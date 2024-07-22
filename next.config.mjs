/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
          {
            protocol: 'https',
            hostname: 'oaidalleapiprodscus.blob.core.windows.net',
            pathname: '/*/**',
          },
          {
            protocol: 'https',
            hostname: 'ylq6raulhsuqgkok.public.blob.vercel-storage.com',
            pathname: '/*',
          }
        ]
    },
    env: {
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
};

export default nextConfig;
