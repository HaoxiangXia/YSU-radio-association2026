import sqlite3
import json


def find_all(db: sqlite3.Connection):
    rows = db.execute("SELECT * FROM competitions ORDER BY year DESC").fetchall()
    records = []
    for row in rows:
        record = dict(row)
        if record.get("tracks"):
            try:
                record["tracks"] = json.loads(record["tracks"])
            except json.JSONDecodeError:
                pass
        records.append(record)
    return records
