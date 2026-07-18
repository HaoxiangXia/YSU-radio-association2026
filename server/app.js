const express = require('express');
const app = express();
require('dotenv').config();
require('./config/database');
const competitionsRouter = require('./routes/competitions');
const trainingsRouter = require('./routes/trainings');
const departmentsRouter = require('./routes/departments');
const registrationRouter = require('./routes/registration');
const honorsRouter = require('./routes/honors'); // 引入荣誉路由
const adminRouter = require('./routes/admin'); // 引入管理员路由
const path = require('path');

// 解析请求体
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 配置静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// 配置根路径的路由，重定向到纯 HTML 版本
app.get('/', (req, res) => {
  res.redirect('/html/index.html');
});


// 使用路由
app.use('/api/competitions', competitionsRouter);
app.use('/api/trainings', trainingsRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/registration', registrationRouter);
app.use('/api/honors', honorsRouter); // 挂载荣誉路由
app.use('/api/admin', adminRouter); // 挂载管理员路由

const port = process.env.PORT || 5000; // 使用环境变量中的端口号，如果未设置则使用默认值
app.listen(port, () => {
  console.log(`服务器运行在端口 ${port}`);
});
