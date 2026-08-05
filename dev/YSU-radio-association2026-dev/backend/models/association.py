import sqlite3
import json


def find_one(db: sqlite3.Connection):
    row = db.execute("SELECT * FROM association LIMIT 1").fetchone()
    if row is None:
        return None
    record = dict(row)
    if record.get("awards"):
        try:
            record["awards"] = json.loads(record["awards"])
        except json.JSONDecodeError:
            pass
    return record
