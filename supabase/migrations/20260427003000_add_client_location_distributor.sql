alter table public.clients
add column if not exists location_state text;

alter table public.clients
add column if not exists location_city text;

alter table public.clients
add column if not exists distributor text;

create index if not exists clients_location_state_idx
  on public.clients (location_state);

create index if not exists clients_distributor_idx
  on public.clients (distributor);
