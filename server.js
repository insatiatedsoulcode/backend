// server.js

console.log('--- Script starting ---');

// Import necessary modules (ensure each is imported only once)
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from .env file

// Initialize the Express application (ensure app is initialized only once)
const app = express();

console.log('--- Modules imported ---');
console.log('MONGODB_URI from env:', process.env.MONGODB_URI); // Debug: Check MongoDB URI

// Vercel provides the PORT environment variable
const PORT = process.env.PORT || 3001; // Use Vercel's port or 3001 locally

console.log('--- Express app initialized ---');

// --- Middleware ---

// Updated CORS Configuration (place this before other middleware that depends on app)
// Define the list of allowed origins (your frontend domains)
const allowedOrigins = [
  'http://localhost:3000', // For your local frontend development
  'https://college-website-react-phi.vercel.app', // Your Vercel deployment domain for frontend
  'https://udaypratapcollege.com', // Your custom domain for the frontend
  'http://udaypratapcollege.com' // Your custom domain (non-HTTPS, if applicable)
  // Add any other Vercel preview deployment domains if needed
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests during testing)
    // For stricter production, you might want to remove this or make it more conditional
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the Origin: ${origin}`;
      return callback(new Error(msg), false); // Disallow if origin is not in the list
    }
    return callback(null, true); // Allow if origin is in the list
  }
}));

// Parse JSON request bodies
app.use(express.json());
// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

console.log('--- Middleware configured ---');

// --- MongoDB Connection ---
// Ensure MONGODB_URI is set in your environment variables (locally in .env, on Vercel in settings)
if (!process.env.MONGODB_URI) {
  console.error('FATAL ERROR: MONGODB_URI is not defined in environment variables.');
  // process.exit(1); // Optionally exit if DB connection is critical
} else {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('--- Successfully connected to MongoDB ---');
    })
    .catch((err) => {
      console.error('--- MongoDB connection error: ---', err);
      // process.exit(1); // Optionally exit
    });
}

// --- Mongoose Schema and Model for Enquiries ---
const enquirySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/\S+@\S+\.\S+/, 'Please use a valid email address.'],
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

// Mongoose automatically looks for the plural, lowercased version of the model name ('enquiries')
const Enquiry = mongoose.model('Enquiry', enquirySchema);
console.log('--- Mongoose Enquiry model created ---');


// --- API Routes ---

// Basic test route
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from the backend contact form API! (Database only)' });
});

// POST route to submit a new enquiry
app.post('/api/send-enquiry', async (req, res) => {
  console.log('--- Received POST to /api/send-enquiry ---');
  const { name, email, subject, message } = req.body;

  // Basic validation (Mongoose schema validation is also applied on save)
  if (!name || !email || !subject || !message) {
    console.log('Validation failed: Missing fields from request body');
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  // Save to MongoDB
  try {
    const newEnquiry = new Enquiry({
      name,
      email,
      subject,
      message,
    });
    const savedEnquiry = await newEnquiry.save();
    console.log('--- Enquiry saved to MongoDB: ---', savedEnquiry._id);

    // Respond with success
    res.status(201).json({ // 201 Created status code
        success: true,
        message: 'Enquiry received and stored successfully!',
        enquiryId: savedEnquiry._id
    });

  } catch (error) {
    console.error('--- Error processing enquiry: ---', error);
    if (error.name === 'ValidationError') { // Handle Mongoose validation errors
      let errors = {};
      for (let field in error.errors) {
        errors[field] = error.errors[field].message;
      }
      return res.status(400).json({ success: false, message: 'Validation failed.', errors });
    }
    // Handle other potential errors (e.g., database connection issues)
    res.status(500).json({ success: false, message: 'Failed to store enquiry. Please try again later.' });
  }
});

// GET route to fetch all enquiries
app.get('/api/enquiries', async (req, res) => {
  console.log('--- Received GET to /api/enquiries ---');
  try {
    // Fetch all enquiries from the database, sort by newest first
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


// --- Start the server (for local development only) ---

// Only run app.listen if the server is run directly (e.g., `node server.js`)
// and not when imported as a module by Vercel.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend server is running locally on http://localhost:${PORT}`);
    // Optional check after server starts listening
    if (mongoose.connection.readyState !== 1) {
        console.warn('--- Warning: Server started, but MongoDB may not be connected yet. Check connection status. ---')
    }
  });
}

console.log('--- Script finished initial execution ---');

// Export the Express app for Vercel's serverless environment
module.exports = app;
