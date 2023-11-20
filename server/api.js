const express = require('express');
const evenlopesRouter = require('./envelopesRouter.js');

const api = express();

const PORT = 4001;

api.listen(PORT, () => { console.log("Server has started") });

api.use('/', (req, res, next) => {
  next();
})

api.use('/envelopes', evenlopesRouter);

module.exports = api;