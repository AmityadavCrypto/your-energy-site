create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  client_lead_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'Estimate Viewed',
  application_status text not null default 'Application Applied',
  lead_source text,
  project_name text,
  contact_role text,
  decision_stage text,
  customer_type text,
  property_type text,
  monthly_bill text,
  city text,
  name text,
  phone text,
  estimated_system text,
  roof_area text,
  monthly_savings text,
  investment text,
  note text,
  documents jsonb not null default '{}'::jsonb,
  quotation jsonb not null default '{}'::jsonb
);

alter table public.leads add column if not exists lead_source text;
alter table public.leads add column if not exists project_name text;
alter table public.leads add column if not exists contact_role text;
alter table public.leads add column if not exists decision_stage text;

update public.leads
set project_name = btrim(substring(note from 'Project: ([^;]+)'), ' .')
where coalesce(project_name, '') = ''
  and note like '%Project: %';

update public.leads
set contact_role = btrim(substring(note from 'Contact role: ([^;]+)'), ' .')
where coalesce(contact_role, '') = ''
  and note like '%Contact role: %';

update public.leads
set decision_stage = btrim(substring(note from 'Decision stage: ([^;]+)'), ' .')
where coalesce(decision_stage, '') = ''
  and note like '%Decision stage: %';

update public.leads
set lead_source = case
  when property_type = 'Apartment Society' and coalesce(project_name, '') <> '' then 'Housing Society'
  when customer_type = 'Commercial' and coalesce(project_name, '') <> '' then 'Commercial'
  else 'Homes'
end
where coalesce(lead_source, '') = '';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at
before update on public.leads
for each row
execute function public.set_updated_at();

alter table public.leads enable row level security;

drop policy if exists "Admin users can read leads" on public.leads;
create policy "Admin users can read leads"
on public.leads
for select
to authenticated
using (true);

drop policy if exists "Admin users can update leads" on public.leads;
create policy "Admin users can update leads"
on public.leads
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Admin users can delete leads" on public.leads;
create policy "Admin users can delete leads"
on public.leads
for delete
to authenticated
using (true);

insert into storage.buckets (id, name, public)
values ('lead-documents', 'lead-documents', false)
on conflict (id) do nothing;

drop policy if exists "Admin users can read lead documents" on storage.objects;
create policy "Admin users can read lead documents"
on storage.objects
for select
to authenticated
using (bucket_id = 'lead-documents');

drop policy if exists "Admin users can upload lead documents" on storage.objects;
create policy "Admin users can upload lead documents"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'lead-documents');

drop policy if exists "Admin users can update lead documents" on storage.objects;
create policy "Admin users can update lead documents"
on storage.objects
for update
to authenticated
using (bucket_id = 'lead-documents')
with check (bucket_id = 'lead-documents');

drop policy if exists "Admin users can delete lead documents" on storage.objects;
create policy "Admin users can delete lead documents"
on storage.objects
for delete
to authenticated
using (bucket_id = 'lead-documents');
