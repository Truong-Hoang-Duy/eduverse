"""Test dựng Part từ file bài làm — KHÔNG gọi Gemini thật."""

import io
import zipfile

import pytest
from fastapi import HTTPException

from app.storage import bytes_to_part, docx_to_text

_DOCX_XML = """<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Bai lam cua em:</w:t></w:r></w:p>
    <w:p>
      <w:r><w:t>for i in</w:t></w:r>
      <w:r><w:tab/><w:t>range(5):</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t>{content}</w:t></w:r></w:p>
  </w:body>
</w:document>
"""


def make_docx(content: str = "print(i)") -> bytes:
    """Dựng file .docx tối thiểu thật (ZIP + word/document.xml)."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("word/document.xml", _DOCX_XML.format(content=content))
    return buffer.getvalue()


def test_docx_to_text_keeps_paragraphs_and_tabs() -> None:
    text = docx_to_text("bai.docx", make_docx())

    assert text.splitlines() == [
        "Bai lam cua em:",
        "for i in\trange(5):",
        "print(i)",
    ]


def test_docx_becomes_text_part_not_raw_bytes() -> None:
    part = bytes_to_part("bai.docx", make_docx())

    # Gemini không đọc được .docx nhị phân → buộc phải là Part dạng chữ.
    assert part.text is not None
    assert "print(i)" in part.text
    assert part.inline_data is None


def test_docx_detected_by_mime_when_name_has_no_extension() -> None:
    part = bytes_to_part(
        "bai-lam",
        make_docx(),
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )

    assert part.text is not None
    assert "print(i)" in part.text


def test_should_reject_docx_that_is_not_a_zip() -> None:
    with pytest.raises(HTTPException) as exc:
        bytes_to_part("bai.docx", b"khong phai zip")

    assert exc.value.status_code == 400
    assert "Word" in exc.value.detail


def make_textless_docx() -> bytes:
    """Bài làm chỉ là ảnh chụp dán vào Word — không có node `w:t` nào."""
    body = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/'
        'wordprocessingml/2006/main"><w:body><w:p><w:r><w:drawing/></w:r>'
        "</w:p></w:body></w:document>"
    )
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("word/document.xml", body)
    return buffer.getvalue()


def test_should_reject_docx_with_no_readable_text() -> None:
    with pytest.raises(HTTPException) as exc:
        bytes_to_part("anh-chup.docx", make_textless_docx())

    assert exc.value.status_code == 400
    assert "không có chữ nào đọc được" in exc.value.detail


def test_should_reject_legacy_doc_with_hint_to_save_as_docx() -> None:
    with pytest.raises(HTTPException) as exc:
        bytes_to_part("bai.doc", b"\xd0\xcf\x11\xe0 noi dung word cu")

    assert exc.value.status_code == 400
    assert ".docx" in exc.value.detail


def test_code_file_still_goes_through_as_text() -> None:
    part = bytes_to_part("index.html", b"<h1>Xin chao</h1>")

    assert part.text is not None
    assert "<h1>Xin chao</h1>" in part.text
