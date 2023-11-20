const express = require('express');
const { getAllEnvelopeItems, addNewItem, getItemById, updateItem, deleteItem, moveItem } = require('../data/data.js');

const itemsRouter = express.Router({ mergeParams: true });

itemsRouter.param('itemId', (req, res, next, id) => {
  //Check :itemId parameter is number
  if (Number.isInteger(Number(id))) {
    next();
  } else {
    next(new Error("Item id should be number."))
  }
})

itemsRouter.get('/', (req, res, next) => {
  //Request for all items in envelope
  const output = getAllEnvelopeItems(req.params.envId);
  if (typeof output === 'string') {
    next(new Error(output));
  } else {
    res.status(200).send(output);
  }
})

itemsRouter.post('/', (req, res, next) => {
  //Add item to envelope
  if (req.query.name && req.query.cost) {
    const newItem = addNewItem(req.params.envId, {
      name: req.query.name,
      cost: req.query.cost
    })
    if (newItem.id) {
      res.status(201).send(newItem);
    } else {
      next(new Error(newItem));
    }
  } else {
    next(new Error(`Missing required parameters: ${!req.query.name ? "name " : ""} ${!req.query.cost ? "cost " : ""}`));
  }
})

itemsRouter.get('/:itemId', (req, res, next) => {
  //Request for specific item in envelope
  const newItem = getItemById(req.params.envId, req.params.itemId);
  if (newItem.id) {
    res.status(200).send(newItem);
  } else {
    next(new Error(newItem));
  }
})

itemsRouter.put('/:itemId', (req, res, next) => {
  //Replace item in envelope
  if (req.query.name && req.query.cost) {
    const output = updateItem(req.params.envId, req.params.itemId, req.query);
    if (typeof output === 'string') {
      next(new Error(output));
    } else {
      res.status(200).send(output);
    }
  } else {
    next(new Error("Missing required parameters (name/cost)"))
  }
})

itemsRouter.patch('/:itemId', (req, res, next) => {
  //Update item in envelope
  if (req.query.name || req.query.cost) {
    const output = updateItem(req.params.envId, req.params.itemId, req.query);
    if (typeof output === 'string') {
      next(new Error(output));
    } else {
      res.status(200).send(output);
    }
  } else {
    next(new Error("No valid parameters found (name/cost)"))
  }
})

itemsRouter.patch('/:itemId/move/:destEnvId', (req, res, next) => {
  //Move item
  const output = moveItem(req.params.envId, req.params.itemId, req.params.destEnvId);
  if (output.id) {
    res.status(200).send(output);
  } else {
    next(new Error(output));
  }
})

itemsRouter.delete('/:itemId', (req, res, next) => {
  //Delete item from envelope
  const output = deleteItem(req.params.envId, req.params.itemId);
  if (!output) {
    res.status(202).send();
  } else {
    next(new Error(output));
  }
})

module.exports = itemsRouter;