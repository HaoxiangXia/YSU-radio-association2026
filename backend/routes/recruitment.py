import logging

from fastapi import APIRouter, Depends, HTTPException, status

from config.recruitment import (
    RecruitmentConfig,
    RecruitmentConfigError,
    get_public_recruitment_config,
    get_recruitment_config,
    save_recruitment_config,
)
from models.admission_list import AdmissionDataError, load_admissions
from routes.recruitment_officers import (
    RecruitmentOfficerInfo,
    get_current_recruitment_officer,
)


router = APIRouter()
logger = logging.getLogger(__name__)


def _changed_config_fields(current: dict, updated: dict, prefix: str = "") -> list[str]:
    changed = []
    for key in sorted(current.keys() | updated.keys()):
        field = f"{prefix}.{key}" if prefix else key
        current_value = current.get(key)
        updated_value = updated.get(key)
        if isinstance(current_value, dict) and isinstance(updated_value, dict):
            changed.extend(_changed_config_fields(current_value, updated_value, field))
        elif current_value != updated_value:
            changed.append(field)
    return changed


@router.get("/config")
def public_recruitment_config(
    config: RecruitmentConfig = Depends(get_recruitment_config),
):
    return get_public_recruitment_config(config)


@router.get("/manage/config")
def managed_recruitment_config(
    config: RecruitmentConfig = Depends(get_recruitment_config),
    officer: RecruitmentOfficerInfo = Depends(get_current_recruitment_officer),
):
    return {
        "config": config.model_dump(mode="json", by_alias=True),
        "officer": officer.model_dump(),
    }


@router.put("/manage/config")
def update_recruitment_config(
    updated: RecruitmentConfig,
    current: RecruitmentConfig = Depends(get_recruitment_config),
    officer: RecruitmentOfficerInfo = Depends(get_current_recruitment_officer),
):
    if updated.admission_query.enabled:
        try:
            load_admissions()
        except AdmissionDataError as exc:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "录取名单尚未发布或校验失败，不能开启录取查询",
            ) from exc

    current_data = current.model_dump(mode="json", by_alias=True)
    updated_data = updated.model_dump(mode="json", by_alias=True)
    changed_fields = _changed_config_fields(current_data, updated_data)
    try:
        _, backup_path = save_recruitment_config(updated)
    except RecruitmentConfigError as exc:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc)) from exc

    logger.info(
        "recruitment_config_updated officer=%s fields=%s backup=%s",
        officer.username,
        ",".join(changed_fields) or "none",
        bool(backup_path),
    )
    return {
        "message": "招新配置已保存",
        "changedFields": changed_fields,
        "config": updated_data,
    }
