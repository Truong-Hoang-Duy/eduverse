"use client";

import { useActionState, useEffect, useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormMessage } from "@/components/forms/form-message";
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
import { Textarea } from "@/components/ui/textarea";
import {
  deleteProject,
  saveProject,
  suggestFeatures,
  type FeatureSuggestion,
  type SaveProjectResult,
} from "@/lib/actions/projects";
import {
  PROJECT_FEATURE_MAX,
  PROJECT_FEATURES_MAX,
  PROJECT_NAME_MAX,
  PROJECT_TEXT_MAX,
} from "@/lib/project-limits";

import { FeatureChips } from "./feature-chips";

export interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  features: string[];
  repo_url: string | null;
  demo_url: string | null;
  extra_notes: string | null;
}

const DIFFICULTY: Record<FeatureSuggestion["difficulty"], string> = {
  easy: "Dễ",
  medium: "Vừa",
  hard: "Khó",
};

type DesiredDifficulty = "auto" | FeatureSuggestion["difficulty"];

export function ProjectEditor({
  classId,
  courseCode,
  project,
}: {
  classId: string;
  courseCode: string;
  project: ProjectData | null;
}) {
  const [state, formAction, pending] = useActionState<
    SaveProjectResult,
    FormData
  >(saveProject, {});

  // id theo state để chuyển TẠO→SỬA ngay sau khi lưu (hiện nút Xóa, không reload).
  const [projectId, setProjectId] = useState(project?.id ?? "");
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [features, setFeatures] = useState<string[]>(project?.features ?? []);
  const [repoUrl, setRepoUrl] = useState(project?.repo_url ?? "");
  const [demoUrl, setDemoUrl] = useState(project?.demo_url ?? "");
  const [notes, setNotes] = useState(project?.extra_notes ?? "");

  const [difficulty, setDifficulty] = useState<DesiredDifficulty>("auto");
  const [suggestions, setSuggestions] = useState<FeatureSuggestion[]>([]);
  const [aiError, setAiError] = useState("");
  const [aiPending, startAi] = useTransition();

  // Lưu xong: đồng bộ form theo dữ liệu đã lưu (phản ánh đúng, chuyển tạo→sửa).
  useEffect(() => {
    const saved = state.project;
    if (!saved) return;
    setProjectId(saved.id);
    setName(saved.name);
    setDescription(saved.description ?? "");
    setFeatures(saved.features);
    setRepoUrl(saved.repo_url ?? "");
    setDemoUrl(saved.demo_url ?? "");
    setNotes(saved.extra_notes ?? "");
  }, [state]);

  function appendToNotes(s: FeatureSuggestion): string {
    const line = `- ${s.name}: ${s.description}`;
    return notes.trim() ? `${notes}\n${line}` : line;
  }

  function addSuggestion(s: FeatureSuggestion) {
    if (features.length >= PROJECT_FEATURES_MAX) return;
    const name = s.name.slice(0, PROJECT_FEATURE_MAX);
    setFeatures((prev) =>
      prev.some((f) => f.toLowerCase() === name.toLowerCase())
        ? prev
        : [...prev, name]
    );
    // Giữ mô tả cách làm của AI bằng cách lưu vào Ghi chú (features chỉ lưu tên).
    setNotes(appendToNotes(s));
    setSuggestions((prev) => prev.filter((x) => x.name !== s.name));
  }

  function addAllSuggestions() {
    const names = new Set(features.map((f) => f.toLowerCase()));
    const room = PROJECT_FEATURES_MAX - features.length;
    const toAdd = suggestions
      .filter((s) => !names.has(s.name.toLowerCase()))
      .slice(0, Math.max(room, 0));
    setFeatures((prev) => [
      ...prev,
      ...toAdd.map((s) => s.name.slice(0, PROJECT_FEATURE_MAX)),
    ]);
    setNotes((prev) => {
      const lines = toAdd.map((s) => `- ${s.name}: ${s.description}`);
      if (lines.length === 0) return prev;
      return prev.trim() ? `${prev}\n${lines.join("\n")}` : lines.join("\n");
    });
    setSuggestions((prev) => prev.filter((s) => !toAdd.includes(s)));
  }

  function handleSuggest() {
    setAiError("");
    setSuggestions([]);
    startAi(async () => {
      const res = await suggestFeatures({
        projectName: name,
        description,
        existingFeatures: features,
        courseCode,
        desiredDifficulty: difficulty === "auto" ? undefined : difficulty,
      });
      if (res.error) setAiError(res.error);
      else setSuggestions(res.suggestions ?? []);
    });
  }

  const isEditing = Boolean(projectId);

  return (
    <form action={formAction} className="space-y-4">
      {isEditing && <input type="hidden" name="id" value={projectId} />}
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="features" value={features.join("\n")} />

      <div className="space-y-1.5">
        <Label htmlFor={`name-${classId}`}>Tên dự án *</Label>
        <Input
          id={`name-${classId}`}
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="VD: Website quản lý thư viện"
          maxLength={PROJECT_NAME_MAX}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`description-${classId}`}>Mô tả dự án</Label>
        <Textarea
          id={`description-${classId}`}
          name="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Dự án làm gì, dành cho ai, ý tưởng từ đâu..."
          maxLength={PROJECT_TEXT_MAX}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor={`features-${classId}`}>Các chức năng</Label>
          <div className="flex items-center gap-2">
            <Select
              value={difficulty}
              onValueChange={(v) => setDifficulty(v as DesiredDifficulty)}
            >
              <SelectTrigger size="sm" className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Độ khó: Tùy AI</SelectItem>
                <SelectItem value="easy">Độ khó: Dễ</SelectItem>
                <SelectItem value="medium">Độ khó: Vừa</SelectItem>
                <SelectItem value="hard">Độ khó: Khó</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSuggest}
              disabled={aiPending}
            >
              {aiPending ? "AI đang nghĩ..." : "✨ AI gợi ý"}
            </Button>
          </div>
        </div>
        <FeatureChips
          features={features}
          onChange={setFeatures}
          inputId={`features-${classId}`}
          max={PROJECT_FEATURES_MAX}
          featureMaxLength={PROJECT_FEATURE_MAX}
        />
        {aiError && <p className="text-sm text-destructive">{aiError}</p>}
        {suggestions.length > 0 && (
          <div className="space-y-2 rounded-lg border border-dashed p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                Gợi ý từ AI — bấm để thêm (mô tả cách làm sẽ vào Ghi chú):
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={addAllSuggestions}
              >
                ➕ Thêm tất cả
              </Button>
            </div>
            {suggestions.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => addSuggestion(s)}
                className="flex w-full items-start gap-2 rounded-md p-2 text-left text-sm transition-colors hover:bg-accent"
              >
                <span className="text-primary">+</span>
                <span>
                  <span className="font-medium">{s.name}</span>{" "}
                  <Badge variant="secondary" className="text-xs">
                    {DIFFICULTY[s.difficulty]}
                  </Badge>
                  <span className="block text-xs text-muted-foreground">
                    {s.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2 cột bằng nhau, trải hết chiều rộng. Trước là `sm:grid-cols-3` từ hồi
          còn ô Drive — bỏ ô đó rồi mà giữ 3 cột thì chừa một cột trống bên phải. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`repo-${classId}`}>Link GitHub</Label>
          <Input
            id={`repo-${classId}`}
            name="repo_url"
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/..."
          />
        </div>
        {/* KHÔNG còn ô "Link Google Drive" ở đây: link Drive đã chuyển lên cấp
            HỌC VIÊN (một link dùng cho mọi lớp, khai ở khối "Thư mục nộp bài
            tập" phía trên) — để 2 ô Drive là học viên không biết điền vào đâu. */}
        <div className="space-y-1.5">
          <Label htmlFor={`demo-${classId}`}>Link demo</Label>
          <Input
            id={`demo-${classId}`}
            name="demo_url"
            type="url"
            value={demoUrl}
            onChange={(e) => setDemoUrl(e.target.value)}
            placeholder="https://...vercel.app"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`notes-${classId}`}>Ghi chú nghiên cứu thêm</Label>
        <Textarea
          id={`notes-${classId}`}
          name="extra_notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Công nghệ đã tìm hiểu, khó khăn, dự định phát triển tiếp..."
          maxLength={PROJECT_TEXT_MAX}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Đang lưu..."
            : isEditing
              ? "Cập nhật sản phẩm"
              : "Lưu sản phẩm"}
        </Button>
        {/* Chỉ hiện khi ĐÃ có sản phẩm — chưa tạo thì không có gì để xóa. */}
        {isEditing && (
          <ConfirmDialog
            trigger={
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Xóa sản phẩm
              </Button>
            }
            title="Xóa sản phẩm này?"
            description="Toàn bộ thông tin sản phẩm và các nhận xét của bạn bè sẽ bị xóa vĩnh viễn khỏi hệ thống, không lấy lại được. Bạn có thể khai báo lại từ đầu sau đó."
            confirmLabel="Xóa vĩnh viễn"
            action={deleteProject}
            fields={{ id: projectId }}
          />
        )}
        <FormMessage result={state} />
      </div>
    </form>
  );
}
