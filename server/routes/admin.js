const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// 管理员账户配置（实际项目中应该存储在数据库中）
const ADMIN_ACCOUNTS = [
  {
    id: 1,
    username: 'wuxie',
    password: '$2b$10$4seGXthirvKcwqbpx9Y9g.KbrtPjdlURWQ9X6Ul3qcljwDXflGseO', // 密码: 513513#
    name: '无协管理员'
  }
];

// JWT密钥（实际项目中应该使用环境变量）
const JWT_SECRET = process.env.JWT_SECRET || 'radio-association-admin-secret-key-2024';

// 管理员登录
router.post('/login', async (req, res) => {
  try {
    const { username, password, remember } = req.body;

    // 验证输入
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }

    // 查找管理员账户
    const admin = ADMIN_ACCOUNTS.find(acc => acc.username === username);
    if (!admin) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 生成JWT token
    const tokenExpiry = remember ? '7d' : '24h'; // 记住我：7天，否则24小时
    const token = jwt.sign(
      {
        adminId: admin.id,
        username: admin.username,
        name: admin.name
      },
      JWT_SECRET,
      { expiresIn: tokenExpiry }
    );

    res.json({
      message: '登录成功',
      token: token,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name
      }
    });

    console.log(`管理员 ${admin.username} 登录成功`);

  } catch (error) {
    console.error('管理员登录错误:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
});

// 验证token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    message: 'Token有效',
    admin: req.admin
  });
});

// 管理员注销
router.post('/logout', authenticateToken, (req, res) => {
  // 在实际项目中，可以将token加入黑名单
  res.json({ message: '注销成功' });
  console.log(`管理员 ${req.admin.username} 注销`);
});

// 获取管理员信息
router.get('/profile', authenticateToken, (req, res) => {
  res.json({
    admin: req.admin
  });
});

// JWT认证中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: '缺少访问令牌' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: '访问令牌已过期' });
      }
      return res.status(403).json({ message: '无效的访问令牌' });
    }

    req.admin = {
      id: decoded.adminId,
      username: decoded.username,
      name: decoded.name
    };
    next();
  });
}

// 导出认证中间件供其他路由使用
router.authenticateToken = authenticateToken;

module.exports = router;