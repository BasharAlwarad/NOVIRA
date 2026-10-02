// Opens a new tab / triggers a download for a URL that first needs an
// authenticated fetch to resolve (e.g. an admin-key-protected lookup, which
// can't be a plain <a href> since there's no way to attach a custom header
// to a navigation).
//
// Found live 2026-10-02, in two stages:
// 1. A bare `window.open(url)` called *after* awaiting that fetch gets
//    silently popup-blocked in real browsers (the gap is enough to lose
//    "direct user gesture" status in some cases) — Playwright's own default
//    context doesn't enforce this, which is why it passed automated
//    verification but failed for a real user.
// 2. The first fix — open a blank tab synchronously, then set its location
//    once the URL resolves — works for a real https:// URL (e.g. a SAS URL)
//    but NOT for a client-local blob: URL (from `URL.createObjectURL`):
//    Chromium silently refuses to navigate a window to a blob: URL via
//    `.location.href =`, even the very same window that created it, with no
//    error at all — confirmed by direct testing, not assumed.
//
// What actually works for both cases: a synthetic <a target="_blank"> click
// — the sanctioned "download a fetched blob" pattern — dispatched as soon
// as the URL is ready. This is lenient enough about the user-activation
// window that a typical (fast, local) fetch delay doesn't lose it.
export async function openInNewTabAfterFetch(fetchUrl: () => Promise<string | Blob>): Promise<void> {
  const result = await fetchUrl();
  const isBlob = typeof result !== 'string';
  const url = isBlob ? URL.createObjectURL(result) : result;

  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  if (isBlob) {
    // Give the new tab time to actually start loading/downloading the blob
    // before revoking it — revoking too early would race the download.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
