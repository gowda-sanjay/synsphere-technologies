import "server-only";

import { companies as demoCompanies } from "@/lib/mock/companies";
import type { Company } from "@/lib/types/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dataResult, type DataResult } from "./result";
import type { Database } from "../../../types/database";

const accents = ["#dcebdc", "#e4e8f4", "#f4e7d9", "#f2deda", "#e5eed6", "#e5e2f0"];

export async function getPublicCompanies(): Promise<DataResult<Company[]>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return dataResult(demoCompanies, "demo");

  const { data, error } = await supabase
    .from("companies")
    .select("id,name,industry,location,description,logo_path")
    .eq("status", "active")
    .order("name")
    .overrideTypes<Array<Pick<Database["public"]["Tables"]["companies"]["Row"], "id" | "name" | "industry" | "location" | "description" | "logo_path">>, { merge: false }>();

  if (error) return dataResult([], "supabase", "Company information is temporarily unavailable.");

  return dataResult((data ?? []).map((company, index) => ({
    id: company.id,
    name: company.name,
    initials: company.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
    industry: company.industry ?? "Technology",
    location: company.location ?? "",
    description: company.description,
    accent: accents[index % accents.length],
  })), "supabase");
}