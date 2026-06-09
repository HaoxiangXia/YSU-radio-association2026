const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');
const adminRouter = require('./admin');

const authenticateAdmin = adminRouter.authenticateToken;

router.post('/', async (req, res) => {
  try {
    Registration.create(req.body);
    res.status(200).json({ message: '报名成功！' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: '报名失败，请稍后再试。' });
  }
});

router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const {
      page = 1, limit = 50, college, grade, search,
      sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    const result = Registration.findAll({ page, limit, college, grade, search, sortBy, sortOrder });

    res.status(200).json({
      registrations: result.registrations,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(result.total / parseInt(limit)),
        count: result.total
      }
    });
  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({ message: '获取报名信息失败' });
  }
});

router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const total = Registration.count();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = Registration.count({
      createdAt: { $gte: today.toISOString() }
    });

    const collegeStats = Registration.groupByCollege();
    const gradeStats = Registration.groupByGrade();

    res.status(200).json({
      total,
      todayCount,
      collegeCount: collegeStats.length,
      gradeCount: gradeStats.length,
      collegeStats,
      gradeStats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: '获取统计信息失败' });
  }
});

router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const registration = Registration.findById(req.params.id);
    if (!registration) {
      return res.status(404).json({ message: '未找到报名信息' });
    }
    res.status(200).json(registration);
  } catch (error) {
    console.error('Get registration by ID error:', error);
    res.status(500).json({ message: '获取报名信息失败' });
  }
});

router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const registration = Registration.deleteById(req.params.id);
    if (!registration) {
      return res.status(404).json({ message: '未找到报名信息' });
    }
    res.status(200).json({ message: '删除成功' });
  } catch (error) {
    console.error('Delete registration error:', error);
    res.status(500).json({ message: '删除失败' });
  }
});

module.exports = router;
