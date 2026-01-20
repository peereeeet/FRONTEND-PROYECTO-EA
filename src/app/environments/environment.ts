export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api',
  assetsBaseUrl: 'http://localhost:3000',
  uploadsPath: '/uploads',
  socketUrl: 'http://localhost:3000',
  googleClientId: '584395491868-1500f7qi3285tpa2j2b5ms1hhmc83rhg.apps.googleusercontent.com'
};

export function getAssetUrl(path: string, token?: string): string {
  const url = `${environment.assetsBaseUrl}${path}`;
  return token ? `${url}?token=${token}` : url;
}