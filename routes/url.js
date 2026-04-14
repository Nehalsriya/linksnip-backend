const express = require('express');
const router = express.Router();
const shortid = require('shortid');
const rateLimit = require('express-rate-limit');
const QRCode = require('qrcode');
const Url = require('../models/Url');
const auth = require('../middleware/auth');

// Rate limiter
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: 'Too many requests, please try again after a minute' }
});

// Apply rate limiter to all routes
router.use(limiter);

// Create short URL
router.post('/shorten', auth, async (req, res) => {
  const { originalUrl, customAlias, expiryDays } = req.body;

  if (!originalUrl) {
    return res.status(400).json({ message: 'URL is required' });
  }

  if (!originalUrl.startsWith('http')) {
    return res.status(400).json({ message: 'Invalid URL — must start with http or https' });
  }

  try {
    const shortCode = customAlias || shortid.generate();

    if (customAlias) {
      const existing = await Url.findOne({ shortCode: customAlias });
      if (existing) {
        return res.status(400).json({ message: 'Custom alias already taken' });
      }
    }

    const expiresAt = expiryDays
      ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
      : null;

    const url = new Url({
      originalUrl,
      shortCode,
      customAlias: customAlias || null,
      expiresAt,
      user: req.user.id
    });

    await url.save();

    const shortUrl = `${process.env.BASE_URL}/${shortCode}`;
    const qrCode = await QRCode.toDataURL(shortUrl);

    res.json({ shortUrl, qrCode, clicks: 0, expiresAt });
  } catch (err) {
    console.log('Shorten error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// Get all URLs for logged in user
router.get('/urls', auth, async (req, res) => {
  try {
    const urls = await Url.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(urls);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a URL
router.delete('/urls/:id', auth, async (req, res) => {
  try {
    const url = await Url.findOne({ _id: req.params.id, user: req.user.id });
    if (!url) return res.status(404).json({ message: 'URL not found' });
    await url.deleteOne();
    res.json({ message: 'URL deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get QR code for a URL
router.get('/qr/:code', auth, async (req, res) => {
  try {
    const url = await Url.findOne({ shortCode: req.params.code, user: req.user.id });
    if (!url) return res.status(404).json({ message: 'URL not found' });
    const qrCode = await QRCode.toDataURL(`${process.env.BASE_URL}/${url.shortCode}`);
    res.json({ qrCode });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;