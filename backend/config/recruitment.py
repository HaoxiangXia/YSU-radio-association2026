import json
import os
import shutil
import tempfile
import threading
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
    cross_border_notice: str = Field(
        alias="crossBorderNotice",
        min_length=1,
        max_length=1500,
    )
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
        if self.enabled and self.retention_until is None:
            raise ValueError("开启入会申请时必须填写资料保留期限")
        if has_start and has_end and self.starts_at >= self.ends_at:
            raise ValueError("开始时间必须早于截止时间")
        if (
            self.retention_until is not None
            and self.ends_at is not None
            and self.retention_until < self.ends_at.date()
        ):
            raise ValueError("资料保留期限不得早于入会申请截止日期")
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
_config_lock = threading.RLock()


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
    with _config_lock:
        _current_config_path = resolve_recruitment_config_path(path)
        _current_config = load_recruitment_config(_current_config_path)
        return _current_config


def get_recruitment_config() -> RecruitmentConfig:
    with _config_lock:
        if _current_config is None:
            return initialize_recruitment_config()
        return _current_config


def resolve_writable_recruitment_config_path(
    path: str | Path | None = None,
) -> Path:
    configured_path = path or os.environ.get("RECRUITMENT_CONFIG_PATH")
    if configured_path:
        resolved = Path(configured_path).expanduser()
        if not resolved.is_absolute():
            resolved = REPOSITORY_ROOT / resolved
        return resolved.resolve()
    return LOCAL_CONFIG_PATH.resolve()


def save_recruitment_config(
    config: RecruitmentConfig,
    path: str | Path | None = None,
) -> tuple[Path, Path | None]:
    """Atomically persist validated business configuration.

    The tracked example is never overwritten. If a previous private config exists,
    retain one timestamped copy beside it for operational recovery.
    """

    global _current_config, _current_config_path
    config_path = resolve_writable_recruitment_config_path(path)
    if config_path == EXAMPLE_CONFIG_PATH.resolve():
        raise RecruitmentConfigError("示例配置是只读模板，不能作为后台保存目标")

    payload = json.dumps(
        config.model_dump(mode="json", by_alias=True),
        ensure_ascii=False,
        indent=2,
    ) + "\n"

    with _config_lock:
        try:
            config_path.parent.mkdir(parents=True, exist_ok=True)
            backup_path = None
            if config_path.exists():
                timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
                backup_path = config_path.with_name(
                    f"{config_path.name}.previous.{timestamp}"
                )
                shutil.copy2(config_path, backup_path)
                os.chmod(backup_path, 0o600)

            descriptor, temporary_name = tempfile.mkstemp(
                prefix=f".{config_path.name}.",
                suffix=".tmp",
                dir=config_path.parent,
            )
            temporary_path = Path(temporary_name)
            try:
                with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as file:
                    file.write(payload)
                    file.flush()
                    os.fsync(file.fileno())
                os.chmod(temporary_path, 0o600)
                os.replace(temporary_path, config_path)
            finally:
                temporary_path.unlink(missing_ok=True)
        except OSError as exc:
            raise RecruitmentConfigError("招新配置保存失败，原配置未被替换") from exc

        _current_config = config
        _current_config_path = config_path
        return config_path, backup_path


def reset_recruitment_config() -> None:
    global _current_config, _current_config_path
    with _config_lock:
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
            "crossBorderNotice": config.application.cross_border_notice,
        },
        "admissionQuery": {
            "enabled": config.admission_query.enabled,
            "notice": config.admission_query.notice,
        },
        "contact": config.contact.model_dump(by_alias=True),
        "options": config.options.model_dump(by_alias=True),
        "site": config.site.model_dump(by_alias=True),
    }
