"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { QrCode } from "@/components/qr-code";
import { SafeImage } from "@/components/safe-image";
import { CheckMark, GraduationSeal } from "@/components/showcase/emblem";
import { showcaseFontClass } from "@/components/showcase/fonts";
import { SealAvatar } from "@/components/showcase/seal-avatar";
import {
  enterBrowserFullscreen,
  exitBrowserFullscreen,
} from "@/components/tv-overlay";
import {
  getShowcaseLiveViewCount,
  resetShowcaseViewCount,
} from "@/lib/actions/showcase";

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
 * Hiệu ứng hạt bụi vàng bay nhẹ nhàng trong không gian tối (Ambient Starlight Particles)
 */
function AmbientParticles() {
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

    const PARTICLE_COUNT = 55;
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

        ctx.fillStyle = `rgba(218, 165, 32, ${Math.max(0, Math.min(1, currentOpacity))})`;
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
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-60"
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

  public start() {
    this.init();
    if (this.isRunning) return;
    this.isRunning = true;
    this.playNextChord();
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

  private playNextChord() {
    if (!this.isRunning || !this.ctx || !this.gainNode) return;

    const chord = this.chords[this.chordIndex];
    this.chordIndex = (this.chordIndex + 1) % this.chords.length;

    const now = this.ctx.currentTime;
    const duration = 4.8;

    for (const freq of chord) {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      // Sine wave mềm mại kết hợp chút triangle wave
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      // Thêm chút detune ngẫu nhiên tạo độ ấm (chorus effect)
      osc.detune.setValueAtTime((Math.random() - 0.5) * 8, now);

      // ADSR Envelope êm ái: Attack 1.2s, Decay 0.8s, Sustain, Release 1.5s
      oscGain.gain.setValueAtTime(0, now);
      oscGain.gain.linearRampToValueAtTime(0.06, now + 1.2);
      oscGain.gain.exponentialRampToValueAtTime(0.04, now + 2.5);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(oscGain);
      oscGain.connect(this.gainNode);

      osc.start(now);
      osc.stop(now + duration + 0.2);
    }

    this.timerId = window.setTimeout(() => {
      this.playNextChord();
    }, (duration - 1.2) * 1000); // Cross-fade nhẹ giữa các hợp âm
  }

  public destroy() {
    this.stop();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.gainNode = null;
    }
  }
}

/**
 * Màn hình chờ trình chiếu TV / Máy chiếu chuyên nghiệp cho buổi lễ tổng kết (Welcome Pre-show Mode)
 */
export function ShowcaseTvScreen({
  classId,
  classCode,
  fullUrl,
  viewCount,
  projects = [],
  onClose,
}: ShowcaseTvScreenProps) {
  // Trạng thái Auto-reel xoay vòng sản phẩm
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Số lượng thiết bị THỰC TẾ kết nối từ database (mặc định ban đầu 0 thiết bị)
  const [liveCount, setLiveCount] = useState(() => Math.max(viewCount ?? 0, 0));
  const [isJustJoined, setIsJustJoined] = useState(false);

  // Đặt lại bộ đếm thiết bị về 0
  const handleResetCount = useCallback(async () => {
    setLiveCount(0);
    if (classId) {
      await resetShowcaseViewCount(classId);
    }
  }, [classId]);

  // Lắng nghe cập nhật thực tế từ database mỗi 2.5s:
  // Khi khán giả quét mã QR trên điện thoại và vào tới web thành công,
  // RPC bump_showcase_view sẽ tăng view_count trong DB -> TV lập tức nhảy số thật và phát sáng!
  useEffect(() => {
    if (!classId) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const latestCount = await getShowcaseLiveViewCount(classId);
        if (!isMounted || latestCount === null) return;

        setLiveCount((prev) => {
          if (latestCount > prev) {
            // Phát hiện có khán giả thực sự vừa quét mã vào tới website!
            setIsJustJoined(true);
            setTimeout(() => {
              if (isMounted) setIsJustJoined(false);
            }, 2500);
            return latestCount;
          }
          return Math.max(prev, latestCount);
        });
      } catch {
        // Bỏ qua lỗi mạng chập chờn
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [classId]);

  // Âm thanh
  const synthRef = useRef<AmbientAudioSynth | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);

  // Đếm ngược giờ khai mạc
  const [countdownMinutes, setCountdownMinutes] = useState<number | null>(null);
  const [countdownSecondsLeft, setCountdownSecondsLeft] = useState<number | null>(
    null
  );

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

  // Tự động xoay vòng slide sản phẩm mỗi 6.5 giây
  useEffect(() => {
    if (projects.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % projects.length);
    }, 6500);

    return () => clearInterval(timer);
  }, [projects.length, isPaused]);

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
      className={`${showcaseFontClass} dark showcase-theme relative flex h-full w-full select-none flex-col overflow-hidden bg-[#070a12] text-white`}
      style={{ backgroundColor: "#070a12", color: "#f8fafc" }}
    >
      {/* Nền hiệu ứng hạt bụi sao vàng lơ lửng */}
      <AmbientParticles />

      {/* Ánh sáng dạ nền dịu nhẹ (Ambient glow) */}
      <div className="pointer-events-none absolute -top-40 -left-40 size-[500px] rounded-full bg-amber-500/10 blur-[140px]" />
      <div className="pointer-events-none absolute -right-40 -bottom-40 size-[550px] rounded-full bg-yellow-600/10 blur-[150px]" />

      {/* Header sang trọng trên cùng */}
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-slate-800/80 bg-[#070a12]/80 px-8 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <GraduationSeal size={38} className="text-amber-400" />
          <div>
            <p className="text-[11px] font-semibold tracking-[0.25em] text-amber-400 uppercase">
              Lễ tổng kết & Báo cáo sản phẩm
            </p>
            <h1 className="font-display text-lg font-bold tracking-tight text-white sm:text-xl">
              Khóa học Lập trình · Lớp {classCode}
            </h1>
          </div>
        </div>

        {/* Đồng hồ đếm ngược giờ khai mạc nổi bật ở đầu trang */}
        {formattedCountdown && (
          <div className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-950/60 px-4 py-1.5 shadow-lg backdrop-blur-md">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-amber-400" />
            </span>
            <span className="text-xs font-medium text-amber-200">
              {countdownSecondsLeft === 0
                ? "🎉 Buổi lễ chính thức bắt đầu!"
                : "Khai mạc sau:"}
            </span>
            {countdownSecondsLeft !== 0 && (
              <span className="font-mono text-base font-bold text-amber-300">
                {formattedCountdown}
              </span>
            )}
          </div>
        )}

        {/* Nút thoát góc trên */}
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-slate-700 bg-slate-800/80 px-4 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
        >
          ✕ Thoát
        </button>
      </header>

      {/* Nội dung chính: Bố cục Split-Screen cân đối */}
      <main className="relative z-10 grid min-h-0 flex-1 grid-cols-1 items-center gap-8 p-6 lg:grid-cols-12 lg:gap-12 lg:px-12">
        {/* CỘT TRÁI: Khu vực Mã QR & Thông điệp kết nối (5 cột) */}
        <div className="flex h-full flex-col items-center justify-center text-center lg:col-span-5">
          <div className="max-w-md space-y-4">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-300 uppercase tracking-widest">
                📱 Quét mã tham gia
              </span>
              <h2 className="font-display text-2xl font-bold leading-snug sm:text-3xl text-white">
                Xem sản phẩm học viên
              </h2>
              <p className="text-xs text-slate-300 sm:text-sm">
                Cùng theo dõi các dự án công nghệ, gửi cảm nghĩ & góp ý cho các con
              </p>
            </div>

            {/* Khung QR to, sắc nét viền sáng ánh kim */}
            <div className="relative mx-auto inline-block">
              <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-r from-amber-500/40 via-yellow-300/40 to-amber-500/40 opacity-75 blur-md" />
              <div className="relative rounded-3xl border-2 border-amber-400/60 bg-white p-5 shadow-[0_0_40px_rgba(245,158,11,0.25)]">
                <QrCode
                  value={fullUrl}
                  size={380}
                  className="block h-[clamp(190px,28vh,360px)] w-[clamp(190px,28vh,360px)]"
                />
              </div>
            </div>

            {/* Dòng thông điệp kết nối thời gian thực — đếm thực tế khi khách vào web */}
            <div
              className={`inline-flex items-center gap-2.5 rounded-full border px-4 py-2 text-xs font-medium backdrop-blur-xs transition-all duration-500 select-none ${isJustJoined
                  ? "border-emerald-400/80 bg-emerald-900/85 text-emerald-100 shadow-[0_0_24px_rgba(52,211,153,0.4)] scale-105"
                  : "border-emerald-500/30 bg-emerald-950/70 text-emerald-300 shadow-md scale-100"
                }`}
            >
              <span className="relative flex size-2.5">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 ${isJustJoined
                      ? "animate-ping opacity-100 duration-700"
                      : "animate-ping opacity-75"
                    }`}
                />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
              </span>
              <span>
                {liveCount > 0 ? "Một khán giả vừa tham gia" : "Đang chờ khán giả quét mã"} ·{" "}
                <strong
                  className={`inline-block font-mono font-bold transition-all duration-300 ${isJustJoined
                      ? "scale-125 text-emerald-100 drop-shadow-[0_0_8px_rgba(52,211,153,0.85)]"
                      : "scale-100 text-emerald-200"
                    }`}
                >
                  {liveCount}
                </strong>{" "}
                thiết bị đang kết nối
              </span>
            </div>

            {/* Link dự phòng rút gọn */}
            <p className="mx-auto max-w-sm truncate rounded-full border border-slate-800 bg-slate-900/90 px-4 py-1.5 font-mono text-xs text-slate-400">
              {fullUrl}
            </p>
          </div>
        </div>

        {/* CỘT PHẢI: Khung trình chiếu sản phẩm xoay vòng Auto-Reel (7 cột) */}
        <div className="flex h-full flex-col justify-center lg:col-span-7">
          {currentProject ? (
            <div
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-amber-500/30 bg-[#0f1422]/95 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all sm:p-8"
            >
              {/* Header của thẻ sản phẩm */}
              <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3.5">
                  <SealAvatar name={currentProject.authorName} size={48} />
                  <div>
                    <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                      Học viên lập trình
                    </span>
                    <h3 className="font-display text-xl font-bold text-white sm:text-2xl">
                      {currentProject.authorName}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 font-display text-xs font-semibold text-amber-300">
                    {currentIndex + 1} / {projects.length}
                  </span>
                </div>
              </div>

              {/* Thân thẻ: Ảnh demo lớn + Tên đề tài + tính năng */}
              <div className="grid gap-6 py-5 sm:grid-cols-2 sm:items-center">
                <div className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950">
                  {currentProject.imageUrls.length > 0 ? (
                    <SafeImage
                      src={currentProject.imageUrls[0]}
                      alt={currentProject.name}
                      className="h-52 w-full object-cover transition-transform duration-700 hover:scale-105 sm:h-64"
                    />
                  ) : (
                    <div className="flex h-52 w-full flex-col items-center justify-center gap-2 p-6 text-center text-slate-400 sm:h-64">
                      <GraduationSeal size={52} className="text-amber-400/40" />
                      <span className="text-xs">Sản phẩm lập trình sáng tạo</span>
                    </div>
                  )}
                  <span className="sc-tape absolute -top-1.5 left-6 h-4 w-16 rounded-[2px]" />
                </div>

                <div className="space-y-3.5">
                  <div>
                    <span className="text-xs font-medium text-amber-400/90 uppercase tracking-wider">
                      Tên dự án
                    </span>
                    <h4 className="font-display text-xl font-bold text-white sm:text-2xl">
                      {currentProject.name}
                    </h4>
                  </div>

                  {currentProject.description && (
                    <p className="line-clamp-3 text-xs leading-relaxed text-slate-300 sm:text-sm">
                      {currentProject.description}
                    </p>
                  )}

                  {currentProject.features.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                        Điểm nổi bật đã làm được:
                      </p>
                      <ul className="space-y-1">
                        {currentProject.features.slice(0, 3).map((feat) => (
                          <li
                            key={feat}
                            className="flex items-start gap-2 text-xs text-slate-200"
                          >
                            <CheckMark className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
                            <span className="line-clamp-1">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Chân thẻ: Dots phân trang + Nút chuyển slide thủ công */}
              <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                <div className="flex items-center gap-1.5">
                  {projects.slice(0, 15).map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-1.5 rounded-full transition-all ${idx === currentIndex
                          ? "w-6 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                          : "w-2 bg-slate-700 hover:bg-slate-500"
                        }`}
                      aria-label={`Chuyển tới bài ${p.authorName}`}
                    />
                  ))}
                  {projects.length > 15 && (
                    <span className="text-[10px] text-slate-400">+{projects.length - 15}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentIndex(
                        (prev) => (prev - 1 + projects.length) % projects.length
                      )
                    }
                    className="rounded-full border border-slate-700 bg-slate-800/90 p-2 text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
                    aria-label="Bạn trước"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentIndex((prev) => (prev + 1) % projects.length)
                    }
                    className="rounded-full border border-slate-700 bg-slate-800/90 p-2 text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
                    aria-label="Bạn tiếp theo"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Khi chưa có sản phẩm: Thiệp chào mừng trang trọng */
            <div className="flex flex-col items-center justify-center rounded-3xl border border-amber-500/25 bg-[#0f1422]/95 p-12 text-center shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
              <GraduationSeal size={72} withRibbon className="text-amber-400" />
              <h3 className="mt-4 font-display text-2xl font-bold text-white sm:text-3xl">
                Chào mừng Quý phụ huynh & Các em học sinh!
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate-300">
                Hãy chuẩn bị điện thoại và quét mã QR bên cạnh để cùng theo dõi những
                sản phẩm công nghệ tuyệt vời của lớp học hôm nay.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Thanh công cụ giáo viên tự động ẩn ở cạnh dưới màn hình */}
      <footer
        className={`relative z-20 flex shrink-0 items-center justify-between border-t border-slate-800 bg-[#070a12]/95 px-8 py-3 backdrop-blur-md transition-opacity duration-300 ${showControls ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
      >
        {/* Điều khiển nhạc nền */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleMusic}
            className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${isMusicPlaying
                ? "bg-amber-400 text-slate-950 shadow-md font-semibold"
                : "border border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white"
              }`}
          >
            <span>{isMusicPlaying ? "🔊 Nhạc nền: Bật" : "🔇 Nhạc nền: Tắt"}</span>
          </button>

          {isMusicPlaying && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Âm lượng:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-slate-700 accent-amber-400"
              />
            </div>
          )}
        </div>

        {/* Điều khiển đếm ngược */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">⏱️ Hẹn giờ khai mạc:</span>
          {[5, 10, 15].map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() =>
                startCountdown(countdownMinutes === mins ? null : mins)
              }
              className={`rounded-full px-3 py-1 font-medium transition-colors ${countdownMinutes === mins
                  ? "bg-amber-400 text-slate-950 font-semibold"
                  : "border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
            >
              {mins} phút
            </button>
          ))}
          {countdownMinutes !== null && (
            <button
              type="button"
              onClick={() => startCountdown(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ Hủy
            </button>
          )}
        </div>

        {/* Toàn màn hình & Thoát */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetCount}
            className="rounded-full border border-slate-700 bg-slate-800/80 px-3.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            title="Đặt lại số lượng kết nối về 0 khi bắt đầu buổi lễ"
          >
            🔄 Đặt lại 0
          </button>
          <button
            type="button"
            onClick={() => {
              if (document.fullscreenElement) {
                exitBrowserFullscreen();
              } else {
                enterBrowserFullscreen();
              }
            }}
            className="rounded-full border border-slate-700 bg-slate-800/80 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
          >
            ⛶ Toàn màn hình
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-red-600/80 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600"
          >
            ✕ Đóng màn chiếu
          </button>
        </div>
      </footer>
    </div>
  );
}
