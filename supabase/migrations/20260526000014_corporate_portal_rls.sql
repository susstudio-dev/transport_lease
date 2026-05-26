-- ============================================================================
-- 20260526000014_corporate_portal_rls
-- Relax the corporate_admin "read vehicles" policy so they can see vehicle
-- details for ALL their contracts, not only active/expiring_soon ones. This
-- is required so the corporate portal can render past contracts (which may
-- be terminated/expired) with their vehicle info and let the corporate
-- download the lease agreement PDF for any of their past contracts.
--
-- vehicle_documents stays scoped to active leases — there's no need to expose
-- statutory documents after the lease ends.
-- ============================================================================

drop policy if exists "vehicles: corporate_admin read leased" on public.vehicles;

create policy "vehicles: corporate_admin read theirs"
  on public.vehicles
  for select
  to authenticated
  using (
    public.current_user_role() = 'corporate_admin'
    and exists (
      select 1
      from public.contracts c
      where c.vehicle_id = vehicles.id
        and c.corporate_id = public.current_corporate_id()
    )
  );
