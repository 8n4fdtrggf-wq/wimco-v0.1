/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: `next build` writes a plain site to /out, ready to upload to wimco.se.
  output: 'export',
  // /tillganglighet/ → out/tillganglighet/index.html, matching how Cloudflare Pages serves the other sub-pages.
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  // The accessibility packages live in ../lib/a11y/packages.js, shared with the API that takes orders.
  experimental: { externalDir: true },
};

export default nextConfig;
