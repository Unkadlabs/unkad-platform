import type { MetadataRoute } from 'next';

// What search engines may index on the platform.
//
// The public pages (join, login, leaderboard) are worth indexing: "Qor
// Af-Soomaali" should resolve to the platform itself, not only to mentions of
// it. Everything behind auth is blocked, and /admin doubly so: those pages hold
// contributor emails and provenance judgements, and while the auth guard
// already denies crawlers, there is no reason to even advertise the paths.
//
// The disallow list now also covers the authenticated app. Those routes all
// redirect to /login, so a crawler spends its budget collecting redirects and
// indexes nothing; worse, /contribute and /validate render contributor text
// that has not finished review, which should not be reachable through search
// under any circumstances.
//
// There was no sitemap line at all, so the platform advertised none. A sitemap
// may only list URLs on its own host, which is why the marketing site's file
// could not have covered this one even if it had been referenced here.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/admin/',
        '/dashboard',
        '/account',
        '/review',
        '/validate',
        '/contribute',
        '/contribute/',
        '/onboarding',
        '/forgot',
        '/reset/',
        '/unsubscribe/',
        '/seed',
        '/seed/',
      ],
    },
    sitemap: 'https://qor.unkad.com/sitemap.xml',
  };
}
