"use server";

import { revalidatePath } from "next/cache";

import { getAiConfig } from "@/lib/actions/api-key";
import { AiServiceError, callAiService } from "@/lib/ai-client";
import { imageUrlError } from "@/lib/image-url";
import {
  PROJECT_COMMENT_MAX,
  PROJECT_FEATURE_MAX,
  PROJECT_FEATURES_MAX,
  PROJECT_IMAGES_MAX,
  PROJECT_NAME_MAX,
  PROJECT_TEXT_MAX,
} from "@/lib/project-limits";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

/**
 * Sản phẩm + nhận xét hiện ở 3 trang: khu HV (sản phẩm của mình, gallery lớp) và
 * gallery của GV. Đổi ở đâu cũng phải làm mới cả ba, nếu không trang kia còn cache cũ.
 */
function revalidateGallery(classId?: string): void {
  // Khu HV giờ theo từng lớp → làm mới cả URL cụ thể (nếu có) và mẫu route động.
  if (classId) {
    revalidatePath(`/student/classes/${classId}/projects`);
    revalidatePath(`/student/classes/${classId}/gallery`);
  }
  revalidatePath("/student/classes/[classId]/projects", "page");
  revalidatePath("/student/classes/[classId]/gallery", "page");
  revalidatePath("/teacher/gallery");
}

/** Tách textarea nhiều dòng thành mảng chức năng (bỏ dòng trống). */
function parseFeatures(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

/** Tách ô ảnh (mỗi dòng một link) thành mảng, bỏ dòng trống và link trùng. */
function parseImageUrls(raw: string): string[] {
  const seen = new Set<string>();
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line || seen.has(line)) return false;
      seen.add(line);
      return true;
    });
}

/** URL http(s) hợp lệ (chuỗi rỗng được coi là hợp lệ — không bắt buộc). */
function isValidUrl(value: string): boolean {
  if (!value) return true;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Sản phẩm đã lưu, trả về để form phản ánh ngay (chuyển tạo→sửa không reload). */
export interface SavedProject {
  id: string;
  name: string;
  description: string | null;
  features: string[];
  image_urls: string[];
  repo_url: string | null;
  demo_url: string | null;
  extra_notes: string | null;
}

export type SaveProjectResult = ActionResult & { project?: SavedProject };

export async function saveProject(
  _prev: SaveProjectResult,
  formData: FormData
): Promise<SaveProjectResult> {
  const id = String(formData.get("id") ?? "");
  const classId = String(formData.get("class_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const features = parseFeatures(String(formData.get("features") ?? ""));
  const imageUrls = parseImageUrls(String(formData.get("image_urls") ?? ""));
  const repoUrl = String(formData.get("repo_url") ?? "").trim();
  const demoUrl = String(formData.get("demo_url") ?? "").trim();
  const extraNotes = String(formData.get("extra_notes") ?? "").trim();

  if (!classId || !name) {
    return { error: "Vui lòng nhập tên dự án." };
  }
  if (name.length > PROJECT_NAME_MAX) {
    return { error: `Tên dự án tối đa ${PROJECT_NAME_MAX} ký tự.` };
  }
  if (description.length > PROJECT_TEXT_MAX) {
    return { error: `Mô tả dự án tối đa ${PROJECT_TEXT_MAX} ký tự.` };
  }
  if (extraNotes.length > PROJECT_TEXT_MAX) {
    return { error: `Ghi chú nghiên cứu thêm tối đa ${PROJECT_TEXT_MAX} ký tự.` };
  }
  if (features.length > PROJECT_FEATURES_MAX) {
    return { error: `Tối đa ${PROJECT_FEATURES_MAX} chức năng.` };
  }
  if (features.some((f) => f.length > PROJECT_FEATURE_MAX)) {
    return { error: `Mỗi chức năng tối đa ${PROJECT_FEATURE_MAX} ký tự.` };
  }
  if (imageUrls.length > PROJECT_IMAGES_MAX) {
    return { error: `Tối đa ${PROJECT_IMAGES_MAX} ảnh sản phẩm.` };
  }
  for (const url of imageUrls) {
    const problem = imageUrlError(url);
    if (problem) return { error: `Ảnh sản phẩm: ${problem}` };
  }
  for (const [label, url] of [
    ["GitHub", repoUrl],
    ["demo", demoUrl],
    ["Canvas", extraNotes],
  ] as const) {
    if (url && !isValidUrl(url)) {
      return { error: `Link ${label} không hợp lệ — phải bắt đầu bằng http:// hoặc https://` };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const row = {
    student_id: user.id,
    class_id: classId,
    name,
    description: description || null,
    features,
    image_urls: imageUrls,
    repo_url: repoUrl || null,
    // Không có drive_url: link Drive ở cấp học viên (`student_drive_links`).
    demo_url: demoUrl || null,
    extra_notes: extraNotes || null,
    updated_at: new Date().toISOString(),
  };

  const { data: saved, error } = id
    ? await supabase.from("projects").update(row).eq("id", id).select().single()
    : await supabase.from("projects").insert(row).select().single();
  if (error) {
    if (error.code === "23505") {
      return { error: "Bạn đã có một sản phẩm cho lớp này rồi." };
    }
    return { error: `Không lưu được: ${error.message}` };
  }

  revalidateGallery(classId);
  return {
    success: "Đã lưu sản phẩm.",
    project: {
      id: saved.id,
      name: saved.name,
      description: saved.description,
      features: saved.features,
      image_urls: saved.image_urls,
      repo_url: saved.repo_url,
      demo_url: saved.demo_url,
      extra_notes: saved.extra_notes,
    },
  };
}

export async function deleteProject(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const classId = String(formData.get("class_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("projects").delete().eq("id", id);
  revalidateGallery(classId);
}

export async function addComment(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const projectId = String(formData.get("project_id") ?? "");
  const classId = String(formData.get("class_id") ?? "");
  const content = String(formData.get("content") ?? "").trim();

  if (!projectId || !content) {
    return { error: "Nhập nội dung nhận xét." };
  }
  if (content.length > PROJECT_COMMENT_MAX) {
    return { error: `Nhận xét tối đa ${PROJECT_COMMENT_MAX} ký tự.` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }

  const { error } = await supabase
    .from("project_comments")
    .insert({ project_id: projectId, author_id: user.id, content });
  if (error) {
    return { error: `Không gửi được nhận xét: ${error.message}` };
  }

  revalidateGallery(classId);
  return { success: "Đã gửi nhận xét." };
}

export async function deleteComment(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const classId = String(formData.get("class_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("project_comments").delete().eq("id", id);
  revalidateGallery(classId);
}

export interface FeatureSuggestion {
  name: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
}

/** AI gợi ý tính năng mở rộng cho sản phẩm học viên. */
export async function suggestFeatures(input: {
  projectName: string;
  description: string;
  existingFeatures: string[];
  courseCode: string;
  /** Học viên muốn AI ưu tiên độ khó này; bỏ trống = để AI tự chọn theo khóa. */
  desiredDifficulty?: FeatureSuggestion["difficulty"];
}): Promise<{ suggestions?: FeatureSuggestion[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }
  if (!input.projectName) {
    return { error: "Hãy nhập tên và mô tả dự án trước khi xin gợi ý." };
  }

  const aiConfig = await getAiConfig();
  if (!aiConfig.ok) {
    return { error: aiConfig.error };
  }

  try {
    const data = await callAiService<{ suggestions: FeatureSuggestion[] }>(
      "/suggest-features",
      {
        api_key: aiConfig.api_key,
        provider: aiConfig.provider,
        project_name: input.projectName,
        description: input.description,
        existing_features: input.existingFeatures,
        course_code: input.courseCode,
        desired_difficulty: input.desiredDifficulty ?? null,
      }
    );
    return { suggestions: data.suggestions };
  } catch (err) {
    if (err instanceof AiServiceError) {
      return { error: err.message };
    }
    return { error: "Không kết nối được AI service (thử lại sau 30 giây nếu server vừa thức dậy)." };
  }
}
