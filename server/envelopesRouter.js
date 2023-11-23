const express = require('express');
const itemsRouter = require('./itemsRouter.js');
const bodyParser = require('body-parser');
const { getEnvelope, addNewEnvelope, updateEnvelope, getAllEnvelopes, deleteEnvelope, transferBudget } = require('../data/data.js');

const envelopesRouter = express.Router();

envelopesRouter.param('envId', (req, res, next, id) => {
  if (Number.isInteger(Number(id)) && Number(id) >= 0) {
    next();
  } else {
    res.status(400);
    next(new Error("Envelope id should be a positive integer."))
  }
})

envelopesRouter.param('destEnvId', (req, res, next, id) => {
  if (Number.isInteger(Number(id)) && Number(id) >= 0) {
    next();
  } else {
    res.status(400);
    next(new Error("Destination envelope id should be a positive integer."))
  }
})

envelopesRouter.use(bodyParser.json());

envelopesRouter.use(
  bodyParser.urlencoded({
    extended: true
  })
)

// GET all envelopes
envelopesRouter.get('/', async (req, res, next) => {
  //Request to retrieve ALL envelopes (ALL DATA)
  try {
    const output = await getAllEnvelopes();
    if (output) {
      res.status(200).json(output.rows);
    }
  } catch (err) {
    res.status(err.statusCode || 500);
    next(err);
  }

})

// POST new envelope
envelopesRouter.post('/', async (req, res, next) => {
  //Add a new envelope
  if (req.query.name && req.query.description && req.query.budget) {
    try {
      const newEnvelope = await addNewEnvelope({
        name: req.query.name,
        description: req.query.description,
        budget: req.query.budget,
      });
      if (newEnvelope) {
        res.status(201).json(newEnvelope.rows[0]);
      }
    } catch (err) {
      res.status(err.statusCode || 500);
      next(err);
    }
  } else {
    res.status(400);
    next(new Error(`Missing required parameters: ${!req.query.name ? "name," : ""} ${!req.query.description ? "description," : ""} ${!req.query.budget ? "budget," : ""}`.slice(0, -1)));
  }
})

// GET envelope by id
envelopesRouter.get('/:envId', async (req, res, next) => {
  //Request to retrieve specific envelope
  try {
    const output = await getEnvelope(req.params.envId);
    if (output) {
      res.status(200).json(output);
    }
  } catch (err) {
    res.status(err.statusCode || 500);
    next(err);
  }
})

// Update envelope (all fields required); Returns updated envelope
envelopesRouter.put('/:envId', async (req, res, next) => {
  //Replace existing envelope
  if (req.query.name && req.query.description && req.query.budget) {
    try {
      const updatedEnvelope = await updateEnvelope(req.params.envId, req.query);
      if (updatedEnvelope) {
        res.status(200).json(updatedEnvelope);
      }
    } catch (err) {
      res.status(err.statusCode || 500);
      next(err);
    }
  } else {
    res.status(400);
    next(new Error(`Missing required parameters: ${!req.query.name ? "name," : ""} ${!req.query.description ? "description," : ""} ${!req.query.budget ? "budget," : ""}`.slice(0, -1)));
  }
})

// Update envelope (any fields); Returns updated envelope
envelopesRouter.patch('/:envId', async (req, res, next) => {
  //Update existing envelope
  if (req.query.name || req.query.description || req.query.budget) {
    try {
      const updatedEnvelope = await updateEnvelope(req.params.envId, req.query);
      if (updatedEnvelope) {
        res.status(200).json(updatedEnvelope);
      }
    } catch (err) {
      res.status(err.statusCode || 500);
      next(err);
    }
  } else {
    res.status(400);
    next(new Error("No valid parameter provided (name/description/budget)"))
  }
})

// Transfer budget between envelopes; Returns updated envelopes
envelopesRouter.patch('/:envId/transferto/:destEnvId', async (req, res, next) => {
  if (req.query.amount) {
    try {
      const output = await transferBudget(req.params.envId, req.params.destEnvId, req.query.amount);
      if (output) {
        res.status(200).json(output);
      }
    } catch (err) {
      res.status(err.statusCode || 500);
      next(err);
    }
  } else {
    res.status(400);
    next(new Error("Amount to be transferred needed"));
  }
})

// DELETE envelope
envelopesRouter.delete('/:envId', async (req, res, next) => {
  try {
    await deleteEnvelope(req.params.envId);
    res.status(204).send();
  } catch (err) {
    res.status(err.statusCode || 500);
    next(err);
  }
})

envelopesRouter.use('/:envId/items', itemsRouter);

envelopesRouter.use((err, req, res, next) => {
  res.status(res.statusCode || err.status || 400).send(err.message || 'An error has occured');
})

module.exports = envelopesRouter;