// server.js
// Simplified backend to only save inquiries to MongoDB.

console.log('--- Script starting ---');

// Import necessary modules
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from .env file

// Initialize the Express application
const app = express();

console.log('--- Modules imported ---');
console.log('MONGODB_URI from env:', process.env.MONGODB_URI ? 'Loaded' : 'NOT LOADED');

// Render provides the PORT environment variable.
const PORT = process.env.PORT || 3001;

console.log('--- Express app initialized ---');

// --- Middleware ---

// Define the list of allowed origins
const allowedOrigins = [
  'http://localhost:3000',                            // For your local frontend development
  'https://udaypratapcollege.com',                     // Your custom domain
  'https://www.udaypratapcollege.com',               // Your custom domain with WWW
  'https://udaypratapcollege-website.onrender.com',    // Your Render frontend URL
  // Add any other deployment preview URLs if needed
];

// CORS Configuration Options
const corsOptions = {
  origin: function (origin, callback) {
    console.log(`CORS Check: Request origin: ${origin}`);
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      console.log(`CORS Check: Origin allowed: ${origin || 'No Origin (Allowed)'}`);
      callback(null, true);
    } else {
      console.error(`CORS Check: Origin NOT allowed: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS policy.`));
    }
  },
  methods: "GET,POST,OPTIONS",
  allowedHeaders: "Content-Type, Authorization",
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log('--- Middleware configured ---');


// --- MongoDB Connection ---
if (!process.env.MONGODB_URI) {
  console.error('FATAL ERROR: MONGODB_URI is not defined in environment variables.');
  // In a real production app, you might want to exit if the DB connection string is missing
  // process.exit(1); 
} else {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('--- Successfully connected to MongoDB ---');
    })
    .catch((err) => {
      console.error('--- MongoDB connection error: ---', err);
    });
}

// --- Mongoose Schema and Model for Enquiries ---
const enquirySchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true },
  email: { type: String, required: [true, 'Email is required'], trim: true, lowercase: true, match: [/\S+@\S+\.\S+/, 'Please use a valid email address.'] },
  subject: { type: String, required: [true, 'Subject is required'], trim: true },
  message: { type: String, required: [true, 'Message is required'], trim: true },
  submittedAt: { type: Date, default: Date.now },
});

const Enquiry = mongoose.model('Enquiry', enquirySchema);
console.log('--- Mongoose Enquiry model created ---');


// --- API Routes ---

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Uday Pratap College Enquiry API is running.' });
});

// POST route to submit a new enquiry
app.post('/api/send-enquiry', async (req, res) => {
  console.log('--- Received POST to /api/send-enquiry ---');
  console.log('Request Body:', req.body);
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    console.log('Validation failed: Missing fields from request body');
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  try {
    const newEnquiry = new Enquiry({ name, email, subject, message });
    const savedEnquiry = await newEnquiry.save();
    console.log('--- Enquiry saved to MongoDB. ID: ---', savedEnquiry._id);

    res.status(201).json({
      success: true,
      message: 'Thank you for your inquiry! It has been received successfully.',
      enquiryId: savedEnquiry._id
    });

  } catch (error) {
    console.error('--- Error processing enquiry: ---', error);
    if (error.name === 'ValidationError') {
      const errors = {};
      for (const field in error.errors) {
        errors[field] = error.errors[field].message;
      }
      return res.status(400).json({ success: false, message: 'Please correct the errors and try again.', errors });
    }
    res.status(500).json({ success: false, message: 'An internal error occurred. Please try again later.' });
  }
});

// GET route to view all enquiries (optional, can be protected later)
app.get('/api/enquiries', async (req, res) => {
  console.log('--- Received GET to /api/enquiries ---');
  try {
    const enquiries = await Enquiry.find().sort({ submittedAt: -1 });
    res.status(200).json({
      success: true,
      count: enquiries.length,
      data: enquiries
    });
  } catch (error) {
    console.error('--- Error fetching enquiries: ---', error);
    res.status(500).json({ success: false, message: 'Failed to fetch enquiries.' });
  }
});

// --- Start the server ---
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
  if (mongoose.connection.readyState === 1) {
    console.log('--- Server started and MongoDB is connected. ---');
  }
});

console.log('--- Script finished initial execution ---');

module.exports = app;