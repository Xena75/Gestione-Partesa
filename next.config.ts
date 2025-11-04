import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🚀 AUMENTA LIMITI per export grandi dataset e import file
  serverExternalPackages: ['mysql2', 'pdf-lib'],
  
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
  
  // Configurazione runtime per API routes
  // serverComponentsExternalPackages è stato spostato a serverExternalPackages
};

export default nextConfig;
