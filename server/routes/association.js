const express = require('express');
const router = express.Router();
const Association = require('../models/Association');

// 获取协会基本信息
router.get('/', async (req, res) => {
  try {
    const association = await Association.findOne();
    res.json(association);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;