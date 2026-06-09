const db = require('../config/database');

const Department = {
  findAll() {
    return db.prepare('SELECT * FROM departments').all();
  }
};

module.exports = Department;
