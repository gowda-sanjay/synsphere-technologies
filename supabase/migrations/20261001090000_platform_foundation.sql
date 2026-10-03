create type public.user_role as enum ('user', 'admin');
create type public.profile_status as enum ('active', 'suspended');
create type public.company_status as enum ('active', 'inactive');
create type public.job_status as enum ('draft', 'published', 'closed', 'archived');
create type public.application_status as enum ('applied', 'under_review', 'shortlisted', 'interview', 'selected', 'rejected');
create type public.course_status as enum ('draft', 'published', 'archived');
create type public.enrollment_status as enum ('pending', 'active', 'completed', 'cancelled');
create type public.placement_status as enum ('draft', 'published', 'archived');
create type public.notification_type as enum ('job', 'application', 'course', 'placement', 'system');
create type public.document_type as enum ('resume', 'profile_image', 'portfolio', 'other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  mobile text,
  address text,
  profile_image_path text,
  skills text[] not null default '{}',
  education jsonb not null default '[]'::jsonb check (jsonb_typeof(education) = 'array'),
  experience jsonb not null default '[]'::jsonb check (jsonb_typeof(experience) = 'array'),
  resume_path text,
  status public.profile_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_path text,
  website text,
  industry text,
  location text,
  description text not null default '',
  contact_email text,
  status public.company_status not null default 'inactive',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company_id uuid not null references public.companies(id) on delete restrict,
  location text not null,
  job_type text not null,
  experience text not null,
  salary text,
  skills text[] not null default '{}',
  description text not null,
  responsibilities text[] not null default '{}',
  requirements text[] not null default '{}',
  vacancies integer not null default 1 check (vacancies >= 0),
  application_deadline date,
  status public.job_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete restrict,
  resume_path text,
  status public.application_status not null default 'applied',
  interview_date timestamptz,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text not null,
  duration text not null,
  price numeric(12, 2) not null default 0 check (price >= 0),
  skills text[] not null default '{}',
  level text not null,
  curriculum jsonb not null default '[]'::jsonb check (jsonb_typeof(curriculum) = 'array'),
  requirements text[] not null default '{}',
  image_path text,
  status public.course_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  status public.enrollment_status not null default 'pending',
  enrolled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table public.placements (
  id uuid primary key default gen_random_uuid(),
  candidate_name text not null,
  candidate_display_name text not null,
  company_id uuid not null references public.companies(id) on delete restrict,
  job_title text not null,
  course_id uuid references public.courses(id) on delete set null,
  placement_year integer not null check (placement_year between 2000 and 2200),
  description text not null default '',
  image_path text,
  status public.placement_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type public.notification_type not null default 'system',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.user_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_type public.document_type not null,
  file_path text not null unique,
  file_name text not null,
  file_size bigint not null check (file_size > 0),
  mime_type text not null,
  created_at timestamptz not null default now()
);

create table public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index jobs_status_idx on public.jobs(status);
create index jobs_company_id_idx on public.jobs(company_id);
create index jobs_location_idx on public.jobs(location);
create index jobs_application_deadline_idx on public.jobs(application_deadline);
create index jobs_created_at_idx on public.jobs(created_at desc);
create index applications_user_id_idx on public.applications(user_id);
create index applications_job_id_idx on public.applications(job_id);
create index courses_status_idx on public.courses(status);
create index course_enrollments_user_id_idx on public.course_enrollments(user_id);
create index course_enrollments_course_id_idx on public.course_enrollments(course_id);
create index notifications_user_id_idx on public.notifications(user_id);
create index placements_status_idx on public.placements(status);
create index user_documents_user_id_idx on public.user_documents(user_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger companies_set_updated_at before update on public.companies
for each row execute function public.set_updated_at();
create trigger jobs_set_updated_at before update on public.jobs
for each row execute function public.set_updated_at();
create trigger applications_set_updated_at before update on public.applications
for each row execute function public.set_updated_at();
create trigger courses_set_updated_at before update on public.courses
for each row execute function public.set_updated_at();
create trigger placements_set_updated_at before update on public.placements
for each row execute function public.set_updated_at();

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email)
  on conflict (id) do update set email = excluded.email;
  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_auth_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles as roles
    where roles.user_id = (select auth.uid())
      and roles.role = 'admin'::public.user_role
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.companies enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.courses enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.placements enable row level security;
alter table public.notifications enable row level security;
alter table public.user_documents enable row level security;
alter table public.admin_activity_logs enable row level security;

create policy profiles_read_self_or_admin on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_insert_self on public.profiles for insert to authenticated
with check (id = (select auth.uid()) and status = 'active');
create policy profiles_update_self on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (
  id = (select auth.uid())
  and (resume_path is null or resume_path like ((select auth.uid())::text || '/%'))
  and (profile_image_path is null or profile_image_path like ((select auth.uid())::text || '/%'))
);
create policy profiles_admin_delete on public.profiles for delete to authenticated
using ((select public.is_admin()));

create policy user_roles_read_self_or_admin on public.user_roles for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy companies_public_read on public.companies for select to anon, authenticated
using (status = 'active');
create policy companies_admin_read on public.companies for select to authenticated
using ((select public.is_admin()));
create policy companies_admin_insert on public.companies for insert to authenticated
with check ((select public.is_admin()));
create policy companies_admin_update on public.companies for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy companies_admin_delete on public.companies for delete to authenticated
using ((select public.is_admin()));

create policy jobs_public_read on public.jobs for select to anon, authenticated
using (status = 'published' and exists (
  select 1 from public.companies
  where companies.id = jobs.company_id and companies.status = 'active'
));
create policy jobs_admin_read on public.jobs for select to authenticated
using ((select public.is_admin()));
create policy jobs_admin_insert on public.jobs for insert to authenticated
with check ((select public.is_admin()));
create policy jobs_admin_update on public.jobs for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy jobs_admin_delete on public.jobs for delete to authenticated
using ((select public.is_admin()));

create policy applications_read_self_or_admin on public.applications for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy applications_insert_own on public.applications for insert to authenticated
with check (
  user_id = (select auth.uid()) and status = 'applied'
  and interview_date is null and admin_notes is null
  and resume_path is not null
  and resume_path like ((select auth.uid())::text || '/%')
  and exists (
    select 1 from public.user_documents as document
    where document.user_id = (select auth.uid())
      and document.document_type = 'resume'
      and document.file_path = applications.resume_path
  )
  and exists (
    select 1 from public.jobs
    where jobs.id = applications.job_id and jobs.status = 'published'
      and jobs.vacancies > 0
      and (jobs.application_deadline is null or jobs.application_deadline >= current_date)
  )
);
create policy applications_admin_update on public.applications for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy applications_admin_delete on public.applications for delete to authenticated
using ((select public.is_admin()));

create policy courses_public_read on public.courses for select to anon, authenticated
using (status = 'published');
create policy courses_admin_read on public.courses for select to authenticated
using ((select public.is_admin()));
create policy courses_admin_insert on public.courses for insert to authenticated
with check ((select public.is_admin()));
create policy courses_admin_update on public.courses for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy courses_admin_delete on public.courses for delete to authenticated
using ((select public.is_admin()));

create policy course_enrollments_read_self_or_admin on public.course_enrollments for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy course_enrollments_insert_own on public.course_enrollments for insert to authenticated
with check (
  user_id = (select auth.uid()) and status = 'pending'
  and exists (
    select 1 from public.courses
    where courses.id = course_enrollments.course_id and courses.status = 'published'
  )
);
create policy course_enrollments_admin_update on public.course_enrollments for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy course_enrollments_admin_delete on public.course_enrollments for delete to authenticated
using ((select public.is_admin()));

create policy placements_public_read on public.placements for select to anon, authenticated
using (status = 'published');
create policy placements_admin_read on public.placements for select to authenticated
using ((select public.is_admin()));
create policy placements_admin_insert on public.placements for insert to authenticated
with check ((select public.is_admin()));
create policy placements_admin_update on public.placements for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy placements_admin_delete on public.placements for delete to authenticated
using ((select public.is_admin()));

create policy notifications_read_self_or_admin on public.notifications for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy notifications_update_own_read_state on public.notifications for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_admin_insert on public.notifications for insert to authenticated
with check ((select public.is_admin()));
create policy notifications_admin_update on public.notifications for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy notifications_admin_delete on public.notifications for delete to authenticated
using ((select public.is_admin()));

create policy user_documents_read_self_or_admin on public.user_documents for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy user_documents_insert_own on public.user_documents for insert to authenticated
with check (
  user_id = (select auth.uid())
  and file_path like ((select auth.uid())::text || '/%')
);
create policy user_documents_delete_self_or_admin on public.user_documents for delete to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy admin_activity_logs_read_admin on public.admin_activity_logs for select to authenticated
using ((select public.is_admin()));
create policy admin_activity_logs_insert_admin on public.admin_activity_logs for insert to authenticated
with check ((select public.is_admin()) and admin_user_id = (select auth.uid()));

revoke all on public.profiles, public.user_roles, public.companies, public.jobs,
  public.applications, public.courses, public.course_enrollments, public.placements,
  public.notifications, public.user_documents, public.admin_activity_logs
from public, anon, authenticated;
grant usage on schema public to anon, authenticated;

grant select on public.profiles to authenticated;
grant insert (id, full_name, email, mobile, address, profile_image_path, skills, education, experience, resume_path)
  on public.profiles to authenticated;
grant update (full_name, mobile, address, profile_image_path, skills, education, experience, resume_path)
  on public.profiles to authenticated;
grant delete on public.profiles to authenticated;
grant select on public.user_roles to authenticated;

grant select (id, name, logo_path, website, industry, location, description, status, created_at, updated_at)
  on public.companies to anon, authenticated;
grant insert (name, logo_path, website, industry, location, description, status)
  on public.companies to authenticated;
grant update (name, logo_path, website, industry, location, description, status)
  on public.companies to authenticated;
grant delete on public.companies to authenticated;

grant select on public.jobs to anon, authenticated;
grant insert (title, company_id, location, job_type, experience, salary, skills, description, responsibilities, requirements, vacancies, application_deadline, status)
  on public.jobs to authenticated;
grant update (title, company_id, location, job_type, experience, salary, skills, description, responsibilities, requirements, vacancies, application_deadline, status)
  on public.jobs to authenticated;
grant delete on public.jobs to authenticated;

grant select (id, user_id, job_id, resume_path, status, interview_date, created_at, updated_at)
  on public.applications to authenticated;
grant insert (user_id, job_id, resume_path, status) on public.applications to authenticated;
grant update (status, interview_date) on public.applications to authenticated;
grant delete on public.applications to authenticated;

grant select on public.courses to anon, authenticated;
grant insert (title, description, category, duration, price, skills, level, curriculum, requirements, image_path, status)
  on public.courses to authenticated;
grant update (title, description, category, duration, price, skills, level, curriculum, requirements, image_path, status)
  on public.courses to authenticated;
grant delete on public.courses to authenticated;

grant select on public.course_enrollments to authenticated;
grant insert (user_id, course_id, status) on public.course_enrollments to authenticated;
grant update (status) on public.course_enrollments to authenticated;
grant delete on public.course_enrollments to authenticated;

grant select (id, candidate_display_name, company_id, job_title, course_id, placement_year, description, image_path, status, created_at, updated_at)
  on public.placements to anon, authenticated;
grant insert (candidate_name, candidate_display_name, company_id, job_title, course_id, placement_year, description, image_path, status)
  on public.placements to authenticated;
grant update (candidate_display_name, company_id, job_title, course_id, placement_year, description, image_path, status)
  on public.placements to authenticated;
grant delete on public.placements to authenticated;

grant select on public.notifications to authenticated;
grant insert (user_id, title, message, type, is_read) on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;
grant select, insert, delete on public.user_documents to authenticated;
grant select, insert on public.admin_activity_logs to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-images', 'profile-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('resumes', 'resumes', false, 10485760, array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('course-images', 'course-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('course-materials', 'course-materials', false, 52428800, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('company-logos', 'company-logos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy profile_images_read_self_or_admin on storage.objects for select to authenticated
using (bucket_id = 'profile-images' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
create policy profile_images_insert_self on storage.objects for insert to authenticated
with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy profile_images_update_self on storage.objects for update to authenticated
using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy profile_images_delete_self_or_admin on storage.objects for delete to authenticated
using (bucket_id = 'profile-images' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));

create policy resumes_read_self_or_admin on storage.objects for select to authenticated
using (bucket_id = 'resumes' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
create policy resumes_insert_self on storage.objects for insert to authenticated
with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy resumes_update_self on storage.objects for update to authenticated
using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy resumes_delete_self_or_admin on storage.objects for delete to authenticated
using (bucket_id = 'resumes' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));

create policy course_images_public_read on storage.objects for select to anon, authenticated
using (bucket_id = 'course-images');
create policy course_images_admin_insert on storage.objects for insert to authenticated
with check (bucket_id = 'course-images' and (select public.is_admin()));
create policy course_images_admin_update on storage.objects for update to authenticated
using (bucket_id = 'course-images' and (select public.is_admin()))
with check (bucket_id = 'course-images' and (select public.is_admin()));
create policy course_images_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'course-images' and (select public.is_admin()));

create policy course_materials_read_enrolled_or_admin on storage.objects for select to authenticated
using (
  bucket_id = 'course-materials'
  and ((select public.is_admin()) or exists (
    select 1 from public.course_enrollments as enrollment
    where enrollment.user_id = (select auth.uid())
      and enrollment.course_id::text = (storage.foldername(name))[1]
      and enrollment.status in ('active', 'completed')
  ))
);
create policy course_materials_admin_insert on storage.objects for insert to authenticated
with check (bucket_id = 'course-materials' and (select public.is_admin()));
create policy course_materials_admin_update on storage.objects for update to authenticated
using (bucket_id = 'course-materials' and (select public.is_admin()))
with check (bucket_id = 'course-materials' and (select public.is_admin()));
create policy course_materials_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'course-materials' and (select public.is_admin()));

create policy company_logos_public_read on storage.objects for select to anon, authenticated
using (bucket_id = 'company-logos');
create policy company_logos_admin_insert on storage.objects for insert to authenticated
with check (bucket_id = 'company-logos' and (select public.is_admin()));
create policy company_logos_admin_update on storage.objects for update to authenticated
using (bucket_id = 'company-logos' and (select public.is_admin()))
with check (bucket_id = 'company-logos' and (select public.is_admin()));
create policy company_logos_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'company-logos' and (select public.is_admin()));

comment on table public.user_roles is 'Role assignment is read-only to application roles. Provision admin users with a trusted operator or server-only process.';
comment on column public.placements.candidate_name is 'Private canonical name. Public access uses candidate_display_name only.';
comment on column public.applications.admin_notes is 'Private staff notes. Not selectable by ordinary authenticated clients.';
