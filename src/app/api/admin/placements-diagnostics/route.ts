import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ProbeResult = {
  name: string;
  ok: boolean;
  count?: number | null;
  returned?: number;
  error?: {
    code: string | null;
    message: string;
    details: string | null;
    hint: string | null;
    httpStatus: number | null;
  };
};

function failure(name: string, error: {
  code?: string;
  message: string;
  details?: string;
  hint?: string;
  status?: number;
}): ProbeResult {
  return {
    name,
    ok: false,
    error: {
      code: error.code ?? null,
      message: error.message,
      details: error.details ?? null,
      hint: error.hint ?? null,
      httpStatus: error.status ?? null,
    },
  };
}

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase server client is unavailable." }, { status: 503 });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Sign in before running placement diagnostics." }, { status: 401 });
  }

  const { data: admin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError) {
    return NextResponse.json({
      error: "Unable to verify administrator access.",
      diagnostic: failure("rpc:is_admin", adminError),
    }, { status: 503 });
  }
  if (admin !== true) {
    return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  }

  const probes: ProbeResult[] = [];

  const companies = await supabase.from("companies").select("id,name").order("name").limit(1);
  probes.push(companies.error
    ? failure("companies options: select id,name order name", companies.error)
    : { name: "companies options: select id,name order name", ok: true, returned: companies.data?.length ?? 0 });

  const courses = await supabase.from("courses").select("id,title").order("title").limit(1);
  probes.push(courses.error
    ? failure("courses options: select id,title order title", courses.error)
    : { name: "courses options: select id,title order title", ok: true, returned: courses.data?.length ?? 0 });

  const placementColumns = await supabase.from("placements")
    .select("id,candidate_display_name,company_id,job_title,course_id,placement_year,description,status,created_at,updated_at", { count: "exact" })
    .range(0, 0);
  probes.push(placementColumns.error
    ? failure("placements columns + exact count", placementColumns.error)
    : { name: "placements columns + exact count", ok: true, count: placementColumns.count, returned: placementColumns.data?.length ?? 0 });

  const companyJoin = await supabase.from("placements")
    .select("id,company:companies!placements_company_id_fkey!inner(id,name)", { count: "exact" })
    .range(0, 0);
  probes.push(companyJoin.error
    ? failure("placements -> companies FK join + exact count", companyJoin.error)
    : { name: "placements -> companies FK join + exact count", ok: true, count: companyJoin.count, returned: companyJoin.data?.length ?? 0 });

  const courseJoin = await supabase.from("placements")
    .select("id,course:courses!placements_course_id_fkey(id,title)", { count: "exact" })
    .range(0, 0);
  probes.push(courseJoin.error
    ? failure("placements -> courses FK join + exact count", courseJoin.error)
    : { name: "placements -> courses FK join + exact count", ok: true, count: courseJoin.count, returned: courseJoin.data?.length ?? 0 });

  const exactList = await supabase.from("placements")
    .select(
      "id,candidate_display_name,company_id,job_title,course_id,placement_year,description,status,created_at,updated_at,company:companies!placements_company_id_fkey!inner(id,name),course:courses!placements_course_id_fkey(id,title)",
      { count: "exact" },
    )
    .order("placement_year", { ascending: false })
    .order("created_at", { ascending: false })
    .range(0, 24);
  probes.push(exactList.error
    ? failure("initial admin list query (columns, FK joins, exact count, order, range)", exactList.error)
    : { name: "initial admin list query (columns, FK joins, exact count, order, range)", ok: true, count: exactList.count, returned: exactList.data?.length ?? 0 });

  const failedProbe = probes.find((probe) => !probe.ok);
  if (failedProbe) {
    console.error("[admin-placements-diagnostic] Probe failed", failedProbe);
  } else {
    console.info("[admin-placements-diagnostic] All read-only probes passed", probes.map(({ name, count, returned }) => ({ name, count, returned })));
  }

  return NextResponse.json(
    { authorized: true, probes },
    { headers: { "Cache-Control": "no-store" } },
  );
}
