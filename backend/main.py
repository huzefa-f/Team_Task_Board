from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, project, tasks, notifications

app = FastAPI(title="Team Task Board API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(project.router)
app.include_router(tasks.router)
app.include_router(notifications.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}