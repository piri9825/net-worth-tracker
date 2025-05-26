from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Net Worth Tracker API",
    description="API for tracking personal net worth.",
    version="0.1.0",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

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
