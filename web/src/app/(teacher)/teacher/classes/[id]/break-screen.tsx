"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TvOverlay,
  enterBrowserFullscreen,
  exitBrowserFullscreen,
} from "@/components/tv-overlay";

const PRESETS = [5, 10, 15] as const;

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Màn hình chiếu giờ nghỉ giữa buổi: chọn số phút → đếm ngược chữ khổng lồ. */
export function BreakScreen({ classCode }: { classCode: string }) {
  const [open, setOpen] = useState(false);
  // null = đang ở màn chọn số phút; số = tổng giây còn lại.
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [customMinutes, setCustomMinutes] = useState("");
  const [paused, setPaused] = useState(false);
  const interval = useRef<ReturnType<typeof setInterval>>(undefined);

  function stopTicking() {
    if (interval.current) clearInterval(interval.current);
    interval.current = undefined;
  }

  useEffect(() => stopTicking, []);

  function startCountdown(minutes: number) {
    stopTicking();
    setPaused(false);
    setSecondsLeft(minutes * 60);
    interval.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null || prev <= 0) return prev;
        return prev - 1;
      });
    }, 1000);
  }

  function togglePause() {
    if (secondsLeft === null) return;
    if (paused) {
      setPaused(false);
      interval.current = setInterval(() => {
        setSecondsLeft((prev) => (prev === null || prev <= 0 ? prev : prev - 1));
      }, 1000);
    } else {
      setPaused(true);
      stopTicking();
    }
  }

  function addMinute() {
    setSecondsLeft((prev) => (prev === null ? prev : prev + 60));
  }

  function backToPicker() {
    stopTicking();
    setPaused(false);
    setSecondsLeft(null);
  }

  function enter() {
    setOpen(true);
    enterBrowserFullscreen();
  }

  function exit() {
    backToPicker();
    setOpen(false);
    exitBrowserFullscreen();
  }

  const timeUp = secondsLeft === 0;

  return (
    <>
      <Button variant="outline" onClick={enter}>
        ☕ Nghỉ giữa giờ
      </Button>

      {open && (
        <TvOverlay onClose={exit}>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold">☕ Nghỉ giữa giờ · Lớp {classCode}</h2>
            <Button
              size="lg"
              variant="ghost"
              className="ml-auto"
              onClick={exit}
              aria-label="Thoát chế độ chiếu"
            >
              ✕ Thoát
            </Button>
          </div>

          {secondsLeft === null ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8">
              <p className="text-2xl text-muted-foreground">Nghỉ bao nhiêu phút?</p>
              <div className="flex flex-wrap justify-center gap-4">
                {PRESETS.map((m) => (
                  <Button
                    key={m}
                    size="lg"
                    className="h-20 w-32 text-3xl font-bold"
                    onClick={() => startCountdown(m)}
                  >
                    {m} phút
                  </Button>
                ))}
              </div>
              <form
                className="flex items-center gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const m = Number(customMinutes);
                  if (Number.isFinite(m) && m >= 1) startCountdown(Math.floor(m));
                }}
              >
                <label htmlFor="custom-minutes" className="text-xl text-muted-foreground">
                  Hoặc nhập:
                </label>
                <Input
                  id="custom-minutes"
                  type="number"
                  min={1}
                  max={180}
                  placeholder="VD: 7"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  className="h-14 w-28 text-center !text-2xl font-bold"
                />
                <span className="text-xl text-muted-foreground">phút</span>
                <Button
                  type="submit"
                  size="lg"
                  className="h-14 text-xl"
                  disabled={!Number.isFinite(Number(customMinutes)) || Number(customMinutes) < 1}
                >
                  ▶️ Bắt đầu
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8">
              {timeUp ? (
                <>
                  <p className="animate-bounce text-7xl" aria-hidden>
                    ⏰
                  </p>
                  <p className="text-center text-6xl font-bold text-primary">
                    Hết giờ nghỉ — vào học thôi!
                  </p>
                </>
              ) : (
                <>
                  <p
                    className={`font-mono text-[16vw] leading-none font-bold tabular-nums sm:text-[12rem] ${
                      secondsLeft <= 60 ? "text-destructive" : ""
                    } ${paused ? "opacity-50" : ""}`}
                  >
                    {formatClock(secondsLeft)}
                  </p>
                  <p className="text-2xl text-muted-foreground">
                    {paused ? "⏸️ Đang tạm dừng" : "Cả lớp nghỉ ngơi chút nhé 🧃"}
                  </p>
                </>
              )}
              <div className="flex flex-wrap justify-center gap-3">
                {!timeUp && (
                  <>
                    <Button size="lg" variant="outline" onClick={togglePause}>
                      {paused ? "▶️ Tiếp tục" : "⏸️ Tạm dừng"}
                    </Button>
                    <Button size="lg" variant="outline" onClick={addMinute}>
                      +1 phút
                    </Button>
                  </>
                )}
                <Button size="lg" variant="outline" onClick={backToPicker}>
                  🔄 Chọn lại thời gian
                </Button>
              </div>
            </div>
          )}
        </TvOverlay>
      )}
    </>
  );
}
