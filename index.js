const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
const urlRoutes = require('./routes/url');
const authRoutes = require('./routes/auth');

app.use('/api', urlRoutes);
app.use('/api/auth', authRoutes);

// Redirect Route
const Url = require('./models/Url');
app.get('/:code', async (req, res) => {
  try {
    const url = await Url.findOne({ shortCode: req.params.code });
    if (!url) return res.status(404).json({ message: 'URL not found' });

    // Check if URL has expired
    if (url.expiresAt && new Date() > url.expiresAt) {
      return res.status(410).json({ message: 'This URL has expired' });
    }

    // Track click
    url.clicks++;
    url.clickHistory.push({ clickedAt: new Date() });
    await url.save();

    res.redirect(url.originalUrl);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected!');
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch(err => console.log(err));