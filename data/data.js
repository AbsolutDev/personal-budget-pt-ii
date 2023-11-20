const DATA = [
  {
    id: 3,
    name: 'Groceries',
    description: 'Groceries expenses',
    budget: 200,
    items: [
      {
        id: 1,
        name: 'Weekly groceries',
        cost: 190
      }
    ]
  },
  {
    id: 1,
    name: 'Travel',
    description: 'Travel expenses',
    budget: 100,
    items: [
      {
        id: 3,
        name: 'Train to London',
        cost: 10
      },
      {
        id: 1,
        name: 'Train from London',
        cost: 15
      }
    ]
  }
];

function getAllEnvelopes() {
  return DATA;
}

function getEnvelopeIndexById(envId) {
  for (let index in DATA) {
    if (DATA[index].id === Number(envId)) {
      return index;
    }
  }
  return null;
}

function getEnvelope(envId) {
  const envIndex = getEnvelopeIndexById(envId);
  if (!envIndex) {
    return "No such envelope"
  }
  return DATA[envIndex];
}

function addNewEnvelope(envelope) {
  //Check to see if budget is a number
  if (!Number(envelope.budget)) {
    return "The budget value has to be a number";
  }
  //Check to see if name is unique
  for (let envelopeIndex in DATA) {
    if (DATA[envelopeIndex].name.toLowerCase() === envelope.name.toLowerCase()) {
      return "An envelope with the same name already exists";
    }
  }
  const newId = getNewId(DATA);
  DATA.push({
    id: newId,
    name: envelope.name,
    description: envelope.description,
    budget: Number(envelope.budget),
    items: []
  })
  return DATA[getIndexById(DATA, newId)];
}

function deleteEnvelope(envId) {
  const envIndex = getEnvelopeIndexById(envId);
  if(!envIndex) {
    return "No such envelope"
  }
  DATA.splice(envIndex,1);
  console.log(DATA);
  return null;
}

function updateEnvelope(envId, data) {
  const envIndex = getEnvelopeIndexById(envId);
  if (!envIndex) {
    return "No such envelope"
  }
  if (data.budget) {
    //Check if new budget value is a number
    if (!Number(data.budget)) {
      return "The budget value has to be a number";
    }
    data.budget = Number(data.budget);
    //Check if new budget value exceeds items total
    const itemsTotal = sumOfEnvelopeItems(envIndex);
    if (data.budget < itemsTotal) {
      return `The budget value cannot be less than ${itemsTotal}`;
    }
    DATA[envIndex].budget = data.budget;
  }
  if (data.name) {
    for (let envelopeIndex in DATA) {
      if (DATA[envelopeIndex].name.toLowerCase() === data.name.toLowerCase()) {
        return "An envelope with the same name already exists";
      }
    }
    DATA[envIndex].name = data.name;
  }
  if (data.description) DATA[envIndex].description = data.description;
  
  return DATA[envIndex];
}

function transferBudget(srcEnvelopeId, destEnvelopeId, amount) {
  if (srcEnvelopeId === destEnvelopeId)
    return "Source and destination envelopes cannot be the same"

  const srcEnvelopeIndex = getEnvelopeIndexById(srcEnvelopeId);
  if (!srcEnvelopeIndex) {
    return "No such source envelope"
  }

  if (!Number(amount)) {
    return "The amount to be transfered has to be a number";
  }
  amount = Number(amount);
  const budgetAvailable = DATA[srcEnvelopeIndex].budget - sumOfEnvelopeItems(srcEnvelopeIndex);
  if (budgetAvailable === 0) {
    return "No budget available to transfer"
  }

  const destEnvelopeIndex = getEnvelopeIndexById(destEnvelopeId);
  if (!destEnvelopeIndex) {
    return "No such destination envelope"
  }

  //Check if amount is available in source envelope
  if (budgetAvailable < amount) {
    return `Cannot transfer more than ${budgetAvailable}`;
  }

  DATA[srcEnvelopeIndex].budget -= amount;
  DATA[destEnvelopeIndex].budget += amount;
  
  return null
}

function getAllEnvelopeItems(envId) {
  const envIndex = getEnvelopeIndexById(envId);
  if (!envIndex) {
    return "No such envelope"
  }
  return DATA[envIndex].items;
}

function addNewItem(envId, item) {
  const envIndex = getEnvelopeIndexById(envId);
  if (!envIndex) {
    return "No such envelope"
  }
  const newId = getNewId(DATA[envIndex].items);
  
  if (!Number(item.cost)) {
    return "The budget value has to be a number";
  }
  item.cost = Number(item.cost);
  const currentItemsTotal = sumOfEnvelopeItems(envIndex);
  if (item.cost > 0 && DATA[envIndex].budget - currentItemsTotal === 0) {
    return `No available budget for envelope ${DATA[envIndex].name}`;
  }
  
  if (currentItemsTotal + item.cost > DATA[envIndex].budget) {
    return `Can't exceed available envelope budget of ${DATA[envIndex].budget - currentItemsTotal}`
  }
  DATA[envIndex].items.push({
    ...item,
    id: newId
  });
  return DATA[envIndex].items[DATA[envIndex].items.length-1];
}

function getItemById(envId, itemId) {
  const envIndex = getEnvelopeIndexById(envId);
  if (!envIndex) {
    return "No such envelope"
  }
  const itemIndex = getItemIndexById(envIndex, itemId);
  if (!itemIndex) {
    return "No such item"
  }
  return DATA[envIndex].items[itemIndex];
}

function getItemIndexById(envIndex, itemId) {
  for (let index in DATA[envIndex].items) {
    if (DATA[envIndex].items[index].id === Number(itemId)) {
      return index;
    }
  }
  return null;
}

function updateItem(envId, itemId, data) {
  const envIndex = getEnvelopeIndexById(envId);
  if (!envIndex) {
    return "No such envelope"
  }
  const itemIndex = getItemIndexById(envIndex, itemId);
  if (!itemIndex) {
    return "No such item"
  }
  if (data.cost) {
    //Check if new cost is number
    if (!Number(data.cost)) {
      return "The cost value has to be a positive number";
    }
    data.cost = Number(data.cost);
    //Check if new cost value exceeds available budget
    const itemsTotal = sumOfEnvelopeItems(envIndex);
    const budgetForItem = DATA[envIndex].budget - itemsTotal + DATA[envIndex].items[itemIndex].cost;
    if (budgetForItem - data.cost < 0) {
      return `The cost value cannot be more than ${budgetForItem}`;
    }
    DATA[envIndex].items[itemIndex].cost = data.cost;
  }
  if (data.name) {
    DATA[envIndex].items[itemIndex].name = data.name;
  }
  return DATA[envIndex].items[itemIndex];
}

function deleteItem(envId, itemId) {
  const envIndex = getEnvelopeIndexById(envId);
  if (!envIndex) {
    return "No such envelope"
  }
  const itemIndex = getItemIndexById(envIndex, itemId);
  if (!itemIndex) {
    return "No such item"
  }
  DATA[envIndex].items.splice(itemIndex,1);
  return null;
}

function moveItem(srcEnvelopeId, itemId, destEnvelopeId) {
  const srcEnvelopeIndex = getEnvelopeIndexById(srcEnvelopeId);
  if (!srcEnvelopeIndex) {
    return "No such source envelope"
  }
  const itemIndex = getItemIndexById(srcEnvelopeIndex, itemId);
  if (!itemIndex) {
    return "No such item in source envelope"
  }
  const destEnvelopeIndex = getEnvelopeIndexById(destEnvelopeId);
  if (!destEnvelopeIndex) {
    return "No such destination envelope"
  }
  const destBudgetAvailable = DATA[destEnvelopeIndex].budget - sumOfEnvelopeItems(destEnvelopeIndex);
  if (destBudgetAvailable < DATA[srcEnvelopeIndex].items[itemIndex].cost) {
    return "Not enough available budget in destination envelope"
  }
  //Generate new id in destination envelope
  const newItemId = getNewId(DATA[destEnvelopeIndex].items);
  
  //Add item to destination envelope
  DATA[destEnvelopeIndex].items.push({...DATA[srcEnvelopeIndex].items[itemIndex], id: newItemId})

  //Remove item from source envelope
  DATA[srcEnvelopeIndex].items.splice(itemIndex,1);
  
  return DATA[destEnvelopeIndex].items[DATA[destEnvelopeIndex].items.length - 1];
}

//Utility Functions

function getNewId(data) {
  let newId = 1;
  let foundId = false;
  while (!foundId) {
    foundId = true;
    for (let dataIndex in data) {
      if (data[dataIndex].id === newId) {
        newId++;
        foundId = false;
        break;
      }
    }
  }
  return newId;
}

function sumOfEnvelopeItems(envIndex) {
  let sumOfItems = 0;
  DATA[envIndex].items.forEach(item => sumOfItems += item.cost);
  return sumOfItems;
}

module.exports = {
  DATA,
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