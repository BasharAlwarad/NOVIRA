// Shared between every Route Handler that reads or writes the session
// cookie (verify/me/logout/matches) so the name/settings can't drift
// between them. The backend never sets this cookie itself — it only ever
// returns the raw session token in a JSON body to this server-side code;
// only this cookie, set here, is what the browser ever holds. See
// backend/Endpoints/AuthEndpoints.cs's doc comment for the full reasoning.
export const SESSION_COOKIE_NAME = 'novira_session';

// 30 days, matching the backend Session row's own expiry
// (AuthEndpoints.cs's /auth/verify). Keeping these in sync isn't enforced
// automatically — the backend is still the real source of truth (an
// expired Session row is rejected server-side regardless of what the
// cookie itself claims), this just avoids the browser holding a cookie well
// past when the backend would honor it anyway.
export const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
