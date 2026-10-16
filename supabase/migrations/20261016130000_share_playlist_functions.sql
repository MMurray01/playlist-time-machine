-- Share links go through two narrow functions instead of the service role.
--
-- Apply this only after the website deploy that calls these functions is the
-- deployment serving traffic. The previous website still writes birth_year and
-- birth_month and reads this table with the anon key. Running this file first
-- makes those calls fail.
--
-- create_shared_playlist inserts one row and returns its id.
-- get_shared_playlist returns one playlist for a link.
-- Anonymous clients can no longer list shared_playlists.

alter table public.shared_playlists
  add column if not exists title text;

create or replace function public.create_shared_playlist(
  graduation_year integer,
  genres text[],
  title text
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  clean_title text;
  clean_genres text[] := '{}'::text[];
  raw_genre text;
  genre_name text;
  new_id text := '';
  alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  random_bytes bytea;
  byte_index integer;
begin
  if graduation_year is null
    or graduation_year < 1955
    or graduation_year > pg_catalog.date_part(
      'year',
      pg_catalog.timezone('utc', pg_catalog.now())
    )::integer
  then
    raise exception 'Enter the year you graduated high school.' using errcode = '22023';
  end if;

  if pg_catalog.char_length(coalesce(title, '')) > 120 then
    raise exception 'That playlist name is too long.' using errcode = '22023';
  end if;

  clean_title := pg_catalog.regexp_replace(
    coalesce(title, ''),
    '[' || pg_catalog.chr(1) || '-' || pg_catalog.chr(31) || ']',
    '',
    'g'
  );
  clean_title := pg_catalog.btrim(pg_catalog.regexp_replace(clean_title, '\s+', ' ', 'g'));
  clean_title := pg_catalog.left(clean_title, 80);

  if pg_catalog.btrim(coalesce(title, '')) <> '' and exists (
    select 1
    from pg_catalog.unnest(pg_catalog.string_to_array(
      pg_catalog.btrim(pg_catalog.regexp_replace(pg_catalog.lower(clean_title), '[^a-z0-9]+', ' ', 'g')),
      ' '
    )) as token(word)
    where token.word <> ''
      and token.word in (
        'fuck',
        'shit',
        'bitch',
        'asshole',
        'cunt',
        'nigger',
        'nigga',
        'faggot',
        'retard'
      )
  ) then
    raise exception 'Choose a playlist name without abusive language.' using errcode = '22023';
  end if;

  if clean_title = '' then
    clean_title := 'Class of ' || graduation_year::text;
  end if;

  if genres is null then
    genres := '{}'::text[];
  end if;
  -- Same list-size limit as POST /api/share. Songs are not stored on this row.
  if pg_catalog.cardinality(genres) > 12 then
    raise exception 'Choose fewer genres.' using errcode = '22023';
  end if;

  foreach raw_genre in array genres loop
    genre_name := pg_catalog.btrim(raw_genre);
    if genre_name is null or genre_name = '' then
      continue;
    end if;
    if pg_catalog.char_length(genre_name) > 40
      or genre_name !~ $genre$^[[:alnum:]][[:alnum:]&/+' ._()-]{0,39}$genre$
    then
      raise exception 'Those genres could not be used.' using errcode = '22023';
    end if;
    clean_genres := clean_genres || genre_name;
  end loop;

  random_bytes := extensions.gen_random_bytes(10);
  for byte_index in 0..9 loop
    new_id := new_id || pg_catalog.substr(
      alphabet,
      (pg_catalog.get_byte(random_bytes, byte_index) % 64) + 1,
      1
    );
  end loop;

  insert into public.shared_playlists (id, graduation_year, genres, title)
  values (new_id, graduation_year, clean_genres, clean_title);

  return new_id;
end;
$function$;

create or replace function public.get_shared_playlist(slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select case
    when slug is null or slug !~ '^[A-Za-z0-9_-]{4,32}$' then null::jsonb
    else (
      select pg_catalog.jsonb_build_object(
        'id', playlist.id,
        'graduation_year', playlist.graduation_year,
        'genres', coalesce(playlist.genres, '{}'::text[]),
        'title', playlist.title,
        'created_at', playlist.created_at
      )
      from public.shared_playlists as playlist
      where playlist.id = slug
    )
  end;
$function$;

revoke all on function public.create_shared_playlist(integer, text[], text) from public;
grant execute on function public.create_shared_playlist(integer, text[], text) to anon, authenticated;

revoke all on function public.get_shared_playlist(text) from public;
grant execute on function public.get_shared_playlist(text) to anon, authenticated;

comment on function public.create_shared_playlist(integer, text[], text) is
  'Inserts one shared playlist and returns its id. Checks the year (1955 through the current UTC year), the title (at most 120 characters, stored at 80), and the genre list (at most 12, each at most 40 characters).';

comment on function public.get_shared_playlist(text) is
  'Returns one shared playlist for a link, or null when the link is missing.';

drop policy if exists shared_playlists_public_select on public.shared_playlists;

drop policy if exists shared_playlists_owner_select on public.shared_playlists;

create policy shared_playlists_owner_select
  on public.shared_playlists
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

comment on policy shared_playlists_owner_select on public.shared_playlists is
  'Replaces shared_playlists_public_select. Anonymous clients cannot list shared playlists. A link is read through get_shared_playlist.';

alter table public.shared_playlists
  drop column if exists birth_year,
  drop column if exists birth_month;

notify pgrst, 'reload schema';
