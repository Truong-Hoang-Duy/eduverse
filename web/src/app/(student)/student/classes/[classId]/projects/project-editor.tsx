"use client";

import { useActionState, useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteProject,
  saveProject,
  type SaveProjectResult,
} from "@/lib/actions/projects";
import {
  PROJECT_FEATURE_MAX,
  PROJECT_FEATURES_MAX,
  PROJECT_IMAGES_MAX,
  PROJECT_NAME_MAX,
  PROJECT_TEXT_MAX,
} from "@/lib/project-limits";

import { FeatureChips } from "./feature-chips";
import { ImageUrlChips } from "./image-url-chips";
import { SampleProjectDialog } from "./sample-project-dialog";

export interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  features: string[];
  image_urls: string[];
  repo_url: string | null;
  demo_url: string | null;
  extra_notes: string | null;
}

export function ProjectEditor({
  classId,
  project,
}: {
  classId: string;
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
  const [imageUrls, setImageUrls] = useState<string[]>(
    project?.image_urls ?? []
  );
  const [repoUrl, setRepoUrl] = useState(project?.repo_url ?? "");
  const [demoUrl, setDemoUrl] = useState(project?.demo_url ?? "");
  const [canvasUrl, setCanvasUrl] = useState(project?.extra_notes ?? "");

  // Lưu xong: đồng bộ form theo dữ liệu đã lưu (phản ánh đúng, chuyển tạo→sửa).
  useEffect(() => {
    const saved = state.project;
    if (!saved) return;
    setProjectId(saved.id);
    setName(saved.name);
    setDescription(saved.description ?? "");
    setFeatures(saved.features);
    setImageUrls(saved.image_urls);
    setRepoUrl(saved.repo_url ?? "");
    setDemoUrl(saved.demo_url ?? "");
    setCanvasUrl(saved.extra_notes ?? "");
  }, [state]);

  const isEditing = Boolean(projectId);

  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base font-semibold">
          Sản phẩm cuối khóa
        </CardTitle>
        <SampleProjectDialog />
      </CardHeader>

      <CardContent>
        <form action={formAction} className="space-y-5">
          {isEditing && <input type="hidden" name="id" value={projectId} />}
          <input type="hidden" name="class_id" value={classId} />
          <input type="hidden" name="features" value={features.join("\n")} />
          <input
            type="hidden"
            name="image_urls"
            value={imageUrls.join("\n")}
          />

          <div className="space-y-2">
            <Label
              htmlFor={`name-${classId}`}
              className="text-base font-semibold text-foreground flex items-center gap-1"
            >
              Tên dự án <span className="text-destructive">*</span>
            </Label>
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

          <div className="space-y-2">
            <Label
              htmlFor={`description-${classId}`}
              className="text-base font-semibold text-foreground"
            >
              Mô tả dự án
            </Label>
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

          <div className="space-y-2">
            <Label
              htmlFor={`features-${classId}`}
              className="text-base font-semibold text-foreground"
            >
              Các chức năng
            </Label>
            <FeatureChips
              features={features}
              onChange={setFeatures}
              inputId={`features-${classId}`}
              max={PROJECT_FEATURES_MAX}
              featureMaxLength={PROJECT_FEATURE_MAX}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold text-foreground">
              Ảnh sản phẩm (tối đa {PROJECT_IMAGES_MAX} ảnh)
            </Label>
            <ImageUrlChips
              urls={imageUrls}
              onChange={setImageUrls}
              max={PROJECT_IMAGES_MAX}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label
                htmlFor={`repo-${classId}`}
                className="text-base font-semibold text-foreground"
              >
                Link GitHub
              </Label>
              <Input
                id={`repo-${classId}`}
                name="repo_url"
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor={`demo-${classId}`}
                className="text-base font-semibold text-foreground"
              >
                Link demo
              </Label>
              <Input
                id={`demo-${classId}`}
                name="demo_url"
                type="url"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                placeholder="https://...vercel.app"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor={`canvas-${classId}`}
                className="text-base font-semibold text-foreground"
              >
                Link Canvas
              </Label>
              <Input
                id={`canvas-${classId}`}
                name="extra_notes"
                type="url"
                value={canvasUrl}
                onChange={(e) => setCanvasUrl(e.target.value)}
                placeholder="https://www.canva.com/..."
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button type="submit" disabled={pending}>
              {pending
                ? "Đang lưu..."
                : isEditing
                  ? "Cập nhật sản phẩm"
                  : "Lưu sản phẩm"}
            </Button>
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
                fields={{ id: projectId, class_id: classId }}
              />
            )}
            <FormMessage result={state} />
          </div>
        </form>
      </CardContent>
    </>
  );
}
