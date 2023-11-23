const Pool = require('pg').Pool;

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  database: 'personal_expenses',
  password: 'postgre',
  port: 5432
})

const query = (text, params, callback) => {
  return pool.query(text, params, callback);
}

module.exports = { query };