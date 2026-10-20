// Site settings. These values are public by design: they ship to every visitor.

// The lead-intake Apps Script web app URL (Deploy → Manage deployments → Web app URL).
// Empty means the form says "isn't connected yet" and points people to email.
export const LEAD_ENDPOINT = "";

// Cloudflare Turnstile site key (Cloudflare → Turnstile → Add site). Empty runs the form without the
// bot check. Set the matching secret as the TURNSTILE_SECRET script property in Apps Script, or the
// backend skips verification.
export const TURNSTILE_SITE_KEY = "";

// A scheduling link (Cal.com, Calendly, Google Calendar booking page). When set, every "Book a call"
// button opens it in a new tab instead of scrolling to the form. Must start with https://.
export const BOOKING_URL = "";
