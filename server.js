// server.js

console.log('--- Script starting ---');

// Import necessary modules
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from .env file

// Initialize the Express application
const app = express();

console.log('--- Modules imported ---');
console.log('MONGODB_URI from env:', process.env.MONGODB_URI);

// Render provides the PORT environment variable.
const PORT = process.env.PORT || 3001;

console.log('--- Express app initialized ---');

// --- Middleware ---

// Define the list of allowed origins
const allowedOrigins = [
  'http://localhost:3000', // For your local frontend development
  'https://college-website-react-phi.vercel.app', // Your Vercel deployment for frontend
  'https://udaypratapcollege.com', // Your custom domain
  'http://udaypratapcollege.com', // Custom domain (non-HTTPS, if used)
  'https://www.udaypratapcollege.com', // Custom domain with WWW
  'http://www.udaypratapcollege.com'  // Custom domain with WWW (non-HTTPS, if used)
  // Add any other Vercel/Render preview deployment domains if needed
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
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: "Content-Type, Authorization, X-Requested-With, Accept", // Added Accept
  credentials: true,
  optionsSuccessStatus: 204 // Standard for successful preflight
};

// IMPORTANT: Handle OPTIONS requests first, especially for specific routes if needed,
// then apply global CORS, then other middleware.

// Explicitly handle ALL OPTIONS requests for all routes using the defined corsOptions.
// This should respond to preflight requests correctly before they hit other route handlers.
app.options('*', cors(corsOptions)); // Handles preflight requests for all routes

// Apply CORS middleware globally for all other requests (GET, POST, etc.)
app.use(cors(corsOptions));

// Parse JSON request bodies
app.use(express.json());
// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

console.log('--- Middleware configured ---');

// --- MongoDB Connection ---
if (!process.env.MONGODB_URI) {
  console.error('FATAL ERROR: MONGODB_URI is not defined in environment variables.');
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

// Root route for health checks (good for Render)
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Backend API is healthy and running!' });
});

app.get('/api', (req, res) => {
  res.json({ message: 'Hello from the backend contact form API! (Database only)' });
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
    console.log('--- Enquiry saved to MongoDB: ---', savedEnquiry._id);

    res.status(201).json({
      success: true,
      message: 'Enquiry received and stored successfully!',
      enquiryId: savedEnquiry._id
    });

  } catch (error) {
    console.error('--- Error processing enquiry: ---', error);
    if (error.name === 'ValidationError') {
      let errors = {};
      for (let field in error.errors) {
        errors[field] = error.errors[field].message;
      }
      return res.status(400).json({ success: false, message: 'Validation failed.', errors });
    }
    res.status(500).json({ success: false, message: 'Failed to store enquiry. Please try again later.' });
  }
});

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

// --- Start the server (for local development or if Render uses `node server.js`) ---
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`); // Changed "locally"
    if (mongoose.connection.readyState !== 1) {
      console.warn('--- Warning: Server started, but MongoDB may not be connected yet. Check connection status. ---')
    } else {
      console.log('--- Server started and MongoDB is connected. ---');
    }
  });
}

console.log('--- Script finished initial execution ---');

// Export the Express app (Render might use this if not using the start script directly,
// but with a `node server.js` start command, the app.listen above is key)
module.exports = app;
