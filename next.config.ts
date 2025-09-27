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
      // Fix per errori di inizializzazione variabili
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          // Separazione vendor chunks per evitare conflitti
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            enforce: true,
          },
          // CSS chunks separati
          styles: {
            name: 'styles',
            test: /\.(css|scss|sass)$/,
            chunks: 'all',
            enforce: true,
            priority: 20,
          },
          // React Big Calendar separato per evitare conflitti
          calendar: {
            name: 'calendar',
            test: /[\\/]node_modules[\\/]react-big-calendar[\\/]/,
            chunks: 'all',
            enforce: true,
            priority: 30,
          },
        },
      };
      
      // Configurazioni per prevenire errori di inizializzazione
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      config.optimization.moduleIds = 'deterministic';
      config.optimization.chunkIds = 'deterministic';
      
      // Fix per preload CSS warnings
      config.module.rules.push({
        test: /\.css$/,
        sideEffects: true,
      });
    }
    return config;
  },
  
  // Configurazione runtime per API routes
  // serverComponentsExternalPackages è stato spostato a serverExternalPackages
};

export default nextConfig;
