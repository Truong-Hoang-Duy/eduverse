"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { QrCode } from "@/components/qr-code";
import { SafeImage } from "@/components/safe-image";
import {
  CheckMark,
  GraduationSeal,
  MoonIcon,
  SunIcon,
} from "@/components/showcase/emblem";
import { showcaseFontClass } from "@/components/showcase/fonts";
import { SealAvatar } from "@/components/showcase/seal-avatar";
import { getShowcaseLiveViewCount } from "@/lib/actions/showcase";

export interface TvProjectItem {
  id: string;
  name: string;
  authorName: string;
  imageUrls: string[];
  features: string[];
  description: string | null;
}

interface ShowcaseTvScreenProps {
  classId?: string;
  classCode: string;
  fullUrl: string;
  viewCount: number;
  projects?: TvProjectItem[];
  onClose: () => void;
}

/**
 * Hiệu ứng hạt bụi vàng bay nhẹ nhàng trong không gian tối/sáng (Ambient Starlight Particles)
 */
function AmbientParticles({ isDark }: { isDark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const PARTICLE_COUNT = 45;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.2 + 0.8,
      speedY: -(Math.random() * 0.35 + 0.1),
      speedX: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.5 + 0.2,
      pulseSpeed: Math.random() * 0.015 + 0.005,
      pulseVal: Math.random() * Math.PI,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.y += p.speedY;
        p.x += p.speedX;
        p.pulseVal += p.pulseSpeed;
        const currentOpacity =
          p.opacity * (0.6 + 0.4 * Math.sin(p.pulseVal));

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const color = isDark
          ? `rgba(218, 165, 32, ${Math.max(0, Math.min(1, currentOpacity))})`
          : `rgba(168, 110, 20, ${Math.max(0, Math.min(0.7, currentOpacity * 0.75))})`;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 z-0 h-full w-full ${
        isDark ? "opacity-60" : "opacity-35"
      }`}
    />
  );
}

/**
 * Trình phát nhạc nền thư giãn bằng Web Audio API Synthesizer (0 byte phụ thuộc, không lo bản quyền)
 * Tạo chuỗi hợp âm Lofi / Ambient Pad du dương, êm dịu
 */
class AmbientAudioSynth {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isRunning = false;
  private timerId: number | null = null;
  private masterVolume = 0.35;

  private chords = [
    // Fmaj7
    [174.61, 220.0, 261.63, 329.63],
    // G7
    [196.0, 246.94, 293.66, 349.23],
    // Em7
    [164.81, 196.0, 246.94, 293.66],
    // Am7
    [220.0, 261.63, 329.63, 392.0],
  ];
  private chordIndex = 0;

  public init() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.gainNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(
        this.masterVolume,
        this.ctx.currentTime,
        0.05
      );
    }
  }

  private playPadTone(freq: number, duration = 4.2) {
    if (!this.ctx || !this.gainNode) return;

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    // Dùng sóng tam giác (triangle) kết hợp sine tạo chất âm pad mềm mại, ấm áp
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    // Envelope âm thanh: Attack 1.2s mượt, Decay/Release êm dịu
    const now = this.ctx.currentTime;
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(0.08, now + 1.2);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(env);
    env.connect(this.gainNode);

    osc.start(now);
    osc.stop(now + duration + 0.1);
  }

  public start() {
    if (this.isRunning) return;
    this.init();
    this.isRunning = true;

    const playNext = () => {
      if (!this.isRunning || !this.ctx) return;
      const notes = this.chords[this.chordIndex];
      this.chordIndex = (this.chordIndex + 1) % this.chords.length;

      // Đánh hợp âm pad
      notes.forEach((freq) => this.playPadTone(freq, 4.4));

      // Hẹn giờ cho hợp âm tiếp theo (mỗi 4 giây lặp lại)
      this.timerId = window.setTimeout(playNext, 4000);
    };

    playNext();
  }

  public stop() {
    this.isRunning = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.ctx && this.ctx.state === "running") {
      void this.ctx.suspend();
    }
  }

  public destroy() {
    this.stop();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}

/**
 * Giao diện màn hình chiếu TV / Máy chiếu chuyên dụng trong Lễ tổng kết:
 * - Tự động nhận diện theme Sáng/Tối theo lựa chọn ở Header của app.
 * - Hỗ trợ nút chuyển đổi Sáng/Tối ngay trên thanh Header của màn chiếu.
 * - Trình phát hợp âm Lofi / Ambient Synth êm dịu, không cần file mp3.
 * - Cột trái: Mã QR sắc nét viền ánh kim, đếm số phụ huynh đang kết nối thời gian thực.
 * - Cột phải: Khung ảnh xoay vòng sản phẩm các em kèm mô tả, tính năng nổi bật.
 */
export function ShowcaseTvScreen({
  classId,
  classCode,
  fullUrl,
  viewCount: initialViewCount,
  projects = [],
  onClose,
}: ShowcaseTvScreenProps) {
  // 1. Quản lý trạng thái theme (Sáng / Tối) đồng bộ với header của app
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  };

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Giai đoạn hiển thị của học viên hiện tại:
  // "info": Hiện nội dung (Tên dự án, Mô tả, Điểm nổi bật)
  // "gallery": Chạy các ảnh bài làm của học viên to vừa vặn toàn màn hình
  const [subStage, setSubStage] = useState<"info" | "gallery">("info");
  const [subImageIndex, setSubImageIndex] = useState(0);

  // Hàm chuyển học sinh (luôn bắt đầu từ giai đoạn info)
  const goToStudent = useCallback((idx: number) => {
    setCurrentIndex(idx);
    setSubStage("info");
    setSubImageIndex(0);
  }, []);

  // Điều khiển âm thanh
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const synthRef = useRef<AmbientAudioSynth | null>(null);

  // Bộ đếm ngược khai mạc (phút:giây)
  const [countdownMinutes, setCountdownMinutes] = useState<number | null>(null);
  const [countdownSecondsLeft, setCountdownSecondsLeft] = useState<number | null>(
    null
  );

  // Số lượng phụ huynh đang mở xem (Real-time Live Count)
  const [liveCount, setLiveCount] = useState(initialViewCount);
  const [isJustJoined, setIsJustJoined] = useState(false);

  // Polling nhẹ mỗi 4s để cập nhật lượt xem thời gian thực
  const prevCountRef = useRef(initialViewCount);
  useEffect(() => {
    if (!classId) return;

    const interval = setInterval(async () => {
      try {
        const count = await getShowcaseLiveViewCount(classId);
        if (count !== null) {
          if (count > prevCountRef.current) {
            // Có người mới vừa tham gia -> kích hoạt hiệu ứng chúc mừng nhấp nháy
            setIsJustJoined(true);
            setTimeout(() => setIsJustJoined(false), 2400);
          }
          prevCountRef.current = count;
          setLiveCount(count);
        }
      } catch {
        // Bỏ qua lỗi ngầm
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [classId]);


  // Điều khiển thanh công cụ tự ẩn (hide controls on mouse idle)
  const [showControls, setShowControls] = useState(true);
  const idleTimerRef = useRef<number | null>(null);

  // Khởi tạo synth
  useEffect(() => {
    const synth = new AmbientAudioSynth();
    synthRef.current = synth;
    return () => {
      synth.destroy();
    };
  }, []);

  // Xử lý bật/tắt nhạc
  const toggleMusic = useCallback(() => {
    if (!synthRef.current) return;
    if (isMusicPlaying) {
      synthRef.current.stop();
      setIsMusicPlaying(false);
    } else {
      synthRef.current.start();
      setIsMusicPlaying(true);
    }
  }, [isMusicPlaying]);

  // Điều chỉnh âm lượng
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (synthRef.current) {
      synthRef.current.setVolume(newVol);
    }
  };

  // Tự động xoay vòng: Hiện nội dung học viên -> sau đó chạy các ảnh bài làm của học viên -> chuyển sang em tiếp theo
  useEffect(() => {
    if (projects.length === 0 || isPaused) return;

    const currentProj = projects[currentIndex % projects.length];
    const imageCount = currentProj?.imageUrls?.length ?? 0;

    let timeoutId: number;

    if (subStage === "info") {
      // Giai đoạn 1: Hiện nội dung giới thiệu học viên trong 6.5s
      timeoutId = window.setTimeout(() => {
        if (imageCount > 0) {
          // Nếu có ảnh bài làm: chuyển sang chạy ảnh
          setSubStage("gallery");
          setSubImageIndex(0);
        } else if (projects.length > 1) {
          // Không có ảnh: chuyển sang học viên tiếp theo
          goToStudent((currentIndex + 1) % projects.length);
        }
      }, 6500);
    } else {
      // Giai đoạn 2: Chiếu từng ảnh bài làm to vừa vặn màn hình trong 5.5s
      timeoutId = window.setTimeout(() => {
        if (subImageIndex + 1 < imageCount) {
          // Chuyển sang ảnh bài làm tiếp theo của em đó
          setSubImageIndex((prev) => prev + 1);
        } else if (projects.length > 1) {
          // Đã hết ảnh bài làm: chuyển sang học viên tiếp theo
          goToStudent((currentIndex + 1) % projects.length);
        } else {
          // Chỉ có 1 học viên duy nhất: lặp lại từ đầu
          setSubStage("info");
          setSubImageIndex(0);
        }
      }, 5500);
    }

    return () => window.clearTimeout(timeoutId);
  }, [currentIndex, subStage, subImageIndex, projects, isPaused, goToStudent]);

  // Bộ đếm ngược khai mạc
  useEffect(() => {
    if (countdownSecondsLeft === null) return;
    if (countdownSecondsLeft <= 0) return;

    const timer = setInterval(() => {
      setCountdownSecondsLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownSecondsLeft]);

  const startCountdown = (minutes: number | null) => {
    setCountdownMinutes(minutes);
    if (minutes === null) {
      setCountdownSecondsLeft(null);
    } else {
      setCountdownSecondsLeft(minutes * 60);
    }
  };

  // Tự động ẩn thanh công cụ khi chuột đứng im sau 3.5 giây
  const handleMouseMove = () => {
    setShowControls(true);
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = window.setTimeout(() => {
      setShowControls(false);
    }, 3500);
  };

  useEffect(() => {
    return () => {
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  const currentProject = useMemo(() => {
    if (projects.length === 0) return null;
    return projects[currentIndex % projects.length];
  }, [projects, currentIndex]);

  const formattedCountdown = useMemo(() => {
    if (countdownSecondsLeft === null) return null;
    const m = Math.floor(countdownSecondsLeft / 60);
    const s = countdownSecondsLeft % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, [countdownSecondsLeft]);

  return (
    <div
      onMouseMove={handleMouseMove}
      className={`${showcaseFontClass} ${
        isDark
          ? "dark bg-[#070a12] text-white"
          : "showcase-surface bg-[#faf6ee] text-[#241c14]"
      } showcase-theme relative flex h-full w-full select-none flex-col overflow-hidden transition-colors duration-300`}
    >
      {/* Nền hiệu ứng hạt bụi sao vàng lơ lửng */}
      <AmbientParticles isDark={isDark} />

      {/* Ánh sáng dạ nền dịu nhẹ (Ambient glow) */}
      <div
        className={`pointer-events-none absolute -top-40 -left-40 size-[500px] rounded-full blur-[140px] ${
          isDark ? "bg-amber-500/10" : "bg-amber-500/5"
        }`}
      />
      <div
        className={`pointer-events-none absolute -right-40 -bottom-40 size-[550px] rounded-full blur-[150px] ${
          isDark ? "bg-yellow-600/10" : "bg-yellow-600/5"
        }`}
      />

      {/* Header sang trọng trên cùng */}
      <header
        className={`relative z-10 flex shrink-0 items-center justify-between border-b px-8 py-4.5 backdrop-blur-md transition-colors ${
          isDark
            ? "border-slate-800/80 bg-[#070a12]/80 text-white"
            : "border-[#e4d9c4] bg-[#faf6ee]/90 text-[#241c14] shadow-2xs"
        }`}
      >
        <div className="flex items-center gap-3.5 sm:gap-4.5 min-w-0">
          <GraduationSeal
            size={42}
            className={isDark ? "text-amber-400" : "text-[#8a5e10]"}
          />
          <h1
            className={`font-display text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight whitespace-nowrap ${
              isDark ? "text-white" : "text-[#241c14]"
            }`}
          >
            Báo cáo sản phẩm cuối khóa - Lớp{" "}
            <span className="whitespace-nowrap font-sans font-bold">{classCode}</span>
          </h1>
        </div>

        {/* Đồng hồ đếm ngược giờ khai mạc nổi bật ở đầu trang */}
        {formattedCountdown && (
          <div
            className={`flex items-center gap-2.5 rounded-full border px-5 py-2 shadow-lg backdrop-blur-md transition-colors ${
              isDark
                ? "border-amber-500/40 bg-amber-950/60"
                : "border-[#8a5e10]/35 bg-[#f0dfb4]/60"
            }`}
          >
            <span className="relative flex size-3">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full ${
                  isDark ? "bg-amber-400 opacity-75" : "bg-[#8a5e10] opacity-60"
                }`}
              />
              <span
                className={`relative inline-flex size-3 rounded-full ${
                  isDark ? "bg-amber-400" : "bg-[#8a5e10]"
                }`}
              />
            </span>
            <span
              className={`text-sm sm:text-base font-semibold ${
                isDark ? "text-amber-200" : "text-[#6a5949]"
              }`}
            >
              {countdownSecondsLeft === 0
                ? "🎉 Buổi lễ chính thức bắt đầu!"
                : "Khai mạc sau:"}
            </span>
            {countdownSecondsLeft !== 0 && (
              <span
                className={`font-mono text-xl sm:text-2xl font-black ${
                  isDark ? "text-amber-300" : "text-[#8a5e10]"
                }`}
              >
                {formattedCountdown}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Nút chuyển đổi chế độ Sáng / Tối theo theme đã chọn ở Header */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              isDark
                ? "Chuyển sang giao diện sáng"
                : "Chuyển sang giao diện tối"
            }
            title={isDark ? "Giao diện sáng" : "Giao diện tối"}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
              isDark
                ? "border border-slate-700 bg-slate-800/80 text-amber-300 hover:bg-slate-700 hover:text-white"
                : "border border-[#e4d9c4] bg-[#fffcf6] text-[#8a5e10] hover:bg-[#f0dfb4]/50 hover:text-[#241c14]"
            }`}
          >
            {isDark ? (
              <>
                <SunIcon className="size-4 text-amber-300" />
                <span className="hidden sm:inline">Giao diện sáng</span>
              </>
            ) : (
              <>
                <MoonIcon className="size-4 text-[#8a5e10]" />
                <span className="hidden sm:inline">Giao diện tối</span>
              </>
            )}
          </button>

          {/* Nút thoát góc trên */}
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full px-4.5 py-2 text-sm font-semibold transition-colors cursor-pointer ${
              isDark
                ? "border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
                : "border border-[#e4d9c4] bg-[#fffcf6] text-[#6a5949] hover:bg-[#f0dfb4]/50 hover:text-[#241c14]"
            }`}
          >
            ✕ Thoát
          </button>
        </div>
      </header>

      {/* Nội dung chính: Bố cục Split-Screen cân đối */}
      <main className="relative z-10 grid min-h-0 flex-1 grid-cols-1 items-center gap-8 p-6 lg:grid-cols-12 lg:gap-12 lg:px-12">
        {/* CỘT TRÁI: Khu vực Mã QR & Thông điệp kết nối (5 cột) - Lược bỏ chữ, tuyệt đối không xuống dòng */}
        <div className="flex h-full flex-col items-center justify-center text-center lg:col-span-5">
          <div className="max-w-md space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs sm:text-sm font-bold uppercase tracking-widest whitespace-nowrap ${
                  isDark
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                    : "border-[#8a5e10]/30 bg-[#f0dfb4]/60 text-[#8a5e10]"
                }`}
              >
                📱 Quét mã tham gia
              </span>
              <h2
                className={`font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight whitespace-nowrap ${
                  isDark ? "text-white" : "text-[#241c14]"
                }`}
              >
                Xem sản phẩm
              </h2>
              <p
                className={`text-sm sm:text-base font-medium whitespace-nowrap ${
                  isDark ? "text-slate-300" : "text-[#6a5949]"
                }`}
              >
                Gửi cảm nghĩ & góp ý cho các con
              </p>
            </div>

            {/* Khung QR to, sắc nét viền sáng ánh kim */}
            <div className="relative mx-auto inline-block">
              <div
                className={`absolute -inset-1 rounded-[32px] opacity-75 blur-md ${
                  isDark
                    ? "bg-gradient-to-r from-amber-500/40 via-yellow-300/40 to-amber-500/40"
                    : "bg-gradient-to-r from-amber-600/30 via-yellow-500/30 to-amber-600/30"
                }`}
              />
              <div
                className={`relative rounded-3xl border-2 bg-white p-5 ${
                  isDark
                    ? "border-amber-400/60 shadow-[0_0_40px_rgba(245,158,11,0.25)]"
                    : "border-[#8a5e10]/50 shadow-[0_10px_35px_rgba(138,94,16,0.15)]"
                }`}
              >
                <QrCode
                  value={fullUrl}
                  size={380}
                  className="block h-[clamp(190px,28vh,360px)] w-[clamp(190px,28vh,360px)]"
                />
              </div>
            </div>

            {/* Dòng thông điệp kết nối thời gian thực — 1 dòng duy nhất, không xuống dòng */}
            <div>
              <div
                className={`inline-flex items-center gap-2.5 rounded-full border px-4 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap backdrop-blur-xs transition-all duration-500 select-none ${
                  isJustJoined
                    ? isDark
                      ? "border-emerald-400/80 bg-emerald-900/85 text-emerald-100 shadow-[0_0_24px_rgba(52,211,153,0.4)] scale-105"
                      : "border-emerald-600 bg-emerald-100 text-emerald-900 shadow-md scale-105"
                    : isDark
                      ? "border-emerald-500/30 bg-emerald-950/70 text-emerald-300 shadow-md scale-100"
                      : "border-emerald-600/30 bg-emerald-50/90 text-emerald-800 shadow-2xs scale-100"
                }`}
              >
                <span className="relative flex size-2.5">
                  <span
                    className={`absolute inline-flex h-full w-full rounded-full bg-emerald-500 ${
                      isJustJoined
                        ? "animate-ping opacity-100 duration-700"
                        : "animate-ping opacity-75"
                    }`}
                  />
                  <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                </span>
                <span className="whitespace-nowrap">
                  {liveCount > 0 ? "Khán giả vừa tham gia" : "Đang chờ kết nối"} ·{" "}
                  <strong
                    className={`inline-block font-mono font-bold transition-all duration-300 ${
                      isJustJoined
                        ? isDark
                          ? "scale-125 text-emerald-100 drop-shadow-[0_0_8px_rgba(52,211,153,0.85)]"
                          : "scale-125 text-emerald-950 font-extrabold"
                        : isDark
                          ? "scale-100 text-emerald-200"
                          : "scale-100 text-emerald-800"
                    }`}
                  >
                    {liveCount}
                  </strong>{" "}
                  thiết bị
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: Khung trình chiếu sản phẩm cố định chiều cao, không nhảy giật giao diện (7 cột) */}
        <div className="flex h-full flex-col justify-center lg:col-span-7">
          {currentProject ? (
            <div
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              className={`relative flex flex-col justify-between overflow-hidden rounded-3xl border transition-all h-[560px] sm:h-[580px] lg:h-[600px] w-full shadow-2xl backdrop-blur-xl ${
                isDark
                  ? "border-amber-500/30 bg-[#0f1422]/95 shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-white"
                  : "border-2 border-[#e4d9c4] bg-[#fffcf6] shadow-[0_20px_45px_rgba(36,28,20,0.08)] text-[#241c14]"
              }`}
            >
              {/* Header của thẻ sản phẩm */}
              <div
                className={`flex h-16 sm:h-18 shrink-0 items-center justify-between gap-4 border-b px-6 sm:px-8 ${
                  isDark ? "border-slate-800" : "border-[#e4d9c4]"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <SealAvatar name={currentProject.authorName} size={40} />
                  <div className="min-w-0">
                    <h3
                      className={`font-display text-lg sm:text-xl font-bold truncate ${
                        isDark ? "text-white" : "text-[#241c14]"
                      }`}
                    >
                      {currentProject.authorName}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {/* Nút chuyển đổi chế độ xem: Nội dung vs Ảnh bài làm */}
                  {currentProject.imageUrls.length > 0 && (
                    <div
                      className={`inline-flex items-center rounded-full border p-1 text-xs font-semibold ${
                        isDark
                          ? "border-slate-700 bg-slate-800/80"
                          : "border-[#e4d9c4] bg-[#faf6ee]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSubStage("info")}
                        className={`rounded-full px-3 py-1 transition-colors cursor-pointer ${
                          subStage === "info"
                            ? isDark
                              ? "bg-amber-400 text-slate-950 font-bold"
                              : "bg-[#8a5e10] text-white font-bold"
                            : isDark
                              ? "text-slate-300 hover:text-white"
                              : "text-[#6a5949] hover:text-[#241c14]"
                        }`}
                      >
                        📋 Nội dung
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSubStage("gallery");
                          setSubImageIndex(0);
                        }}
                        className={`rounded-full px-3 py-1 transition-colors cursor-pointer ${
                          subStage === "gallery"
                            ? isDark
                              ? "bg-amber-400 text-slate-950 font-bold"
                              : "bg-[#8a5e10] text-white font-bold"
                            : isDark
                              ? "text-slate-300 hover:text-white"
                              : "text-[#6a5949] hover:text-[#241c14]"
                        }`}
                      >
                        🖼️ Ảnh bài làm ({currentProject.imageUrls.length})
                      </button>
                    </div>
                  )}

                  {/* Badge thứ tự học viên */}
                  <span
                    className={`rounded-full border px-3.5 py-1.5 font-display text-sm font-bold ${
                      isDark
                        ? "border-amber-500/30 bg-amber-500/15 text-amber-300"
                        : "border-[#8a5e10]/30 bg-[#f0dfb4]/60 text-[#8a5e10]"
                    }`}
                  >
                    {currentIndex + 1} / {projects.length}
                  </span>
                </div>
              </div>

              {/* Thân thẻ: flex-1 cố định, không nhảy giao diện */}
              <div className="flex-1 min-h-0 overflow-hidden p-6 sm:p-7">
                {subStage === "gallery" && currentProject.imageUrls.length > 0 ? (
                  /* GIAI ĐOẠN 2: Chiếu ảnh bài làm to vừa vặn màn hình (Cinema Showcase) */
                  <div className="relative flex size-full items-center justify-center overflow-hidden rounded-2xl bg-zinc-950 shadow-inner">
                    {/* Ambient backdrop mờ theo màu ảnh */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <SafeImage
                        src={currentProject.imageUrls[subImageIndex]}
                        alt=""
                        className="size-full scale-125 object-cover blur-2xl opacity-35 saturate-150"
                      />
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs" />
                    </div>

                    {/* Ảnh bài làm chính: hiển thị 100% trọn vẹn, vừa vặn hoàn hảo với màn hình */}
                    <div className="relative z-1 flex size-full items-center justify-center p-3 sm:p-4">
                      <SafeImage
                        src={currentProject.imageUrls[subImageIndex]}
                        alt={`${currentProject.name} - ảnh ${subImageIndex + 1}`}
                        className="max-h-full max-w-full object-contain drop-shadow-2xl rounded-xl transition-transform duration-500"
                      />
                    </div>

                    {/* Badge số thứ tự ảnh */}
                    <div className="absolute top-3 right-3 z-10 rounded-full bg-black/70 px-3 py-1 font-mono text-xs font-semibold text-white backdrop-blur-md border border-white/10 shadow-xs">
                      Ảnh {subImageIndex + 1} / {currentProject.imageUrls.length}
                    </div>

                    {/* Dải dots chuyển ảnh nếu có > 1 ảnh */}
                    {currentProject.imageUrls.length > 1 && (
                      <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-black/70 px-3.5 py-1.5 backdrop-blur-md border border-white/15">
                        {currentProject.imageUrls.map((_, imgIdx) => (
                          <button
                            key={imgIdx}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSubImageIndex(imgIdx);
                            }}
                            className={`h-2 rounded-full transition-all cursor-pointer ${
                              imgIdx === subImageIndex
                                ? "w-6 bg-amber-400 shadow-xs"
                                : "w-2 bg-white/40 hover:bg-white/70"
                            }`}
                            aria-label={`Xem ảnh ${imgIdx + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* GIAI ĐOẠN 1: Hiện nội dung dự án của học viên (không hiển thị ảnh, tập trung tối đa cho thông tin) */
                  <div className="flex h-full min-h-0 flex-col justify-between overflow-hidden space-y-4">
                    {/* Tên dự án */}
                    <div>
                      <span
                        className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${
                          isDark ? "text-amber-400/90" : "text-[#8a5e10]"
                        }`}
                      >
                        Tên dự án
                      </span>
                      <h4
                        className={`font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold truncate mt-0.5 ${
                          isDark ? "text-white" : "text-[#241c14]"
                        }`}
                      >
                        {currentProject.name}
                      </h4>
                    </div>

                    {/* Mô tả dự án */}
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                      <span
                        className={`text-xs sm:text-sm font-bold uppercase tracking-wider mb-1.5 ${
                          isDark ? "text-slate-400" : "text-[#6a5949]"
                        }`}
                      >
                        Mô tả dự án
                      </span>
                      <div
                        className={`flex-1 min-h-0 overflow-y-auto scrollbar-slim rounded-2xl border p-4 sm:p-5 text-base sm:text-lg lg:text-xl leading-relaxed ${
                          isDark
                            ? "border-slate-800 bg-slate-900/60 text-slate-200"
                            : "border-[#e4d9c4] bg-[#faf6ee] text-[#241c14]"
                        }`}
                      >
                        {currentProject.description ||
                          "Dự án tốt nghiệp do học viên tự tay lên ý tưởng, thiết kế và phát triển hoàn thiện."}
                      </div>
                    </div>

                    {/* Điểm nổi bật đã làm được */}
                    {currentProject.features.length > 0 && (
                      <div className="shrink-0 space-y-2">
                        <p
                          className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${
                            isDark ? "text-amber-400" : "text-[#8a5e10]"
                          }`}
                        >
                          Điểm nổi bật đã làm được ({currentProject.features.length}):
                        </p>
                        <div className="flex flex-wrap gap-2.5 max-h-28 overflow-y-auto scrollbar-slim">
                          {currentProject.features.map((feat) => (
                            <div
                              key={feat}
                              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm sm:text-base font-medium ${
                                isDark
                                  ? "border-slate-700 bg-slate-800/80 text-slate-200"
                                  : "border-[#e4d9c4] bg-[#fffcf6] text-[#241c14]"
                              }`}
                            >
                              <CheckMark
                                className={`size-4 shrink-0 ${
                                  isDark ? "text-amber-400" : "text-[#8a5e10]"
                                }`}
                              />
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Chân thẻ: cố định h-16 với dots phân trang + nút chuyển slide */}
              <div
                className={`flex h-16 shrink-0 items-center justify-between border-t px-6 sm:px-8 ${
                  isDark ? "border-slate-800" : "border-[#e4d9c4]"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {projects.slice(0, 15).map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => goToStudent(idx)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        idx === currentIndex
                          ? isDark
                            ? "w-7 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                            : "w-7 bg-[#8a5e10] shadow-[0_0_6px_rgba(138,94,16,0.4)]"
                          : isDark
                            ? "w-2.5 bg-slate-700 hover:bg-slate-500"
                            : "w-2.5 bg-[#e4d9c4] hover:bg-[#d5c5aa]"
                      }`}
                      aria-label={`Chuyển tới bài ${p.authorName}`}
                    />
                  ))}
                  {projects.length > 15 && (
                    <span
                      className={`text-xs font-semibold ${
                        isDark ? "text-slate-400" : "text-[#6a5949]"
                      }`}
                    >
                      +{projects.length - 15}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      goToStudent((currentIndex - 1 + projects.length) % projects.length)
                    }
                    className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors cursor-pointer ${
                      isDark
                        ? "border border-slate-700 bg-slate-800/90 text-slate-200 hover:bg-slate-700 hover:text-white"
                        : "border border-[#e4d9c4] bg-[#fffcf6] text-[#241c14] hover:bg-[#f0dfb4]/40"
                    }`}
                    aria-label="Bạn trước"
                  >
                    ← Trước
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      goToStudent((currentIndex + 1) % projects.length)
                    }
                    className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors cursor-pointer ${
                      isDark
                        ? "border border-slate-700 bg-slate-800/90 text-slate-200 hover:bg-slate-700 hover:text-white"
                        : "border border-[#e4d9c4] bg-[#fffcf6] text-[#241c14] hover:bg-[#f0dfb4]/40"
                    }`}
                    aria-label="Bạn tiếp theo"
                  >
                    Tiếp →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Khi chưa có sản phẩm: Thiệp chào mừng trang trọng */
            <div
              className={`flex flex-col items-center justify-center rounded-3xl border p-12 text-center backdrop-blur-xl ${
                isDark
                  ? "border-amber-500/25 bg-[#0f1422]/95 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
                  : "border-2 border-[#e4d9c4] bg-[#fffcf6] shadow-[0_20px_45px_rgba(36,28,20,0.08)]"
              }`}
            >
              <GraduationSeal
                size={88}
                withRibbon
                className={isDark ? "text-amber-400" : "text-[#8a5e10]"}
              />
              <h3
                className={`mt-5 font-display text-3xl font-extrabold sm:text-4xl lg:text-5xl ${
                  isDark ? "text-white" : "text-[#241c14]"
                }`}
              >
                Chào mừng Quý phụ huynh & Các em học sinh!
              </h3>
              <p
                className={`mt-3 max-w-xl text-base sm:text-lg lg:text-xl font-medium leading-relaxed ${
                  isDark ? "text-slate-300" : "text-[#6a5949]"
                }`}
              >
                Hãy chuẩn bị điện thoại và quét mã QR bên cạnh để cùng theo dõi những
                sản phẩm công nghệ tuyệt vời của lớp học hôm nay.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Thanh công cụ giáo viên tự động ẩn ở cạnh dưới màn hình */}
      <footer
        className={`relative z-20 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-8 py-3.5 backdrop-blur-md transition-all duration-300 ${
          isDark
            ? "border-slate-800 bg-[#070a12]/95 text-slate-300"
            : "border-[#e4d9c4] bg-[#faf6ee]/95 text-[#6a5949] shadow-md"
        } ${showControls ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {/* Điều khiển nhạc nền */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleMusic}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${
              isMusicPlaying
                ? isDark
                  ? "bg-amber-400 text-slate-950 shadow-md font-bold"
                  : "bg-[#8a5e10] text-white shadow-xs font-bold"
                : isDark
                  ? "border border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white"
                  : "border border-[#e4d9c4] bg-[#fffcf6] text-[#241c14] hover:bg-[#f0dfb4]/40"
            }`}
          >
            <span>{isMusicPlaying ? "🔊 Nhạc nền: Bật" : "🔇 Nhạc nền: Tắt"}</span>
          </button>

          {isMusicPlaying && (
            <div className="flex items-center gap-2.5">
              <span
                className={`text-xs sm:text-sm font-medium ${
                  isDark ? "text-slate-400" : "text-[#6a5949]"
                }`}
              >
                Âm lượng:
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className={`h-2 w-24 cursor-pointer appearance-none rounded-full ${
                  isDark
                    ? "bg-slate-700 accent-amber-400"
                    : "bg-[#e4d9c4] accent-[#8a5e10]"
                }`}
              />
            </div>
          )}
        </div>

        {/* Điều khiển đếm ngược */}
        <div className="flex items-center gap-2 text-sm">
          <span className={`font-medium ${isDark ? "text-slate-400" : "text-[#6a5949]"}`}>
            ⏱️ Hẹn giờ khai mạc:
          </span>
          {[5, 10, 15].map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() =>
                startCountdown(countdownMinutes === mins ? null : mins)
              }
              className={`rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                countdownMinutes === mins
                  ? isDark
                    ? "bg-amber-400 text-slate-950 font-bold shadow-xs"
                    : "bg-[#8a5e10] text-white font-bold shadow-xs"
                  : isDark
                    ? "border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
                    : "border border-[#e4d9c4] bg-[#fffcf6] text-[#6a5949] hover:bg-[#f0dfb4]/40 hover:text-[#241c14]"
              }`}
            >
              {mins} phút
            </button>
          ))}
          {countdownMinutes !== null && (
            <button
              type="button"
              onClick={() => startCountdown(null)}
              className={`text-xs sm:text-sm font-medium cursor-pointer ${
                isDark
                  ? "text-slate-400 hover:text-white"
                  : "text-[#6a5949] hover:text-[#241c14]"
              }`}
            >
              ✕ Hủy
            </button>
          )}
        </div>


      </footer>
    </div>
  );
}
