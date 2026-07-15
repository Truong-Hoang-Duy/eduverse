"use server";

import { revalidatePath } from "next/cache";

import { getMyApiKey } from "@/lib/actions/api-key";
import { AiServiceError, callAiService } from "@/lib/ai-client";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

/** Tách textarea nhiều dòng thành mảng chức năng (bỏ dòng trống). */
function parseFeatures(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

export async function saveProject(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const classId = String(formData.get("class_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const features = parseFeatures(String(formData.get("features") ?? ""));
  const repoUrl = String(formData.get("repo_url") ?? "").trim();
  const driveUrl = String(formData.get("drive_url") ?? "").trim();
  const demoUrl = String(formData.get("demo_url") ?? "").trim();
  const extraNotes = String(formData.get("extra_notes") ?? "").trim();

  if (!classId || !name) {
    return { error: "Vui lòng nhập tên dự án." };
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
    repo_url: repoUrl || null,
    drive_url: driveUrl || null,
    demo_url: demoUrl || null,
    extra_notes: extraNotes || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = id
    ? await supabase.from("projects").update(row).eq("id", id)
    : await supabase.from("projects").insert(row);
  if (error) {
    if (error.code === "23505") {
      return { error: "Bạn đã có một sản phẩm cho lớp này rồi." };
    }
    return { error: `Không lưu được: ${error.message}` };
  }

  revalidatePath("/student/projects");
  revalidatePath("/student/gallery");
  return { success: "Đã lưu sản phẩm." };
}

export async function deleteProject(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("projects").delete().eq("id", id);
  revalidatePath("/student/projects");
}

export async function addComment(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const projectId = String(formData.get("project_id") ?? "");
  const content = String(formData.get("content") ?? "").trim();

  if (!projectId || !content) {
    return { error: "Nhập nội dung nhận xét." };
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

  revalidatePath("/student/gallery");
  return { success: "Đã gửi nhận xét." };
}

export async function deleteComment(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("project_comments").delete().eq("id", id);
  revalidatePath("/student/gallery");
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

  try {
    const data = await callAiService<{ suggestions: FeatureSuggestion[] }>(
      "/suggest-features",
      {
        api_key: await getMyApiKey(),
        project_name: input.projectName,
        description: input.description,
        existing_features: input.existingFeatures,
        course_code: input.courseCode,
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
