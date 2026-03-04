import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => ({
  locale: 'en',
  messages: (await import('../locales/en.json')).default,
}));
