require('dotenv').config;  // Load .env variables
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());  // Connects frontend to backend
app.use(express.json());  // Parse incoming JSON req body

// Mount the route files
app.use('/auth', require('./routes/auth'));
app.listen(3000, () => console.log('Backend is now running'));
