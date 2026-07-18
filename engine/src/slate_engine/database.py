from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import sys

from alembic import command
from alembic.config import Config
from sqlalchemy import Float, ForeignKey, Integer, String, Text, UniqueConstraint, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Base(DeclarativeBase):
    pass


class ProjectRow(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    document_id: Mapped[str] = mapped_column(String, nullable=False)
    analysis_pack: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[str] = mapped_column(String, nullable=False)


class DocumentVersionRow(Base):
    __tablename__ = "document_versions"
    __table_args__ = (UniqueConstraint("project_id", "content_hash"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False)
    ordinal: Mapped[int] = mapped_column(Integer, nullable=False)
    source_name: Mapped[str] = mapped_column(String, nullable=False)
    source_format: Mapped[str] = mapped_column(String, nullable=False)
    content_hash: Mapped[str] = mapped_column(String, nullable=False)
    object_path: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_path: Mapped[str] = mapped_column(Text, nullable=False)
    imported_at: Mapped[str] = mapped_column(String, nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    analyses: Mapped[list[AnalysisRunRow]] = relationship(cascade="all, delete-orphan")


class AnalysisPackRow(Base):
    __tablename__ = "analysis_packs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    version: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)


class AnalysisRunRow(Base):
    __tablename__ = "analysis_runs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    version_id: Mapped[str] = mapped_column(ForeignKey("document_versions.id"), nullable=False)
    pack_id: Mapped[str] = mapped_column(ForeignKey("analysis_packs.id"), nullable=False)
    algorithm_version: Mapped[str] = mapped_column(String, nullable=False)
    started_at: Mapped[str] = mapped_column(String, nullable=False)
    completed_at: Mapped[str] = mapped_column(String, nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    metrics: Mapped[list[MetricResultRow]] = relationship(cascade="all, delete-orphan")
    findings: Mapped[list[FindingRow]] = relationship(cascade="all, delete-orphan")


class MetricDefinitionRow(Base):
    __tablename__ = "metric_definitions"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    label: Mapped[str] = mapped_column(String, nullable=False)
    kind: Mapped[str] = mapped_column(String, nullable=False)
    unit: Mapped[str | None] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text, nullable=False)


class MetricResultRow(Base):
    __tablename__ = "metric_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("analysis_runs.id"), nullable=False)
    metric_key: Mapped[str] = mapped_column(ForeignKey("metric_definitions.key"), nullable=False)
    value_json: Mapped[str] = mapped_column(Text, nullable=False)


class FindingRow(Base):
    __tablename__ = "findings"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("analysis_runs.id"), nullable=False)
    key: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String, nullable=False)
    criterion: Mapped[str] = mapped_column(Text, nullable=False)
    element_ids_json: Mapped[str] = mapped_column(Text, nullable=False)


class AnnotationRow(Base):
    __tablename__ = "annotations"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    finding_id: Mapped[str] = mapped_column(ForeignKey("findings.id"), nullable=False)
    element_id: Mapped[str | None] = mapped_column(String)
    page: Mapped[int | None] = mapped_column(Integer)
    left: Mapped[float | None] = mapped_column(Float)
    top: Mapped[float | None] = mapped_column(Float)
    right: Mapped[float | None] = mapped_column(Float)
    bottom: Mapped[float | None] = mapped_column(Float)


class ComparisonRow(Base):
    __tablename__ = "comparisons"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False)
    base_version_id: Mapped[str] = mapped_column(ForeignKey("document_versions.id"), nullable=False)
    target_version_id: Mapped[str] = mapped_column(ForeignKey("document_versions.id"), nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False)
    result_json: Mapped[str] = mapped_column(Text, nullable=False)


PACKS = (
    ("general-v1", "General Document", "1", "Deterministic structure and language metrics."),
    ("resume-v1", "Resume", "1", "Deterministic resume structure and evidence metrics."),
    ("screenplay-v1", "Screenplay", "1", "Deterministic screenplay structure and pacing metrics."),
)


def open_project_database(project_path: Path) -> tuple[Session, object]:
    engine = create_engine(f"sqlite:///{project_path / 'project.sqlite'}")
    migration_root = (
        Path(getattr(sys, "_MEIPASS")) / "migrations"
        if hasattr(sys, "_MEIPASS")
        else Path(__file__).resolve().parents[2] / "migrations"
    )
    alembic_config = Config()
    alembic_config.set_main_option("script_location", str(migration_root))
    alembic_config.set_main_option("sqlalchemy.url", f"sqlite:///{project_path / 'project.sqlite'}")
    command.upgrade(alembic_config, "head")
    session = Session(engine)
    for pack_id, name, version, description in PACKS:
        if session.get(AnalysisPackRow, pack_id) is None:
            session.add(
                AnalysisPackRow(
                    id=pack_id,
                    name=name,
                    version=version,
                    description=description,
                )
            )
    session.commit()
    return session, engine
