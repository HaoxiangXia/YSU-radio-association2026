require('dotenv').config();

if (process.env.NODE_ENV === 'production') {
  console.error('拒绝在生产环境清空报名数据。');
  process.exit(1);
}

const db = require('../config/database');
const result = db.prepare('DELETE FROM registrations').run();
console.log(`已清空 ${result.changes} 条测试报名数据。`);
db.close();
