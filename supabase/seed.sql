-- DEMO / DEVELOPMENT DATA ONLY. Do not present these records as real employers, jobs, fees, or placements.
insert into public.companies (id, name, website, industry, location, description, status)
values
  ('10000000-0000-4000-8000-000000000001', 'Northstar Digital (Demo)', 'https://northstar.example', 'Software', 'Bengaluru', 'Demo software product company.', 'active'),
  ('10000000-0000-4000-8000-000000000002', 'Orbit Analytics (Demo)', 'https://orbit.example', 'Data and analytics', 'Hyderabad', 'Demo analytics company.', 'active'),
  ('10000000-0000-4000-8000-000000000003', 'Fieldnote Cloud (Demo)', 'https://fieldnote.example', 'Cloud services', 'Pune', 'Demo cloud services company.', 'active')
on conflict (id) do nothing;

insert into public.courses (id, title, description, category, duration, price, skills, level, curriculum, requirements, status)
values
  ('20000000-0000-4000-8000-000000000001', 'Data Analytics Foundations (Demo)', 'Demo pathway covering practical analysis, SQL, and data storytelling.', 'Data Analytics', '12 weeks', 24999, array['SQL', 'Excel', 'Power BI'], 'Beginner', '["Data thinking", "SQL", "Dashboards", "Demo capstone"]'::jsonb, array['No prior analytics experience required'], 'published'),
  ('20000000-0000-4000-8000-000000000002', 'Full Stack Engineering (Demo)', 'Demo pathway covering interfaces, APIs, and databases.', 'Full Stack Development', '20 weeks', 49999, array['TypeScript', 'React', 'Node.js'], 'Intermediate', '["Web foundations", "React", "APIs", "Demo capstone"]'::jsonb, array['Basic computer skills'], 'published'),
  ('20000000-0000-4000-8000-000000000003', 'Cybersecurity Fundamentals (Demo)', 'Demo introduction to security principles and defensive practices.', 'Cybersecurity', '10 weeks', 29999, array['Networking', 'Threat analysis', 'Linux'], 'Beginner', '["Security basics", "Networks", "Monitoring", "Demo exercise"]'::jsonb, array['No prior security experience required'], 'published')
on conflict (id) do nothing;

insert into public.jobs (id, title, company_id, location, job_type, experience, salary, skills, description, responsibilities, requirements, vacancies, application_deadline, status)
values
  ('30000000-0000-4000-8000-000000000001', 'Junior Data Analyst (Demo)', '10000000-0000-4000-8000-000000000002', 'Hyderabad, Telangana', 'Full-time', '0-2 years', 'INR 4-6 LPA (DEMO)', array['SQL', 'Excel', 'Power BI'], 'Demo role for validating public job listings.', array['Prepare reports', 'Explore data'], array['SQL basics', 'Clear communication'], 1, current_date + 90, 'published'),
  ('30000000-0000-4000-8000-000000000002', 'Frontend Developer (Demo)', '10000000-0000-4000-8000-000000000001', 'Bengaluru, Karnataka', 'Hybrid', '1-3 years', 'INR 6-9 LPA (DEMO)', array['React', 'TypeScript', 'CSS'], 'Demo role for validating frontend opportunities.', array['Build interfaces', 'Work with design'], array['React fundamentals'], 1, current_date + 90, 'published'),
  ('30000000-0000-4000-8000-000000000003', 'Python Developer Intern (Demo)', '10000000-0000-4000-8000-000000000002', 'Remote, India', 'Internship', '0-1 years', 'INR 20,000-30,000 per month (DEMO)', array['Python', 'Pandas', 'APIs'], 'Demo internship listing.', array['Support internal tools'], array['Python basics'], 1, current_date + 90, 'published'),
  ('30000000-0000-4000-8000-000000000004', 'Cloud Support Associate (Demo)', '10000000-0000-4000-8000-000000000003', 'Pune, Maharashtra', 'Full-time', '0-2 years', 'INR 4.5-7 LPA (DEMO)', array['Linux', 'Cloud', 'Troubleshooting'], 'Demo cloud support listing.', array['Assist with cloud operations'], array['Linux basics'], 1, current_date + 90, 'published'),
  ('30000000-0000-4000-8000-000000000005', 'Data Operations Associate (Demo)', '10000000-0000-4000-8000-000000000002', 'Hyderabad, Telangana', 'Contract', '0-2 years', 'INR 4-6 LPA (DEMO)', array['SQL', 'Data quality', 'Spreadsheets'], 'Demo data operations listing.', array['Review data quality'], array['Attention to detail'], 1, current_date + 90, 'published')
on conflict (id) do nothing;

insert into public.placements (id, candidate_name, candidate_display_name, company_id, job_title, course_id, placement_year, description, status)
values
  ('40000000-0000-4000-8000-000000000001', 'Demo Candidate One', 'A. K.', '10000000-0000-4000-8000-000000000002', 'Junior Data Analyst (Demo)', '20000000-0000-4000-8000-000000000001', 2025, 'Illustrative placement story for development previews only.', 'published'),
  ('40000000-0000-4000-8000-000000000002', 'Demo Candidate Two', 'M. R.', '10000000-0000-4000-8000-000000000001', 'Frontend Developer (Demo)', '20000000-0000-4000-8000-000000000002', 2025, 'Illustrative placement story for development previews only.', 'published'),
  ('40000000-0000-4000-8000-000000000003', 'Demo Candidate Three', 'S. P.', '10000000-0000-4000-8000-000000000003', 'Cloud Support Associate (Demo)', '20000000-0000-4000-8000-000000000003', 2024, 'Illustrative placement story for development previews only.', 'published')
on conflict (id) do nothing;
