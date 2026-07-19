<!--
Sync Impact Report
- Version change: template (unratified) -> 1.0.0
- New principles:
  - I. Simple Surface, Robust Core
  - II. Immutable Versions, Reproducible Analysis
  - III. Local-First by Default
  - IV. Narrow, Typed Boundaries
  - V. Evidence Before Scores
  - VI. Incremental Delivery, Verified Migration
- Added sections:
  - Product and Architecture Constraints
  - Development Workflow and Quality Gates
- Removed sections: none; template placeholders were resolved
- Templates reviewed:
  - ✅ .specify/templates/constitution-template.md (generic template retained)
  - ✅ .specify/templates/plan-template.md
  - ✅ .specify/templates/spec-template.md
  - ✅ .specify/templates/tasks-template.md
  - ✅ .specify/templates/checklist-template.md
- Runtime guidance reviewed:
  - ✅ docs/product-strategy.md
  - ✅ docs/architecture.md
  - ✅ docs/development.md
  - ✅ README.md
  - ✅ SECURITY.md
- Follow-up TODOs: none
-->

# Slate Constitution

## Core Principles

### I. Simple Surface, Robust Core

The primary product surface MUST remain limited to the project list, version timeline,
`Overview`, `Document`, and `Compare`. Normalization, persistence, analysis, and
comparison complexity MUST remain behind these surfaces. A feature that introduces a
new primary surface, persistent control, or user-visible concept MUST explain why the
existing surfaces cannot express it and record the added complexity in its plan.

This constraint keeps the product understandable while allowing the engine to become
more capable.

### II. Immutable Versions, Reproducible Analysis

An imported document version MUST never be edited in place. Original files MUST be
stored by content hash, and an import MUST create a version only when its content
changes. Every analysis run MUST record the document version, analysis pack and
version, parser version, algorithm versions, contract version, and execution metadata.
The same immutable input and analysis configuration MUST produce the same results.

Changing an analysis pack creates a new analysis run, not a new document version.

### III. Local-First by Default

Documents, normalized content, metrics, findings, annotations, and comparisons MUST be
stored primarily in the portable local project. Local paths, document contents,
metadata, and derived artifacts MUST be treated as sensitive user data. Accounts,
hosted sync, telemetry, remote processing, or other network dependencies MUST NOT be
introduced without an explicit specification, privacy impact, failure behavior, and
user approval.

The MVP MUST retain its value without an internet connection.

### IV. Narrow, Typed Boundaries

The renderer MUST use only high-level methods exposed by the typed preload API. It MUST
NOT receive direct Node.js, filesystem, SQLite, subprocess, or generic IPC access.
Electron and the Python sidecar MUST communicate through versioned JSON-RPC over
`stdin/stdout`; a local HTTP server or raw subprocess bridge MUST NOT be added.

`SlateDocument`, JSON-RPC messages, database migrations, and analysis pack identifiers
MUST be versioned. Pack identifiers MUST remain extensible strings rather than a closed
enumeration. Boundary inputs and outputs MUST be validated before use.

### V. Evidence Before Scores

Slate MUST prefer deterministic metrics and findings with explicit criteria. Every
result MUST expose its definition, evidence when applicable, and algorithm version.
The product MUST NOT present an arbitrary overall score or rank documents without a
documented corpus or benchmark using compatible criteria.

Normalization failures, unavailable coordinates, unsupported scanned documents, and
unmatched annotation anchors MUST be visible states. They MUST NOT be silently hidden,
invented, or relocated without evidence.

### VI. Incremental Delivery, Verified Migration

Features MUST be delivered as independently testable vertical workflows. The first
validation target for document intelligence is a complete two-version journey: import,
analyze, inspect, re-import changed content, and compare. Reusable Fountain parsing and
screenplay analytics MUST be isolated before editor-only code or dependencies are
removed.

`docs/product-strategy.md` is the source of truth for approved product direction.
`docs/architecture.md` is the source of truth for behavior that is actually implemented.
Plans and documentation MUST distinguish target architecture from current behavior.

## Product and Architecture Constraints

The MVP supports textual PDF, DOCX, Markdown, plain text, and Fountain. Its initial
analysis packs are `general-v1`, `resume-v1`, and `screenplay-v1`. Non-PDF documents
use normalized reading; only PDF preserves its original layout. Scanned or image-only
PDFs MUST return an explicit unsupported result while OCR is unavailable.

AI providers, Ollama, chat, RAG, generated rewriting, OCR, collaboration, accounts,
hosted sync, multiple logical documents per project, public rankings, regulated legal,
financial, or medical analysis, and executable plugin marketplaces are outside the MVP.
Adding one of these capabilities requires a dedicated specification and a constitution
compliance review before implementation.

Slate MUST preserve the existing Electron, React, TypeScript, Vite, Tailwind, and
component foundation unless a measured limitation justifies migration. Electron owns
native capabilities and sidecar lifecycle; Python owns project persistence,
normalization, analysis, and comparison; the renderer owns presentation and interaction.
Application strings MUST remain in English.

## Development Workflow and Quality Gates

Every feature specification and implementation plan MUST address:

- impact on the primary surface and interaction complexity;
- immutable data and reproducibility requirements;
- local data sensitivity and any network behavior;
- typed contract, schema, parser, algorithm, and migration changes;
- legacy editor isolation or migration impact;
- accessible keyboard behavior, visible focus, and relevant `empty`, `importing`,
  `analyzing`, `ready`, `error`, and `unsupported` states.

Tests are mandatory when behavior changes. Applicable work MUST include golden fixtures
for supported formats and analysis packs; storage, deduplication, immutability, and
migration tests; JSON-RPC contract, cancellation, and sidecar-failure tests; deterministic
reproduction checks; comparison and annotation re-anchoring tests; and interface tests
for affected states and interactions. A plan MAY mark a category not applicable only
with a concrete reason.

Constitution checks are blocking gates before implementation and after design. Any
violation MUST be documented in `Complexity Tracking` with the need, impact, and reason
a constitution-compliant alternative is insufficient.

## Governance

This constitution supersedes conflicting feature specifications, implementation plans,
task lists, and informal practices. Amendments require an explicit proposal, rationale,
impact assessment, updates to dependent templates and guidance, and approval by the
project owner.

Versions follow semantic versioning:

- MAJOR for removing or incompatibly redefining a principle or governance rule;
- MINOR for adding a principle or materially expanding mandatory guidance;
- PATCH for clarifications that do not change required behavior.

Every plan MUST complete the Constitution Check before research and repeat it after
design. Every implementation review MUST verify compliance and confirm that the product
strategy and implemented architecture are described accurately. Exceptions do not set
precedent and MUST be re-evaluated in each affected plan.

**Version**: 1.0.0 | **Ratified**: 2026-07-18 | **Last Amended**: 2026-07-18
