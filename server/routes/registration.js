const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');
const adminRouter = require('./admin');

// 获取认证中间件
const authenticateAdmin = adminRouter.authenticateToken;

// 处理表单提交的 API 端点（公开接口，无需认证）
router.post('/', async (req, res) => {
  try {
    const newRegistration = new Registration(req.body);
    await newRegistration.save();
    res.status(200).json({ message: '报名成功！' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: '报名失败，请稍后再试。' });
  }
});

// 获取所有报名信息（管理员专用，需要认证）
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      college,
      grade,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // 构建查询条件
    let query = {};

    if (college) {
      query.college = college;
    }

    if (grade) {
      query.grade = grade;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { college: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // 构建排序条件
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // 执行查询
    const total = await Registration.countDocuments(query);
    const registrations = await Registration.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.status(200).json({
      registrations,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: total
      }
    });
  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({ message: '获取报名信息失败' });
  }
});

// 获取统计信息（管理员专用，需要认证）
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const total = await Registration.countDocuments();

    // 今日新增
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await Registration.countDocuments({
      createdAt: { $gte: today }
    });

    // 按学院统计
    const collegeStats = await Registration.aggregate([
      { $group: { _id: '$college', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // 按年级统计
    const gradeStats = await Registration.aggregate([
      { $group: { _id: '$grade', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

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

// 根据ID获取单个报名信息（管理员专用，需要认证）
router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id);
    if (!registration) {
      return res.status(404).json({ message: '未找到报名信息' });
    }
    res.status(200).json(registration);
  } catch (error) {
    console.error('Get registration by ID error:', error);
    res.status(500).json({ message: '获取报名信息失败' });
  }
});

// 删除报名信息（管理员专用，需要认证）
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const registration = await Registration.findByIdAndDelete(req.params.id);
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