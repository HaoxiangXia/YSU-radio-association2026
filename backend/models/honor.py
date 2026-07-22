import sqlite3


def find_all(db: sqlite3.Connection):
    rows = db.execute("SELECT * FROM honors ORDER BY year DESC").fetchall()
    return [dict(row) for row in rows]
