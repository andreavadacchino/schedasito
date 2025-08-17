from __future__ import annotations

from typing import List

from fastapi import Depends, FastAPI
from sqlmodel import Session, select

from .database import get_session, init_db
from .models import Project, Task

app = FastAPI(title="SchedaSito API")


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/projects/", response_model=List[Project])
def read_projects(session: Session = Depends(get_session)) -> List[Project]:
    return session.exec(select(Project)).all()


@app.post("/projects/", response_model=Project)
def create_project(
    project: Project, session: Session = Depends(get_session)
) -> Project:
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@app.get("/tasks/", response_model=List[Task])
def read_tasks(session: Session = Depends(get_session)) -> List[Task]:
    return session.exec(select(Task)).all()


@app.post("/tasks/", response_model=Task)
def create_task(task: Task, session: Session = Depends(get_session)) -> Task:
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
