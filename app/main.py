from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.database import init_db, SessionLocal


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database
    init_db()
    print("Database initialized")

    yield

    # Shutdown: Clean up resources
    print("Shutting down application")
    SessionLocal.close_all()


app = FastAPI(
    title="Net Worth Tracker API",
    description="API for tracking personal net worth.",
    version="0.1.0",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# Include API routes
app.include_router(api_router, prefix="/api")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to the Net Worth Tracker API",
        "docs": "/api/docs or /api/redoc",
        "openapi_schema": "/api/openapi.json",
    }


# Import and include routers here
# from app.routers import users, accounts, values
# app.include_router(users.router, prefix="/api/users", tags=["users"])
# app.include_router(accounts.router, prefix="/api/accounts", tags=["accounts"])
# app.include_router(values.router, prefix="/api/values", tags=["values"])

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
