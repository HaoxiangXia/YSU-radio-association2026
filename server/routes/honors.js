const express = require('express');
const router = express.Router();
const Honor = require('../models/Honor');

// 获取所有荣誉
router.get('/', async (req, res) => {
  try {
    const honors = await Honor.find().sort({ year: -1 });
    res.json(honors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;