const db = require('../config/database');

const Association = {
  findOne() {
    const row = db.prepare('SELECT * FROM association LIMIT 1').get();
    if (row && row.awards) row.awards = JSON.parse(row.awards);
    return row;
  }
};

module.exports = Association;
