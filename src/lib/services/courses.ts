import "server-only";

import { courses as demoCourses } from "@/lib/mock/courses";
import type { Course, CourseLevel } from "@/lib/types/public";
import type { Database, Json } from "../../../types/database";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dataResult, type DataResult } from "./result";

type PublicCourseRow = Pick<Database["public"]["Tables"]["courses"]["Row"],
  "id" | "title" | "description" | "category" | "duration" | "price" | "skills" | "level" | "curriculum" | "requirements" | "image_path"
>;

function curriculumItems(value: Json): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mapCourse(
  row: {
    id: string;
    title: string;
    description: string;
    category: string;
    duration: string;
    price: number;
    skills: string[];
    level: string;
    curriculum: Json;
    requirements: string[];
    image_path: string | null;
  },
  imageUrl: string | null,
): Course {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    duration: row.duration,
    price: row.price,
    skills: row.skills,
    level: row.level as CourseLevel,
    imageUrl,
    status: "published",
    curriculum: curriculumItems(row.curriculum),
    requirements: row.requirements,
  };
}

export async function getPublishedCourses(): Promise<DataResult<Course[]>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return dataResult(demoCourses.filter((course) => course.status === "published"), "demo");

  const { data, error } = await supabase
    .from("courses")
    .select("id,title,description,category,duration,price,skills,level,curriculum,requirements,image_path")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .overrideTypes<PublicCourseRow[], { merge: false }>();

  if (error) return dataResult([], "supabase", "Course information is temporarily unavailable.");

  const mapped = (data ?? []).map((row) => {
    const imageUrl = row.image_path
      ? supabase.storage.from("course-images").getPublicUrl(row.image_path).data.publicUrl
      : null;
    return mapCourse(row, imageUrl);
  });

  return dataResult(mapped, "supabase");
}

export async function getPublicCourse(id: string): Promise<DataResult<Course | null>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return dataResult(demoCourses.find((course) => course.id === id && course.status === "published") ?? null, "demo");
  }

  const { data: rows, error } = await supabase
    .from("courses")
    .select("id,title,description,category,duration,price,skills,level,curriculum,requirements,image_path")
    .eq("id", id)
    .eq("status", "published")
    .limit(1)
    .overrideTypes<PublicCourseRow[], { merge: false }>();

  if (error) return dataResult(null, "supabase", "Course information is temporarily unavailable.");
  const data = rows?.[0] ?? null;
  if (!data) return dataResult(null, "supabase");

  const imageUrl = data.image_path
    ? supabase.storage.from("course-images").getPublicUrl(data.image_path).data.publicUrl
    : null;
  return dataResult(mapCourse(data, imageUrl), "supabase");
}