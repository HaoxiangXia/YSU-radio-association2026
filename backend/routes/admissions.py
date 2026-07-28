import json
import os
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from config.recruitment import RecruitmentConfig, get_recruitment_config
from utils.security import admission_query_limiter, get_client_ip


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ADMISSIONS_PATH = (
    REPOSITORY_ROOT.parent
    / "YSU-radio-association-private"
    / "admission-results.json"
)

router = APIRouter()


class AdmissionDataError(RuntimeError):
    pass


class AdmissionRecord(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    student_id: str = Field(alias="studentId", pattern=r"^\d{12}$")
    name: str = Field(min_length=1, max_length=30)
    phone: str = Field(pattern=r"^1[3-9]\d{9}$")
    department: str = Field(default="", max_length=100)
    status: Literal["已录取", "未录取"]


class AdmissionQuery(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True, str_strip_whitespace=True)

    student_id: str = Field(alias="studentId", pattern=r"^\d{12}$")
    phone: str = Field(pattern=r"^1[3-9]\d{9}$")


class AdmissionQueryResponse(BaseModel):
    name: str
    department: str
    status: Literal["已录取", "未录取"]


_admissions_by_student_id: dict[str, AdmissionRecord] | None = None
_admissions_path: Path | None = None


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


def initialize_admissions_data(
    config: RecruitmentConfig,
    path: str | Path | None = None,
) -> dict[str, AdmissionRecord]:
    global _admissions_by_student_id, _admissions_path
    _admissions_path = resolve_admissions_path(path)
    if config.admission_query.enabled:
        _admissions_by_student_id = load_admissions(_admissions_path)
    else:
        _admissions_by_student_id = {}
    return _admissions_by_student_id


def reset_admissions_data() -> None:
    global _admissions_by_student_id, _admissions_path
    _admissions_by_student_id = None
    _admissions_path = None


def get_admissions(config: RecruitmentConfig) -> dict[str, AdmissionRecord]:
    if _admissions_by_student_id is None:
        return initialize_admissions_data(config)
    return _admissions_by_student_id


@router.post("/query", response_model=AdmissionQueryResponse)
def query_admission(
    query: AdmissionQuery,
    request: Request,
    config: RecruitmentConfig = Depends(get_recruitment_config),
):
    if not config.admission_query.enabled:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            config.admission_query.notice,
        )

    client_key = get_client_ip(request)
    if not admission_query_limiter.is_allowed(client_key):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "查询过于频繁，请稍后再试",
        )

    admission = get_admissions(config).get(query.student_id)
    if not admission or admission.phone != query.phone:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "未找到匹配的录取结果，请检查输入或联系协会负责人",
        )

    return AdmissionQueryResponse(
        name=admission.name,
        department=admission.department,
        status=admission.status,
    )
