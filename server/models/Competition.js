const db = require('../config/database');

const Competition = {
  findAll() {
    const rows = db.prepare('SELECT * FROM competitions ORDER BY year DESC').all();
    for (const row of rows) {
      if (row.tracks) row.tracks = JSON.parse(row.tracks);
    }
    return rows;
  }
};

module.exports = Competition;
