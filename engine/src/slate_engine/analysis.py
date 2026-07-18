from __future__ import annotations

import math
import re
from collections import Counter

from .models import FindingValue, MetricValue, SlateDocument


ALGORITHM_VERSION = "deterministic-1"
WORD_PATTERN = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿ0-9][A-Za-zÀ-ÖØ-öø-ÿ0-9'-]*")
SENTENCE_PATTERN = re.compile(r"[^.!?]+[.!?]?", re.MULTILINE)
STOP_WORDS = {
    "a", "an", "and", "as", "at", "be", "by", "for", "from", "in", "is", "it",
    "of", "on", "or", "that", "the", "to", "was", "were", "with", "de", "da", "do",
    "e", "em", "o", "os", "para", "por", "que", "um", "uma",
}


def _words(text: str) -> list[str]:
    return [word.lower() for word in WORD_PATTERN.findall(text)]


def _sentences(text: str) -> list[str]:
    return [sentence.strip() for sentence in SENTENCE_PATTERN.findall(text) if sentence.strip()]


def _estimated_syllables(word: str) -> int:
    groups = re.findall(r"[aeiouyà-öø-ÿ]+", word.lower())
    count = len(groups)
    if word.lower().endswith("e") and count > 1:
        count -= 1
    return max(count, 1)


def _metric(
    key: str,
    label: str,
    value: object,
    kind: str,
    description: str,
    unit: str | None = None,
) -> MetricValue:
    return MetricValue(
        key=key,
        label=label,
        value=value,
        kind=kind,  # type: ignore[arg-type]
        unit=unit,
        description=description,
    )


def _general_metrics(document: SlateDocument) -> list[MetricValue]:
    words = _words(document.text)
    sentences = _sentences(document.text)
    paragraphs = [element for element in document.elements if element.kind not in {"heading"}]
    unique_words = set(words)
    content_words = [word for word in words if word not in STOP_WORDS and len(word) > 2]
    common_terms = [
        {"term": term, "count": count}
        for term, count in Counter(content_words).most_common(12)
    ]
    avg_sentence = round(len(words) / max(len(sentences), 1), 1)
    lexical_diversity = round(len(unique_words) / max(len(words), 1) * 100, 1)
    long_sentences = sum(1 for sentence in sentences if len(_words(sentence)) > 30)
    syllables = sum(_estimated_syllables(word) for word in words)
    reading_ease = round(
        206.835
        - 1.015 * (len(words) / max(len(sentences), 1))
        - 84.6 * (syllables / max(len(words), 1)),
        1,
    )

    return [
        _metric("word-count", "Words", len(words), "number", "Total tokenized words."),
        _metric("sentence-count", "Sentences", len(sentences), "number", "Total detected sentences."),
        _metric("paragraph-count", "Paragraphs", len(paragraphs), "number", "Total normalized content blocks."),
        _metric("section-count", "Sections", len(document.sections), "number", "Total detected sections."),
        _metric("average-sentence-length", "Average sentence", avg_sentence, "number", "Average words per sentence.", "words"),
        _metric("lexical-diversity", "Lexical diversity", lexical_diversity, "percentage", "Unique words as a percentage of all words.", "%"),
        _metric("long-sentence-count", "Long sentences", long_sentences, "number", "Sentences longer than 30 words."),
        _metric("reading-ease", "Reading ease", reading_ease, "number", "Approximate Flesch reading ease using deterministic syllable estimation."),
        _metric("frequent-terms", "Frequent terms", common_terms, "distribution", "Most frequent non-stop words."),
    ]


def _resume_analysis(document: SlateDocument) -> tuple[list[MetricValue], list[FindingValue]]:
    text_lower = document.text.lower()
    section_groups = {
        "experience": ("experience", "employment", "work history", "experiência profissional"),
        "education": ("education", "academic", "formação", "educação"),
        "skills": ("skills", "competencies", "habilidades", "competências"),
    }
    present = {
        name: any(term in text_lower for term in terms)
        for name, terms in section_groups.items()
    }
    bullets = [element for element in document.elements if element.kind == "bullet"]
    if not bullets:
        bullets = [
            element
            for element in document.elements
            if any(line.lstrip().startswith(("-", "•", "*")) for line in element.text.splitlines())
        ]
    quantified = [element for element in bullets if re.search(r"\b\d+(?:[.,]\d+)?%?\b", element.text)]
    ratio = round(len(quantified) / max(len(bullets), 1) * 100, 1)
    findings: list[FindingValue] = []
    for name, is_present in present.items():
        if not is_present:
            findings.append(
                FindingValue(
                    key=f"missing-{name}",
                    title=f"Missing {name} section",
                    description=f"No recognizable {name} heading was found.",
                    severity="warning",
                    criterion=f"A resume should include a recognizable {name} section.",
                )
            )
    for element in bullets:
        if len(_words(element.text)) > 35:
            findings.append(
                FindingValue(
                    key="long-bullet",
                    title="Long resume bullet",
                    description="This bullet contains more than 35 words.",
                    severity="info",
                    criterion="Resume bullets longer than 35 words are flagged for review.",
                    elementIds=[element.id],
                )
            )

    metrics = [
        _metric("resume-section-coverage", "Section coverage", sum(present.values()) / len(present) * 100, "percentage", "Recognized expected resume sections.", "%"),
        _metric("resume-bullet-count", "Bullets", len(bullets), "number", "Detected resume bullets."),
        _metric("resume-quantified-ratio", "Quantified bullets", ratio, "percentage", "Bullets containing a number or percentage.", "%"),
    ]
    return metrics, findings


def _screenplay_metrics(document: SlateDocument) -> list[MetricValue]:
    scenes = [element for element in document.elements if element.kind == "scene-heading"]
    characters = {
        element.text.split("(", 1)[0].strip().upper()
        for element in document.elements
        if element.kind == "character"
    }
    dialogue_words = sum(len(_words(element.text)) for element in document.elements if element.kind == "dialogue")
    action_words = sum(len(_words(element.text)) for element in document.elements if element.kind == "action")
    content_total = dialogue_words + action_words
    dialogue_ratio = round(dialogue_words / max(content_total, 1) * 100, 1)
    estimated_pages = max(1, math.ceil(len(_words(document.text)) / 250))
    return [
        _metric("screenplay-pages", "Estimated pages", estimated_pages, "number", "Estimated at 250 words per screenplay page."),
        _metric("screenplay-duration", "Estimated duration", estimated_pages, "number", "One estimated screenplay page per minute.", "minutes"),
        _metric("screenplay-scenes", "Scenes", len(scenes), "number", "Detected Fountain scene headings."),
        _metric("screenplay-characters", "Characters", len(characters), "number", "Unique detected character cues."),
        _metric("screenplay-dialogue-ratio", "Dialogue ratio", dialogue_ratio, "percentage", "Dialogue words as a percentage of dialogue and action words.", "%"),
    ]


def analyze(document: SlateDocument, pack_id: str) -> tuple[list[MetricValue], list[FindingValue]]:
    if pack_id not in {"general-v1", "resume-v1", "screenplay-v1"}:
        raise ValueError(f"Unknown analysis pack: {pack_id}")
    metrics = _general_metrics(document)
    findings: list[FindingValue] = []
    if pack_id == "resume-v1":
        pack_metrics, findings = _resume_analysis(document)
        metrics.extend(pack_metrics)
    elif pack_id == "screenplay-v1":
        metrics.extend(_screenplay_metrics(document))
    return metrics, findings
