/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    /**
     * pdf-parse wraps pdfjs-dist, which performs its own module and global setup at load
     * time. Webpack's transform of that breaks it at runtime with "Object.defineProperty
     * called on non-object" — the library works under plain Node but not once bundled.
     * Listing it here makes the server require() it directly instead.
     */
    serverComponentsExternalPackages: ['pdf-parse'],
  },
};

module.exports = nextConfig;
