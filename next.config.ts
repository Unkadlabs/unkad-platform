import type { NextConfig } from 'next';

// Full-stack app (server actions + Postgres) — unlike the marketing site,
// this is NOT a static export.

// Production was serving only HSTS. For a site with real accounts, sessions,
// and contributors' email addresses, the clickjacking gap mattered most: with
// no frame protection, a hostile page could iframe qor.unkad.com and trick a
// signed-in reviewer into clicking approve, reject, or a settings control
// without ever seeing what they touched.
const securityHeaders = [
  // Nothing here is ever meant to be embedded. Sessions are cookie-based, so
  // any framing is either an accident or an attack. X-Frame-Options for older
  // browsers, frame-ancestors for current ones.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },

  // Stop the browser guessing a content type. Contributors submit free text,
  // and sniffing is how a text response becomes an executable one.
  { key: 'X-Content-Type-Options', value: 'nosniff' },

  // Contribution URLs carry prompt ids and error states. Send the origin to
  // third parties, never the full path.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

  // The platform asks for none of these; deny them outright rather than rely
  // on a permission prompt nobody reads.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },

  // Two years, subdomains included.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  // Was announcing the framework on every response. Free reconnaissance for
  // anyone scanning for version-specific issues.
  poweredByHeader: false,

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
