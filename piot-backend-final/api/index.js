// Serverless function handler for Vercel
// This file wraps the Express app from server.js for serverless deployment

const app = require('../server');

module.exports = app;
