import type { MetadataRoute } from 'next';

// What search engines may index on the platform.
//
// The public pages (join, login, home) are worth indexing: "Qor Af-Soomaali"
// should resolve to the platform itself, not only to mentions of it. Everything
// behind auth is blocked, and /admin doubly so: those pages hold contributor
// emails and provenance judgements, and while the auth guard already denies
// crawlers, there is no reason to even advertise the paths.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/admin/', '/dashboard', '/account', '/review', '/unsubscribe/'],
    },
  };
}
