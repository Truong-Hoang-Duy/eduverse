import { notFound } from "next/navigation";

import { listMyCombos } from "@/lib/actions/review-combos";
import { getSubstituteClass } from "@/lib/actions/substitute-classes";
import { sortCoursesByRoadmap } from "@/lib/course-sort";
import { requireRole } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";
import type { Course } from "@/lib/types";

import { SubstituteDetailClient } from "./substitute-detail-client";

export const maxDuration = 60;

export default async function SubstituteClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const [profile, { id }, sp] = await Promise.all([
    requireRole("teacher"),
    params,
    searchParams,
  ]);
  const supabase = await createClient();

  const [
    substituteClass,
    { data: coursesData },
    { data: optionsData },
    { data: templatesData },
    combos,
  ] = await Promise.all([
    getSubstituteClass(id, profile.id),
    supabase.from("courses").select("*").order("code"),
    supabase
      .from("review_options")
      .select("id, category, label, skill_group")
      .eq("teacher_id", profile.id)
      .order("label"),
    supabase
      .from("zalo_templates")
      .select("id, name")
      .eq("teacher_id", profile.id)
      .not("name", "like", "__CODE_SNIPPET__:%")
      .not("name", "like", "__SUBSTITUTE_CLASS__:%")
      .order("name"),
    listMyCombos(profile.id),
  ]);

  if (!substituteClass) {
    notFound();
  }

  const courses = sortCoursesByRoadmap((coursesData ?? []) as Course[]).map(
    (c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
    })
  );

  return (
    <SubstituteDetailClient
      substituteClass={substituteClass}
      initialSessionId={sp.session ?? null}
      courses={courses}
      options={optionsData ?? []}
      templates={templatesData ?? []}
      combos={combos}
      teacherName={profile.full_name}
    />
  );
}
