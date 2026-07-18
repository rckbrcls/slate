import sqlite3

import pytest

from slate_engine.service import SlateService


def test_project_import_is_immutable_and_deduplicated(tmp_path) -> None:
    project_path = tmp_path / "project"
    project_path.mkdir()
    source = tmp_path / "report.txt"
    source.write_text("Evidence changes when the document changes.", encoding="utf-8")
    service = SlateService()

    project = service.create_project(
        {"path": str(project_path), "name": "Report", "analysisPack": "general-v1"}
    )
    imported = service.import_version(
        {"projectPath": str(project_path), "sourcePath": str(source)}
    )

    assert project["versionCount"] == 0
    assert imported["version"]["ordinal"] == 1
    assert (project_path / "project.sqlite").is_file()
    assert len(list((project_path / "objects").iterdir())) == 1
    assert len(list((project_path / "normalized").iterdir())) == 1

    with pytest.raises(ValueError, match="already in the version timeline"):
        service.import_version(
            {"projectPath": str(project_path), "sourcePath": str(source)}
        )

    with sqlite3.connect(project_path / "project.sqlite") as connection:
        assert connection.execute("SELECT COUNT(*) FROM document_versions").fetchone()[0] == 1
        assert connection.execute("SELECT COUNT(*) FROM analysis_runs").fetchone()[0] == 1
        assert connection.execute("SELECT version_num FROM alembic_version").fetchone()[0] == "0001_initial"
