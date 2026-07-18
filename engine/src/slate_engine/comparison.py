from __future__ import annotations

from difflib import SequenceMatcher
from typing import Any

from .models import AnalysisResult, SlateDocument


def compare_versions(
    base_document: SlateDocument,
    target_document: SlateDocument,
    base_analysis: AnalysisResult,
    target_analysis: AnalysisResult,
) -> dict[str, Any]:
    if base_analysis.pack_id != target_analysis.pack_id:
        raise ValueError("Versions must use the same analysis pack for comparison.")

    base_lines = [element.text for element in base_document.elements]
    target_lines = [element.text for element in target_document.elements]
    matcher = SequenceMatcher(a=base_lines, b=target_lines, autojunk=False)
    changes: list[dict[str, Any]] = []
    counts = {"added": 0, "removed": 0, "changed": 0, "moved": 0, "unchanged": 0}

    for tag, base_start, base_end, target_start, target_end in matcher.get_opcodes():
        if tag == "equal":
            counts["unchanged"] += target_end - target_start
            continue
        status = {"insert": "added", "delete": "removed", "replace": "changed"}[tag]
        counts[status] += max(base_end - base_start, target_end - target_start)
        changes.append(
            {
                "status": status,
                "baseElementIds": [element.id for element in base_document.elements[base_start:base_end]],
                "targetElementIds": [element.id for element in target_document.elements[target_start:target_end]],
                "baseText": "\n\n".join(base_lines[base_start:base_end]),
                "targetText": "\n\n".join(target_lines[target_start:target_end]),
            }
        )

    consumed_added: set[int] = set()
    for removed_index, removed in enumerate(changes):
        if removed["status"] != "removed" or not removed["baseText"]:
            continue
        for added_index, added in enumerate(changes):
            if added_index in consumed_added or added["status"] != "added":
                continue
            if removed["baseText"] != added["targetText"]:
                continue
            removed["status"] = "moved"
            removed["targetElementIds"] = added["targetElementIds"]
            removed["targetText"] = added["targetText"]
            consumed_added.add(added_index)
            block_size = max(len(removed["baseElementIds"]), len(added["targetElementIds"]))
            counts["removed"] -= len(removed["baseElementIds"])
            counts["added"] -= len(added["targetElementIds"])
            counts["moved"] += block_size
            break
    changes = [change for index, change in enumerate(changes) if index not in consumed_added]

    base_metrics = {metric.key: metric for metric in base_analysis.metrics}
    metric_deltas: list[dict[str, Any]] = []
    for metric in target_analysis.metrics:
        base_metric = base_metrics.get(metric.key)
        delta = None
        if base_metric and isinstance(base_metric.value, (int, float)) and isinstance(metric.value, (int, float)):
            delta = round(float(metric.value) - float(base_metric.value), 2)
        metric_deltas.append(
            {
                "key": metric.key,
                "label": metric.label,
                "baseValue": base_metric.value if base_metric else None,
                "targetValue": metric.value,
                "delta": delta,
                "unit": metric.unit,
            }
        )

    base_finding_counts: dict[str, int] = {}
    target_finding_counts: dict[str, int] = {}
    for finding in base_analysis.findings:
        base_finding_counts[finding.key] = base_finding_counts.get(finding.key, 0) + 1
    for finding in target_analysis.findings:
        target_finding_counts[finding.key] = target_finding_counts.get(finding.key, 0) + 1
    base_findings = set(base_finding_counts)
    target_findings = set(target_finding_counts)
    finding_states = []
    for key in sorted(target_findings):
        if key not in base_findings:
            status = "new"
        elif target_finding_counts[key] > base_finding_counts[key]:
            status = "regressed"
        else:
            status = "persistent"
        finding_states.append({"key": key, "status": status})
    finding_states.extend(
        {"key": key, "status": "resolved"}
        for key in sorted(base_findings - target_findings)
    )

    target_texts = {element.text for element in target_document.elements}
    unmatched_annotations = sorted({
        element_id
        for finding in base_analysis.findings
        if finding.key in target_findings
        for element_id in finding.element_ids
        for element in base_document.elements
        if element.id == element_id and element.text not in target_texts
    })

    return {
        "packId": target_analysis.pack_id,
        "summary": counts,
        "changes": changes,
        "metricDeltas": metric_deltas,
        "findingStates": finding_states,
        "unmatchedAnnotations": unmatched_annotations,
    }
