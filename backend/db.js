const { Pool } = require('pg');

// Reads DATABASE_URL from .env and manages connections
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = pool;