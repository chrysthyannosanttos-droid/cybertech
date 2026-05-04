import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cybertech.rh',
  appName: 'CyberTech RH',
  webDir: 'dist',
  server: {
    url: 'https://cybertech-psi.vercel.app/',
    cleartext: true
  }
};

export default config;
