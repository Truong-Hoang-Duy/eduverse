"""Test app.llm.generate_json chọn ĐÚNG module theo provider — không gọi AI thật."""

import pytest

from app import gemini, llm, openai_client


def test_default_provider_dispatches_to_gemini(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = []
    monkeypatch.setattr(
        gemini, "generate_json", lambda *a, **k: calls.append(("gemini", a, k)) or {}
    )
    monkeypatch.setattr(
        openai_client, "generate_json", lambda *a, **k: calls.append(("openai", a, k)) or {}
    )

    llm.generate_json("prompt", {"type": "object"})

    assert [c[0] for c in calls] == ["gemini"]


def test_openai_provider_dispatches_to_openai_client(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = []
    monkeypatch.setattr(
        gemini, "generate_json", lambda *a, **k: calls.append(("gemini", a, k)) or {}
    )
    monkeypatch.setattr(
        openai_client, "generate_json", lambda *a, **k: calls.append(("openai", a, k)) or {}
    )

    llm.generate_json("prompt", {"type": "object"}, api_key="k", provider="openai")

    assert [c[0] for c in calls] == ["openai"]
