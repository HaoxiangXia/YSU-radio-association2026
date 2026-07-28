from fastapi import APIRouter, Depends

from config.recruitment import (
    RecruitmentConfig,
    get_public_recruitment_config,
    get_recruitment_config,
)


router = APIRouter()


@router.get("/config")
def public_recruitment_config(
    config: RecruitmentConfig = Depends(get_recruitment_config),
):
    return get_public_recruitment_config(config)
