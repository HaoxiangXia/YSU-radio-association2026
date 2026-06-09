const db = require('../config/database');

const Training = {
  findAll() {
    return db.prepare('SELECT * FROM trainings ORDER BY year DESC').all();
  }
};

module.exports = Training;
