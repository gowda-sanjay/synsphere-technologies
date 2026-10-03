import "server-only";

import type { PlacementStory } from "@/lib/types/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dataResult, type DataResult } from "./result";
import type { Database } from "../../../types/database";
import { isPlacementImagePath } from "@/lib/storage/placement-image-validation";

type PublicPlacementRow = Pick<Database["public"]["Tables"]["placements"]["Row"],
  "id" | "candidate_display_name" | "company_id" | "job_title" | "course_id" | "placement_year" | "description" | "image_path" | "status"
>;
type PublicCompanyName = Pick<Database["public"]["Tables"]["companies"]["Row"], "id" | "name">;
type PublicCourseName = Pick<Database["public"]["Tables"]["courses"]["Row"], "id" | "title">;

export async function getPublicPlacements(): Promise<DataResult<PlacementStory[]>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return dataResult([], "supabase", "Placement stories are temporarily unavailable.");

  const [placementResult, companyResult, courseResult] = await Promise.all([
    supabase.from("placements")
      .select("id,candidate_display_name,company_id,job_title,course_id,placement_year,description,image_path,status")
      .eq("status", "published")
      .order("placement_year", { ascending: false })
      .overrideTypes<PublicPlacementRow[], { merge: false }>(),
    supabase.from("companies").select("id,name").eq("status", "active").overrideTypes<PublicCompanyName[], { merge: false }>(),
    supabase.from("courses").select("id,title").eq("status", "published").overrideTypes<PublicCourseName[], { merge: false }>(),
  ]);

  if (placementResult.error || companyResult.error || courseResult.error) {
    return dataResult([], "supabase", "Placement stories are temporarily unavailable.");
  }

  const companyNames = new Map((companyResult.data ?? []).map((company) => [company.id, company.name]));
  const courseNames = new Map((courseResult.data ?? []).map((course) => [course.id, course.title]));
  const publishedRows = (placementResult.data ?? [])
    .filter((placement) => placement.status === "published")
    .flatMap((placement) => {
      const company = companyNames.get(placement.company_id);
      return company ? [{ placement, company }] : [];
    });
  const mapped = await Promise.all(publishedRows.map(async ({ placement, company }) => {
    let imageUrl: string | null = null;
    if (placement.image_path && isPlacementImagePath(placement.image_path)) {
      const { data, error } = await supabase.storage.from("placement-images").createSignedUrl(placement.image_path, 60);
      if (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[placements] Published image URL creation failed", { code: error.statusCode, message: error.message });
        }
      } else {
        imageUrl = data?.signedUrl ?? null;
      }
    }
    return {
      id: placement.id,
      candidate: placement.candidate_display_name,
      role: placement.job_title,
      company,
      course: placement.course_id ? courseNames.get(placement.course_id) ?? null : null,
      year: placement.placement_year,
      description: placement.description,
      imageUrl,
    };
  }));

  return dataResult(mapped, "supabase");
}