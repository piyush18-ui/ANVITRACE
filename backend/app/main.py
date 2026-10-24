"""ANVITRACE — FastAPI Application Entry Point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import settings
from app.database.duckdb import close, connect
from app.routers.cases import cases_router
from app.routers.dataset import router as dataset_router
from app.routers.evidence import documents_router, evidence_router
from app.routers.investigations import account_router, investigation_router
from app.routers.recovery import router as recovery_router
from app.routers.syndicate import router as syndicate_router
from app.utils.logging import logger


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Application lifespan: startup and shutdown hooks."""
    logger.info("Starting up ANVITRACE backend platform...")
    connect()
    logger.info("DuckDB connected and canonical schema applied.")
    yield
    logger.info("Shutting down ANVITRACE backend platform...")
    close()
    logger.info("DuckDB connection closed safely.")


app = FastAPI(
    title=settings.APP_NAME,
    description="Offline cyber-forensics platform for financial transaction analysis and money-mule investigation.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for local forensic UI / inspection tools
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["system"])
@app.get("/api/health", tags=["system"])
async def health_check():
    """System health check endpoint."""
    return {
        "status": "ok",
        "project": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "database": "DuckDB (Embedded)",
        "offline": True,
    }



# Register functional routers
app.include_router(dataset_router, prefix="/api")
app.include_router(account_router, prefix="/api")
app.include_router(investigation_router, prefix="/api")
app.include_router(recovery_router, prefix="/api")
app.include_router(syndicate_router, prefix="/api")
app.include_router(evidence_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(cases_router, prefix="/api")

# Serve offline compiled frontend
frontend_dist = settings.frontend_dist_path
if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    from fastapi.responses import FileResponse, JSONResponse
    from fastapi.staticfiles import StaticFiles

    logger.info(f"Mounting offline frontend static assets from: {frontend_dist}")
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")

    @app.exception_handler(404)
    async def spa_404_handler(request, exc):
        # Allow API 404s to return standard JSON 404
        if request.url.path.startswith("/api") or request.url.path in ("/docs", "/redoc", "/openapi.json"):
            return JSONResponse(status_code=404, content={"detail": "Not Found"})
        # Otherwise serve index.html for SPA client-side routing
        index_file = frontend_dist / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return JSONResponse(status_code=404, content={"detail": "Not Found"})


