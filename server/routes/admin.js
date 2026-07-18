const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getAdminSettings } = require('../config/settings');
const { checkRateLimit, clearRateLimit, recordRateLimit } = require('../utils/rateLimit');

const router = express.Router();
const loginLimit = 5;
const loginWindowMs = 10 * 60 * 1000;

function hasValidAdminSettings() {
  const { username, passwordHash, jwtSecret } = getAdminSettings();
  return Boolean(username && passwordHash && jwtSecret);
}

router.post('/login', async (req, res) => {
  const rateLimitKey = `admin-login:${req.ip}`;
  const limitOptions = { key: rateLimitKey, limit: loginLimit, windowMs: loginWindowMs };
  const attempt = checkRateLimit(limitOptions);
  if (!attempt.allowed) {
    res.set('Retry-After', String(attempt.retryAfter));
    return res.status(429).json({ message: '尝试次数过多，请稍后再试。' });
  }

  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const remember = req.body.remember === true;
  const settings = getAdminSettings();

  if (!hasValidAdminSettings()) {
    console.error('管理员配置不完整：请检查 ADMIN_USERNAME、ADMIN_PASSWORD_HASH 和 JWT_SECRET。');
    return res.status(503).json({ message: '管理员功能尚未配置完成。' });
  }
  if (!username || !password || username.length > 64 || password.length > 256) {
    recordRateLimit(limitOptions);
    return res.status(401).json({ message: '用户名或密码错误。' });
  }

  let passwordMatches = false;
  try {
    passwordMatches = username === settings.username && await bcrypt.compare(password, settings.passwordHash);
  } catch (error) {
    console.error('管理员密码哈希格式无效。');
    return res.status(503).json({ message: '管理员功能尚未配置完成。' });
  }
  if (!passwordMatches) {
    recordRateLimit(limitOptions);
    return res.status(401).json({ message: '用户名或密码错误。' });
  }

  clearRateLimit(rateLimitKey);

  const token = jwt.sign(
    { username: settings.username, name: '协会管理员' },
    settings.jwtSecret,
    { expiresIn: remember ? '7d' : '8h' }
  );

  return res.json({
    message: '登录成功。',
    token,
    admin: { username: settings.username, name: '协会管理员' },
  });
});

function authenticateToken(req, res, next) {
  const { jwtSecret } = getAdminSettings();
  if (!jwtSecret) {
    return res.status(503).json({ message: '管理员功能尚未配置完成。' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return res.status(401).json({ message: '请先登录。' });

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.admin = { username: decoded.username, name: decoded.name };
    return next();
  } catch (error) {
    return res.status(401).json({ message: '登录已失效，请重新登录。' });
  }
}

router.get('/verify', authenticateToken, (req, res) => res.json({ admin: req.admin }));
router.get('/profile', authenticateToken, (req, res) => res.json({ admin: req.admin }));
router.post('/logout', authenticateToken, (req, res) => res.json({ message: '已退出登录。' }));

router.authenticateToken = authenticateToken;
module.exports = router;
