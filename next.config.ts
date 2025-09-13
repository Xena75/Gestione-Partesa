import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🚀 AUMENTA LIMITI per export grandi dataset e import file
  serverExternalPackages: ['mysql2'],
  
  // Configurazione per Vercel
  env: {
    MAX_FILE_SIZE: '50mb',
  },
  
  // Configurazione runtime per API routes
  // serverComponentsExternalPackages è stato spostato a serverExternalPackages
};

export default nextConfig;
