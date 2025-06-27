// server.js

console.log('--- Script starting ---');

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

console.log('--- Modules imported ---');
console.log('MONGODB_URI from env:', process.env.MONGODB_URI);

const PORT = process.env.PORT || 3001;

console.log('--- Express app initialized ---');

const allowedOrigins = [
  'http://localhost:3000'
];

const corsOptions = {
  origin: function (origin, callback) {
    console.log(`CORS Check: ${origin}`);
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed`));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.set('bufferCommands', false);

if (!process.env.MONGODB_URI) {
  console.error('No MONGODB_URI defined');
} else {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('MongoDB error:', err));
}

mongoose.connection.on('connected', () => console.log('Mongoose connected'));
mongoose.connection.on('error', err => console.error('Mongoose error:', err));
mongoose.connection.on('disconnected', () => console.log('Mongoose disconnected'));

// === Enquiry schema ===
const enquirySchema = new mongoose.Schema({
  name: String,
  email: String,
  subject: String,
  message: String,
  submittedAt: { type: Date, default: Date.now }
});
const Enquiry = mongoose.model('Enquiry', enquirySchema);

// === Application schema ===
const applicationSchema = new mongoose.Schema({
  fullName: String,
  dob: Date,
  gender: String,
  parentName: String,
  email: String,
  phone: String,
  fullAddress: String,
  programApplyingFor: String,
  tenthBoard: String,
  tenthPercentage: String,
  twelfthBoard: String,
  twelfthPercentage: String,
  submittedAt: { type: Date, default: Date.now }
});
const Application = mongoose.model('Application', applicationSchema);

// === SiteAnalytics schema ===
const siteAnalyticsSchema = new mongoose.Schema({
  key: { type: String, default: 'site_visits', unique: true },
  count: { type: Number, default: 0 }
});
const SiteAnalytics = mongoose.model('SiteAnalytics', siteAnalyticsSchema);

// === Routes ===

// ✅ Increment visit count on landing page
app.get('/', async (req, res) => {
  try {
    const updated = await SiteAnalytics.findOneAndUpdate(
      { key: 'site_visits' },
      { $inc: { count: 1 } },
      { new: true, upsert: true }
    );
    res.json({ message: 'Welcome! Site visits counted.', visits: updated.count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating visits.' });
  }
});

// ✅ Get current visit count only
app.get('/api/visits', async (req, res) => {
  try {
    let analytics = await SiteAnalytics.findOne({ key: 'site_visits' });
    if (!analytics) {
      analytics = await new SiteAnalytics().save();
    }
    res.json({ visits: analytics.count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching visits.' });
  }
});

// ✅ Enquiry endpoint
app.post('/api/send-enquiry', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }
  try {
    const newEnquiry = new Enquiry({ name, email, subject, message });
    await newEnquiry.save();
    res.json({ success: true, message: 'Enquiry saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error saving enquiry' });
  }
});

// ✅ Application endpoint
app.post('/api/submit-application', async (req, res) => {
  console.log('📨 POST /api/submit-application:', req.body);

  const {
    fullName, dob, gender, parentName, email,
    phone, fullAddress, programApplyingFor,
    tenthBoard, tenthPercentage, twelfthBoard, twelfthPercentage
  } = req.body;

  if (!fullName || !dob || !gender || !parentName || !email || !phone || !fullAddress || !programApplyingFor) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  try {
    const newApp = new Application({
      fullName, dob, gender, parentName, email,
      phone, fullAddress, programApplyingFor,
      tenthBoard, tenthPercentage, twelfthBoard, twelfthPercentage
    });

    await newApp.save();
    res.json({ success: true, message: 'Application submitted!' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error saving application.' });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
