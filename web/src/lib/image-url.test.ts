import { describe, expect, it } from "vitest";

import { imageUrlError, imageUrlWarning } from "./image-url";

describe("imageUrlError", () => {
  it("should accept a plain https image link", () => {
    expect(imageUrlError("https://i.example.com/a.png")).toBeNull();
  });

  it("should accept http as well as https", () => {
    expect(imageUrlError("http://i.example.com/a.png")).toBeNull();
  });

  it("should reject an empty value", () => {
    expect(imageUrlError("   ")).toBe("Chưa nhập link ảnh.");
  });

  it("should reject javascript: urls that would become an img src", () => {
    expect(imageUrlError("javascript:alert(1)")).not.toBeNull();
  });

  it("should reject data: urls", () => {
    expect(imageUrlError("data:image/png;base64,AAAA")).not.toBeNull();
  });

  it("should reject garbage that is not a url at all", () => {
    expect(imageUrlError("anh cua em")).not.toBeNull();
  });

  it("should reject links longer than the DB constraint allows", () => {
    const long = `https://i.example.com/${"a".repeat(500)}.png`;
    expect(imageUrlError(long)).toContain("quá dài");
  });
});

describe("imageUrlWarning", () => {
  it("should stay silent for a direct image link", () => {
    expect(imageUrlWarning("https://i.example.com/photo.JPG")).toBeNull();
  });

  it("should warn about Google Drive links (embedding from Drive was ruled out)", () => {
    expect(imageUrlWarning("https://drive.google.com/file/d/abc/view")).toContain(
      "Google Drive"
    );
  });

  it("should warn when the link is an image host page instead of the image", () => {
    expect(imageUrlWarning("https://imgur.com/a/xyz")).toContain("link TRANG");
  });

  it("should warn softly for an unknown host without an image extension", () => {
    expect(imageUrlWarning("https://example.com/anh")).not.toBeNull();
  });

  it("should stay silent for a value that is not a url (imageUrlError handles it)", () => {
    expect(imageUrlWarning("khong-phai-url")).toBeNull();
  });
});
