const express = require('express');
const Registration = require('../models/Registration');
const adminRouter = require('./admin');
const { getRegistrationSettings } = require('../config/settings');
const { rateLimit } = require('../utils/rateLimit');

const router = express.Router();
const authenticateAdmin = adminRouter.authenticateToken;

function serializeStatus(settings = getRegistrationSettings()) {
  return {
    available: settings.available,
    code: settings.code,
    notice: settings.notice,
    start: settings.start ? settings.start.toISOString() : null,
    end: settings.end ? settings.end.toISOString() : null,
  };
}

function validateRegistration(payload) {
  const data = {
    name: typeof payload.name === 'string' ? payload.name.trim() : '',
    studentId: typeof payload.studentId === 'string' ? payload.studentId.trim() : '',
    college: typeof payload.college === 'string' ? payload.college.trim() : '',
    grade: typeof payload.grade === 'string' ? payload.grade.trim() : '',
    phone: typeof payload.phone === 'string' ? payload.phone.trim() : '',
    email: typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '',
    experience: typeof payload.experience === 'string' ? payload.experience.trim() : '',
    expectation: typeof payload.expectation === 'string' ? payload.expectation.trim() : '',
  };
  const fields = {};

  if (data.name.length < 2 || data.name.length > 30) fields.name = '姓名应为 2 到 30 个字符。';
  if (!/^\d{12}$/.test(data.studentId)) fields.studentId = '请输入 12 位数字学号。';
  if (data.college.length < 2 || data.college.length > 80) fields.college = '请填写有效的学院名称。';
  if (data.grade.length < 2 || data.grade.length > 30) fields.grade = '请选择有效的年级。';
  if (!/^1[3-9]\d{9}$/.test(data.phone)) fields.phone = '请输入有效的 11 位手机号码。';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || data.email.length > 120) fields.email = '请输入有效的电子邮箱。';
  if (data.experience.length < 10 || data.experience.length > 1000) fields.experience = '自我介绍应为 10 到 1000 个字符。';
  if (data.expectation.length > 500) fields.expectation = '加入期望不能超过 500 个字符。';

  return { data, fields };
}

function escapeCsvCell(value) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ');
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

function parseRegistrationId(value) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

router.get('/status', (req, res) => res.json(serializeStatus()));

router.post('/', (req, res) => {
  const status = getRegistrationSettings();
  if (!status.available) {
    return res.status(403).json({ message: status.notice, status: serializeStatus(status) });
  }

  const { data, fields } = validateRegistration(req.body || {});
  if (Object.keys(fields).length > 0) {
    return res.status(400).json({ message: '请检查填写的信息。', fields });
  }

  const attempt = rateLimit({ key: `registration:${req.ip}:${data.studentId}`, limit: 3, windowMs: 10 * 60 * 1000 });
  if (!attempt.allowed) {
    res.set('Retry-After', String(attempt.retryAfter));
    return res.status(429).json({ message: '提交过于频繁，请稍后再试。' });
  }

  try {
    Registration.create(data);
    return res.status(201).json({ message: '报名成功！' });
  } catch (error) {
    if (String(error.message).includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: '该学号已经提交过报名，请勿重复提交。', fields: { studentId: '该学号已经报名。' } });
    }
    console.error('Registration error:', error);
    return res.status(500).json({ message: '报名失败，请稍后再试。' });
  }
});

router.get('/', authenticateAdmin, (req, res) => {
  try {
    const result = Registration.findAll(req.query);
    return res.json({
      registrations: result.registrations,
      pagination: {
        current: result.page,
        total: Math.ceil(result.total / result.limit),
        count: result.total,
        limit: result.limit,
      },
    });
  } catch (error) {
    console.error('Get registrations error:', error);
    return res.status(500).json({ message: '获取报名信息失败。' });
  }
});

router.get('/options', authenticateAdmin, (req, res) => {
  try {
    return res.json(Registration.findOptions());
  } catch (error) {
    console.error('Get registration options error:', error);
    return res.status(500).json({ message: '获取筛选项失败。' });
  }
});

router.get('/stats', authenticateAdmin, (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return res.json({
      total: Registration.count(),
      todayCount: Registration.count({ createdAt: { $gte: today.toISOString() } }),
      collegeCount: Registration.groupByCollege().length,
      gradeCount: Registration.groupByGrade().length,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return res.status(500).json({ message: '获取统计信息失败。' });
  }
});

router.get('/export', authenticateAdmin, (req, res) => {
  try {
    const registrations = [];
    let page = 1;
    let result;
    do {
      result = Registration.findAll({ ...req.query, page, limit: 50 });
      registrations.push(...result.registrations);
      page += 1;
    } while (registrations.length < result.total);
    const headers = ['姓名', '学号', '学院', '年级', '联系电话', '电子邮箱', '自我介绍', '加入期望', '提交时间'];
    const rows = registrations.map((item) => [
      item.name, item.studentId, item.college, item.grade, item.phone, item.email,
      item.experience, item.expectation, item.createdAt,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="registrations.csv"',
    });
    return res.send(`\ufeff${csv}`);
  } catch (error) {
    console.error('Export registrations error:', error);
    return res.status(500).json({ message: '导出失败。' });
  }
});

router.get('/:id', authenticateAdmin, (req, res) => {
  const id = parseRegistrationId(req.params.id);
  if (id === null) return res.status(400).json({ message: '无效的报名编号。' });
  const registration = Registration.findById(id);
  if (!registration) return res.status(404).json({ message: '未找到报名信息。' });
  return res.json(registration);
});

router.delete('/:id', authenticateAdmin, (req, res) => {
  const id = parseRegistrationId(req.params.id);
  if (id === null) return res.status(400).json({ message: '无效的报名编号。' });
  const registration = Registration.deleteById(id);
  if (!registration) return res.status(404).json({ message: '未找到报名信息。' });
  return res.json({ message: '删除成功。' });
});

module.exports = router;
