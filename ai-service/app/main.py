import hmac

from fastapi import Depends, FastAPI, HTTPException, Security
from fastapi.security import APIKeyHeader

from app.config import get_settings
from app.routes import grading, projects, reviews

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def verify_api_key(api_key: str | None = Security(api_key_header)) -> None:
    expected = get_settings().ai_service_api_key
    if not expected or api_key is None or not hmac.compare_digest(api_key, expected):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


app = FastAPI(
    title="Eduverse AI Service",
    description="Gemini-backed endpoints: review, zalo summary, feature suggestions, grading.",
)

# /health không cần key — Render dùng để health-check.
@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


protected = [Depends(verify_api_key)]
app.include_router(reviews.router, dependencies=protected)
app.include_router(projects.router, dependencies=protected)
app.include_router(grading.router, dependencies=protected)
