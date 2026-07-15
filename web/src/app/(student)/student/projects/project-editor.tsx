"use client";

import { useActionState, useState, useTransition } from "react";

import { FormMessage } from "@/components/forms/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  saveProject,
  suggestFeatures,
  type FeatureSuggestion,
} from "@/lib/actions/projects";
import type { ActionResult } from "@/lib/types";

export interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  features: string[];
  repo_url: string | null;
  drive_url: string | null;
  demo_url: string | null;
  extra_notes: string | null;
}

const DIFFICULTY: Record<FeatureSuggestion["difficulty"], string> = {
  easy: "Dễ",
  medium: "Vừa",
  hard: "Khó",
};

export function ProjectEditor({
  classId,
  classCode,
  courseCode,
  project,
}: {
  classId: string;
  classCode: string;
  courseCode: string;
  project: ProjectData | null;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    saveProject,
    {}
  );
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [features, setFeatures] = useState((project?.features ?? []).join("\n"));
  const [suggestions, setSuggestions] = useState<FeatureSuggestion[]>([]);
  const [aiError, setAiError] = useState("");
  const [aiPending, startAi] = useTransition();

  function handleSuggest() {
    setAiError("");
    setSuggestions([]);
    startAi(async () => {
      const res = await suggestFeatures({
        projectName: name,
        description,
        existingFeatures: features.split("\n").map((f) => f.trim()).filter(Boolean),
        courseCode,
      });
      if (res.error) setAiError(res.error);
      else setSuggestions(res.suggestions ?? []);
    });
  }

  function addSuggestion(s: FeatureSuggestion) {
    setFeatures((prev) => (prev.trim() ? `${prev}\n${s.name}` : s.name));
    setSuggestions((prev) => prev.filter((x) => x.name !== s.name));
  }

  return (
    <form action={formAction} className="space-y-4">
      {project && <input type="hidden" name="id" value={project.id} />}
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="features" value={features} />

      <div className="space-y-1.5">
        <Label htmlFor={`name-${classId}`}>Tên dự án *</Label>
        <Input
          id={`name-${classId}`}
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="VD: Website quản lý thư viện"
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
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={`features-${classId}`}>Các chức năng (mỗi dòng một chức năng)</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleSuggest}
            disabled={aiPending}
          >
            {aiPending ? "AI đang nghĩ..." : "✨ AI gợi ý tính năng"}
          </Button>
        </div>
        <Textarea
          id={`features-${classId}`}
          rows={4}
          value={features}
          onChange={(e) => setFeatures(e.target.value)}
          placeholder={"Đăng nhập\nThêm sách mới\nTìm kiếm sách"}
        />
        {aiError && <p className="text-sm text-destructive">{aiError}</p>}
        {suggestions.length > 0 && (
          <div className="space-y-2 rounded-lg border border-dashed p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Gợi ý từ AI — bấm để thêm vào danh sách:
            </p>
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

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`repo-${classId}`}>Link GitHub</Label>
          <Input
            id={`repo-${classId}`}
            name="repo_url"
            type="url"
            defaultValue={project?.repo_url ?? ""}
            placeholder="https://github.com/..."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`drive-${classId}`}>Link Google Drive</Label>
          <Input
            id={`drive-${classId}`}
            name="drive_url"
            type="url"
            defaultValue={project?.drive_url ?? ""}
            placeholder="https://drive.google.com/..."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`demo-${classId}`}>Link demo</Label>
          <Input
            id={`demo-${classId}`}
            name="demo_url"
            type="url"
            defaultValue={project?.demo_url ?? ""}
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
          defaultValue={project?.extra_notes ?? ""}
          placeholder="Công nghệ đã tìm hiểu, khó khăn, dự định phát triển tiếp..."
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu..." : project ? "Cập nhật sản phẩm" : "Lưu sản phẩm"}
        </Button>
        <span className="text-xs text-muted-foreground">Lớp {classCode}</span>
        <FormMessage result={state} />
      </div>
    </form>
  );
}
