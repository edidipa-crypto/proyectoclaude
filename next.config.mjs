/** @type {import('next').NextConfig} */
const nextConfig = {
  // Genera un servidor Node autocontenido en .next/standalone (imagen Docker mínima).
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
