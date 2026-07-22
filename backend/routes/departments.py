from fastapi import APIRouter, Depends
from config.database import get_db
from models import department as department_model

router = APIRouter()


@router.get("")
def get_departments(db=Depends(get_db)):
    return department_model.find_all(db)
