from slate_engine.comparison import compare_versions
from slate_engine.models import AnalysisResult, DocumentElement, DocumentMetadata, FindingValue, MetricValue, SlateDocument


def make_document(texts: list[str]) -> SlateDocument:
    text = "\n\n".join(texts)
    offset = 0
    elements = []
    for index, value in enumerate(texts):
        elements.append(
            DocumentElement(
                id=f"element-{index}",
                kind="paragraph",
                text=value,
                charStart=offset,
                charEnd=offset + len(value),
            )
        )
        offset += len(value) + 2
    return SlateDocument(
        parserVersion="test",
        metadata=DocumentMetadata(
            sourceName="fixture.txt",
            sourceFormat="txt",
            contentHash="b" * 64,
        ),
        text=text,
        pages=[],
        sections=[],
        elements=elements,
        provenance=[],
    )


def make_analysis(version_id: str, words: int, finding_count: int = 0) -> AnalysisResult:
    return AnalysisResult(
        runId=f"run-{version_id}",
        versionId=version_id,
        packId="general-v1",
        algorithmVersion="test",
        startedAt="2026-01-01T00:00:00+00:00",
        completedAt="2026-01-01T00:00:00+00:00",
        durationMs=0,
        metrics=[
            MetricValue(
                key="word-count",
                label="Words",
                value=words,
                kind="number",
                description="Total words.",
            )
        ],
        findings=[
            FindingValue(
                key="long-bullet",
                title="Long bullet",
                description="A deterministic fixture.",
                severity="warning",
                criterion="Fixture criterion.",
                elementIds=[f"element-{index}"],
            )
            for index in range(finding_count)
        ],
    )


def test_comparison_reports_content_and_metric_changes() -> None:
    result = compare_versions(
        make_document(["Alpha", "Beta"]),
        make_document(["Alpha", "Gamma", "Delta"]),
        make_analysis("v1", 2),
        make_analysis("v2", 3),
    )

    assert result["summary"]["changed"] == 2
    assert result["metricDeltas"][0]["delta"] == 1


def test_comparison_detects_movement_and_regression() -> None:
    result = compare_versions(
        make_document(["Alpha", "Beta"]),
        make_document(["Beta", "Alpha"]),
        make_analysis("v1", 2, finding_count=1),
        make_analysis("v2", 2, finding_count=2),
    )

    assert result["summary"]["moved"] == 1
    assert {state["status"] for state in result["findingStates"]} == {"regressed"}
