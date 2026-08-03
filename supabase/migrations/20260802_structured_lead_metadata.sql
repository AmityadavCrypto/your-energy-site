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
