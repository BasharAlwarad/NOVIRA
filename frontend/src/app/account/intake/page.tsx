import { redirect } from 'next/navigation';

// Round 16: this page's entire content moved into
// @/components/editable-profile-section.tsx, rendered inline on /account
// itself — no separate page to navigate to anymore. Kept as a redirect
// rather than deleted outright, in case anyone has this URL bookmarked.
export default function IntakeRedirectPage() {
  redirect('/account');
}
