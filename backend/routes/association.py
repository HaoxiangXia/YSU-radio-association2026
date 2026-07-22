from fastapi import APIRouter, Depends
from config.database import get_db
from models import association as association_model

router = APIRouter()


@router.get("")
def get_association(db=Depends(get_db)):
    return association_model.find_one(db)
