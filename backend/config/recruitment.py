import json
import os
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    ValidationError,
    field_validator,
    model_validator,
)


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
EXAMPLE_CONFIG_PATH = REPOSITORY_ROOT / "config" / "recruitment.example.json"
LOCAL_CONFIG_PATH = REPOSITORY_ROOT / "config" / "recruitment.local.json"


class StrictConfigModel(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=True,
        str_strip_whitespace=True,
    )


class ApplicationConfig(StrictConfigModel):
    enabled: StrictBool = False
    starts_at: datetime | None = Field(default=None, alias="startsAt")
    ends_at: datetime | None = Field(default=None, alias="endsAt")
    notice: str = Field(min_length=1, max_length=500)
    privacy_notice: str = Field(alias="privacyNotice", min_length=1, max_length=1500)
    retention_until: date | None = Field(default=None, alias="retentionUntil")

    @field_validator("starts_at", "ends_at")
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        if value is not None and (value.tzinfo is None or value.utcoffset() is None):
            raise ValueError("时间必须包含时区")
        return value

    @model_validator(mode="after")
    def validate_window(self):
        has_start = self.starts_at is not None
        has_end = self.ends_at is not None
        if has_start != has_end:
            raise ValueError("开始时间和截止时间必须同时填写或同时留空")
        if self.enabled and not (has_start and has_end):
            raise ValueError("开启入会申请时必须填写开始时间和截止时间")
        if has_start and has_end and self.starts_at >= self.ends_at:
            raise ValueError("开始时间必须早于截止时间")
        return self


class AdmissionQueryConfig(StrictConfigModel):
    enabled: StrictBool = False
    notice: str = Field(min_length=1, max_length=500)


class ContactConfig(StrictConfigModel):
    label: str = Field(min_length=1, max_length=100)
    qq: str = Field(default="", max_length=30)
    channel_text: str = Field(alias="channelText", min_length=1, max_length=500)


class OptionsConfig(StrictConfigModel):
    colleges: list[str] = Field(min_length=1, max_length=100)
    grades: list[str] = Field(min_length=1, max_length=30)

    @field_validator("colleges", "grades")
    @classmethod
    def require_unique_nonempty_values(cls, values: list[str]) -> list[str]:
        normalized = [value.strip() for value in values]
        if any(not value for value in normalized):
            raise ValueError("选项不得为空")
        if len(set(normalized)) != len(normalized):
            raise ValueError("选项不得重复")
        return normalized


class SiteConfig(StrictConfigModel):
    icp_number: str = Field(default="", alias="icpNumber", max_length=100)


class RecruitmentConfig(StrictConfigModel):
    cycle: str = Field(min_length=1, max_length=50)
    application: ApplicationConfig
    admission_query: AdmissionQueryConfig = Field(alias="admissionQuery")
    contact: ContactConfig
    options: OptionsConfig
    site: SiteConfig


class RecruitmentConfigError(RuntimeError):
    pass


_current_config: RecruitmentConfig | None = None
_current_config_path: Path | None = None


def resolve_recruitment_config_path(path: str | Path | None = None) -> Path:
    configured_path = path or os.environ.get("RECRUITMENT_CONFIG_PATH")
    if configured_path:
        resolved = Path(configured_path).expanduser()
        if not resolved.is_absolute():
            resolved = REPOSITORY_ROOT / resolved
        return resolved.resolve()
    if LOCAL_CONFIG_PATH.exists():
        return LOCAL_CONFIG_PATH.resolve()
    return EXAMPLE_CONFIG_PATH.resolve()


def load_recruitment_config(path: str | Path | None = None) -> RecruitmentConfig:
    config_path = resolve_recruitment_config_path(path)
    try:
        raw_config = json.loads(config_path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise RecruitmentConfigError("招新配置文件不存在") from exc
    except (OSError, json.JSONDecodeError) as exc:
        raise RecruitmentConfigError("招新配置文件无法读取或不是有效 JSON") from exc

    try:
        return RecruitmentConfig.model_validate(raw_config)
    except ValidationError as exc:
        problems = []
        for error in exc.errors(include_input=False, include_url=False):
            location = ".".join(str(part) for part in error["loc"])
            problems.append(f"{location}: {error['msg']}")
        raise RecruitmentConfigError(
            f"招新配置校验失败：{'; '.join(problems)}"
        ) from None


def initialize_recruitment_config(
    path: str | Path | None = None,
) -> RecruitmentConfig:
    global _current_config, _current_config_path
    _current_config_path = resolve_recruitment_config_path(path)
    _current_config = load_recruitment_config(_current_config_path)
    return _current_config


def get_recruitment_config() -> RecruitmentConfig:
    if _current_config is None:
        return initialize_recruitment_config()
    return _current_config


def reset_recruitment_config() -> None:
    global _current_config, _current_config_path
    _current_config = None
    _current_config_path = None


def get_application_status(
    config: RecruitmentConfig,
    now: datetime | None = None,
) -> Literal["manually_closed", "scheduled", "open", "ended"]:
    if not config.application.enabled:
        return "manually_closed"

    current_time = now or datetime.now(timezone.utc)
    current_time = current_time.astimezone(timezone.utc)
    starts_at = config.application.starts_at.astimezone(timezone.utc)
    ends_at = config.application.ends_at.astimezone(timezone.utc)
    if current_time < starts_at:
        return "scheduled"
    if current_time >= ends_at:
        return "ended"
    return "open"


def get_public_recruitment_config(
    config: RecruitmentConfig,
    now: datetime | None = None,
) -> dict:
    return {
        "cycle": config.cycle,
        "application": {
            "status": get_application_status(config, now),
            "startsAt": config.application.starts_at,
            "endsAt": config.application.ends_at,
            "notice": config.application.notice,
            "privacyNotice": config.application.privacy_notice,
        },
        "admissionQuery": {
            "enabled": config.admission_query.enabled,
            "notice": config.admission_query.notice,
        },
        "contact": config.contact.model_dump(by_alias=True),
        "options": config.options.model_dump(by_alias=True),
        "site": config.site.model_dump(by_alias=True),
    }
