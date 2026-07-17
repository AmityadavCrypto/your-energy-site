create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  client_lead_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'Estimate Viewed',
  application_status text not null default 'Application Applied',
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
