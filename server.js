// server.js

console.log('--- Script starting ---');

// Import necessary modules
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer'); // <<<< ADDED: Import Nodemailer
require('dotenv').config(); // Load environment variables from .env file

// Initialize the Express application
const app = express();

console.log('--- Modules imported ---');
console.log('MONGODB_URI from env:', process.env.MONGODB_URI);
// For email configuration (ensure these are in your .env file and Render/Vercel environment variables)
console.log('EMAIL_USER from env:', process.env.EMAIL_USER ? 'Loaded' : 'NOT LOADED');
console.log('EMAIL_PASS from env:', process.env.EMAIL_PASS ? 'Loaded (status)' : 'NOT LOADED'); // Don't log the actual password
console.log('COLLEGE_EMAIL_RECEIVER from env:', process.env.COLLEGE_EMAIL_RECEIVER ? 'Loaded' : 'NOT LOADED');


// Render/Vercel provides the PORT environment variable.
const PORT = process.env.PORT || 3001;

console.log('--- Express app initialized ---');

// --- Middleware ---

// Define the list of allowed origins
const allowedOrigins = [
  'http://localhost:3000',  // For your local frontend development
  'https://college-website-react-phi.vercel.app', // Your Vercel deployment for frontend
  'https://college-website-react-bwa0.onrender.com', // Your Render frontend URL
  'https://udaypratapcollege.com', // Your custom domain
  'http://udaypratapcollege.com', // Custom domain (non-HTTPS, if used - ensure HTTPS is primary)
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
  allowedHeaders: "Content-Type, Authorization, X-Requested-With, Accept",
  credentials: true,
  optionsSuccessStatus: 204 // Standard for successful preflight
};

// Apply CORS middleware globally.
app.use(cors(corsOptions));

// Parse JSON request bodies
app.use(express.json());
// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

console.log('--- Middleware configured ---');

// --- Nodemailer Transporter Setup ---
let transporter;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
        service: 'gmail', // Or your email provider e.g., 'Outlook365', or use SMTP settings
        auth: {
            user: process.env.EMAIL_USER, // Your email address from .env
            pass: process.env.EMAIL_PASS, // Your email password or app password from .env
        },
        // Optional: Add TLS options for some environments if needed
        // tls: {
        //   rejectUnauthorized: false // Use with caution, only if necessary for specific environments
        // }
    });
    console.log('--- Nodemailer transporter configured ---');

    transporter.verify(function(error, success) { // Verify transporter configuration
        if (error) {
            console.error('--- Nodemailer transporter verification error: ---', error);
        } else {
            console.log('--- Nodemailer transporter is ready to send emails ---');
        }
    });

} else {
    console.warn('--- Nodemailer transporter NOT configured: EMAIL_USER or EMAIL_PASS missing. Emails will not be sent. ---');
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

    // Send email notification
    if (transporter && process.env.COLLEGE_EMAIL_RECEIVER) {
      const mailOptions = {
        from: `"Website Inquiry" <${process.env.EMAIL_USER}>`,
        to: process.env.COLLEGE_EMAIL_RECEIVER,
        replyTo: email, // So replies go to the person who made the enquiry
        subject: `New Website Inquiry: ${subject}`,
        html: `
          <p>You have received a new inquiry from the college website:</p>
          <hr>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <div style="padding: 10px; border: 1px solid #eee; background: #f9f9f9;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <hr>
          <p><em>Enquiry ID: ${savedEnquiry._id}</em></p>
          <p><em>Submitted At: ${new Date(savedEnquiry.submittedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</em></p>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log('--- Email notification sent successfully to ---', process.env.COLLEGE_EMAIL_RECEIVER);
      } catch (emailError) {
        console.error('--- Error sending email notification: ---', emailError);
        // Log error but don't make the API request fail because of email failure
      }
    } else {
      console.warn('--- Email notification not sent: Transporter or COLLEGE_EMAIL_RECEIVER not configured. ---');
    }

    res.status(201).json({
      success: true,
      message: 'Enquiry received and stored successfully! Notification email attempted.',
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
    console.log(`Backend server is running on port ${PORT}`);
    if (mongoose.connection.readyState !== 1) {
      console.warn('--- Warning: Server started, but MongoDB may not be connected yet. Check connection status. ---')
    } else {
      console.log('--- Server started and MongoDB is connected. ---');
    }
  });
}

console.log('--- Script finished initial execution ---');

// Export the Express app
module.exports = app;
