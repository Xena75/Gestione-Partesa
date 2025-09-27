import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🚀 AUMENTA LIMITI per export grandi dataset e import file
  serverExternalPackages: ['mysql2'],
  
  // ESLint configuration per Vercel deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Configurazione per Vercel
  env: {
    MAX_FILE_SIZE: '50mb',
  },
  
  // 🎨 OTTIMIZZAZIONI CSS per eliminare warning preload
  experimental: {
    optimizePackageImports: ['react-big-calendar', 'lucide-react'],
  },

  // 🔧 CONFIGURAZIONE PRELOAD per eliminare warning CSS
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // 📦 OTTIMIZZAZIONI WEBPACK per CSS chunks e preload
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          styles: {
            name: 'styles',
            test: /\.(css|scss|sass)$/,
            chunks: 'all',
            enforce: true,
            priority: 20,
          },
          // Chunk specifico per react-big-calendar CSS
          calendar: {
            name: 'calendar-styles',
            test: /react-big-calendar.*\.(css|scss|sass)$/,
            chunks: 'all',
            enforce: true,
            priority: 30,
          },
        },
      };
      
      // Configurazione per preload ottimizzato
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }
    return config;
  },
  
  // Configurazione runtime per API routes
  // serverComponentsExternalPackages è stato spostato a serverExternalPackages
};

export default nextConfig;
