// server.js

console.log('--- Script starting ---');

// Import necessary modules (ensure each is imported only once)
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer'); // Import Nodemailer
require('dotenv').config(); // Load environment variables from .env file

// Initialize the Express application (ensure app is initialized only once)
const app = express();

console.log('--- Modules imported ---');
console.log('MONGODB_URI from env:', process.env.MONGODB_URI); // Debug: Check MongoDB URI
console.log('EMAIL_USER from env:', process.env.EMAIL_USER); // Debug: Check Email User

// Vercel provides the PORT environment variable
const PORT = process.env.PORT || 3001; // Use Vercel's port or 3001 locally

console.log('--- Express app initialized ---');

// --- Middleware ---

// Updated CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://college-website-react-phi.vercel.app',
  'https://udaypratapcollege.com',
  'http://udaypratapcollege.com',
  'https://www.udaypratapcollege.com',
  'http://www.udaypratapcollege.com'
];

app.use(cors({
  origin: function (origin, callback) {
    console.log('CORS: Received origin:', origin);
    if (!origin) {
      console.log('CORS: No origin, allowing.');
      return callback(null, true);
    }
    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    console.log('CORS: Normalized origin:', normalizedOrigin);
    console.log('CORS: Allowed origins list:', allowedOrigins);
    if (allowedOrigins.indexOf(normalizedOrigin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the Origin: ${origin}`;
      console.error('CORS: Disallowing origin:', origin, 'Normalized:', normalizedOrigin);
      return callback(new Error(msg), false);
    }
    console.log('CORS: Allowing origin:', origin);
    return callback(null, true);
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log('--- Middleware configured ---');

// --- Nodemailer Transporter Setup ---
let transporter;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.YOUR_RECEIVING_EMAIL) {
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  transporter.verify((error, success) => {
    if (error) {
      console.error('Nodemailer transporter verification error:', error);
    } else {
      console.log('Nodemailer transporter is ready to send emails.');
    }
  });
} else {
  console.warn('--- Email credentials or receiving email not fully configured in .env. Email notifications will be disabled. ---');
}


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

// **NEW: Add a root route for basic testing**
app.get('/', (req, res) => {
  console.log('--- Received GET to / (root) ---');
  res.status(200).json({ message: 'Welcome to the Backend API! Server is running.' });
});

app.get('/api', (req, res) => {
  console.log('--- Received GET to /api ---');
  res.json({ message: 'Hello from the backend contact form API!' });
});

app.post('/api/send-enquiry', async (req, res) => {
  console.log('--- Received POST to /api/send-enquiry ---');
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    console.log('Validation failed: Missing fields from request body');
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  try {
    const newEnquiry = new Enquiry({ name, email, subject, message });
    const savedEnquiry = await newEnquiry.save();
    console.log('--- Enquiry saved to MongoDB: ---', savedEnquiry._id);

    let emailSent = false;
    if (transporter) {
      const mailOptions = {
        from: `"${name} (Website Enquiry)" <${process.env.EMAIL_USER}>`,
        to: process.env.YOUR_RECEIVING_EMAIL,
        replyTo: email,
        subject: `New Website Enquiry: ${subject} (ID: ${savedEnquiry._id})`,
        html: `
          <h2>New Enquiry Received from Website</h2>
          <p><strong>Enquiry ID:</strong> ${savedEnquiry._id}</p>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
          <hr>
          <p><em>Submitted at: ${new Date(savedEnquiry.submittedAt).toLocaleString()}</em></p>
        `,
      };
      try {
        await transporter.sendMail(mailOptions);
        console.log('Email notification sent successfully.');
        emailSent = true;
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
      }
    }
    res.status(201).json({
        success: true,
        message: `Enquiry received and stored successfully! ${emailSent ? 'Email notification sent.' : 'Email notification failed or not configured.'}`,
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


// --- Start the server (for local development only) ---
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend server is running locally on http://localhost:${PORT}`);
    if (mongoose.connection.readyState !== 1) {
        console.warn('--- Warning: Server started, but MongoDB may not be connected yet. Check connection status. ---')
    }
  });
}

console.log('--- Script finished initial execution ---');

// Export the Express app for Vercel's serverless environment
module.exports = app;
