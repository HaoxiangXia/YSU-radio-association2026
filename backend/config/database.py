import os
import sqlite3
from contextlib import contextmanager

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, 'server', 'data')
DB_PATH = os.path.join(DATA_DIR, 'database.sqlite')

os.makedirs(DATA_DIR, exist_ok=True)


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

        # Migration: rename legacy tables to membership_applications.
        # If multiple legacy tables exist, we rename the most recent one
        # (`applications`) and leave the older one (`registrations`) as an
        # orphan so no data is silently lost.
        existing = {row[0] for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()}
        if 'membership_applications' not in existing:
            if 'applications' in existing:
                conn.execute('ALTER TABLE applications RENAME TO membership_applications')
                conn.commit()
            elif 'registrations' in existing:
                conn.execute('ALTER TABLE registrations RENAME TO membership_applications')
                conn.commit()

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

        # Rename legacy `experience` column to canonical `self_introduction`.
        columns = {row[1] for row in conn.execute(
            "PRAGMA table_info(membership_applications)"
        ).fetchall()}
        if 'experience' in columns and 'self_introduction' not in columns:
            conn.execute('ALTER TABLE membership_applications RENAME COLUMN experience TO self_introduction')
            conn.commit()


# Initialize schema on module import (at startup)
init_database()
