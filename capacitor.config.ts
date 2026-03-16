import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ironflow.gym',
  appName: 'IronFlow Gym Manager',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '1000822016456-s9bciv81l47lc2dte63nje2j3cic4keq.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
