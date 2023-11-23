const express = require('express');
const bodyParser = require('body-parser');
const { getAllEnvelopeItems, addNewItem, getItemById, updateItem, deleteItem, moveItem } = require('../data/data.js');

const itemsRouter = express.Router({ mergeParams: true });

itemsRouter.param('itemId', (req, res, next, id) => {
  //Check :itemId parameter is number
  if (Number.isInteger(Number(id)) && Number(id) >= 0) {
    next();
  } else {
    res.status(400);
    next(new Error("Item id should be a positive integer."))
  }
})

itemsRouter.param('destEnvId', (req, res, next, id) => {
  if (Number.isInteger(Number(id)) && Number(id) >= 0) {
    next();
  } else {
    res.status(400);
    next(new Error("Destination envelope id should be a positive integer."))
  }
})

itemsRouter.use(bodyParser.json());

itemsRouter.use(
  bodyParser.urlencoded({
    extended: true
  })
)

// GET all items in envelope
itemsRouter.get('/', async (req, res, next) => {
  //Request for all items in envelope
  try {
    const output = await getAllEnvelopeItems(req.params.envId);
    if (output) {
      res.status(200).json(output.rows);
    }
  } catch (err) {
    res.status(err.statusCode || 500);
    next(err);
  }
})

//Add new item to envelope
itemsRouter.post('/', async (req, res, next) => {
  if (req.query.name && req.query.cost) {
    try {
      const newItem = await addNewItem(req.params.envId, {
        name: req.query.name,
        cost: req.query.cost
      })
      if (newItem) {
        res.status(201).json(newItem.rows[0]);
      }
    } catch (err) {
      res.status(err.statusCode || 500);
      next(err);
    }
  } else {
    res.status(400);
    next(new Error(`Missing required parameters: ${!req.query.name ? "name," : ""} ${!req.query.cost ? "cost," : ""}`.slice(0, -1)));
  }
})

// GET specific item
itemsRouter.get('/:itemId', async (req, res, next) => {
  try {
    const output = await getItemById(req.params.envId, req.params.itemId);
    if (output) {
      res.status(200).json(output);
    }
  } catch (err) {
    res.status(err.statusCode || 500);
    next(err);
  }
})

// Update item in envelope (all fields required); Returns updated item
itemsRouter.put('/:itemId', async (req, res, next) => {
  if (req.query.name && req.query.cost) {
    try {
      const updatedItem = await updateItem(req.params.envId, req.params.itemId, req.query);
      if (updatedItem) {
        res.status(200).json(updatedItem);
      }
    } catch (err) {
      res.status(err.statusCode || 500);
      next(err);
    }
  } else {
    res.status(400);
    next(new Error(`Missing required parameters: ${!req.query.name ? "name," : ""} ${!req.query.cost ? "cost," : ""}`.slice(0, -1)));
  }
})

// Update envelope (any fields); Returns updated envelope
itemsRouter.patch('/:itemId', async (req, res, next) => {
  if (req.query.name || req.query.cost) {
    try {
      const updatedItem = await updateItem(req.params.envId, req.params.itemId, req.query);
      if (updatedItem) {
        res.status(200).json(updatedItem);
      }
    } catch (err) {
      res.status(err.statusCode || 500);
      next(err);
    }
  } else {
    res.status(400);
    next(new Error("No valid parameters found (name/cost)"))
  }
})

//Move item between envelopes; Returns the updated item
itemsRouter.patch('/:itemId/moveto/:destEnvId', async (req, res, next) => {
  if (req.params.envId !== req.params.destEnvId) {
    try {
      const updatedItem = await moveItem(req.params.envId, req.params.itemId, req.params.destEnvId);
      if (updatedItem)
        res.status(200).json(updatedItem);
    } catch (err) {
      res.status(err.statusCode || 500);
      next(err);
    }
  } else {
    res.status(400);
    next(new Error("Source and destination envelopes cannot be the same."));
  }
})

//Delete item from envelope
itemsRouter.delete('/:itemId', async (req, res, next) => {
  try {
    await deleteItem(req.params.envId, req.params.itemId);
    res.status(204).send();
  } catch (err) {
    res.status(err.statusCode || 500);
    next(err);
  }
})

itemsRouter.use((err, req, res, next) => {
  res.status(res.statusCode || err.status || 400).send(err.message || 'An error has occured');
})


module.exports = itemsRouter;