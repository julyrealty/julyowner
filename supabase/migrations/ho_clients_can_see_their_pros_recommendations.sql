-- Applied to julybase 2026-07-19.
--
-- Why: the provider directory shipped with the client side broken. ho_recommendations
-- was readable only by `pro_id = auth.uid()`, so a homeowner could never see which
-- trades their own advisor vouches for — the thumbs-up would have been permanently
-- absent from Home Services, and Manage Home would have always said "0 pros vetted
-- by your advisor". Separately ho_providers was readable only when status='verified',
-- and nothing in the product flips that flag, so a trade a pro added (status defaults
-- to 'pending') would never reach their clients at all.
--
-- Both helpers are SECURITY DEFINER, matching the existing ho_is_member /
-- ho_is_pro_of pattern, so the policies never re-enter RLS on ho_hubs or
-- ho_hub_members (which would recurse).

create or replace function public.ho_is_my_pro(p_pro uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from ho_hubs h
    join ho_hub_members m on m.hub_id = h.id
    where h.pro_id = p_pro
      and (m.user_id = auth.uid()
           or lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

create or replace function public.ho_provider_recommended_to_me(p_provider uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from ho_recommendations r
    join ho_hubs h on h.pro_id = r.pro_id
    join ho_hub_members m on m.hub_id = h.id
    where r.provider_id = p_provider
      and (m.user_id = auth.uid()
           or lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;

-- NOTE: Supabase grants EXECUTE to `anon` explicitly, so `revoke ... from public`
-- does NOT remove it. Revoke anon by name or these stay callable signed-out.
revoke all on function public.ho_is_my_pro(uuid) from public;
revoke all on function public.ho_provider_recommended_to_me(uuid) from public;
revoke execute on function public.ho_is_my_pro(uuid) from anon;
revoke execute on function public.ho_provider_recommended_to_me(uuid) from anon;
grant execute on function public.ho_is_my_pro(uuid) to authenticated;
grant execute on function public.ho_provider_recommended_to_me(uuid) to authenticated;

drop policy if exists "recs readable by sponsored members" on public.ho_recommendations;
create policy "recs readable by sponsored members" on public.ho_recommendations
for select using (ho_is_my_pro(pro_id));

-- A pro's vouch is the trust signal clients act on, so their recommended trades are
-- visible to those clients even before JULY marks the provider globally verified.
-- The UI badge already distinguishes "Verified" from "Pending verification".
drop policy if exists "providers readable when my pro recommends them" on public.ho_providers;
create policy "providers readable when my pro recommends them" on public.ho_providers
for select using (ho_provider_recommended_to_me(id));
