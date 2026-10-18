/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: `next build` writes a plain site to /out, ready to upload to wimco.se.
  output: 'export',
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default nextConfig;
