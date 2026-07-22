from fastapi import APIRouter, Depends
from config.database import get_db
from models import training as training_model

router = APIRouter()


@router.get("")
def get_trainings(db=Depends(get_db)):
    return training_model.find_all(db)
