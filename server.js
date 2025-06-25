// server.js
// Backend now includes logic for tracking website visits.

console.log('--- Script starting ---');

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); 
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware (cors, express.json, etc.) ---
// ... (your existing middleware code remains here) ...

// --- MongoDB Connection ---
// ... (your existing MongoDB connection logic remains here) ...


// --- Mongoose Schemas and Models ---
// ... (Your Enquiry, Application, and User schemas remain here) ...

// --- NEW: Schema for tracking site analytics ---
const siteAnalyticsSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'site_visits' },
  count: { type: Number, default: 0 }
});
const SiteAnalytics = mongoose.models.SiteAnalytics || mongoose.model('SiteAnalytics', siteAnalyticsSchema);
console.log('--- Mongoose SiteAnalytics model created ---');


// --- API Routes ---
// ... (Your existing routes for inquiries, applications, login, etc. remain here) ...


// --- VVV NEW ROUTES FOR VISITOR COUNTER VVV ---

// GET route to fetch the current visit count
app.get('/api/analytics/visits', async (req, res) => {
  try {
    // Find the single document responsible for tracking visits, or create it if it doesn't exist.
    let analytics = await SiteAnalytics.findOne({ key: 'site_visits' });
    if (!analytics) {
      analytics = await new SiteAnalytics().save();
    }
    res.status(200).json({ success: true, count: analytics.count });
  } catch (error) {
    console.error('--- Error fetching visit count: ---', error);
    res.status(500).json({ success: false, message: 'Failed to fetch visit count.' });
  }
});

// POST route to increment the visit count
app.post('/api/analytics/track-visit', async (req, res) => {
  try {
    // Find the analytics document and increment the count by 1.
    // The { new: true, upsert: true } options ensure that if the document doesn't exist,
    // it will be created automatically.
    const updatedAnalytics = await SiteAnalytics.findOneAndUpdate(
      { key: 'site_visits' },
      { $inc: { count: 1 } },
      { new: true, upsert: true }
    );
    res.status(200).json({ success: true, count: updatedAnalytics.count });
  } catch (error) {
    console.error('--- Error tracking visit: ---', error);
    res.status(500).json({ success: false, message: 'Failed to track visit.' });
  }
});

// --- ^^^ END OF NEW ROUTES ^^^ ---


// --- Start the server ---
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
