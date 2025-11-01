/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Abilita il nuovo JSX transform per migliorare le performance
    esmExternals: true,
  },
  compiler: {
    // Abilita il nuovo JSX transform di React 17+
    reactRemoveProperties: process.env.NODE_ENV === 'production',
  },
  // Configurazione ESLint per permettere warning durante la build
  eslint: {
    // Ignora gli errori ESLint durante la build
    ignoreDuringBuilds: true,
  },
  // Configurazione TypeScript per il nuovo JSX transform
  typescript: {
    // Ignora gli errori di build TypeScript in produzione (opzionale)
    ignoreBuildErrors: false,
  },
  // Esclude cartelle specifiche dalla compilazione
  webpack: (config, { isServer }) => {
    // Esclude la cartella backup dalla compilazione
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/backup-ferie-v2.35.0/**', '**/node_modules/**']
    };
    
    return config;
  },
}

module.exports = nextConfig