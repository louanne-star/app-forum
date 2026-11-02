-- Base de données de l'appli (à lancer dans le SQL Editor de Supabase)

-- 1. Les visiteurs
create table if not exists public.visiteurs (
  id          uuid primary key default gen_random_uuid(),
  prenom      text not null check (char_length(prenom) between 1 and 60),
  nom         text not null check (char_length(nom) between 1 and 60),
  matricule   text not null unique check (matricule ~ '^[0-9]{4}$'),
  photo       text,                          -- lien de la photo
  niveau      text,                          -- rempli à la fin du parcours
  imprime     boolean not null default false, -- carte imprimée ou pas
  created_at  timestamptz not null default now(),
  termine_at  timestamptz
);
-- si la table existait déjà avant
alter table public.visiteurs add column if not exists photo  text;
alter table public.visiteurs add column if not exists niveau text;

-- 2. Les activités validées (un QR scanné = une ligne)
create table if not exists public.scans (
  visiteur_id uuid not null references public.visiteurs(id) on delete cascade,
  activite_id text not null check (char_length(activite_id) between 1 and 40),
  created_at  timestamptz not null default now(),
  primary key (visiteur_id, activite_id)       -- une activité compte une seule fois
);

-- 3. Droits : on peut lire, s'inscrire et valider, mais pas supprimer
alter table public.visiteurs enable row level security;
alter table public.scans     enable row level security;

drop policy if exists "lecture visiteurs"  on public.visiteurs;
drop policy if exists "inscription"        on public.visiteurs;
drop policy if exists "mise a jour fiche"  on public.visiteurs;
drop policy if exists "lecture scans"      on public.scans;
drop policy if exists "validation"         on public.scans;

create policy "lecture visiteurs" on public.visiteurs for select to anon using (true);
create policy "inscription"       on public.visiteurs for insert to anon with check (niveau is null and imprime = false);
create policy "mise a jour fiche" on public.visiteurs for update to anon using (true) with check (true);
create policy "lecture scans"     on public.scans     for select to anon using (true);
create policy "validation"        on public.scans     for insert to anon with check (true);

-- accès de la clé anon aux tables
grant usage on schema public to anon;
grant select, insert, update on public.visiteurs to anon;
grant select, insert         on public.scans     to anon;

-- 4. Les photos (JPEG, 2 Mo max)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "depot photo" on storage.objects;
create policy "depot photo" on storage.objects for insert to anon with check (bucket_id = 'photos');

-- 5. Temps réel pour l'espace équipe
do $$ begin
  alter publication supabase_realtime add table public.visiteurs;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.scans;
exception when duplicate_object then null; end $$;


-- Après le forum : décommenter pour tout vider (les photos se suppriment dans Storage)
-- truncate public.scans, public.visiteurs;
