from slate_engine.normalization import normalize_document


def test_fountain_normalization_preserves_screenplay_structure(tmp_path) -> None:
    source = tmp_path / "scene.fountain"
    source.write_text(
        "INT. ARCHIVE - NIGHT\n\nMARA\nEvery version leaves a trace.\n\nThe light changes.\n",
        encoding="utf-8",
    )

    document = normalize_document(source)

    assert [element.kind for element in document.elements] == [
        "scene-heading",
        "character",
        "dialogue",
        "action",
    ]
    assert document.metadata.source_format == "fountain"


def test_empty_text_document_is_rejected(tmp_path) -> None:
    source = tmp_path / "empty.txt"
    source.write_text("\n\n", encoding="utf-8")

    try:
        normalize_document(source)
    except ValueError as error:
        assert "no extractable text" in str(error)
    else:
        raise AssertionError("Expected an empty document error")
