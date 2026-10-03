# SynSphere x SynKode Career Platform

Next.js App Router foundation for the SynSphere Technologies and SynKode career and training platform.

## Current scope

Phase 1 provides the shared responsive header and footer, branded home page, metadata, design tokens, and application configuration. Phase 2 adds public company, training, course, job, placement, and contact pages with reusable responsive components. Phase 3 adds the Supabase schema and RLS/storage policies, typed clients, server data services, private resume operations, and live public reads with demo-only fallback when Supabase is not configured.

Course, job, company, and placement fixtures are development examples and are not verified outcomes. The contact form validates submissions in the browser and on the server, then sends enquiries through Resend without storing them in the database. Phase 4 implements email-only OTP signup/sign-in and protected user placeholders. Mobile verification, full dashboards, admin CRUD UI, payments, and exports are not implemented.

## Local development

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

## Supabase configuration

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. These browser-safe values are used by the typed SSR clients. Never add a service-role or secret key to `NEXT_PUBLIC_*` variables or client modules. With either public variable missing, public reads use the clearly labeled demo fixtures. With both set, database errors are shown as errors and do not silently fall back to demo rows.

## Database and Storage

The versioned schema, RLS policies, storage buckets, and development seed are in `supabase/migrations/` and `supabase/seed.sql`. With the Supabase CLI and Docker installed, run `npx supabase start` for local Supabase, then `npx supabase db reset` to apply migrations and seed data. Link a hosted project and use `npx supabase db push` to apply pending migrations there.

The `resumes` bucket is private. Resume upload helpers validate PDF/DOC/DOCX extension, MIME type, and a 10 MB limit; reads use short-lived signed URLs after checking the caller-owned document record. Admin roles are not writable through client grants. Provision an admin role only through a trusted database/operator process after verifying the user ID.

## Contact form email configuration

The contact form sends enquiries through Resend without storing them in the database. Set the server-only `RESEND_API_KEY` and `RESEND_FROM_EMAIL` variables locally and in the deployment provider's environment settings. Use a sender address verified for the Resend domain (currently `no-reply@synsphere.in`); enquiries are delivered to `info@synsphere.in`. Never expose or commit the Resend API key.

## Email OTP configuration

In the existing Supabase project, enable **Authentication → Providers → Email**. To send numeric codes instead of magic links, edit **Authentication → Email Templates → Magic Link** so the message displays `{{ .Token }}` rather than relying only on `{{ .ConfirmationURL }}`. The verify form accepts 6–10 digits because the OTP length is controlled by the Supabase Auth project configuration.

Set the project Site URL and allowed redirect URLs under **Authentication → URL Configuration** for the deployed site and local development. This implementation verifies codes in the app with `verifyOtp`; it does not require an email callback route.

For production delivery, configure a custom SMTP provider under **Authentication → SMTP Settings** and confirm sender-domain DNS and rate limits. Supabase's built-in mail service is restricted and is not intended for production delivery. Email Auth being enabled does not confirm that a message can be delivered; the OTP flow still needs an end-to-end test with an address you control.