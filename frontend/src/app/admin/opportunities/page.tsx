import { redirect } from 'next/navigation';

// /admin/opportunities used to be one page stacking both paths' full lists
// — split 2026-08-30 into /ausbildung and /university (see PathTabs in
// _shared.tsx for the sub-nav between them). This bare index just lands on
// the first tab, same as before the split defaulted to Ausbildung first.
export default function AdminOpportunitiesIndexPage() {
  redirect('/admin/opportunities/ausbildung');
}
