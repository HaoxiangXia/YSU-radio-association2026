const { Database } = require('bun:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new Database(dbPath);

db.run('PRAGMA journal_mode = WAL');
db.run('PRAGMA foreign_keys = ON');

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
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS competitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    year INTEGER,
    participants INTEGER,
    description TEXT,
    tracks TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS honors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    rank INTEGER,
    year INTEGER,
    description TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    studentId TEXT NOT NULL,
    college TEXT NOT NULL,
    grade TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    experience TEXT NOT NULL,
    expectation TEXT,
    createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS trainings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year TEXT,
    type TEXT,
    count INTEGER,
    participants INTEGER,
    description TEXT
  )
`);

console.log('SQLite database initialized');

module.exports = db;
