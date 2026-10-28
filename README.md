# ILAD Construction Panel Control

A web application for a UK construction company. Site leads log the hours and work done on each site, and an administrator approves new users and reviews a weekly report by person and site.

Built for the PFD200 Professional Development portfolio (FdSc Computing, Level 5).

## Stack
- Next.js (App Router) and TypeScript
- Tailwind CSS
- Supabase: Postgres, authentication and Row Level Security

## Features
- Sign-up with administrator approval (new users start as `pending` and see no data)
- Daily site log: site, date, workers, hours and work items
- Weekly report of hours by person and site
- Weekly goals per site and a contractor invoice builder (extra, outside the assessed scope)

## Run it locally
1. `npm install`
2. Copy `.env.local.example` to `.env.local` and add your own Supabase project URL and anon key.
3. In the Supabase SQL Editor, run `schema.sql` on a fresh project.
4. `npm run dev`, sign up, then make yourself admin:
   `update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');`

## Security notes
- Row Level Security is enabled on every table; policies limit site leads to their own sites.
- Secrets live in `.env.local`, which is not committed.
- Threat table and awareness campaign: see the portfolio (task 1.4).

## Status
Work in progress for the 30 October 2026 submission. Automated tests and the SQL report function are being added.

## Use of AI
Parts of this code were generated with Claude (Anthropic) and reviewed by the author. The SQL report function and the tests are written by the author with guidance. Details are in the portfolio's Statement on the Use of AI.
