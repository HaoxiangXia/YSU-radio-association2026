from fastapi import APIRouter, Depends
from config.database import get_db
from models import competition as competition_model

router = APIRouter()


@router.get("")
def get_competitions(db=Depends(get_db)):
    return competition_model.find_all(db)
