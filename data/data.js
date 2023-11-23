const { query } = require('./db.js');

//Database Queries

// GET ./
function getAllEnvelopes() {
  const result = query('SELECT * FROM categories ORDER BY id ASC');
  return result;
}

// GET ./:envId
async function getEnvelope(envId) {
  const result = await query('SELECT * FROM categories WHERE id = $1', [envId])
  if (!result.rowCount) {
    const err = new Error(`No such envelope ID ${envId}`);
    err.statusCode = 400;
    throw (err);
  }
  return result.rows[0];
}

// POST ./
async function addNewEnvelope(envelope) {
  //Check budget is a number
  if (isNaN(envelope.budget)) {
    const err = new Error("The budget value has to be a number");
    err.statusCode = 400;
    throw (err);
  }
  //Check budget is not negative
  if (Number(envelope.budget) < 0) {
    const err = new Error("The budget value cannot be negative");
    err.statusCode = 400;
    throw (err);
  }
  //Check name is unique
  const checkNameIsUnique = await checkValueIsUnique("categories", "name", envelope.name);
  if (checkNameIsUnique.rowCount) {
    const err = new Error("The envelope name has to be unique")
    err.statusCode = 400;
    throw (err);
  }

  const lastId = await getLastId("categories");
  const newId = lastId.rows[0].max + 1;
  const result = await query('INSERT INTO categories VALUES ($1, $2, $3, $4) RETURNING *', [newId, envelope.name, envelope.description, Number(envelope.budget)]);
  logTransaction(newId, `Envelope ${newId} '${envelope.name}' created with budget ${envelope.budget}`);
  return result;
}

// DELETE ./:envId
async function deleteEnvelope(envId) {
  //Check envelope exists
  const envelope = await getEnvelope(envId);
  //Check if envelope has items
  const envSpend = await getSpendInEnvelope(envId);
  if(envSpend.rows[0].total_cost) {
    const err = new Error("Envelope has items")
    err.statusCode = 400;
    throw (err);
  }
  await query('DELETE FROM categories WHERE id = $1', [envId]);
  logTransaction(envId, `Envelope ${envId} '${envelope.name}' deleted`);
  return null;
}

// PUT+PATCH ./:envId
async function updateEnvelope(envId, data) {
  //Checks before any query
  if (data.budget) {
    //Check if new budget value is a number
    if (isNaN(data.budget)) {
      const err = new Error("The budget value has to be a number");
      err.statusCode = 400;
      throw (err);
    }
    //Check budget is not negative
    if (Number(data.budget) < 0) {
      const err = new Error("The budget value cannot be negative");
      err.statusCode = 400;
      throw (err);
    }
  }
  let isValidChange = false;
  let budgetDecrease = false;
  //Check envelope exists
  const currentEnvelope = await getEnvelope(envId);
  //Convert budget value to number
  const currentBudget = Number(currentEnvelope.budget.replace(/[^0-9.-]+/g, ""));
  if (data.budget && Number(data.budget) !== currentBudget) {
    if (Number(data.budget) < currentBudget) {
      //Check new budget is higher than total cost of existing items in the envelope
      const envBudgetInfo = await getSpendInEnvelope(envId);
      const { total_cost } = envBudgetInfo.rows[0];
      const totalCost = total_cost === null ? 0 : Number(total_cost.replace(/[^0-9.-]+/g, ""));
      if (Number(data.budget) < totalCost) {
        const err = new Error(`The budget value has to be at least ${total_cost}`);
        err.statusCode = 400;
        throw (err);
      }
      budgetDecrease = true;
    }
    isValidChange = true;
  }
  if (data.name && data.name !== currentEnvelope.name) {
    //Check new name doesn't already exist
    const checkNameIsUnique = await checkValueIsUnique("categories", "name", data.name);
    if (checkNameIsUnique.rowCount && checkNameIsUnique.rows[0].id !== currentEnvelope.id) {
      const err = new Error("The envelope name has to be unique")
      err.statusCode = 400;
      throw (err);
    }
    isValidChange = true;
  }
  if (data.description && data.description !== currentEnvelope.description)
    isValidChange = true;

  if (!isValidChange) {
    const err = new Error("Nothing to be updated")
    err.statusCode = 400;
    throw (err);
  }
  let statement = 'UPDATE categories SET';
  let transactionDescription = `Envelope ${currentEnvelope.id}`;
  if (data.name && data.name !== currentEnvelope.name) {
    statement += ` name = '${data.name}',`;
    transactionDescription += ` changed name from '${currentEnvelope.name}' to '${data.name}',`;
  } else {
    transactionDescription += ` '${currentEnvelope.name}'`;
  }

  if (data.description && data.description !== currentEnvelope.description) {
    statement += ` description = '${data.description}',`;
    transactionDescription += ` description changed from '${currentEnvelope.description}' to '${data.description}',`;
  }

  if (data.budget && Number(data.budget) !== currentBudget)
    statement += ` budget = '${data.budget}',`;
    transactionDescription += ` budget ${budgetDecrease ? 'decreased' : 'increased'} from ${currentBudget} to ${data.budget},`;

  statement = statement.slice(0, -1) + ` WHERE id = ${currentEnvelope.id} RETURNING *;`;
  const result = await query(statement);
  logTransaction(currentEnvelope.id, transactionDescription.slice(0, -1));
  return result.rows[0];
}

// PATCH ./:endId/transferto/:destEnvId
async function transferBudget(srcEnvelopeId, destEnvelopeId, amount) {
  //Checks before any query
  //Check if source and destination IDs are different
  if (srcEnvelopeId === destEnvelopeId) {
    const err = new Error("Source and destination envelopes cannot be the same");
    err.statusCode = 400;
    throw (err);
  }
  //Check if amount is a number
  if (isNaN(amount)) {
    const err = new Error("The amount value has to be a number");
    err.statusCode = 400;
    throw (err);
  }

  //Check if amount is gt 0
  if (Number(amount) <= 0) {
    const err = new Error("The amount value has to be a positive number");
    err.statusCode = 400;
    throw (err);
  }

  //Get the 2 envelopes
  const scopedEnvelopes = await query("SELECT * FROM categories WHERE id IN ($1, $2) ORDER BY id;", [srcEnvelopeId, destEnvelopeId]);

  //Check if 2 envelopes exist
  if (scopedEnvelopes.rowCount < 2) {
    const err = new Error();
    err.statusCode = 400;
    if (scopedEnvelopes.rowCount === 0) {
      err.message = "Non-existent envelopes";
      throw (err);
    }
    if (scopedEnvelopes.rows[0].id === Number(srcEnvelopeId)) {
      err.message = "Destination envelope does not exist";
      throw (err);
    }
    err.message = "Source envelope does not exist";
    throw (err);
  }
  const srcIndex = scopedEnvelopes.rows[0].id === Number(srcEnvelopeId) ? 0 : 1;
  const destIndex = srcIndex === 0 ? 1 : 0;
  const srcBudget = Number(scopedEnvelopes.rows[srcIndex].budget.replace(/[^0-9.-]+/g, ""));
  const destBudget = Number(scopedEnvelopes.rows[destIndex].budget.replace(/[^0-9.-]+/g, ""));

  //Check available budget in source envelope
  const srcEnvBudgetInfo = await getSpendInEnvelope(srcEnvelopeId);
  const { total_cost } = srcEnvBudgetInfo.rows[0];
  const srcEnvSpend = total_cost === null? 0 : Number(total_cost.replace(/[^0-9.-]+/g, ""));
  if (srcBudget - srcEnvSpend < Number(amount)) {
    const err = new Error(`Maximum available to transfer is ${srcBudget - srcEnvSpend}`);
    err.statusCode = 400;
    throw (err);
  }

  const srcEnvelope = await query("UPDATE categories SET budget = $1 WHERE id = $2 RETURNING *", [srcBudget - Number(amount), srcEnvelopeId]);
  const destEnvelope = await query("UPDATE categories SET budget = $1 WHERE id = $2 RETURNING *", [destBudget + Number(amount), destEnvelopeId]);
  logTransaction(srcEnvelopeId, `${amount} transferred from ${srcEnvelopeId} '${scopedEnvelopes.rows[srcIndex].name}' to ${destEnvelopeId} '${scopedEnvelopes.rows[destIndex].name}'.`)
  return [srcEnvelope.rows[0], destEnvelope.rows[0]];
}

// GET ./:envId/Items
async function getAllEnvelopeItems(envId) {
  //Check envelope id
  const envelope = await getEnvelope(envId);
  const result = query('SELECT * FROM items WHERE category_id = $1', [envId]);
  return result;
}

// POST ./:envId/items
async function addNewItem(envId, { name, cost }) {
  //Check envelope id
  const envelope = await getEnvelope(envId);
  if (isNaN(cost)) {
    const err = new Error("Cost should be a number");
    err.statusCode = 400;
    throw (err);
  }
  if (Number(cost) <= 0) {
    const err = new Error("Cost should be a positive number");
    err.statusCode = 400;
    throw (err);
  }

  //Check cost against available budget in the envelope
  const envBudgetInfo = await getSpendInEnvelope(envId);
  const { total_cost } = envBudgetInfo.rows[0];
  const totalCost = total_cost === null ? 0 : Number(total_cost.replace(/[^0-9.-]+/g, ""));
  const envBudget = Number(envelope.budget.replace(/[^0-9.-]+/g, ""));
  const availableBudget = envBudget - totalCost;
  if (availableBudget < Number(cost)) {
    const err = new Error(`Available budget in envelope is ${availableBudget}`);
    err.statusCode = 400;
    throw (err);
  }

  //Get next available sub_id
  const lastSubId = await getLastId('items', 'sub_id', Number(envId), 'category_id');
  const newSubId = lastSubId.rows[0].max + 1;

  const result = await query('INSERT INTO items VALUES ($1, $2, $3, $4) RETURNING *', [newSubId, name, cost, envId]);
  logTransaction(envId, `Item ${newSubId} '${name}' (cost ${cost}) added to category ${envId} '${envelope.name}'`);
  return result
}

// GET ./envelopes/:envId/items/:itemId
async function getItemById(envId, itemId) {
  //Check if envelope exists
  await getEnvelope(envId);
  const result = await query('SELECT * FROM items WHERE sub_id = $1 AND category_id = $2', [itemId, envId]);
  if (!result.rowCount) {
    const err = new Error("No such item.");
    err.statusCode = 400;
    throw (err);
  }
  return result.rows[0];
}

// PUT+PATCH ./:envId/items/:itemId
async function updateItem(envId, itemId, data) {
  //Checks before any query
  if (data.cost) {
    //Check cost is a number
    if (isNaN(data.cost)) {
      const err = new Error("The cost value has to be a number");
      err.statusCode = 400;
      throw (err);
    }
    //Check cost is not negative
    if (Number(data.cost) <= 0) {
      const err = new Error("The cost value has to be a positive number");
      err.statusCode = 400;
      throw (err);
    }
  }
  let isValidChange = false;
  let costIncrease = false;
  //Check envelope and item exist
  const currentItem = await getItemById(envId, itemId);
  const currentItemCost = Number(currentItem.cost.replace(/[^0-9.-]+/g, ""));
  if (data.cost && Number(data.cost) !== currentItemCost) {
    if (Number(data.cost) > currentItemCost) {
      //Check there's enough budget for the cost increase
      const envelope = await getEnvelope(envId);
      const envBudget = Number(envelope.budget.replace(/[^0-9.-]+/g, ""));

      const envBudgetInfo = await getSpendInEnvelope(envId);
      const { total_cost } = envBudgetInfo.rows[0];
      const totalCost = total_cost === null ? 0 : Number(total_cost.replace(/[^0-9.-]+/g, ""));

      if (envBudget - totalCost < Number(data.cost) - currentItemCost) {
        const err = new Error(`New cost cannot exceed ${envBudget - totalCost + currentItemCost} `);
        err.statusCode = 400;
        throw (err);
      }
      costIncrease = true;
    }
    isValidChange = true
  }
  if (data.name && data.name !== currentItem.name)
    isValidChange = true

  if (!isValidChange) {
    const err = new Error("Nothing to be updated")
    err.statusCode = 400;
    throw (err);
  }

  let statement = 'UPDATE items SET';
  let transactionDescription = `Item ${itemId}`
  if (data.name && data.name !== currentItem.name) {
    statement += ` name = '${data.name}',`;
    transactionDescription += ` changed name from '${currentItem.name}' to '${data.name}',`
  } else {
    transactionDescription += ` '${currentItem.name}'`;
  }

  if (data.cost && Number(data.cost) !== currentItemCost) {
    statement += ` cost = '${data.cost}',`;
    transactionDescription += ` cost ${costIncrease ? 'increased':'decreased'} from ${currentItemCost} to ${data.cost},`
  }

  statement = statement.slice(0, -1) + `WHERE sub_id = ${itemId} AND category_id = ${envId} RETURNING *;`;
  const result = await query(statement);
  logTransaction(envId, transactionDescription.slice(0,-1));
  return result.rows[0];
}

// DELETE ./:envId/items/:itemId
async function deleteItem(envId, itemId) {
  //Check item exists
  const item = await getItemById(envId, itemId);
  await query('DELETE FROM items WHERE sub_id = $1 AND category_id = $2', [itemId, envId]);
  logTransaction(envId, `Item ${itemId} '${item.name}' deleted`);
  return null;
}

// PATCH ./:srcEnvId/items/:itemId/moveto/:destEnvId
async function moveItem(srcEnvId, itemId, destEnvId) {
  //Check item exists
  const item = await getItemById(srcEnvId, itemId);
  const itemCost = Number(item.cost.replace(/[^0-9.-]+/g, ""));

  const srcEnvelope = await(getEnvelope(srcEnvId));
  //Check destination envelope exists and extract its budget
  const destEnvelope = await getEnvelope(destEnvId);
  const destEnvBudget = Number(destEnvelope.budget.replace(/[^0-9.-]+/g, ""));

  //Check destination envelope has budget for item
  const destEnvBudgetInfo = await getSpendInEnvelope(destEnvId);
  const { total_cost } = destEnvBudgetInfo.rows[0];
  const totalCost = total_cost === null ? 0 : Number(total_cost.replace(/[^0-9.-]+/g, ""));
    
  
  if (destEnvBudget - totalCost < itemCost) {
    const err = new Error("Not enough budget in destination envelope")
    err.statusCode = 400;
    throw (err);
  }

  //Get the highest Id used in envelope
  const lastId = await getLastId('items', 'sub_id', destEnvId, 'category_id');
  const nextId = lastId.rows[0].max + 1;

  const output = await query('UPDATE items SET category_id = $1, sub_id = $2 WHERE sub_id = $3 AND category_id = $4 RETURNING *;', [destEnvId, nextId, itemId, srcEnvId]);
  logTransaction(srcEnvId, `Item ${itemId} '${item.name}' moved from ${srcEnvId} '${srcEnvelope.name}' to ${destEnvId} '${destEnvelope.name}'. New item id ${nextId}`);
  return output.rows[0];
}

// Helper Queries

//Checks if a value is not already present in table.column
function checkValueIsUnique(tableName, columnName, value) {
  const statement = `SELECT id, ${columnName} FROM ${tableName} WHERE LOWER(${columnName}) = '${value.toLowerCase()}'`;
  const result = query(statement)
  return result;
}

//Function called by POST routes to return the highest id in a table
//If only tableName is provided, it returns highest in 'id' column
function getLastId(tableName, subIdColumnName, supId, supIdColumnName) {
  let statement = `SELECT MAX(${subIdColumnName || 'id'}) FROM ${tableName}`;
  if (supId) {
    statement += ` WHERE ${supIdColumnName} = ${supId}`
  }
  const result = query(statement);
  return result;
}

//Function returning the available budget in an envelope
function getSpendInEnvelope(envId) {
  const statement = `
    SELECT SUM(cost) AS total_cost
    FROM items
    WHERE category_id = ${envId}`;
  const result = query(statement);
  return result;
}

//Logging transactions
function logTransaction(envId, transactionDescription) {
  query('INSERT INTO transactions VALUES (NOW(), $1, $2)', [envId, transactionDescription]);
  return null;
}

module.exports = {
  getAllEnvelopes,
  getEnvelope,
  addNewEnvelope,
  updateEnvelope,
  deleteEnvelope,
  transferBudget,
  getAllEnvelopeItems,
  getItemById,
  addNewItem,
  updateItem,
  moveItem,
  deleteItem
}