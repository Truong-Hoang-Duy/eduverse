"use client";

import { useEffect, useState } from "react";

import { MoonIcon, SunIcon } from "./emblem";

/**
 * Chuyển sáng/tối cho trang phụ huynh.
 *
 * Bản dùng chung của app (`components/theme-toggle.tsx`) vẽ bằng emoji ☀️/🌙 và
 * ăn theo palette indigo — cả hai đều lạc khỏi bản sắc ở đây, nên trang này có
 * nút riêng: icon vẽ tay, màu đồng thau, viền như con dấu.
 *
 * Cơ chế vẫn y hệt: class `.dark` do script trong layout gốc đặt TRƯỚC khi paint
 * (tránh nháy trắng), nút này chỉ đọc lại rồi lật.
 */
export function ThemeSwitch() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Trình duyệt chặn localStorage (chế độ riêng tư) — vẫn đổi được trong phiên.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      title={dark ? "Giao diện sáng" : "Giao diện tối"}
      className="inline-flex size-10 items-center justify-center rounded-full border border-sc-brass/40 bg-sc-raised text-sc-brass shadow-sm transition-colors hover:bg-sc-brass-soft"
    >
      {/* Chưa mount thì để trống cho server/client khớp nhau, khỏi lỗi hydrate. */}
      {mounted ? (
        dark ? (
          <SunIcon className="size-5" />
        ) : (
          <MoonIcon className="size-5" />
        )
      ) : (
        <span className="size-5" />
      )}
    </button>
  );
}
