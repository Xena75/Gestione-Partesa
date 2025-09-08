import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🚀 AUMENTA LIMITI per export grandi dataset
  serverExternalPackages: ['mysql2'],
  
  // Configurazione per server
  experimental: {
    serverComponentsExternalPackages: ['mysql2'],
  },
};

export default nextConfig;
