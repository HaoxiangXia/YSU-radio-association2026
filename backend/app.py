from contextlib import asynccontextmanager

import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.responses import RedirectResponse

# Load local defaults without overriding explicit process/test configuration.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, '.env'), override=False)

from config.database import initialize_database
from config.recruitment import initialize_recruitment_config
from models.admission_list import initialize_admissions_data

from routes import (
    admissions,
    membership_applications,
    association,
    competitions,
    departments,
    honors,
    ops,
    recruitment,
    recruitment_officers,
    trainings,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    recruitment_config = initialize_recruitment_config()
    recruitment_officers.load_recruitment_officer()
    initialize_admissions_data(recruitment_config)
    initialize_database()
    yield


app = FastAPI(title="燕山大学无线电爱好者协会", version="1.0.0", lifespan=lifespan)

@app.get("/")
async def root():
    return RedirectResponse(url="/html/index.html")


# API routers
app.include_router(departments.router, prefix="/api/departments", tags=["departments"])
app.include_router(trainings.router, prefix="/api/trainings", tags=["trainings"])
app.include_router(competitions.router, prefix="/api/competitions", tags=["competitions"])
app.include_router(honors.router, prefix="/api/honors", tags=["honors"])
app.include_router(association.router, prefix="/api/association", tags=["association"])
app.include_router(recruitment.router, prefix="/api/recruitment", tags=["recruitment"])
app.include_router(admissions.router, prefix="/api/admissions", tags=["admissions"])
app.include_router(membership_applications.router, prefix="/api/membership-applications", tags=["membership-applications"])
app.include_router(recruitment_officers.router, prefix="/api/recruitment-officers", tags=["recruitment-officers"])
app.include_router(ops.router, tags=["operations"])

# Static files (must be mounted after API routes so /api/* takes precedence)
app.mount("/", StaticFiles(directory="../public", html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 5000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
