import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🚀 AUMENTA LIMITI per export grandi dataset e import file
  serverExternalPackages: ['mysql2'],
  
  // Configurazione per Vercel
  env: {
    MAX_FILE_SIZE: '50mb',
  },
  
  // 🎨 OTTIMIZZAZIONI CSS per ridurre warning preload
  experimental: {
    optimizeCss: true,
    cssChunking: 'strict',
  },
  
  // 📦 OTTIMIZZAZIONI WEBPACK per CSS chunks
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
        },
      };
    }
    return config;
  },
  
  // Configurazione runtime per API routes
  // serverComponentsExternalPackages è stato spostato a serverExternalPackages
};

export default nextConfig;
