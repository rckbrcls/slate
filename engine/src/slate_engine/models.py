from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class BoundingBox(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    left: float
    top: float
    right: float
    bottom: float


class DocumentMetadata(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    source_name: str = Field(alias="sourceName")
    source_format: str = Field(alias="sourceFormat")
    content_hash: str = Field(alias="contentHash", pattern=r"^[a-f0-9]{64}$")
    title: str | None = None
    author: str | None = None


class DocumentPage(BaseModel):
    number: int = Field(ge=1)
    width: float | None = None
    height: float | None = None


class DocumentElement(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    kind: str
    text: str
    char_start: int = Field(alias="charStart", ge=0)
    char_end: int = Field(alias="charEnd", ge=0)
    page: int | None = Field(default=None, ge=1)
    bounding_box: BoundingBox | None = Field(default=None, alias="boundingBox")


class DocumentSection(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    level: int = Field(ge=1)
    element_ids: list[str] = Field(alias="elementIds")


class Provenance(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    element_id: str = Field(alias="elementId")
    source: str
    page: int | None = Field(default=None, ge=1)
    bounding_box: BoundingBox | None = Field(default=None, alias="boundingBox")


class SlateDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    schema_version: Literal["1.0.0"] = Field(default="1.0.0", alias="schemaVersion")
    parser_version: str = Field(alias="parserVersion")
    metadata: DocumentMetadata
    text: str
    pages: list[DocumentPage]
    sections: list[DocumentSection]
    elements: list[DocumentElement]
    provenance: list[Provenance]


class MetricValue(BaseModel):
    key: str
    label: str
    value: float | int | str | list[Any] | dict[str, Any]
    kind: Literal["number", "percentage", "text", "list", "distribution"]
    unit: str | None = None
    description: str


class FindingValue(BaseModel):
    key: str
    title: str
    description: str
    severity: Literal["info", "warning", "error"]
    criterion: str
    element_ids: list[str] = Field(default_factory=list, alias="elementIds")


class AnalysisResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    run_id: str = Field(alias="runId")
    version_id: str = Field(alias="versionId")
    pack_id: str = Field(alias="packId")
    algorithm_version: str = Field(alias="algorithmVersion")
    started_at: str = Field(alias="startedAt")
    completed_at: str = Field(alias="completedAt")
    duration_ms: int = Field(alias="durationMs")
    metrics: list[MetricValue]
    findings: list[FindingValue]
