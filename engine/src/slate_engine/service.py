from __future__ import annotations

import json
import shutil
import time
import uuid
from pathlib import Path
from typing import Any, Callable

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from .analysis import ALGORITHM_VERSION, analyze
from .comparison import compare_versions
from .database import (
    AnalysisRunRow,
    AnnotationRow,
    ComparisonRow,
    DocumentVersionRow,
    FindingRow,
    MetricDefinitionRow,
    MetricResultRow,
    ProjectRow,
    open_project_database,
    utc_now,
)
from .models import AnalysisResult, FindingValue, MetricValue, SlateDocument
from .normalization import normalize_document


ProgressCallback = Callable[[str, int, str], None]
PACK_IDS = {"general-v1", "resume-v1", "screenplay-v1"}


def _project_dir(value: str) -> Path:
    path = Path(value).expanduser().resolve()
    if not path.exists() or not path.is_dir():
        raise ValueError("Project directory does not exist.")
    return path


def _project_summary(project: ProjectRow, project_path: Path, version_count: int) -> dict[str, Any]:
    return {
        "id": project.id,
        "name": project.name,
        "path": str(project_path),
        "analysisPack": project.analysis_pack,
        "createdAt": project.created_at,
        "updatedAt": project.updated_at,
        "versionCount": version_count,
    }


def _version_summary(version: DocumentVersionRow) -> dict[str, Any]:
    return {
        "id": version.id,
        "ordinal": version.ordinal,
        "sourceName": version.source_name,
        "sourceFormat": version.source_format,
        "contentHash": version.content_hash,
        "importedAt": version.imported_at,
        "note": version.note,
    }


def _load_document(project_path: Path, version: DocumentVersionRow) -> SlateDocument:
    payload = json.loads((project_path / version.normalized_path).read_text(encoding="utf-8"))
    return SlateDocument.model_validate(payload)


def _load_analysis(session: Any, version_id: str, pack_id: str) -> AnalysisResult:
    run = session.scalar(
        select(AnalysisRunRow)
        .where(AnalysisRunRow.version_id == version_id, AnalysisRunRow.pack_id == pack_id)
        .order_by(AnalysisRunRow.completed_at.desc())
    )
    if run is None:
        raise ValueError("Analysis is not available for this version and pack.")
    metrics: list[MetricValue] = []
    for result in run.metrics:
        definition = session.get(MetricDefinitionRow, result.metric_key)
        if definition is None:
            continue
        metrics.append(
            MetricValue(
                key=definition.key,
                label=definition.label,
                value=json.loads(result.value_json),
                kind=definition.kind,  # type: ignore[arg-type]
                unit=definition.unit,
                description=definition.description,
            )
        )
    findings = [
        FindingValue(
            key=finding.key,
            title=finding.title,
            description=finding.description,
            severity=finding.severity,  # type: ignore[arg-type]
            criterion=finding.criterion,
            elementIds=json.loads(finding.element_ids_json),
        )
        for finding in run.findings
    ]
    return AnalysisResult(
        runId=run.id,
        versionId=run.version_id,
        packId=run.pack_id,
        algorithmVersion=run.algorithm_version,
        startedAt=run.started_at,
        completedAt=run.completed_at,
        durationMs=run.duration_ms,
        metrics=metrics,
        findings=findings,
    )


class SlateService:
    def create_project(self, params: dict[str, Any]) -> dict[str, Any]:
        project_path = _project_dir(str(params.get("path", "")))
        name = str(params.get("name", "")).strip()
        pack_id = str(params.get("analysisPack", "general-v1"))
        if not name:
            raise ValueError("Project name is required.")
        if pack_id not in PACK_IDS:
            raise ValueError("Unknown analysis pack.")
        if (project_path / "project.sqlite").exists():
            raise ValueError("This directory already contains a Slate project.")

        for directory in ("objects", "normalized", "artifacts"):
            (project_path / directory).mkdir(parents=True, exist_ok=True)
        session, engine = open_project_database(project_path)
        try:
            timestamp = utc_now()
            project = ProjectRow(
                id=str(uuid.uuid4()),
                name=name,
                document_id=str(uuid.uuid4()),
                analysis_pack=pack_id,
                created_at=timestamp,
                updated_at=timestamp,
            )
            session.add(project)
            session.commit()
            return _project_summary(project, project_path, 0)
        finally:
            session.close()
            engine.dispose()

    def open_project(self, params: dict[str, Any]) -> dict[str, Any]:
        project_path = _project_dir(str(params.get("path", "")))
        if not (project_path / "project.sqlite").is_file():
            raise ValueError("The selected directory is not a Slate project.")
        session, engine = open_project_database(project_path)
        try:
            project = session.scalar(select(ProjectRow).limit(1))
            if project is None:
                raise ValueError("The Slate project metadata is missing.")
            version_count = session.scalar(
                select(func.count()).select_from(DocumentVersionRow).where(
                    DocumentVersionRow.project_id == project.id
                )
            ) or 0
            return _project_summary(project, project_path, int(version_count))
        finally:
            session.close()
            engine.dispose()

    def set_analysis_pack(self, params: dict[str, Any]) -> dict[str, Any]:
        project_path = _project_dir(str(params.get("projectPath", "")))
        pack_id = str(params.get("analysisPack", ""))
        if pack_id not in PACK_IDS:
            raise ValueError("Unknown analysis pack.")
        session, engine = open_project_database(project_path)
        try:
            project = session.scalar(select(ProjectRow).limit(1))
            if project is None:
                raise ValueError("Project metadata is missing.")
            project.analysis_pack = pack_id
            project.updated_at = utc_now()
            versions = list(
                session.scalars(
                    select(DocumentVersionRow)
                    .where(DocumentVersionRow.project_id == project.id)
                    .order_by(DocumentVersionRow.ordinal)
                )
            )
            for version in versions:
                document = _load_document(project_path, version)
                self._persist_analysis(session, version, document, pack_id)
            session.commit()
            return _project_summary(project, project_path, len(versions))
        finally:
            session.close()
            engine.dispose()

    def import_version(
        self,
        params: dict[str, Any],
        progress: ProgressCallback | None = None,
    ) -> dict[str, Any]:
        project_path = _project_dir(str(params.get("projectPath", "")))
        source_path = Path(str(params.get("sourcePath", ""))).expanduser().resolve()
        note = str(params.get("note", "")).strip() or None
        if not source_path.is_file():
            raise ValueError("The selected document does not exist.")
        if progress:
            progress("normalizing", 15, "Extracting document structure")
        document = normalize_document(source_path)
        session, engine = open_project_database(project_path)
        try:
            project = session.scalar(select(ProjectRow).limit(1))
            if project is None:
                raise ValueError("Project metadata is missing.")
            existing = session.scalar(
                select(DocumentVersionRow).where(
                    DocumentVersionRow.project_id == project.id,
                    DocumentVersionRow.content_hash == document.metadata.content_hash,
                )
            )
            if existing is not None:
                raise ValueError("This exact document content is already in the version timeline.")

            ordinal = int(
                session.scalar(
                    select(func.coalesce(func.max(DocumentVersionRow.ordinal), 0)).where(
                        DocumentVersionRow.project_id == project.id
                    )
                )
                or 0
            ) + 1
            version_id = str(uuid.uuid4())
            extension = source_path.suffix.lower()
            object_name = f"{document.metadata.content_hash}{extension}"
            object_relative = Path("objects") / object_name
            normalized_relative = Path("normalized") / f"{version_id}.json"
            destination = project_path / object_relative
            if not destination.exists():
                shutil.copy2(source_path, destination)
            (project_path / normalized_relative).write_text(
                document.model_dump_json(by_alias=True, indent=2),
                encoding="utf-8",
            )
            imported_at = utc_now()
            version = DocumentVersionRow(
                id=version_id,
                project_id=project.id,
                ordinal=ordinal,
                source_name=source_path.name,
                source_format=extension.lstrip("."),
                content_hash=document.metadata.content_hash,
                object_path=str(object_relative),
                normalized_path=str(normalized_relative),
                imported_at=imported_at,
                note=note,
            )
            session.add(version)
            session.flush()
            if progress:
                progress("analyzing", 65, f"Running {project.analysis_pack}")
            analysis = self._persist_analysis(
                session, version, document, project.analysis_pack
            )
            project.updated_at = imported_at
            session.commit()
            if progress:
                progress("ready", 100, "Version imported")
            return {
                "version": _version_summary(version),
                "analysis": analysis.model_dump(by_alias=True),
            }
        except IntegrityError as error:
            session.rollback()
            raise ValueError("This exact document content is already in the version timeline.") from error
        finally:
            session.close()
            engine.dispose()

    def _persist_analysis(
        self,
        session: Any,
        version: DocumentVersionRow,
        document: SlateDocument,
        pack_id: str,
    ) -> AnalysisResult:
        existing = session.scalar(
            select(AnalysisRunRow).where(
                AnalysisRunRow.version_id == version.id,
                AnalysisRunRow.pack_id == pack_id,
                AnalysisRunRow.algorithm_version == ALGORITHM_VERSION,
            )
        )
        if existing is not None:
            return _load_analysis(session, version.id, pack_id)
        started_at = utc_now()
        started = time.perf_counter()
        metrics, findings = analyze(document, pack_id)
        completed_at = utc_now()
        duration_ms = max(0, round((time.perf_counter() - started) * 1000))
        run = AnalysisRunRow(
            id=str(uuid.uuid4()),
            version_id=version.id,
            pack_id=pack_id,
            algorithm_version=ALGORITHM_VERSION,
            started_at=started_at,
            completed_at=completed_at,
            duration_ms=duration_ms,
        )
        session.add(run)
        session.flush()
        for metric in metrics:
            definition = session.get(MetricDefinitionRow, metric.key)
            if definition is None:
                session.add(
                    MetricDefinitionRow(
                        key=metric.key,
                        label=metric.label,
                        kind=metric.kind,
                        unit=metric.unit,
                        description=metric.description,
                    )
                )
                session.flush()
            session.add(
                MetricResultRow(
                    run_id=run.id,
                    metric_key=metric.key,
                    value_json=json.dumps(metric.value, ensure_ascii=False),
                )
            )
        element_map = {element.id: element for element in document.elements}
        for finding in findings:
            finding_id = str(uuid.uuid4())
            session.add(
                FindingRow(
                    id=finding_id,
                    run_id=run.id,
                    key=finding.key,
                    title=finding.title,
                    description=finding.description,
                    severity=finding.severity,
                    criterion=finding.criterion,
                    element_ids_json=json.dumps(finding.element_ids),
                )
            )
            for element_id in finding.element_ids:
                element = element_map.get(element_id)
                box = element.bounding_box if element else None
                session.add(
                    AnnotationRow(
                        id=str(uuid.uuid4()),
                        finding_id=finding_id,
                        element_id=element_id,
                        page=element.page if element else None,
                        left=box.left if box else None,
                        top=box.top if box else None,
                        right=box.right if box else None,
                        bottom=box.bottom if box else None,
                    )
                )
        session.flush()
        return AnalysisResult(
            runId=run.id,
            versionId=version.id,
            packId=pack_id,
            algorithmVersion=ALGORITHM_VERSION,
            startedAt=started_at,
            completedAt=completed_at,
            durationMs=duration_ms,
            metrics=metrics,
            findings=findings,
        )

    def list_versions(self, params: dict[str, Any]) -> list[dict[str, Any]]:
        project_path = _project_dir(str(params.get("projectPath", "")))
        session, engine = open_project_database(project_path)
        try:
            project = session.scalar(select(ProjectRow).limit(1))
            if project is None:
                return []
            versions = session.scalars(
                select(DocumentVersionRow)
                .where(DocumentVersionRow.project_id == project.id)
                .order_by(DocumentVersionRow.ordinal.desc())
            )
            return [_version_summary(version) for version in versions]
        finally:
            session.close()
            engine.dispose()

    def get_document(self, params: dict[str, Any]) -> dict[str, Any]:
        project_path = _project_dir(str(params.get("projectPath", "")))
        version_id = str(params.get("versionId", ""))
        session, engine = open_project_database(project_path)
        try:
            version = session.get(DocumentVersionRow, version_id)
            if version is None:
                raise ValueError("Document version was not found.")
            document = _load_document(project_path, version)
            return document.model_dump(by_alias=True)
        finally:
            session.close()
            engine.dispose()

    def get_document_asset_path(self, params: dict[str, Any]) -> str:
        project_path = _project_dir(str(params.get("projectPath", "")))
        version_id = str(params.get("versionId", ""))
        session, engine = open_project_database(project_path)
        try:
            version = session.get(DocumentVersionRow, version_id)
            if version is None:
                raise ValueError("Document version was not found.")
            asset_path = (project_path / version.object_path).resolve()
            if project_path not in asset_path.parents or not asset_path.is_file():
                raise ValueError("The immutable document asset is unavailable.")
            return str(asset_path)
        finally:
            session.close()
            engine.dispose()

    def get_analysis(self, params: dict[str, Any]) -> dict[str, Any]:
        project_path = _project_dir(str(params.get("projectPath", "")))
        version_id = str(params.get("versionId", ""))
        pack_id = str(params.get("analysisPack", ""))
        session, engine = open_project_database(project_path)
        try:
            result = _load_analysis(session, version_id, pack_id)
            return result.model_dump(by_alias=True)
        finally:
            session.close()
            engine.dispose()

    def create_comparison(self, params: dict[str, Any]) -> dict[str, Any]:
        project_path = _project_dir(str(params.get("projectPath", "")))
        base_id = str(params.get("baseVersionId", ""))
        target_id = str(params.get("targetVersionId", ""))
        if not base_id or not target_id or base_id == target_id:
            raise ValueError("Choose two different versions to compare.")
        session, engine = open_project_database(project_path)
        try:
            project = session.scalar(select(ProjectRow).limit(1))
            base = session.get(DocumentVersionRow, base_id)
            target = session.get(DocumentVersionRow, target_id)
            if project is None or base is None or target is None:
                raise ValueError("One or more comparison versions were not found.")
            base_analysis = _load_analysis(session, base.id, project.analysis_pack)
            target_analysis = _load_analysis(session, target.id, project.analysis_pack)
            result = compare_versions(
                _load_document(project_path, base),
                _load_document(project_path, target),
                base_analysis,
                target_analysis,
            )
            comparison_id = str(uuid.uuid4())
            created_at = utc_now()
            session.add(
                ComparisonRow(
                    id=comparison_id,
                    project_id=project.id,
                    base_version_id=base.id,
                    target_version_id=target.id,
                    created_at=created_at,
                    result_json=json.dumps(result, ensure_ascii=False),
                )
            )
            session.commit()
            return {
                "id": comparison_id,
                "baseVersionId": base.id,
                "targetVersionId": target.id,
                "createdAt": created_at,
                **result,
            }
        finally:
            session.close()
            engine.dispose()
