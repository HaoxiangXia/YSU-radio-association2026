import os
import sqlite3
from contextlib import closing, contextmanager
from datetime import datetime, timezone
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = REPOSITORY_ROOT / "backend" / "data" / "database.sqlite"
STUDENT_ID_INDEX = "ux_membership_applications_student_id"
STUDENT_ID_MIGRATION = "0001_unique_membership_application_student_id"
OPERATION_RECORDS_MIGRATION = "0002_membership_application_delete_operation_records"


class DatabaseMigrationError(RuntimeError):
    pass


def get_database_path(db_path: str | Path | None = None) -> Path:
    configured_path = db_path or os.environ.get("DATABASE_PATH")
    if not configured_path:
        return DEFAULT_DB_PATH
    resolved = Path(configured_path).expanduser()
    if not resolved.is_absolute():
        resolved = REPOSITORY_ROOT / resolved
    return resolved.resolve()


def _connect(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


@contextmanager
def get_db_connection(db_path: str | Path | None = None):
    connection = _connect(get_database_path(db_path))
    try:
        yield connection
    finally:
        connection.close()


def get_db():
    """FastAPI dependency that yields a connection to the configured database."""
    with get_db_connection() as connection:
        yield connection


def revoke_token(connection: sqlite3.Connection, jti: str, expires_at: int) -> None:
    """Invalidate a session token and opportunistically prune expired entries."""
    expiry = datetime.fromtimestamp(expires_at, timezone.utc).isoformat()
    connection.execute(
        "INSERT OR REPLACE INTO revoked_tokens (jti, expires_at) VALUES (?, ?)",
        (jti, expiry),
    )
    connection.execute(
        "DELETE FROM revoked_tokens WHERE expires_at < ?",
        (datetime.now(timezone.utc).isoformat(),),
    )
    connection.commit()


def is_token_revoked(connection: sqlite3.Connection, jti: str) -> bool:
    row = connection.execute(
        "SELECT 1 FROM revoked_tokens WHERE jti = ?", (jti,)
    ).fetchone()
    return row is not None


def _create_base_schema(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
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

        CREATE TABLE IF NOT EXISTS revoked_tokens (
            jti TEXT PRIMARY KEY,
            expires_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS trainings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year TEXT,
            type TEXT,
            count INTEGER,
            participants INTEGER,
            description TEXT
        );

        CREATE TABLE IF NOT EXISTS schema_migrations (
            name TEXT PRIMARY KEY,
            appliedAt TEXT NOT NULL
        );
        """
    )
    connection.commit()


def _index_exists(connection: sqlite3.Connection, index_name: str) -> bool:
    row = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = ?",
        (index_name,),
    ).fetchone()
    return row is not None


def _table_exists(connection: sqlite3.Connection, table_name: str) -> bool:
    row = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table_name,),
    ).fetchone()
    return row is not None


def _migration_recorded(connection: sqlite3.Connection, migration_name: str) -> bool:
    row = connection.execute(
        "SELECT 1 FROM schema_migrations WHERE name = ?",
        (migration_name,),
    ).fetchone()
    return row is not None


def _count_duplicate_student_ids(connection: sqlite3.Connection) -> int:
    row = connection.execute(
        """
        SELECT COUNT(*) AS count
        FROM (
            SELECT studentId
            FROM membership_applications
            GROUP BY studentId
            HAVING COUNT(*) > 1
        )
        """
    ).fetchone()
    return int(row["count"]) if row else 0


def _backup_before_migration(
    connection: sqlite3.Connection,
    db_path: Path,
    migration_name: str,
) -> Path:
    backup_directory = db_path.parent / "migration-backups"
    backup_directory.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    backup_path = backup_directory / f"{db_path.stem}-before-{migration_name}-{timestamp}.sqlite"
    with closing(sqlite3.connect(backup_path)) as backup_connection:
        connection.backup(backup_connection)
    return backup_path


def _apply_unique_student_id_migration(
    connection: sqlite3.Connection,
    db_path: Path,
    backup_before_migrations: bool,
) -> Path | None:
    index_exists = _index_exists(connection, STUDENT_ID_INDEX)
    migration_recorded = _migration_recorded(connection, STUDENT_ID_MIGRATION)
    if index_exists and migration_recorded:
        return None

    if not index_exists:
        duplicate_count = _count_duplicate_student_ids(connection)
        if duplicate_count:
            raise DatabaseMigrationError(
                "检测到重复学号，已停止数据库迁移；未自动删除或修改任何入会申请资料。"
            )

    backup_path = None
    if not index_exists and backup_before_migrations:
        backup_path = _backup_before_migration(
            connection,
            db_path,
            STUDENT_ID_MIGRATION,
        )

    applied_at = datetime.now(timezone.utc).isoformat()
    try:
        connection.execute("BEGIN IMMEDIATE")
        if not index_exists:
            connection.execute(
                f"""
                CREATE UNIQUE INDEX {STUDENT_ID_INDEX}
                ON membership_applications(studentId)
                """
            )
        connection.execute(
            """
            INSERT OR IGNORE INTO schema_migrations (name, appliedAt)
            VALUES (?, ?)
            """,
            (STUDENT_ID_MIGRATION, applied_at),
        )
        connection.commit()
    except sqlite3.Error as exc:
        connection.rollback()
        raise DatabaseMigrationError("数据库迁移失败，变更已回滚") from exc
    return backup_path


def _apply_operation_records_migration(
    connection: sqlite3.Connection,
    db_path: Path,
    backup_before_migrations: bool,
) -> Path | None:
    table_name = "membership_application_operation_records"
    index_name = "idx_membership_application_operation_records_created_at"
    table_exists = _table_exists(connection, table_name)
    index_exists = _index_exists(connection, index_name)
    migration_recorded = _migration_recorded(connection, OPERATION_RECORDS_MIGRATION)
    if table_exists and index_exists and migration_recorded:
        return None

    backup_path = None
    if backup_before_migrations:
        backup_path = _backup_before_migration(
            connection,
            db_path,
            OPERATION_RECORDS_MIGRATION,
        )

    applied_at = datetime.now(timezone.utc).isoformat()
    try:
        connection.execute("BEGIN IMMEDIATE")
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS membership_application_operation_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                operation TEXT NOT NULL CHECK (operation = 'delete'),
                membershipApplicationId INTEGER NOT NULL,
                applicationName TEXT NOT NULL,
                studentId TEXT NOT NULL,
                recruitmentOfficerId TEXT NOT NULL,
                createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_membership_application_operation_records_created_at
            ON membership_application_operation_records(createdAt DESC, id DESC)
            """
        )
        connection.execute(
            """
            INSERT OR IGNORE INTO schema_migrations (name, appliedAt)
            VALUES (?, ?)
            """,
            (OPERATION_RECORDS_MIGRATION, applied_at),
        )
        connection.commit()
    except sqlite3.Error as exc:
        connection.rollback()
        raise DatabaseMigrationError("数据库迁移失败，变更已回滚") from exc
    return backup_path


def initialize_database(
    db_path: str | Path | None = None,
    *,
    backup_before_migrations: bool = True,
) -> list[Path]:
    """Create the base schema and apply pending idempotent migrations."""
    resolved_path = get_database_path(db_path)
    with get_db_connection(resolved_path) as connection:
        connection.execute("PRAGMA journal_mode = WAL")
        _create_base_schema(connection)
        backup_paths = []
        backup_path = _apply_unique_student_id_migration(
            connection,
            resolved_path,
            backup_before_migrations,
        )
        if backup_path:
            backup_paths.append(backup_path)
        backup_path = _apply_operation_records_migration(
            connection,
            resolved_path,
            backup_before_migrations,
        )
        if backup_path:
            backup_paths.append(backup_path)
    return backup_paths
