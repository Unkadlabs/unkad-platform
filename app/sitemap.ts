import type { MetadataRoute } from 'next';

// The platform had no sitemap at all, and its robots.txt pointed crawlers at
// the marketing site's sitemap instead — so qor.unkad.com was being discovered
// only through inbound links, and the leaderboard (the one page that changes
// daily and carries contributor names) was not being offered to anyone.
//
// Only the four pages an anonymous visitor can actually load are listed.
// Everything else redirects to /login, and a sitemap full of redirects teaches
// a crawler that the sitemap is unreliable.
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://qor.unkad.com';

  return [
    {
      url: base,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      // The conversion page. Weighted just under the root because most inbound
      // links from the campaign posts point straight at it.
      url: `${base}/join`,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      // Genuinely fresh every day, and the only public page whose content is
      // contributor-authored rather than boilerplate.
      url: `${base}/leaderboard`,
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ];
  // /login is deliberately absent: it is noindex, and listing a noindex URL in
  // a sitemap is a contradiction Search Console reports as an error.
}
