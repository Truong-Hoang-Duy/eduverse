import { listSubstituteClasses } from "@/lib/actions/substitute-classes";
import { sortCoursesByRoadmap } from "@/lib/course-sort";
import { requireRole } from "@/lib/get-profile";
import { createClient } from "@/lib/supabase/server";
import type { Course } from "@/lib/types";

import { SubstituteListClient } from "./substitute-list-client";

export const metadata = { title: "Lớp dạy thay — CodeLuma" };

export default async function SubstituteClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ import?: string }>;
}) {
  const [profile, sp] = await Promise.all([
    requireRole("teacher"),
    searchParams,
  ]);
  const supabase = await createClient();

  const [{ data: coursesData }, substituteClasses] = await Promise.all([
    supabase.from("courses").select("*").order("code"),
    listSubstituteClasses(profile.id),
  ]);

  const courses = sortCoursesByRoadmap((coursesData ?? []) as Course[]).map(
    (c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
    })
  );

  return (
    <SubstituteListClient
      initialClasses={substituteClasses}
      courses={courses}
      autoImportFromLms={sp.import === "lms"}
    />
  );
}
