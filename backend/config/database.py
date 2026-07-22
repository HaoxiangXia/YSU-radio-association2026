import os
import sqlite3
from contextlib import contextmanager

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

_configured_path = os.environ.get('DATABASE_PATH')
if _configured_path:
    DB_PATH = _configured_path if os.path.isabs(_configured_path) else os.path.join(BASE_DIR, _configured_path)
else:
    DB_PATH = os.path.join(BASE_DIR, 'backend', 'data', 'database.sqlite')

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)


@contextmanager
def get_db_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def get_db():
    """FastAPI dependency: yields a sqlite3 connection."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    try:
        yield conn
    finally:
        conn.close()


def init_database():
    with get_db_connection() as conn:
        conn.execute('PRAGMA journal_mode = WAL')
        conn.execute('PRAGMA foreign_keys = ON')

        conn.executescript('''
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

            CREATE TABLE IF NOT EXISTS membership_applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                studentId TEXT NOT NULL,
                college TEXT NOT NULL,
                grade TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT NOT NULL,
                self_introduction TEXT NOT NULL,
                expectation TEXT,
                createdAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
                updatedAt TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            );

            CREATE TABLE IF NOT EXISTS trainings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                year TEXT,
                type TEXT,
                count INTEGER,
                participants INTEGER,
                description TEXT
            );
        ''')
        conn.commit()


# Initialize schema on module import (at startup)
init_database()
