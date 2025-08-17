from __future__ import annotations

from sqlmodel import SQLModel, Session, create_engine, select

from .models import Project, Task

sqlite_url = "sqlite:///./database.db"
engine = create_engine(sqlite_url, echo=False)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        if not session.exec(select(Project)).first():
            session.add_all(
                [Project(name="Progetto Alpha"), Project(name="Progetto Beta")]
            )
            session.commit()
        if not session.exec(select(Task)).first():
            session.add_all(
                [
                    Task(title="Task iniziale", project_id=1),
                    Task(title="Secondo Task", project_id=2),
                ]
            )
            session.commit()


def get_session() -> Session:
    with Session(engine) as session:
        yield session
