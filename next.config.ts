import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: cacheComponents is not compatible with route segment config (export const dynamic)
  // Disabled to allow dynamic route configuration for auth-protected API routes
  // cacheComponents: true,

  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
      {
        protocol: "https",
        //https://nextjs.org/docs/messages/next-image-unconfigured-host
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },

  transpilePackages: ["shiki"],
};

export default nextConfig;
