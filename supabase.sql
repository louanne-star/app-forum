-- =====================================================================
-- FORÇATS'NOU — base Supabase
-- À coller dans Supabase > SQL Editor > New query, puis "Run".
-- =====================================================================

-- 1. Les visiteurs (une ligne = une carte de forçat)
create table if not exists public.visiteurs (
  id          uuid primary key default gen_random_uuid(),
  prenom      text not null check (char_length(prenom) between 1 and 60),
  nom         text not null check (char_length(nom) between 1 and 60),
  matricule   text not null unique check (matricule ~ '^[0-9]{4}$'),
  role        text,                          -- id du rôle (voir config.js), rempli au verdict
  imprime     boolean not null default false, -- carte imprimée par l'équipe
  remis       boolean not null default false, -- carte + autocollant remis à la sortie
  created_at  timestamptz not null default now(),
  termine_at  timestamptz
);

-- 2. Les activités validées (une ligne = un QR code scanné)
create table if not exists public.scans (
  visiteur_id uuid not null references public.visiteurs(id) on delete cascade,
  activite_id text not null check (char_length(activite_id) between 1 and 40),
  created_at  timestamptz not null default now(),
  primary key (visiteur_id, activite_id)       -- une activité ne compte qu'une fois
);

-- 3. Droits (clé "anon" utilisée par le site)
--    Pour une journée de forum : tout le monde peut lire, s'inscrire,
--    valider une activité et mettre à jour une fiche. Personne ne peut supprimer.
alter table public.visiteurs enable row level security;
alter table public.scans     enable row level security;

drop policy if exists "lecture visiteurs"  on public.visiteurs;
drop policy if exists "inscription"        on public.visiteurs;
drop policy if exists "mise a jour fiche"  on public.visiteurs;
drop policy if exists "lecture scans"      on public.scans;
drop policy if exists "validation"         on public.scans;

create policy "lecture visiteurs" on public.visiteurs for select to anon using (true);
create policy "inscription"       on public.visiteurs for insert to anon with check (role is null and imprime = false and remis = false);
create policy "mise a jour fiche" on public.visiteurs for update to anon using (true) with check (true);
create policy "lecture scans"     on public.scans     for select to anon using (true);
create policy "validation"        on public.scans     for insert to anon with check (true);

-- 4. Temps réel (l'écran équipe se met à jour tout seul)
do $$ begin
  alter publication supabase_realtime add table public.visiteurs;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.scans;
exception when duplicate_object then null; end $$;


-- =====================================================================
-- APRÈS LE FORUM (ou après les tests) : vider toutes les données.
-- Décommenter la ligne puis Run.
-- =====================================================================
-- truncate public.scans, public.visiteurs;
