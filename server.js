// server.js
// Backend for Inquiries, Applications, and Admin Authentication

console.log('--- Script starting ---');

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

console.log('--- Modules imported ---');
console.log('MONGODB_URI from env:', process.env.MONGODB_URI ? 'Loaded' : 'NOT LOADED');

// --- Middleware ---
const allowedOrigins = [
  'http://localhost:3000',
  'https://udaypratapcollege.com',
  'https://www.udaypratapcollege.com',
  'https://udaypratapcollege-website.onrender.com',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS policy.`));
    }
  },
  methods: "GET,POST,OPTIONS",
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log('--- Middleware configured ---');

// --- MongoDB Connection ---
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('--- Successfully connected to MongoDB ---'))
    .catch((err) => console.error('--- MongoDB connection error: ---', err));
} else {
  console.error('FATAL ERROR: MONGODB_URI is not defined in environment variables.');
}

// --- Mongoose Schemas and Models ---
const enquirySchema = new mongoose.Schema({ name: { type: String, required: true }, email: { type: String, required: true }, subject: { type: String, required: true }, message: { type: String, required: true }, submittedAt: { type: Date, default: Date.now } });
const Enquiry = mongoose.models.Enquiry || mongoose.model('Enquiry', enquirySchema);

const applicationSchema = new mongoose.Schema({ fullName: { type: String, required: true }, dob: { type: String, required: true }, gender: { type: String, required: true }, parentName: { type: String, required: true }, email: { type: String, required: true, lowercase: true }, phone: { type: String, required: true }, fullAddress: { type: String, required: true }, tenthBoard: { type: String, required: true }, tenthPercentage: { type: String, required: true }, twelfthBoard: { type: String, required: true }, twelfthPercentage: { type: String, required: true }, programApplyingFor: { type: String, required: true }, submittedAt: { type: Date, default: Date.now } });
const Application = mongoose.models.Application || mongoose.model('Application', applicationSchema);

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'instructor', 'admin'], default: 'admin' },
});
userSchema.pre('save', async function(next) { if (this.isModified('password')) { this.password = await bcrypt.hash(this.password, 10) } next(); });
userSchema.methods.comparePassword = function(candidatePassword) { return bcrypt.compare(candidatePassword, this.password); };
const User = mongoose.models.User || mongoose.model('User', userSchema);
console.log('--- Mongoose models configured ---');


// --- API Routes ---
app.get('/', (req, res) => res.status(200).json({ message: 'Uday Pratap College API is running.' }));

// --- LOGIN ROUTE ---
app.post('/api/auth/login', async (req, res) => {
  console.log('--- Received POST to /api/auth/login ---');
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    console.time('Database User Query');
    const user = await User.findOne({ email: email.toLowerCase(), role: 'admin' });
    console.timeEnd('Database User Query');
    
    if (!user) {
      console.log(`Login failed: No admin user found for email ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    console.log(`User found in DB. Now comparing password...`);
    
    console.time('Password Comparison');
    const isMatch = await user.comparePassword(password);
    console.timeEnd('Password Comparison');

    if (!isMatch) {
      console.log(`Login failed: Password does not match for email ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    console.log(`Login successful for user: ${email}`);
    
    const userPayload = { id: user._id, name: user.name, email: user.email, role: user.role };
    res.status(200).json({ success: true, user: userPayload });

  } catch (error) {
    console.error('Server error during login:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// --- NEW: FETCH ALL INQUIRIES ---
app.get('/api/inquiries', async (req, res) => {
    console.log('--- Received GET request for /api/inquiries ---');
    try {
        const inquiries = await Enquiry.find({}).sort({ submittedAt: -1 }); // Sort by most recent
        res.status(200).json({ success: true, data: inquiries });
    } catch (error) {
        console.error('Server error fetching inquiries:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch inquiries.' });
    }
});

// --- NEW: FETCH ALL APPLICATIONS ---
app.get('/api/applications', async (req, res) => {
    console.log('--- Received GET request for /api/applications ---');
    try {
        const applications = await Application.find({}).sort({ submittedAt: -1 }); // Sort by most recent
        res.status(200).json({ success: true, data: applications });
    } catch (error) {
        console.error('Server error fetching applications:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch applications.' });
    }
});


// --- VVV TEMPORARY ADMIN REGISTRATION ROUTE VVV ---
// IMPORTANT: Use this route only once to create your admin, then comment it out or delete it for security.


// --- Start the server ---
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
