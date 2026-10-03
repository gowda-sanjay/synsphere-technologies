import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "../../../types/database";

export type DashboardProfile = Database["public"]["Tables"]["profiles"]["Row"];

export type DashboardSummary = {
  applications: number;
  shortlisted: number;
  courses: number;
  notifications: number;
};

export type DashboardApplication = {
  id: string;
  jobTitle: string;
  companyName: string;
  appliedAt: string;
  status: string;
};

export type DashboardJob = {
  id: string;
  title: string;
  companyName: string;
  location: string;
  jobType: string;
  experience: string;
};

export type DashboardCourse = {
  id: string;
  title: string;
  status: string;
  enrolledAt: string;
  duration: string | null;
};

export type DashboardNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
};

export type DashboardPageData = {
  profile: DashboardProfile | null;
  summary: DashboardSummary;
  recentApplications: DashboardApplication[];
  recommendedJobs: DashboardJob[];
  notifications: DashboardNotification[];
  courses: DashboardCourse[];
  error: string | null;
};

export async function getDashboardPageData(userId: string): Promise<DashboardPageData> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      profile: null,
      summary: { applications: 0, shortlisted: 0, courses: 0, notifications: 0 },
      recentApplications: [],
      recommendedJobs: [],
      notifications: [],
      courses: [],
      error: "Unable to load your dashboard right now.",
    };
  }

  const [profileResult, applicationsResult, notificationsResult, enrollmentsResult, jobsResult, companiesResult] = await Promise.all([
    supabase.from("profiles")
      .select("id,full_name,email,mobile,address,profile_image_path,skills,education,experience,resume_path,status,created_at,updated_at")
      .eq("id", userId)
      .limit(1)
      .overrideTypes<DashboardProfile[], { merge: false }>(),
    supabase.from("applications")
      .select("id,user_id,job_id,status,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .overrideTypes<Array<{ id: string; user_id: string; job_id: string; status: string; created_at: string }>, { merge: false }>(),
    supabase.from("notifications")
      .select("id,title,message,is_read,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5)
      .overrideTypes<Array<{ id: string; title: string; message: string; is_read: boolean; created_at: string }>, { merge: false }>(),
    supabase.from("course_enrollments")
      .select("id,course_id,status,enrolled_at")
      .eq("user_id", userId)
      .order("enrolled_at", { ascending: false })
      .limit(3)
      .overrideTypes<Array<{ id: string; course_id: string; status: string; enrolled_at: string }>, { merge: false }>(),
    supabase.from("jobs")
      .select("id,title,company_id,location,job_type,experience,status,created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(5)
      .overrideTypes<Array<{ id: string; title: string; company_id: string; location: string; job_type: string; experience: string; status: string; created_at: string }>, { merge: false }>(),
    supabase.from("companies")
      .select("id,name")
      .eq("status", "active")
      .overrideTypes<Array<{ id: string; name: string }>, { merge: false }>(),
  ]);

  const profile = profileResult.data?.[0] ?? null;
  const applications = applicationsResult.data ?? [];
  const notifications = notificationsResult.data ?? [];
  const enrollments = enrollmentsResult.data ?? [];
  const jobs = jobsResult.data ?? [];
  const companies = companiesResult.data ?? [];

  if (profileResult.error || applicationsResult.error || notificationsResult.error || enrollmentsResult.error || jobsResult.error || companiesResult.error) {
    return {
      profile,
      summary: {
        applications: applications.length,
        shortlisted: applications.filter((item) => item.status === "shortlisted").length,
        courses: enrollments.length,
        notifications: notifications.filter((item) => !item.is_read).length,
      },
      recentApplications: [],
      recommendedJobs: [],
      notifications: notifications.map((item) => ({
        id: item.id,
        title: item.title,
        message: item.message,
        createdAt: item.created_at,
        isRead: item.is_read,
      })),
      courses: enrollments.map((item) => ({
        id: item.id,
        title: "Course",
        status: item.status,
        enrolledAt: item.enrolled_at,
        duration: null,
      })),
      error: "Unable to load your dashboard right now.",
    };
  }

  const companyMap = new Map(companies.map((company) => [company.id, company.name]));
  const jobIds = [...new Set(jobs.map((job) => job.id))];

  let relevantJobs: Array<{ id: string; title: string; company_id: string; location: string; job_type: string; experience: string; created_at?: string }> = [];
  if (jobIds.length > 0) {
    const { data: relatedJobRows, error: relatedJobsError } = await supabase
      .from("jobs")
      .select("id,title,company_id,location,job_type,experience,created_at")
      .in("id", jobIds)
      .overrideTypes<Array<{ id: string; title: string; company_id: string; location: string; job_type: string; experience: string; created_at?: string }>, { merge: false }>();

    if (!relatedJobsError) {
      relevantJobs = relatedJobRows ?? [];
    }
  }

  const courseIds = [...new Set(enrollments.map((item) => item.course_id))];
  let courseRows: Array<{ id: string; title: string; duration: string | null; status: string }> = [];
  if (courseIds.length > 0) {
    const { data: relevantCourses, error: courseLookupError } = await supabase
      .from("courses")
      .select("id,title,duration,status")
      .in("id", courseIds)
      .overrideTypes<Array<{ id: string; title: string; duration: string | null; status: string }>, { merge: false }>();

    if (!courseLookupError) {
      courseRows = relevantCourses ?? [];
    }
  }

  const courseMap = new Map(courseRows.map((course) => [course.id, course]));
  const jobMap = new Map(relevantJobs.map((job) => [job.id, job]));

  const recentApplications: DashboardApplication[] = applications.slice(0, 5).map((application) => {
    const job = jobMap.get(application.job_id);
    return {
      id: application.id,
      jobTitle: job?.title ?? "Role",
      companyName: job ? (companyMap.get(job.company_id) ?? "Company") : "Company",
      appliedAt: application.created_at,
      status: application.status,
    };
  });

  const recommendedJobs: DashboardJob[] = jobs.slice(0, 4).map((job) => ({
    id: job.id,
    title: job.title,
    companyName: companyMap.get(job.company_id) ?? "Company",
    location: job.location,
    jobType: job.job_type,
    experience: job.experience,
  }));

  const dashboardNotifications: DashboardNotification[] = notifications.map((item) => ({
    id: item.id,
    title: item.title,
    message: item.message,
    createdAt: item.created_at,
    isRead: item.is_read,
  }));

  const dashboardCourses: DashboardCourse[] = enrollments.map((item) => {
    const course = courseMap.get(item.course_id);
    return {
      id: item.id,
      title: course?.title ?? "Course",
      status: item.status,
      enrolledAt: item.enrolled_at,
      duration: course?.duration ?? null,
    };
  });

  return {
    profile,
    summary: {
      applications: applications.length,
      shortlisted: applications.filter((item) => item.status === "shortlisted").length,
      courses: enrollments.length,
      notifications: notifications.filter((item) => !item.is_read).length,
    },
    recentApplications,
    recommendedJobs,
    notifications: dashboardNotifications,
    courses: dashboardCourses,
    error: null,
  };
}

export function getProfileCompletionPercentage(profile: DashboardProfile | null): number {
  if (!profile) return 0;

  const checks = [
    Boolean(profile.full_name?.trim()),
    Boolean(profile.email?.trim()),
    Boolean(profile.mobile?.trim()),
    Boolean(profile.address?.trim()),
    Array.isArray(profile.skills) ? profile.skills.some(Boolean) : false,
    Array.isArray(profile.education) ? profile.education.length > 0 : false,
    Array.isArray(profile.experience) ? profile.experience.length > 0 : false,
    Boolean(profile.profile_image_path?.trim()),
    Boolean(profile.resume_path?.trim()),
  ];

  const filled = checks.filter(Boolean).length;
  const percentage = Math.round((filled / checks.length) * 100);
  return percentage;
}
