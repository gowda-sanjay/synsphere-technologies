export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type ForeignKey<Name extends string, Column extends string, Relation extends string> = {
  foreignKeyName: Name;
  columns: [Column];
  isOneToOne: boolean;
  referencedRelation: Relation;
  referencedColumns: ["id"];
};

type Table<
  Row extends Record<string, unknown>,
  Required extends keyof Row = never,
  Relations extends Relationship[] = [],
> = {
  Row: Row;
  Insert: { [Key in Required]: Row[Key] } & { [Key in Exclude<keyof Row, Required>]?: Row[Key] };
  Update: { [Key in keyof Row]?: Row[Key] };
  Relationships: Relations;
};

type ProfileStatus = "active" | "suspended";
type CompanyStatus = "active" | "inactive";
type JobStatus = "draft" | "published" | "closed" | "archived";
type ApplicationStatus = "applied" | "under_review" | "shortlisted" | "interview" | "selected" | "rejected";
type CourseStatus = "draft" | "published" | "archived";
type EnrollmentStatus = "pending" | "active" | "completed" | "cancelled";
type PlacementStatus = "draft" | "published" | "archived";
type NotificationType = "job" | "application" | "course" | "placement" | "system";
type DocumentType = "resume" | "profile_image" | "portfolio" | "other";

export type Database = {
  public: {
    Tables: {
      profiles: Table<{
        id: string;
        full_name: string;
        email: string | null;
        mobile: string | null;
        address: string | null;
        profile_image_path: string | null;
        skills: string[];
        education: Json;
        experience: Json;
        resume_path: string | null;
        status: ProfileStatus;
        created_at: string;
        updated_at: string;
      }, "id", [ForeignKey<"profiles_id_fkey", "id", "users">]>;
      user_roles: Table<{
        id: string;
        user_id: string;
        role: "user" | "admin";
        created_at: string;
      }, "user_id" | "role", [ForeignKey<"user_roles_user_id_fkey", "user_id", "users">]>;
      companies: {
        Row: {
          id: string;
          name: string;
          logo_path: string | null;
          website: string | null;
          industry: string | null;
          location: string | null;
          description: string;
          contact_email: string | null;
          status: CompanyStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          logo_path?: string | null;
          website?: string | null;
          industry?: string | null;
          location?: string | null;
          description?: string;
          contact_email?: string | null;
          status?: CompanyStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          logo_path?: string | null;
          website?: string | null;
          industry?: string | null;
          location?: string | null;
          description?: string;
          contact_email?: string | null;
          status?: CompanyStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      jobs: Table<{
        id: string;
        title: string;
        company_id: string;
        location: string;
        job_type: string;
        experience: string;
        salary: string | null;
        skills: string[];
        description: string;
        responsibilities: string[];
        requirements: string[];
        vacancies: number;
        application_deadline: string | null;
        status: JobStatus;
        created_at: string;
        updated_at: string;
      }, "title" | "company_id" | "location" | "job_type" | "experience" | "description", [ForeignKey<"jobs_company_id_fkey", "company_id", "companies">]>;
      applications: Table<{
        id: string;
        user_id: string;
        job_id: string;
        resume_path: string | null;
        status: ApplicationStatus;
        interview_date: string | null;
        admin_notes: string | null;
        created_at: string;
        updated_at: string;
      }, "user_id" | "job_id", [
        ForeignKey<"applications_user_id_fkey", "user_id", "profiles">,
        ForeignKey<"applications_job_id_fkey", "job_id", "jobs">,
      ]>;
      courses: Table<{
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
        status: CourseStatus;
        created_at: string;
        updated_at: string;
      }, "title" | "description" | "category" | "duration" | "level">;
      course_enrollments: Table<{
        id: string;
        user_id: string;
        course_id: string;
        status: EnrollmentStatus;
        enrolled_at: string;
        created_at: string;
      }, "user_id" | "course_id", [
        ForeignKey<"course_enrollments_user_id_fkey", "user_id", "profiles">,
        ForeignKey<"course_enrollments_course_id_fkey", "course_id", "courses">,
      ]>;
      placements: Table<{
        id: string;
        candidate_name: string;
        candidate_display_name: string;
        company_id: string;
        job_title: string;
        course_id: string | null;
        placement_year: number;
        description: string;
        image_path: string | null;
        status: PlacementStatus;
        created_at: string;
        updated_at: string;
      }, "candidate_name" | "candidate_display_name" | "company_id" | "job_title" | "placement_year", [
        ForeignKey<"placements_company_id_fkey", "company_id", "companies">,
        ForeignKey<"placements_course_id_fkey", "course_id", "courses">,
      ]>;
      notifications: Table<{
        id: string;
        user_id: string;
        title: string;
        message: string;
        type: NotificationType;
        is_read: boolean;
        created_at: string;
      }, "user_id" | "title" | "message", [ForeignKey<"notifications_user_id_fkey", "user_id", "profiles">]>;
      user_documents: Table<{
        id: string;
        user_id: string;
        document_type: DocumentType;
        file_path: string;
        file_name: string;
        file_size: number;
        mime_type: string;
        created_at: string;
      }, "user_id" | "document_type" | "file_path" | "file_name" | "file_size" | "mime_type", [ForeignKey<"user_documents_user_id_fkey", "user_id", "profiles">]>;
      admin_activity_logs: Table<{
        id: string;
        admin_user_id: string | null;
        action: string;
        entity_type: string;
        entity_id: string | null;
        metadata: Json;
        created_at: string;
      }, "action" | "entity_type", [ForeignKey<"admin_activity_logs_admin_user_id_fkey", "admin_user_id", "users">]>;
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: "user" | "admin";
      profile_status: ProfileStatus;
      company_status: CompanyStatus;
      job_status: JobStatus;
      application_status: ApplicationStatus;
      course_status: CourseStatus;
      enrollment_status: EnrollmentStatus;
      placement_status: PlacementStatus;
      notification_type: NotificationType;
      document_type: DocumentType;
    };
    CompositeTypes: { [_ in never]: never };
  };
};