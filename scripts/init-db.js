// 初始化静态查询表（协会、部门、竞赛、荣誉、培训）的种子数据。
// 注意：本脚本会先清空这些表再重新插入，属于破坏性操作，生产环境不要反复运行。
// 用法：bun scripts/init-db.js
// 数据库路径：环境变量 DATABASE_PATH（相对路径基于仓库根目录），默认 backend/data/database.sqlite。
const path = require('path');
const { Database } = require('bun:sqlite');

const rootDir = path.resolve(__dirname, '..');
const configuredPath = process.env.DATABASE_PATH;
const dbPath = configuredPath
  ? (path.isAbsolute(configuredPath) ? configuredPath : path.resolve(rootDir, configuredPath))
  : path.join(rootDir, 'backend', 'data', 'database.sqlite');

const fs = require('fs');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS association (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    englishName TEXT,
    abbreviation TEXT,
    establishmentYear INTEGER,
    motto TEXT,
    slogan TEXT,
    description TEXT,
    memberCount INTEGER,
    starRating INTEGER,
    awards TEXT
  );
  CREATE TABLE IF NOT EXISTS competitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    year INTEGER,
    participants INTEGER,
    description TEXT,
    tracks TEXT
  );
  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT
  );
  CREATE TABLE IF NOT EXISTS honors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    rank INTEGER,
    year INTEGER,
    description TEXT
  );
  CREATE TABLE IF NOT EXISTS trainings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year TEXT,
    type TEXT,
    count INTEGER,
    participants INTEGER,
    description TEXT
  );
`);

try {
  db.exec('DELETE FROM association');
  db.exec('DELETE FROM departments');
  db.exec('DELETE FROM competitions');
  db.exec('DELETE FROM honors');
  db.exec('DELETE FROM trainings');

  db.prepare(`
    INSERT INTO association (name, englishName, abbreviation, establishmentYear, motto, slogan, description, memberCount, starRating, awards)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    '无线电爱好者协会',
    'Radio Enthusiasts Association',
    '无协',
    1988,
    '挖掘潜质，就在无协',
    '无协天下天下无协',
    '燕山大学无线电爱好者协会是技术实践类社团，非常注重教学与实践，已经陪燕大走过36个春秋。',
    33,
    5,
    JSON.stringify(['2022年河北省高校活力团支部TOP10', '燕山大学五星级社团'])
  );

  const deptStmt = db.prepare('INSERT INTO departments (name, description) VALUES (?, ?)');
  const departments = [
    ['组织部', '主要负责协会内部大大小小的活动，包括前期策划，布置和准备工作等，也可以学到公众号运营和媒体剪辑与制作等相关知识。'],
    ['嵌入式部', '以嵌入式技术为主，软硬件兼修。嵌入式系统就是各种电气设备的控制器。涉及软件运行环境及其操作系统，信号处理器、存储器、通信模块等。'],
    ['机械部', '主要负责机械建模solidworks教学，机械制图等相关教学同时也负责部分嵌入式方面内容教学。'],
    ['计算机部', '主要学习与计算机有关的技术:软件、算法、Web、Linux操作系统、人工智能皆有涉及，也可以学习物理引擎对物理器械进行仿真和使用github page部署个人网站。'],
    ['团支部', '共有团员33人，来自不同专业，学习成绩均排名专业前百分之三十。成功组织了多次主题团日活动、主题学习会。']
  ];
  for (const d of departments) deptStmt.run(...d);

  const compStmt = db.prepare('INSERT INTO competitions (name, year, participants, description, tracks) VALUES (?, ?, ?, ?, ?)');
  const competitions = [
    ['展望杯嵌入式大赛', 2024, 102, '为促进信息科学与工程学院的创新氛围，激发燕山大学大一新生的学习与创新热情，提供展示自我的平台。', JSON.stringify(['嵌入式方向', '软件方向'])],
    ['DIY达人赛', 2024, 62, '参赛选手们在嵌入式和算法领域展现了卓越的DIY能力，展示了各类创新作品，包括蓝牙小车、简易示波器、可视化游戏等。', JSON.stringify(['软件开发创意可视化小游戏', '视觉识别', '嵌入式方向'])],
    ['指尖风暴大赛', 2023, 312, '增强对C语言、单片机的掌握，激发对深度学习的兴趣，提高同学们的编程与单片机技术水平。', JSON.stringify(['软件赛道', '硬件普通赛道', '自主提交作品'])]
  ];
  for (const c of competitions) compStmt.run(...c);

  const honorStmt = db.prepare('INSERT INTO honors (title, rank, year, description) VALUES (?, ?, ?, ?)');
  const honors = [
    ['2022年河北省高校活力团支部TOP10', 6, 2022, '入选改革味榜单'],
    ['燕山大学五星级社团', null, 2024, '在2024年度社团评议中蝉联']
  ];
  for (const h of honors) honorStmt.run(...h);

  const trainStmt = db.prepare('INSERT INTO trainings (year, type, count, participants, description) VALUES (?, ?, ?, ?, ?)');
  const trainings = [
    ['2023-2024', '线下培训', 15, 480, '面向全校同学开设公开课，分享技术知识与实践经验'],
    ['2024', '专业知识授课培训', 23, null, '提供广阔场地与专业设备'],
    ['2024', '线下焊接实训', 4, null, '无协的成员在大一时就能提前了解C语言，嵌入式知识，掌握焊接技巧']
  ];
  for (const t of trainings) trainStmt.run(...t);

  console.log(`Database initialized successfully: ${dbPath}`);
  process.exit(0);
} catch (err) {
  console.error('Error initializing database:', err);
  process.exit(1);
}
