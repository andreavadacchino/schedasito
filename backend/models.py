from __future__ import annotations

from typing import Optional
from sqlmodel import Field, SQLModel


class Project(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str


class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    project_id: int = Field(foreign_key="project.id")
