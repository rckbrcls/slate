from __future__ import annotations

import hashlib
import re
from pathlib import Path
from typing import Any

from .models import (
    BoundingBox,
    DocumentElement,
    DocumentMetadata,
    DocumentPage,
    DocumentSection,
    Provenance,
    SlateDocument,
)


PARSER_VERSION = "slate-normalizer-1"
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".md", ".markdown", ".txt", ".fountain"}


class UnsupportedDocumentError(ValueError):
    pass


class EmptyDocumentError(ValueError):
    pass


def content_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _element_id(kind: str, text: str, index: int) -> str:
    fingerprint = hashlib.sha256(f"{kind}\0{text.strip()}\0{index}".encode()).hexdigest()
    return f"element-{fingerprint[:20]}"


def _normalized_document(
    source: Path,
    digest: str,
    blocks: list[tuple[str, str, int | None, BoundingBox | None]],
) -> SlateDocument:
    elements: list[DocumentElement] = []
    provenance: list[Provenance] = []
    text_parts: list[str] = []
    offset = 0

    for index, (kind, raw_text, page, box) in enumerate(blocks):
        text = raw_text.strip()
        if not text:
            continue
        if text_parts:
            text_parts.append("\n\n")
            offset += 2
        start = offset
        text_parts.append(text)
        offset += len(text)
        element_id = _element_id(kind, text, index)
        elements.append(
            DocumentElement(
                id=element_id,
                kind=kind,
                text=text,
                charStart=start,
                charEnd=offset,
                page=page,
                boundingBox=box,
            )
        )
        provenance.append(
            Provenance(
                elementId=element_id,
                source=source.name,
                page=page,
                boundingBox=box,
            )
        )

    text = "".join(text_parts).strip()
    if not text:
        if source.suffix.lower() == ".pdf":
            raise EmptyDocumentError(
                "This PDF contains no extractable text. Scanned PDFs require OCR, which is not available yet."
            )
        raise EmptyDocumentError("This document contains no extractable text.")

    sections: list[DocumentSection] = []
    current: DocumentSection | None = None
    for element in elements:
        if element.kind == "heading":
            current = DocumentSection(
                id=f"section-{len(sections) + 1}",
                title=element.text,
                level=1,
                elementIds=[element.id],
            )
            sections.append(current)
        elif current is not None:
            current.element_ids.append(element.id)

    page_numbers = sorted({element.page for element in elements if element.page is not None})
    pages = [DocumentPage(number=page) for page in page_numbers]

    return SlateDocument(
        parserVersion=PARSER_VERSION,
        metadata=DocumentMetadata(
            sourceName=source.name,
            sourceFormat=source.suffix.lower().lstrip("."),
            contentHash=digest,
            title=sections[0].title if sections else source.stem,
        ),
        text=text,
        pages=pages,
        sections=sections,
        elements=elements,
        provenance=provenance,
    )


def _plain_blocks(text: str, markdown: bool = False) -> list[tuple[str, str, None, None]]:
    blocks: list[tuple[str, str, None, None]] = []
    for block in re.split(r"\n\s*\n", text):
        clean = block.strip()
        if not clean:
            continue
        if markdown and re.match(r"^#{1,6}\s+", clean):
            blocks.append(("heading", re.sub(r"^#{1,6}\s+", "", clean), None, None))
        elif all(line.lstrip().startswith(("- ", "* ", "+ ")) for line in clean.splitlines()):
            for line in clean.splitlines():
                blocks.append(("bullet", line.lstrip()[2:].strip(), None, None))
        else:
            blocks.append(("paragraph", clean, None, None))
    return blocks


def _fountain_blocks(text: str) -> list[tuple[str, str, None, None]]:
    blocks: list[tuple[str, str, None, None]] = []
    scene_pattern = re.compile(r"^(INT\.|EXT\.|INT\./EXT\.|I/E\.)", re.IGNORECASE)
    action_lines: list[str] = []
    dialogue_lines: list[str] = []
    expecting_dialogue = False

    def flush_action() -> None:
        if action_lines:
            blocks.append(("action", "\n".join(action_lines).strip(), None, None))
            action_lines.clear()

    def flush_dialogue() -> None:
        nonlocal expecting_dialogue
        if dialogue_lines:
            blocks.append(("dialogue", "\n".join(dialogue_lines).strip(), None, None))
            dialogue_lines.clear()
        expecting_dialogue = False

    for raw_line in text.splitlines():
        clean = raw_line.strip()
        if not clean:
            flush_dialogue()
            flush_action()
            continue
        if expecting_dialogue:
            dialogue_lines.append(clean)
            continue
        if scene_pattern.match(clean):
            flush_action()
            blocks.append(("scene-heading", clean, None, None))
        elif clean.startswith("#"):
            flush_action()
            blocks.append(("heading", clean.lstrip("#").strip(), None, None))
        elif clean == clean.upper() and len(clean) <= 48 and not clean.startswith(("TITLE:", "AUTHOR:", "CREDIT:")):
            flush_action()
            blocks.append(("character", clean, None, None))
            expecting_dialogue = True
        else:
            action_lines.append(clean)
    flush_dialogue()
    flush_action()
    return blocks


def _box_from_prov(prov: Any) -> tuple[int | None, BoundingBox | None]:
    if prov is None:
        return None, None
    page = getattr(prov, "page_no", None)
    bbox = getattr(prov, "bbox", None)
    if bbox is None:
        return page, None
    try:
        return page, BoundingBox(
            left=float(bbox.l),
            top=float(bbox.t),
            right=float(bbox.r),
            bottom=float(bbox.b),
        )
    except (AttributeError, TypeError, ValueError):
        return page, None


def _docling_blocks(source: Path) -> list[tuple[str, str, int | None, BoundingBox | None]]:
    try:
        from docling.datamodel.base_models import InputFormat
        from docling.datamodel.pipeline_options import PdfPipelineOptions
        from docling.document_converter import DocumentConverter, PdfFormatOption
    except ImportError as error:
        raise RuntimeError("Docling is required to import PDF and DOCX files.") from error

    formats = [InputFormat.PDF] if source.suffix.lower() == ".pdf" else [InputFormat.DOCX]
    options: dict[Any, Any] = {}
    if source.suffix.lower() == ".pdf":
        pipeline = PdfPipelineOptions()
        pipeline.do_ocr = False
        options[InputFormat.PDF] = PdfFormatOption(pipeline_options=pipeline)
    converter = DocumentConverter(allowed_formats=formats, format_options=options)
    document = converter.convert(source).document
    blocks: list[tuple[str, str, int | None, BoundingBox | None]] = []

    for item, _level in document.iterate_items():
        text = getattr(item, "text", None)
        if not isinstance(text, str) or not text.strip():
            continue
        label = str(getattr(item, "label", "paragraph")).lower()
        if "title" in label or "heading" in label or "section_header" in label:
            kind = "heading"
        elif "list_item" in label or "bullet" in label:
            kind = "bullet"
        else:
            kind = "paragraph"
        prov_list = getattr(item, "prov", None) or []
        page, box = _box_from_prov(prov_list[0] if prov_list else None)
        blocks.append((kind, text, page, box))
    return blocks


def normalize_document(source: Path) -> SlateDocument:
    suffix = source.suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise UnsupportedDocumentError(
            "Unsupported format. Use PDF, DOCX, Markdown, plain text, or Fountain."
        )
    digest = content_hash(source)
    if suffix in {".pdf", ".docx"}:
        blocks = _docling_blocks(source)
    else:
        text = source.read_text(encoding="utf-8-sig")
        if suffix == ".fountain":
            blocks = _fountain_blocks(text)
        else:
            blocks = _plain_blocks(text, markdown=suffix in {".md", ".markdown"})
    return _normalized_document(source, digest, blocks)
