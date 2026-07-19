import { cookies } from 'next/headers';
import { LANG_COOKIE, type Lang } from './i18n';

// Somali is the default language.
export async function getLang(): Promise<Lang> {
  const jar = await cookies();
  return jar.get(LANG_COOKIE)?.value === 'en' ? 'en' : 'so';
}
