from slate_engine.analysis import analyze
from slate_engine.models import DocumentElement, DocumentMetadata, SlateDocument


def document(text: str, elements: list[DocumentElement] | None = None) -> SlateDocument:
    return SlateDocument(
        parserVersion="test",
        metadata=DocumentMetadata(
            sourceName="fixture.txt",
            sourceFormat="txt",
            contentHash="a" * 64,
        ),
        text=text,
        pages=[],
        sections=[],
        elements=elements
        or [
            DocumentElement(
                id="paragraph-1",
                kind="paragraph",
                text=text,
                charStart=0,
                charEnd=len(text),
            )
        ],
        provenance=[],
    )


def test_general_analysis_is_deterministic() -> None:
    fixture = document("Clear writing improves decisions. Clear evidence builds trust.")
    first_metrics, first_findings = analyze(fixture, "general-v1")
    second_metrics, second_findings = analyze(fixture, "general-v1")

    assert first_metrics == second_metrics
    assert first_findings == second_findings
    assert next(metric.value for metric in first_metrics if metric.key == "word-count") == 8


def test_resume_analysis_reports_missing_sections() -> None:
    metrics, findings = analyze(document("Summary\n\nBuilt products for five years."), "resume-v1")

    assert any(metric.key == "resume-section-coverage" for metric in metrics)
    assert {finding.key for finding in findings} == {
        "missing-experience",
        "missing-education",
        "missing-skills",
    }
