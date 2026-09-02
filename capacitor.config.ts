import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.grenadegame',
  appName: '수류탄 던지기',
  webDir: 'dist',
  ios: {
    contentInset: 'always'
  },
  server: {
    // 실기기 라이브 테스트 시 여기에 dev 서버 주소를 넣으면 됨 (예: http://192.168.0.10:5173)
    // url: 'http://192.168.0.10:5173',
    cleartext: true
  }
};

export default config;
