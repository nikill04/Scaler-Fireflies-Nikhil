import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Makes NEXT_PUBLIC_API_URL available in the browser bundle.
  // You set this in your hosting platform (Vercel, Render, etc.)
  // to point at your deployed backend URL.
  // During local dev it falls back to http://localhost:8000 (see lib/api.ts).
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  },

  // Allows <img> tags to load avatar images from external domains (dicebear).
  // Without this, Next.js blocks external image sources in production.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
  },
};

export default nextConfig;
