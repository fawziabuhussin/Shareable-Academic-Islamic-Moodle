/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Production optimizations
  compress: true, // Enable gzip compression for responses
  poweredByHeader: false, // Security: hide X-Powered-By header
  
  images: {
    remotePatterns: [
      {
        // Allow any HTTPS image — teachers can paste URLs from any host
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Enable modern image formats for better compression
    formats: ['image/avif', 'image/webp'],
  },
}

module.exports = nextConfig

