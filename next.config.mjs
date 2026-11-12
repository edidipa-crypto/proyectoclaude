/** @type {import('next').NextConfig} */
const nextConfig = {
  // Genera un servidor Node autocontenido en .next/standalone (imagen Docker mínima).
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  // La carga de archivos de Excel envía hasta 5.000 filas en una sola acción.
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
};

export default nextConfig;
