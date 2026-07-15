"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Bật/tắt dark mode. Class `.dark` được script trong layout đặt sẵn TRƯỚC khi
 * paint (tránh nháy trắng), component này chỉ đọc lại trạng thái rồi đổi.
 */
export function ThemeToggle() {
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
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-label={dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      // Chưa mount thì render khung rỗng để server/client khớp nhau.
      className="px-2"
    >
      {mounted ? (dark ? "☀️" : "🌙") : <span className="size-4" />}
    </Button>
  );
}
