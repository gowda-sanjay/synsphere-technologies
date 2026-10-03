import "server-only";

import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ReportRange = "today" | "7d" | "30d" | "90d" | "year" | "custom";
type ReportTable =
  | "profiles"
  | "user_roles"
  | "companies"
  | "jobs"
  | "applications"
  | "courses"
  | "course_enrollments"
  | "placements"
  | "notifications"
  | "user_documents";
type FilterOperator = "eq" | "gt" | "gte" | "is" | "lt" | "lte" | "not.is";
type QueryFilter = { column: string; operator: FilterOperator; value: string };

type ReportDateRange = {
  start: Date;
  endExclusive: Date;
  label: string;
  warning: string | null;
};

export type ReportBar = { name: string; count: number };
export type ReportTrend = { date: string; users: number; applications: number };

export type AdminReportsData = {
  totals: {
    users: number;
    companies: number;
    activeJobs: number;
    applications: number;
    courses: number;
    enrollments: number;
    placements: number;
    notifications: number;
    unreadNotifications: number;
  };
  range: ReportDateRange;
  trends: ReportTrend[];
  distributions: {
    userRoles: ReportBar[];
    jobs: ReportBar[];
    applications: ReportBar[];
    courses: ReportBar[];
    enrollments: ReportBar[];
    placements: ReportBar[];
    notifications: ReportBar[];
    notificationsRead: ReportBar[];
    documents: ReportBar[];
    companies: ReportBar[];
    resumes: ReportBar[];
  };
  error: string | null;
};

type CountTask = {
  key: string;
  run: () => Promise<{ count: number | null; error: { code?: string; message: string } | null }>;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const RANGE_LABELS: Record<Exclude<ReportRange, "custom">, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  year: "This year",
};

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateOnly(value: string | undefined): Date | null {
  if (!value || !datePattern.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || dateOnly(parsed) !== value ? null : parsed;
}

function resolveDateRange(range: ReportRange, from?: string, to?: string): ReportDateRange {
  const now = new Date();
  const today = new Date(`${dateOnly(now)}T00:00:00.000Z`);
  if (range === "custom") {
    const start = parseDateOnly(from);
    const lastDay = parseDateOnly(to);
    if (start && lastDay && start <= lastDay) {
      const endExclusive = new Date(lastDay);
      endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
      return { start, endExclusive, label: `${dateOnly(start)} to ${dateOnly(lastDay)}`, warning: null };
    }
    const fallbackStart = new Date(today);
    fallbackStart.setUTCDate(fallbackStart.getUTCDate() - 29);
    return {
      start: fallbackStart,
      endExclusive: new Date(today.getTime() + 86400000),
      label: RANGE_LABELS["30d"],
      warning: "The custom dates were invalid; showing the last 30 days instead.",
    };
  }

  if (range === "year") {
    const start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
    return { start, endExclusive: new Date(today.getTime() + 86400000), label: RANGE_LABELS.year, warning: null };
  }

  const days = range === "today" ? 1 : range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return {
    start,
    endExclusive: new Date(today.getTime() + 86400000),
    label: RANGE_LABELS[range],
    warning: null,
  };
}

function periodFilters(range: ReportDateRange): QueryFilter[] {
  return [
    { column: "created_at", operator: "gte", value: range.start.toISOString() },
    { column: "created_at", operator: "lt", value: range.endExclusive.toISOString() },
  ];
}

async function runCountTasks(tasks: CountTask[]) {
  const values: Record<string, number> = {};
  const errors: Array<{ key: string; code?: string; message: string }> = [];
  let nextTask = 0;

  async function worker() {
    while (nextTask < tasks.length) {
      const task = tasks[nextTask];
      nextTask += 1;
      const result = await task.run();
      if (result.error) {
        errors.push({ key: task.key, code: result.error.code, message: result.error.message });
      } else if (typeof result.count !== "number" || !Number.isFinite(result.count)) {
        errors.push({ key: task.key, message: "Exact count was not returned." });
      } else {
        values[task.key] = result.count;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(8, tasks.length) }, () => worker()));
  return { values, errors };
}

function createCountTask(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  key: string,
  table: ReportTable,
  filters: QueryFilter[] = [],
): CountTask {
  return {
    key,
    run: async () => {
      let query = supabase.from(table).select("id", { count: "exact", head: true });
      for (const filter of filters) {
        query = query.filter(filter.column, filter.operator, filter.value);
      }
      const { count, error } = await query;
      return { count, error };
    },
  };
}

function addTasks(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  tasks: CountTask[],
  table: ReportTable,
  keyPrefix: string,
  values: string[],
  column: string,
  filters: QueryFilter[],
) {
  for (const value of values) {
    tasks.push(createCountTask(supabase, `${keyPrefix}.${value}`, table, [
      ...filters,
      { column, operator: "eq", value },
    ]));
  }
}

function createTrendBuckets(range: ReportDateRange) {
  const totalDuration = range.endExclusive.getTime() - range.start.getTime();
  const bucketCount = 12;
  return Array.from({ length: bucketCount }, (_, index) => {
    const start = new Date(range.start.getTime() + Math.floor((totalDuration * index) / bucketCount));
    const end = new Date(range.start.getTime() + Math.floor((totalDuration * (index + 1)) / bucketCount));
    const filters: QueryFilter[] = [
      { column: "created_at", operator: "gte", value: start.toISOString() },
      { column: "created_at", operator: "lt", value: end.toISOString() },
    ];
    return {
      label: new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric", timeZone: "UTC" }).format(start),
      filters,
    };
  });
}

function emptyReports(range: ReportDateRange, error: string | null): AdminReportsData {
  return {
    totals: { users: 0, companies: 0, activeJobs: 0, applications: 0, courses: 0, enrollments: 0, placements: 0, notifications: 0, unreadNotifications: 0 },
    range,
    trends: [],
    distributions: {
      userRoles: [], jobs: [], applications: [], courses: [], enrollments: [], placements: [],
      notifications: [], notificationsRead: [], documents: [], companies: [], resumes: [],
    },
    error,
  };
}

export async function getAdminReports(options: { range?: ReportRange; from?: string; to?: string } = {}): Promise<AdminReportsData> {
  const requestedRange = options.range ?? "30d";
  const range = resolveDateRange(requestedRange, options.from, options.to);
  if (!(await isCurrentUserAdmin())) return emptyReports(range, "You are not authorized to view reports.");

  const supabase = await createSupabaseServerClient();
  if (!supabase) return emptyReports(range, "Reports are unavailable.");

  const tasks: CountTask[] = [
    createCountTask(supabase, "total.users", "profiles"),
    createCountTask(supabase, "total.companies", "companies"),
    createCountTask(supabase, "total.applications", "applications"),
    createCountTask(supabase, "total.courses", "courses"),
    createCountTask(supabase, "total.enrollments", "course_enrollments"),
    createCountTask(supabase, "total.placements", "placements"),
    createCountTask(supabase, "total.notifications", "notifications"),
    createCountTask(supabase, "total.unreadNotifications", "notifications", [{ column: "is_read", operator: "eq", value: "false" }]),
    createCountTask(supabase, "users.withResume", "profiles", [{ column: "resume_path", operator: "not.is", value: "null" }]),
    createCountTask(supabase, "users.withoutResume", "profiles", [{ column: "resume_path", operator: "is", value: "null" }]),
  ];

  const activeJobs = supabase.from("jobs").select("id", { count: "exact", head: true })
    .eq("status", "published")
    .gt("vacancies", 0)
    .or(`application_deadline.is.null,application_deadline.gte.${dateOnly(new Date())}`);
  tasks.push({
    key: "total.activeJobs",
    run: async () => {
      const { count, error } = await activeJobs;
      return { count, error };
    },
  });

  const filters = periodFilters(range);
  const expiredJobFilters: QueryFilter[] = [
    ...filters,
    { column: "status", operator: "eq", value: "published" },
    { column: "application_deadline", operator: "lt", value: dateOnly(new Date()) },
  ];
  tasks.push(createCountTask(supabase, "jobs.expired", "jobs", expiredJobFilters));
  addTasks(supabase, tasks, "user_roles", "role", ["user", "admin"], "role", []);
  addTasks(supabase, tasks, "companies", "companies", ["active", "inactive"], "status", filters);
  addTasks(supabase, tasks, "jobs", "jobs", ["draft", "published", "closed", "archived"], "status", filters);
  addTasks(supabase, tasks, "applications", "applications", ["applied", "under_review", "shortlisted", "interview", "selected", "rejected"], "status", filters);
  addTasks(supabase, tasks, "courses", "courses", ["draft", "published", "archived"], "status", filters);
  addTasks(supabase, tasks, "course_enrollments", "enrollments", ["pending", "active", "completed", "cancelled"], "status", filters);
  addTasks(supabase, tasks, "placements", "placements", ["draft", "published", "archived"], "status", filters);
  addTasks(supabase, tasks, "notifications", "notifications", ["job", "application", "course", "placement", "system"], "type", filters);
  addTasks(supabase, tasks, "user_documents", "documents", ["resume", "profile_image", "portfolio", "other"], "document_type", filters);
  addTasks(supabase, tasks, "notifications", "notifications.read", ["true", "false"], "is_read", filters);
  const buckets = createTrendBuckets(range);
  buckets.forEach((bucket, index) => {
    const bucketFilters = bucket.filters;
    tasks.push(createCountTask(supabase, `trend.${index}.users`, "profiles", bucketFilters));
    tasks.push(createCountTask(supabase, `trend.${index}.applications`, "applications", bucketFilters));
  });

  const { values, errors } = await runCountTasks(tasks);
  if (errors.length) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[admin-reports] Aggregate query failed", errors.map(({ key, code, message }) => ({ key, code, message })));
    }
    return emptyReports(range, "Unable to load analytics. Refresh the page to try again.");
  }

  const makeBars = (prefix: string, labels: string[]) => labels.map((name) => ({
    name: name.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()),
    count: values[`${prefix}.${name}`] ?? 0,
  }));
  const trendRows = buckets.map((bucket, index) => ({
    date: bucket.label,
    users: values[`trend.${index}.users`] ?? 0,
    applications: values[`trend.${index}.applications`] ?? 0,
  }));
  const jobBars = makeBars("jobs", ["draft", "published", "closed", "archived"]);
  jobBars.push({ name: "Expired by deadline", count: values["jobs.expired"] });

  return {
    totals: {
      users: values["total.users"],
      companies: values["total.companies"],
      activeJobs: values["total.activeJobs"],
      applications: values["total.applications"],
      courses: values["total.courses"],
      enrollments: values["total.enrollments"],
      placements: values["total.placements"],
      notifications: values["total.notifications"],
      unreadNotifications: values["total.unreadNotifications"],
    },
    range,
    trends: trendRows,
    distributions: {
      userRoles: makeBars("role", ["user", "admin"]),
      jobs: jobBars,
      applications: makeBars("applications", ["applied", "under_review", "shortlisted", "interview", "selected", "rejected"]),
      courses: makeBars("courses", ["draft", "published", "archived"]),
      enrollments: makeBars("enrollments", ["pending", "active", "completed", "cancelled"]),
      placements: makeBars("placements", ["draft", "published", "archived"]),
      notifications: makeBars("notifications", ["job", "application", "course", "placement", "system"]),
      notificationsRead: [
        { name: "Read", count: values["notifications.read.true"] },
        { name: "Unread", count: values["notifications.read.false"] },
      ],
      documents: makeBars("documents", ["resume", "profile_image", "portfolio", "other"]),
      companies: makeBars("companies", ["active", "inactive"]),
      resumes: [
        { name: "Users with resume", count: values["users.withResume"] },
        { name: "Users without resume", count: values["users.withoutResume"] },
      ],
    },
    error: null,
  };
}
