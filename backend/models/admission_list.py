import json
import os
import shutil
import tempfile
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from config.recruitment import RecruitmentConfig


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ADMISSIONS_PATH = (
    REPOSITORY_ROOT.parent
    / "YSU-radio-association-private"
    / "admission-results.json"
)


class AdmissionDataError(RuntimeError):
    pass


class AdmissionRecord(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    student_id: str = Field(alias="studentId", pattern=r"^\d{12}$")
    name: str = Field(min_length=1, max_length=30)
    phone: str = Field(pattern=r"^1[3-9]\d{9}$")
    department: str = Field(default="", max_length=100)
    status: Literal["已录取", "未录取"] = "已录取"


_admissions_by_student_id: dict[str, AdmissionRecord] | None = None
_admissions_path: Path | None = None
_admissions_lock = threading.RLock()


def resolve_admissions_path(path: str | Path | None = None) -> Path:
    configured_path = path or os.environ.get("ADMISSIONS_DATA_PATH")
    if configured_path:
        resolved = Path(configured_path).expanduser()
        if not resolved.is_absolute():
            resolved = REPOSITORY_ROOT / resolved
        return resolved.resolve()
    return DEFAULT_ADMISSIONS_PATH.resolve()


def load_admissions(path: str | Path | None = None) -> dict[str, AdmissionRecord]:
    admissions_path = resolve_admissions_path(path)
    try:
        raw_records = json.loads(admissions_path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise AdmissionDataError("录取名单文件不存在") from exc
    except (OSError, json.JSONDecodeError) as exc:
        raise AdmissionDataError("录取名单文件无法读取或不是有效 JSON") from exc

    if not isinstance(raw_records, list):
        raise AdmissionDataError("录取名单必须是 JSON 数组")

    records: dict[str, AdmissionRecord] = {}
    try:
        for raw_record in raw_records:
            record = AdmissionRecord.model_validate(raw_record)
            if record.student_id in records:
                raise AdmissionDataError("录取名单包含重复学号")
            records[record.student_id] = record
    except ValidationError as exc:
        problems = []
        for error in exc.errors(include_input=False, include_url=False):
            location = ".".join(str(part) for part in error["loc"])
            problems.append(f"{location}: {error['msg']}")
        raise AdmissionDataError(
            f"录取名单校验失败：{'; '.join(problems)}"
        ) from None
    return records


def publish_admissions(
    records: list[AdmissionRecord],
    path: str | Path | None = None,
) -> tuple[Path, Path | None]:
    global _admissions_by_student_id, _admissions_path
    admissions_path = resolve_admissions_path(path)
    payload = json.dumps(
        [record.model_dump(mode="json", by_alias=True) for record in records],
        ensure_ascii=False,
        indent=2,
    ) + "\n"

    with _admissions_lock:
        try:
            admissions_path.parent.mkdir(parents=True, exist_ok=True)
            backup_path = None
            if admissions_path.exists():
                timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
                backup_path = admissions_path.with_name(
                    f"{admissions_path.name}.previous.{timestamp}"
                )
                shutil.copy2(admissions_path, backup_path)
                os.chmod(backup_path, 0o600)

            descriptor, temporary_name = tempfile.mkstemp(
                prefix=f".{admissions_path.name}.",
                suffix=".tmp",
                dir=admissions_path.parent,
            )
            temporary_path = Path(temporary_name)
            try:
                with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as file:
                    file.write(payload)
                    file.flush()
                    os.fsync(file.fileno())
                os.chmod(temporary_path, 0o600)
                os.replace(temporary_path, admissions_path)
            finally:
                temporary_path.unlink(missing_ok=True)
        except OSError as exc:
            raise AdmissionDataError("录取名单发布失败，原名单未被替换") from exc

        _admissions_path = admissions_path
        _admissions_by_student_id = {record.student_id: record for record in records}
        return admissions_path, backup_path


def initialize_admissions_data(
    config: RecruitmentConfig,
    path: str | Path | None = None,
) -> dict[str, AdmissionRecord]:
    global _admissions_by_student_id, _admissions_path
    with _admissions_lock:
        _admissions_path = resolve_admissions_path(path)
        if config.admission_query.enabled:
            _admissions_by_student_id = load_admissions(_admissions_path)
        else:
            _admissions_by_student_id = {}
        return _admissions_by_student_id


def reset_admissions_data() -> None:
    global _admissions_by_student_id, _admissions_path
    with _admissions_lock:
        _admissions_by_student_id = None
        _admissions_path = None


def get_admissions(config: RecruitmentConfig) -> dict[str, AdmissionRecord]:
    with _admissions_lock:
        if _admissions_by_student_id is None:
            return initialize_admissions_data(config)
        return _admissions_by_student_id
