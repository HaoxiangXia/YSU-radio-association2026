import sqlite3


def create(db: sqlite3.Connection, data: dict):
    cur = db.execute(
        """
        INSERT INTO membership_applications (name, studentId, college, grade, phone, email, self_introduction, expectation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            data.get("name"),
            data.get("studentId"),
            data.get("college"),
            data.get("grade"),
            data.get("phone"),
            data.get("email"),
            data.get("self_introduction"),
            data.get("expectation"),
        ),
    )
    db.commit()
    new_id = cur.lastrowid
    return find_by_id(db, new_id)


def find_all(
    db: sqlite3.Connection,
    page: int = 1,
    limit: int = 50,
    college: str | None = None,
    grade: str | None = None,
    search: str | None = None,
    sort_by: str = "createdAt",
    sort_order: str = "desc",
):
    conditions = []
    params = []

    if college:
        conditions.append("college = ?")
        params.append(college)
    if grade:
        conditions.append("grade = ?")
        params.append(grade)
    if search:
        like = f"%{search}%"
        conditions.append("(name LIKE ? OR studentId LIKE ? OR college LIKE ? OR email LIKE ?)")
        params.extend([like, like, like, like])

    where = "WHERE " + " AND ".join(conditions) if conditions else ""

    allowed_columns = ["createdAt", "name", "studentId", "college", "grade"]
    safe_sort_by = sort_by if sort_by in allowed_columns else "createdAt"
    safe_sort_order = "ASC" if sort_order == "asc" else "DESC"

    offset = (page - 1) * limit

    count_row = db.execute(
        f"SELECT COUNT(*) as total FROM membership_applications {where}",
        tuple(params),
    ).fetchone()
    total = count_row["total"] if count_row else 0

    rows = db.execute(
        f"""
        SELECT * FROM membership_applications {where}
        ORDER BY {safe_sort_by} {safe_sort_order}
        LIMIT ? OFFSET ?
        """,
        tuple(params + [limit, offset]),
    ).fetchall()

    return {"membership_applications": [dict(row) for row in rows], "total": total}


def find_all_for_export(
    db: sqlite3.Connection,
    college: str | None = None,
    grade: str | None = None,
    search: str | None = None,
):
    conditions = []
    params = []

    if college:
        conditions.append("college = ?")
        params.append(college)
    if grade:
        conditions.append("grade = ?")
        params.append(grade)
    if search:
        like = f"%{search}%"
        conditions.append("(name LIKE ? OR studentId LIKE ? OR college LIKE ? OR email LIKE ?)")
        params.extend([like, like, like, like])

    where = "WHERE " + " AND ".join(conditions) if conditions else ""
    rows = db.execute(
        f"""
        SELECT name, studentId, college, grade, phone, email,
               self_introduction, expectation, createdAt
        FROM membership_applications
        {where}
        ORDER BY createdAt DESC
        """,
        tuple(params),
    ).fetchall()
    return [dict(row) for row in rows]


def find_by_id(db: sqlite3.Connection, id: int):
    row = db.execute("SELECT * FROM membership_applications WHERE id = ?", (id,)).fetchone()
    return dict(row) if row else None


def delete_by_id(db: sqlite3.Connection, id: int, recruitment_officer_id: str):
    try:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT * FROM membership_applications WHERE id = ?", (id,)).fetchone()
        if not row:
            db.rollback()
            return None
        db.execute("DELETE FROM membership_applications WHERE id = ?", (id,))
        db.execute(
            """
            INSERT INTO membership_application_operation_records
                (operation, membershipApplicationId, applicationName, studentId, recruitmentOfficerId)
            VALUES (?, ?, ?, ?, ?)
            """,
            ("delete", row["id"], row["name"], row["studentId"], recruitment_officer_id),
        )
        db.commit()
        return dict(row)
    except sqlite3.Error:
        db.rollback()
        raise


def find_delete_operation_records(
    db: sqlite3.Connection,
    page: int = 1,
    limit: int = 50,
):
    offset = (page - 1) * limit
    count_row = db.execute(
        "SELECT COUNT(*) AS total FROM membership_application_operation_records"
    ).fetchone()
    total = count_row["total"] if count_row else 0
    rows = db.execute(
        """
        SELECT id, operation, membershipApplicationId, applicationName,
               studentId, recruitmentOfficerId, createdAt
        FROM membership_application_operation_records
        ORDER BY createdAt DESC, id DESC
        LIMIT ? OFFSET ?
        """,
        (limit, offset),
    ).fetchall()
    return {"operation_records": [dict(row) for row in rows], "total": total}


def count(db: sqlite3.Connection, query: dict | None = None):
    query = query or {}
    conditions = []
    params = []

    if query.get("college"):
        conditions.append("college = ?")
        params.append(query["college"])
    if query.get("grade"):
        conditions.append("grade = ?")
        params.append(query["grade"])
    if query.get("createdAt") and query["createdAt"].get("$gte"):
        conditions.append("createdAt >= ?")
        params.append(query["createdAt"]["$gte"])

    where = "WHERE " + " AND ".join(conditions) if conditions else ""
    row = db.execute(
        f"SELECT COUNT(*) as count FROM membership_applications {where}",
        tuple(params),
    ).fetchone()
    return row["count"] if row else 0


def group_by_college(db: sqlite3.Connection):
    rows = db.execute(
        """
        SELECT college AS _id, COUNT(*) AS count
        FROM membership_applications
        GROUP BY college
        ORDER BY count DESC
        """
    ).fetchall()
    return [dict(row) for row in rows]


def group_by_grade(db: sqlite3.Connection):
    rows = db.execute(
        """
        SELECT grade AS _id, COUNT(*) AS count
        FROM membership_applications
        GROUP BY grade
        ORDER BY count DESC
        """
    ).fetchall()
    return [dict(row) for row in rows]
