// server-debug.js
const express = require('express');
const app = express();

// This will be one of the first things to execute when Vercel runs this file.
console.log('--- MINIMAL DEBUG SERVER: Script starting on Vercel ---');

// A simple root route
app.get('/', (req, res) => {
  console.log('--- MINIMAL DEBUG SERVER: Root / route was hit ---');
  res.status(200).json({ message: 'Minimal Debug Server: Root is ALIVE on Vercel!' });
});

// A simple /api route
app.get('/api', (req, res) => {
  console.log('--- MINIMAL DEBUG SERVER: /api route was hit ---');
  res.status(200).json({ message: 'Minimal Debug Server: /api is ALIVE on Vercel!' });
});

// A catch-all route to see if any requests are reaching Express
app.use('*', (req, res) => {
  console.log(`--- MINIMAL DEBUG SERVER: Catch-all route hit for ${req.originalUrl} ---`);
  res.status(404).json({
    message: `Minimal Debug Server: Route ${req.originalUrl} not explicitly handled by Express.`,
    info: "This means Vercel routing probably worked, but Express didn't have this specific route."
  });
});

// Export the Express app for Vercel
module.exports = app;

console.log('--- MINIMAL DEBUG SERVER: Script finished initial execution on Vercel ---');
