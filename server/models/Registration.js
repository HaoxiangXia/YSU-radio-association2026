const db = require('../config/database');

const Registration = {
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO registrations (name, studentId, college, grade, phone, email, experience, expectation)
      VALUES (@name, @studentId, @college, @grade, @phone, @email, @experience, @expectation)
    `);
    const info = stmt.run({
      name: data.name,
      studentId: data.studentId,
      college: data.college,
      grade: data.grade,
      phone: data.phone,
      email: data.email,
      experience: data.experience,
      expectation: data.expectation || null
    });
    return { id: Number(info.lastInsertRowid), ...data };
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

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM registrations ${where}`).get(...params);
    const total = countRow.total;

    const rows = db.prepare(`SELECT * FROM registrations ${where} ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);

    return { registrations: rows, total };
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
