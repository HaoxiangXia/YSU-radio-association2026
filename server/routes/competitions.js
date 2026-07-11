const express = require('express');
const router = express.Router();
const Competition = require('../models/Competition');

// 获取所有竞赛
router.get('/', async (req, res) => {
  try {
    const competitions = await Competition.find().sort({ year: -1 });
    res.json(competitions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
