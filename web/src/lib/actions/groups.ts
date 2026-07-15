"use server";

import { revalidatePath } from "next/cache";

import type { Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export interface GroupMember {
  id: string;
  name: string;
}

export interface PresentationGroup {
  name: string;
  members: GroupMember[];
}

/** Lưu kết quả chia nhóm gần nhất của lớp (ghi đè kết quả cũ). */
export async function saveGroups(input: {
  classId: string;
  groups: PresentationGroup[];
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Phiên đăng nhập hết hạn." };
  }
  if (input.groups.length === 0) {
    return { error: "Chưa có nhóm nào để lưu." };
  }

  const { error } = await supabase.from("presentation_groups").upsert(
    {
      class_id: input.classId,
      groups: input.groups as unknown as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "class_id" }
  );
  if (error) {
    return { error: `Không lưu được: ${error.message}` };
  }

  revalidatePath(`/teacher/classes/${input.classId}`);
  return {};
}
