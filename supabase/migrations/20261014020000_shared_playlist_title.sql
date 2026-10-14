-- Gift and reunion titles for public playlist pages.
-- The app still works if this column has not been applied: it retries without
-- the title and shows "Class of {graduation year}".

alter table public.shared_playlists
  add column if not exists title text;

comment on column public.shared_playlists.title is
  'Optional gift or reunion title for the public playlist page.';

-- number_one_hits is a join view, so ENABLE ROW LEVEL SECURITY is not valid
-- on it. It runs as the owner, which is what lets the public page read chart
-- rows even though chart_entries is limited to song owners. Do not switch the
-- view to security_invoker or those reads go empty.
-- The view is not auto-updatable. Drop the leftover write grants anyway.
revoke insert, update, delete on table public.number_one_hits from anon, authenticated;
