# Product Strategy: Versioned Document Intelligence

## Decision

Slate is transitioning from a Fountain screenplay editor into a local-first desktop
application for measuring and comparing the evolution of textual documents.

The product promise is:

> Import immutable versions of a document, run reproducible analysis packs, and
> understand what changed, improved, regressed, or remained unresolved over time.

The product remains a standalone project in this repository under the `rckbrcls`
personal brand. It does not need a separate marketing site and should remain off
public portfolio surfaces until the MVP is demonstrable.

## Product Boundary

Slate is not a document editor, a generic PDF chat interface, or an AI writing
assistant. Its primary job is observation and comparison.

The initial user is an individual repeatedly revising one logical document, such as
a resume, screenplay, article, report, or proposal. A project follows that document
through an ordered timeline of explicitly imported versions.

The MVP succeeds when a user can:

1. Create a project and choose an analysis pack.
2. Import a supported textual document as an immutable version.
3. Inspect deterministic metrics and findings linked to its content.
4. Import a changed version of the same document.
5. Compare metrics, content changes, resolved findings, and regressions.

## Evaluation Model

Slate deliberately separates three concepts:

- **Metrics** are deterministic measurements such as word count, sentence length,
  section coverage, dialogue ratio, or repeated terms.
- **Evaluations** interpret explicit criteria and must retain their evidence and
  algorithm version.
- **Rankings** compare documents against a known corpus or benchmark.

The MVP implements metrics and deterministic findings. It does not produce an
arbitrary overall score or rank unrelated documents.

## MVP Scope

### Formats

- Textual PDF files
- DOCX
- Markdown
- Plain text
- Fountain

Scanned or image-only PDFs are reported as unsupported. OCR is intentionally
deferred.

### Analysis Packs

Analysis pack identifiers are versioned strings rather than a closed enum.

- `general-v1`: document size, structure, readability, lexical diversity,
  frequent terms, repetition, and text distribution.
- `resume-v1`: general metrics plus expected sections, bullet structure,
  quantified-result ratio, density, and deterministic missing/excessive-content
  findings.
- `screenplay-v1`: screenplay structure, pages, estimated duration, scenes,
  characters, action/dialogue balance, pacing, readability, beats, and character
  interaction.

Changing a pack creates a new analysis run for the same version. It does not create
a document version.

### Primary Experience

The application has two primary surfaces:

1. A compact project list for creating and reopening local projects.
2. An analysis workspace with a version timeline and three views:
   - `Overview` for key metrics, deltas, trends, and frequent terms.
   - `Document` for a paginated PDF or normalized document reader with filters.
   - `Compare` for selecting two versions and reviewing content and metric changes.

The primary interface excludes editing, autosave, export, file browsing, Git
history, production tools, and chat.

## Conceptual Model

- `Project`: one logical document and its selected default analysis pack.
- `Document`: stable identity for the work tracked by the project.
- `DocumentVersion`: immutable imported source, content hash, normalized document,
  import note, and timestamp.
- `AnalysisPack`: versioned deterministic criteria and metric definitions.
- `AnalysisRun`: a reproducible execution against one document version.
- `MetricDefinition` and `MetricResult`: typed measurement metadata and values.
- `Finding`: deterministic issue or observation with explicit criteria.
- `Annotation`: connection between a finding and normalized or visual content.
- `Comparison`: derived relationship between two versions and their analysis runs.

Findings may be classified as `new`, `persistent`, `resolved`, or `regressed` when
two compatible analyses are compared.

## Target Architecture

Slate keeps its Electron, React, TypeScript, Vite, Tailwind, and existing component
foundation.

The target runtime adds a Python sidecar managed by `uv`:

```text
React renderer
  -> typed Electron preload API
  -> Electron main process
  -> JSON-RPC over stdin/stdout
  -> Python analysis sidecar
  -> project.sqlite + project object vault
```

The renderer never receives Node.js, filesystem, database, subprocess, or raw IPC
access. Electron owns the sidecar lifecycle, while Python owns normalization,
analysis, comparison, and project persistence.

Each portable project directory uses this layout:

```text
SlateProject/
|-- project.sqlite
|-- objects/
|   `-- <content-hash>.<extension>
|-- normalized/
|   `-- <version-id>.json
`-- artifacts/
```

The normalized `SlateDocument` contract is described by JSON Schema and shared by
TypeScript and Pydantic. It retains text, hierarchy, character ranges, pages,
bounding boxes when available, provenance, and parser version.

PDF.js renders original PDF pages. Docling handles PDF and DOCX normalization.
Lightweight adapters handle Markdown, text, and Fountain.

## Current Implementation Versus Target

The repository currently contains a working local-first screenplay editor with a
Tiptap document model, Fountain serialization, PDF/FDX export, screenplay analytics,
file watching, and Git-aware project browsing.

That code is migration input, not evidence that the target product already exists.
The transition should isolate reusable Fountain parsing and screenplay analytics
before editor-only dependencies and surfaces are removed.

`docs/architecture.md` remains the source of truth for the implemented runtime.
This document is the source of truth for the approved product direction.

## Delivery Sequence

1. Establish the product contract, JSON Schema, sidecar protocol, SQLite model, and
   immutable import pipeline.
2. Implement `general-v1`, then `resume-v1`, then migrate existing screenplay
   analytics into `screenplay-v1`.
3. Replace the editor-first routes with the project list and analysis workspace.
4. Add PDF and normalized readers, deterministic annotations, and version filters.
5. Add pairwise comparisons, metric deltas, and finding lifecycle states.
6. Remove editor-only dependencies after all reusable behavior has been isolated.

## Deferred Work

- AI providers, Ollama, chat, RAG, and generated rewriting
- OCR and scanned documents
- Collaboration, accounts, hosted sync, and shared projects
- Multiple logical documents inside one project
- Public rankings or cross-user benchmarks
- Legal, financial, or medical analysis packs
- Plugin marketplaces and user-authored executable analysis packs

## Risks And Validation

- Normalization may lose layout or structure. Golden fixtures must cover every
  supported format and make parser changes visible.
- Annotation anchors may stop matching after major edits. Comparisons must surface
  unmatched anchors instead of silently relocating them.
- Metrics may appear authoritative without defensible criteria. Every metric and
  finding must expose its definition and algorithm version.
- A complex backend can overwhelm a simple product. The UI remains limited to the
  project list, timeline, `Overview`, `Document`, and `Compare`.

The fastest validation is a complete two-version workflow for one resume, one
screenplay, and one general document without using AI.
