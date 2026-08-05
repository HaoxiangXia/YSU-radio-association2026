from fastapi import APIRouter, Depends
from config.database import get_db
from models import honor as honor_model

router = APIRouter()


@router.get("")
def get_honors(db=Depends(get_db)):
    return honor_model.find_all(db)
