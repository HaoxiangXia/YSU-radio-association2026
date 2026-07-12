from contextlib import asynccontextmanager

import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.responses import RedirectResponse

# Load environment variables from the repository root before anything else
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, '.env'), override=True)

# Importing config.database initializes the schema and runs migrations
import config.database

from routes import (
    membership_applications,
    association,
    competitions,
    departments,
    honors,
    recruitment_officers,
    trainings,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fail fast if recruitment officer accounts are not configured.
    # JWT_SECRET is already validated at import time in routes/recruitment_officers.py.
    recruitment_officers.load_recruitment_officer_accounts()
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
app.include_router(membership_applications.router, prefix="/api/membership-applications", tags=["membership-applications"])
app.include_router(recruitment_officers.router, prefix="/api/recruitment-officers", tags=["recruitment-officers"])

# Static files (must be mounted after API routes so /api/* takes precedence)
app.mount("/", StaticFiles(directory="../public", html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 5000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
