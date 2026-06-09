const db = require('../config/database');

const Honor = {
  findAll() {
    return db.prepare('SELECT * FROM honors ORDER BY year DESC').all();
  }
};

module.exports = Honor;
