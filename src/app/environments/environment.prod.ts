export const environment = {
  production: true,
  apiBaseUrl: 'https://ea2.upc.edu/api',
  assetsBaseUrl: 'https://ea2.upc.edu',
  uploadsPath: '/uploads',
  socketUrl: '',
  googleClientId: '584395491868-1500f7qi3285tpa2j2b5ms1hhmc83rhg.apps.googleusercontent.com'
};

export function getAssetUrl(path: string, token?: string): string {
  const url = `${environment.assetsBaseUrl}${path}`;
  return token ? `${url}?token=${token}` : url;
}
