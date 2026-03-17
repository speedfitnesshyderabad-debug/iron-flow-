import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ironflow.gym',
  appName: 'IronFlow Gym Manager',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '816191578392-49u8dl5m58n9l6jl0vht23jtpki6soij.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    CapacitorUpdater: {
      autoUpdate: true,
      statsUrl: 'https://capgo.app/api/stats/',
    },
  },
};

export default config;
