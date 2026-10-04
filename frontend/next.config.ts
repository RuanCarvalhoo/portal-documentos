import type { NextConfig } from 'next';

// Headers de segurança em todas as respostas do frontend. CSP fica de fora: o App Router usa
// scripts inline (dados do RSC e o script de tema) e exigiria nonce por requisição.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Impede que o portal seja embutido em iframe de outro site (clickjacking)
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  // Gera .next/standalone (servidor + dependências usadas) → imagem Docker enxuta
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
