"use client";

import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TvOverlay,
  enterBrowserFullscreen,
  exitBrowserFullscreen,
} from "@/components/tv-overlay";

export interface GroupMember {
  id: string;
  name: string;
}

export interface PresentationGroup {
  name: string;
  members: GroupMember[];
}

type Mode = "byGroups" | "bySize";

/** Linh vật + bộ màu cố định theo THỨ TỰ nhóm — đủ tương phản khi chiếu TV.
 *  Class Tailwind phải là chuỗi literal đầy đủ (JIT không hiểu tên ghép động). */
const GROUP_THEMES = [
  { emoji: "🦁", card: "border-amber-500/50 bg-amber-500/10", title: "text-amber-700 dark:text-amber-300" },
  { emoji: "🚀", card: "border-indigo-500/50 bg-indigo-500/10", title: "text-indigo-700 dark:text-indigo-300" },
  { emoji: "🐬", card: "border-sky-500/50 bg-sky-500/10", title: "text-sky-700 dark:text-sky-300" },
  { emoji: "🌵", card: "border-emerald-500/50 bg-emerald-500/10", title: "text-emerald-700 dark:text-emerald-300" },
  { emoji: "🔥", card: "border-rose-500/50 bg-rose-500/10", title: "text-rose-700 dark:text-rose-300" },
  { emoji: "🦄", card: "border-violet-500/50 bg-violet-500/10", title: "text-violet-700 dark:text-violet-300" },
  { emoji: "🍊", card: "border-orange-500/50 bg-orange-500/10", title: "text-orange-700 dark:text-orange-300" },
  { emoji: "🐢", card: "border-teal-500/50 bg-teal-500/10", title: "text-teal-700 dark:text-teal-300" },
] as const;

/** Fisher-Yates: xáo trộn bản sao, không đụng mảng gốc. */
function shuffle<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Chia đều round-robin → số người giữa các nhóm chênh nhau tối đa 1. */
function buildGroups(members: GroupMember[], count: number): PresentationGroup[] {
  const shuffled = shuffle(members);
  const groups: PresentationGroup[] = Array.from({ length: count }, (_, i) => ({
    name: `Nhóm ${i + 1}`,
    members: [],
  }));
  shuffled.forEach((member, i) => {
    groups[i % count].members.push(member);
  });
  return groups;
}

function GroupCard({
  group,
  index,
  shuffling,
  tv,
}: {
  group: PresentationGroup;
  index: number;
  shuffling: boolean;
  tv: boolean;
}) {
  const theme = GROUP_THEMES[index % GROUP_THEMES.length];
  return (
    <div
      className={`rounded-2xl border-2 transition-all ${theme.card} ${
        tv ? "p-6" : "p-4"
      } ${shuffling ? "scale-[0.98] opacity-70" : "animate-in fade-in slide-in-from-bottom-2"}`}
      style={shuffling ? undefined : { animationDelay: `${index * 60}ms` }}
    >
      <div className="mb-3 flex items-center gap-3">
        <span className={tv ? "text-4xl" : "text-2xl"} aria-hidden>
          {theme.emoji}
        </span>
        <p className={`font-bold ${theme.title} ${tv ? "text-3xl" : "text-lg"}`}>
          {group.name}
        </p>
        <Badge variant="secondary" className={`ml-auto ${tv ? "px-3 py-1 text-base" : "text-xs"}`}>
          {group.members.length} bạn
        </Badge>
      </div>
      <ul className={tv ? "space-y-2" : "space-y-1"}>
        {group.members.map((m) => (
          <li
            key={m.id}
            className={`flex items-center gap-2 font-medium ${
              tv ? "text-2xl" : "text-sm"
            }`}
          >
            <span className={`inline-block size-2 shrink-0 rounded-full ${theme.card} border`} aria-hidden />
            {m.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Chia nhóm hoàn toàn tại chỗ — KHÔNG lưu DB (mỗi buổi random lại từ đầu). */
export function GroupRandomizer({
  classCode,
  students,
}: {
  classCode: string;
  students: GroupMember[];
}) {
  const [mode, setMode] = useState<Mode>("byGroups");
  const [value, setValue] = useState("3");
  const [groups, setGroups] = useState<PresentationGroup[]>([]);
  const [shuffling, setShuffling] = useState(false);
  const [tvMode, setTvMode] = useState(false);
  // Đánh dấu vắng mặt hôm nay — chỉ tồn tại tại chỗ, KHÔNG lưu DB (không phải điểm danh).
  const [absentIds, setAbsentIds] = useState<Set<string>>(new Set());
  const timers = useRef<{ interval?: ReturnType<typeof setInterval>; timeout?: ReturnType<typeof setTimeout> }>({});

  function toggleAbsent(id: string) {
    setAbsentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const activeStudents = students.filter((s) => !absentIds.has(s.id));

  // Dọn timer khi unmount để không setState trên component đã gỡ.
  useEffect(() => {
    const t = timers.current;
    return () => {
      if (t.interval) clearInterval(t.interval);
      if (t.timeout) clearTimeout(t.timeout);
    };
  }, []);

  function enterTv() {
    setTvMode(true);
    enterBrowserFullscreen();
  }

  function exitTv() {
    setTvMode(false);
    exitBrowserFullscreen();
  }

  const num = Number(value);
  const groupCount =
    mode === "byGroups" ? num : num > 0 ? Math.ceil(activeStudents.length / num) : 0;
  const invalid =
    activeStudents.length === 0 ||
    !Number.isFinite(num) ||
    num < 1 ||
    (mode === "byGroups" && num > activeStudents.length);

  function handleRandom() {
    if (invalid || activeStudents.length === 0) return;
    setShuffling(true);

    // Hiệu ứng: xáo liên tục ~800ms rồi chốt kết quả cuối.
    timers.current.interval = setInterval(() => {
      setGroups(buildGroups(activeStudents, groupCount));
    }, 80);
    timers.current.timeout = setTimeout(() => {
      if (timers.current.interval) clearInterval(timers.current.interval);
      setGroups(buildGroups(activeStudents, groupCount));
      setShuffling(false);
    }, 800);
  }

  if (students.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Lớp chưa có học viên để chia nhóm.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>Học viên hôm nay</Label>
          {absentIds.size > 0 && (
            <button
              type="button"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              onClick={() => setAbsentIds(new Set())}
            >
              Bỏ đánh dấu vắng ({absentIds.size})
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {students.map((s) => {
            const absent = absentIds.has(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleAbsent(s.id)}
                title={absent ? "Bấm để đánh dấu có mặt" : "Bấm để đánh dấu vắng hôm nay"}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  absent
                    ? "border-dashed border-muted-foreground/40 bg-muted text-muted-foreground line-through"
                    : "border-input bg-transparent hover:bg-accent/50"
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-44 space-y-1.5">
          <Label>Cách chia</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="byGroups">Theo số nhóm</SelectItem>
              <SelectItem value="bySize">Theo số người mỗi nhóm</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-28 space-y-1.5">
          <Label htmlFor="group-value">
            {mode === "byGroups" ? "Số nhóm" : "Người/nhóm"}
          </Label>
          <Input
            id="group-value"
            type="number"
            min={1}
            max={activeStudents.length}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <Button onClick={handleRandom} disabled={shuffling || invalid}>
          {shuffling
            ? "🎲 Đang xáo..."
            : groups.length > 0
              ? "🎲 Random lại"
              : "🎲 Random nhóm"}
        </Button>
        {groups.length > 0 && (
          <Button variant="outline" onClick={enterTv}>
            📺 Chiếu màn hình
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {absentIds.size > 0
          ? `${activeStudents.length}/${students.length} học viên có mặt`
          : `${students.length} học viên`}
        {!invalid && groupCount > 0 && ` → ${groupCount} nhóm`}
        {invalid && activeStudents.length === 0 && " · chưa có học viên nào có mặt"}
        {invalid && activeStudents.length > 0 && " · số không hợp lệ"}
      </p>

      {groups.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group, i) => (
            <GroupCard
              key={group.name}
              group={group}
              index={i}
              shuffling={shuffling}
              tv={false}
            />
          ))}
        </div>
      )}

      {tvMode && (
        <TvOverlay onClose={exitTv}>
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-3xl font-bold">
              🎤 Nhóm thuyết trình · Lớp {classCode}
            </h2>
            <span className="text-xl text-muted-foreground">
              {activeStudents.length} học viên → {groups.length} nhóm
              {absentIds.size > 0 && ` · ${absentIds.size} vắng`}
            </span>
            <div className="ml-auto flex items-center gap-3">
              <Button size="lg" onClick={handleRandom} disabled={shuffling || invalid}>
                {shuffling ? "🎲 Đang xáo..." : "🎲 Random lại"}
              </Button>
              <Button size="lg" variant="ghost" onClick={exitTv} aria-label="Thoát chế độ chiếu">
                ✕ Thoát
              </Button>
            </div>
          </div>

          <div
            className="grid gap-6"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}
          >
            {groups.map((group, i) => (
              <GroupCard
                key={group.name}
                group={group}
                index={i}
                shuffling={shuffling}
                tv
              />
            ))}
          </div>
        </TvOverlay>
      )}
    </div>
  );
}
