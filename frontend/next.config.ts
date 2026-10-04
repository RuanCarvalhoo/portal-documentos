import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera .next/standalone (servidor + dependências usadas) → imagem Docker enxuta
  output: "standalone",
};

export default nextConfig;
