import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ironflow.gym',
  appName: 'IronFlow Gym Manager',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '816191578392-9a31askki2oqli8gcnnlt7buq4rjdhcc.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    CapacitorUpdater: {
      appId: '71d794dd-0a40-4197-a5a8-c233b1c1d1d3',
      autoUpdate: true,
      statsUrl: 'https://capgo.app/api/stats/',
    },
  },
};

export default config;
