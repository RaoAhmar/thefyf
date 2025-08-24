// next.config.ts
import type { NextConfig } from 'next';

// Works locally and on Vercel: read the Supabase URL and extract hostname.
const supabaseHost =
  process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
    : '**.supabase.co'; // fallback for safety in dev

const nextConfig: NextConfig = {
  images: {
    // Prefer remotePatterns over domains so we also scope the path
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHost,                // e.g. abcdxyz.supabase.co
        pathname: '/storage/v1/object/public/**', // only public bucket objects
      },
      // (Optional) wildcard fallback if you use multiple projects:
      { protocol: 'https', hostname: '**.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
};

export default nextConfig;
