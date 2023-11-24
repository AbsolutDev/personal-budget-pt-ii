const PORT = process.env.PORT || 5432;
const DATABASE_URL = process.env.DATABASE_URL;
const Pool = require('pg').Pool;

const pool = new Pool({
  connectionString: DATABASE_URL
})

const query = (text, params, callback) => {
  return pool.query(text, params, callback);
}

module.exports = { query };