"use client";

import { useEffect, useRef, useState, useTransition } from "react";

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
  saveGroups,
  type GroupMember,
  type PresentationGroup,
} from "@/lib/actions/groups";

type Mode = "byGroups" | "bySize";

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

export function GroupRandomizer({
  classId,
  students,
  savedGroups,
}: {
  classId: string;
  students: GroupMember[];
  savedGroups: PresentationGroup[];
}) {
  const [mode, setMode] = useState<Mode>("byGroups");
  const [value, setValue] = useState("3");
  const [groups, setGroups] = useState<PresentationGroup[]>(savedGroups);
  const [shuffling, setShuffling] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, startSave] = useTransition();
  const timers = useRef<{ interval?: ReturnType<typeof setInterval>; timeout?: ReturnType<typeof setTimeout> }>({});

  // Dọn timer khi unmount để không setState trên component đã gỡ.
  useEffect(() => {
    const t = timers.current;
    return () => {
      if (t.interval) clearInterval(t.interval);
      if (t.timeout) clearTimeout(t.timeout);
    };
  }, []);

  const num = Number(value);
  const groupCount =
    mode === "byGroups" ? num : num > 0 ? Math.ceil(students.length / num) : 0;
  const invalid =
    !Number.isFinite(num) || num < 1 || (mode === "byGroups" && num > students.length);

  function handleRandom() {
    if (invalid || students.length === 0) return;
    setMessage("");
    setShuffling(true);

    // Hiệu ứng: xáo liên tục ~800ms rồi chốt kết quả cuối.
    timers.current.interval = setInterval(() => {
      setGroups(buildGroups(students, groupCount));
    }, 80);
    timers.current.timeout = setTimeout(() => {
      if (timers.current.interval) clearInterval(timers.current.interval);
      setGroups(buildGroups(students, groupCount));
      setShuffling(false);
      setDirty(true);
    }, 800);
  }

  function handleSave() {
    setMessage("");
    startSave(async () => {
      const res = await saveGroups({ classId, groups });
      if (res.error) setMessage(res.error);
      else {
        setDirty(false);
        setMessage("✓ Đã lưu kết quả chia nhóm.");
      }
    });
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
            max={students.length}
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
        {dirty && !shuffling && (
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? "Đang lưu..." : "💾 Lưu kết quả"}
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {students.length} học viên
        {!invalid && groupCount > 0 && ` → ${groupCount} nhóm`}
        {invalid && " · số không hợp lệ"}
      </p>

      {message && (
        <p
          className={`text-sm ${message.startsWith("✓") ? "text-green-600" : "text-destructive"}`}
        >
          {message}
        </p>
      )}

      {groups.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group, i) => (
            <div
              key={group.name}
              className={`rounded-lg border p-3 transition-all ${
                shuffling ? "opacity-70" : "animate-in fade-in slide-in-from-bottom-1"
              }`}
              style={shuffling ? undefined : { animationDelay: `${i * 60}ms` }}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">{group.name}</p>
                <Badge variant="secondary" className="text-xs">
                  {group.members.length} bạn
                </Badge>
              </div>
              <ul className="space-y-1">
                {group.members.map((m) => (
                  <li key={m.id} className="text-sm text-muted-foreground">
                    • {m.name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {dirty && !shuffling && (
        <p className="text-xs text-muted-foreground">
          Kết quả chưa được lưu — bấm &quot;Lưu kết quả&quot; để giữ lại.
        </p>
      )}
    </div>
  );
}
