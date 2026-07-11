const db = require('../config/database');

const Registration = {
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO registrations (name, studentId, college, grade, phone, email, experience, expectation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      data.name,
      data.studentId,
      data.college,
      data.grade,
      data.phone,
      data.email,
      data.experience,
      data.expectation || null
    );
    return { id: Number(info.lastInsertRowid), ...data };
  },

  findOptions() {
    return {
      colleges: db.prepare('SELECT DISTINCT college FROM registrations ORDER BY college').all().map((row) => row.college),
      grades: db.prepare('SELECT DISTINCT grade FROM registrations ORDER BY grade').all().map((row) => row.grade),
    };
  },

  findAll({ page = 1, limit = 50, college, grade, search, sortBy = 'createdAt', sortOrder = 'desc' } = {}) {
    let conditions = [];
    let params = [];

    if (college) {
      conditions.push('college = ?');
      params.push(college);
    }
    if (grade) {
      conditions.push('grade = ?');
      params.push(grade);
    }
    if (search) {
      conditions.push('(name LIKE ? OR studentId LIKE ? OR college LIKE ? OR email LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const allowedSortColumns = ['createdAt', 'name', 'studentId', 'college', 'grade'];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 20));
    const offset = (safePage - 1) * safeLimit;

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM registrations ${where}`).get(...params);
    const total = countRow.total;

    const rows = db.prepare(`SELECT * FROM registrations ${where} ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`).all(...params, safeLimit, offset);

    return { registrations: rows, total, page: safePage, limit: safeLimit };
  },

  findById(id) {
    return db.prepare('SELECT * FROM registrations WHERE id = ?').get(id) || null;
  },

  deleteById(id) {
    const row = db.prepare('SELECT * FROM registrations WHERE id = ?').get(id);
    if (!row) return null;
    db.prepare('DELETE FROM registrations WHERE id = ?').run(id);
    return row;
  },

  count(query = {}) {
    let conditions = [];
    let params = [];

    if (query.college) {
      conditions.push('college = ?');
      params.push(query.college);
    }
    if (query.grade) {
      conditions.push('grade = ?');
      params.push(query.grade);
    }
    if (query.createdAt && query.createdAt.$gte) {
      conditions.push('createdAt >= ?');
      params.push(query.createdAt.$gte);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const row = db.prepare(`SELECT COUNT(*) as count FROM registrations ${where}`).get(...params);
    return row.count;
  },

  groupByCollege() {
    return db.prepare('SELECT college AS _id, COUNT(*) AS count FROM registrations GROUP BY college ORDER BY count DESC').all();
  },

  groupByGrade() {
    return db.prepare('SELECT grade AS _id, COUNT(*) AS count FROM registrations GROUP BY grade ORDER BY count DESC').all();
  }
};

module.exports = Registration;
