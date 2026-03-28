from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.routes import parse, estimate, recommend, simulate

app = FastAPI(title="WattWise API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(parse.router, prefix="/api")
app.include_router(estimate.router, prefix="/api")
app.include_router(recommend.router, prefix="/api")
app.include_router(simulate.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
