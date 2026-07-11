const express = require('express');
const router = express.Router();
const Training = require('../models/Training');

// 获取所有培训
router.get('/', async (req, res) => {
  try {
    const trainings = await Training.find().sort({ year: -1 });
    res.json(trainings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;