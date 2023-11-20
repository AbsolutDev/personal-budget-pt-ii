const express = require('express');
const itemsRouter = require('./itemsRouter.js');
const { getEnvelope, addNewEnvelope, updateEnvelope, getAllEnvelopes, deleteEnvelope, transferBudget } = require('../data/data.js');

const envelopesRouter = express.Router();

envelopesRouter.param('envId', (req, res, next, id) => {
  if (Number.isInteger(Number(id))) {
    next();
  } else {
    next(new Error("Envelope id should be number."))
  }
})

envelopesRouter.get('/', (req, res, next) => {
  //Request to retrieve ALL envelopes (ALL DATA)
  res.status(200).send(getAllEnvelopes());
})

envelopesRouter.post('/', (req, res, next) => {
  //Add a new envelope
  if (req.query.name && req.query.description && req.query.budget) {
    const newEnvelope = addNewEnvelope({
      name: req.query.name,
      description: req.query.description,
      budget: req.query.budget,
    });
    if (newEnvelope.id) {
      res.status(201).send(newEnvelope);
    } else {
      next(new Error(newEnvelope));
    }
  } else {
    next(new Error(`Missing required parameters: ${!req.query.name ? "name " : ""} ${!req.query.description ? "description " : ""} ${!req.query.name ? "budget" : ""}`));
  }

})

envelopesRouter.get('/:envId', (req, res, next) => {
  //Request to retrieve specific envelope
  const output = getEnvelope(req.params.envId);
  if (output.id) {
    res.status(200).send(output);
  } else {
    next(new Error(output))
  }
})

envelopesRouter.put('/:envId', (req, res, next) => {
  //Replace existing envelope
  if (req.query.name && req.query.description && req.query.budget) {
    const output = updateEnvelope(req.params.envId, req.query);
    if (output.id) {
      res.status(200).send(output);
    } else {
      next(new Error(output))
    }
  } else {
    next(new Error("Missing required parameters (name/description/budget)"))
  }
})

envelopesRouter.patch('/:envId', (req, res, next) => {
  //Update existing envelope
  if (req.query.name || req.query.description || req.query.budget) {
    const output = updateEnvelope(req.params.envId, req.query);
    if (output.id) {
      res.status(200).send(output);
    } else {
      next(new Error(output))
    }
  } else {
    next(new Error("No valid parameter provided (name/description/budget)"))
  }
})

envelopesRouter.patch('/:envId/transfer/:destEnvId', (req, res, next) => {
  const output = transferBudget(req.params.envId, req.params.destEnvId, req.query.amount);
  if (!output) {
    res.status(200).send('OK');
  } else {
    next(new Error(output));
  }
  
})

envelopesRouter.delete('/:envId', (req, res, next) => {
  //Delete envelope
  const output = deleteEnvelope(req.params.envId);
  if (!output) {
    res.status(204).send();
  } else {
    next(new Error(output));
  }
  
})

envelopesRouter.use('/:envId/items', itemsRouter);

envelopesRouter.use((err, req, res, next) => {
  res.status(err.status || 400).send(err.message || 'An error has occured');
})

module.exports = envelopesRouter;