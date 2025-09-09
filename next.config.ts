import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🚀 AUMENTA LIMITI per export grandi dataset e import file
  serverExternalPackages: ['mysql2'],
  
  // Configurazione per server
  experimental: {
    serverComponentsExternalPackages: ['mysql2'],
  },
  
  // Configurazione API per file upload
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: '50mb',
  },
  
  // Configurazione server runtime
  serverRuntimeConfig: {
    maxDuration: 600, // 10 minuti per import lunghi
  },
};

export default nextConfig;
