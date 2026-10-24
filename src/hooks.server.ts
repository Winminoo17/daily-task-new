import { createServerClient } from '@supabase/ssr';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const url = publicEnv.PUBLIC_SUPABASE_URL || event.platform?.env?.PUBLIC_SUPABASE_URL;
  const key = publicEnv.PUBLIC_SUPABASE_PUBLISHABLE_KEY || event.platform?.env?.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    if (event.url.pathname !== '/setup') throw redirect(303, '/setup');
    return resolve(event);
  }
  event.locals.supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => event.cookies.getAll(),

      setAll: (
        cookies: {
          name: string;
          value: string;
          options: Record<string, any>;
        }[]
      ) => {
        cookies.forEach(({ name, value, options }) => {
          event.cookies.set(name, value, {
            ...options,
            path: '/'
          });
        });
      }
    }
  });
  // Server verified: never authorize from getSession() user payload.
  const { data: { user }, error } = await event.locals.supabase.auth.getUser();
  const ownerEmail = (privateEnv.PRIVATE_OWNER_EMAIL || event.platform?.env?.PRIVATE_OWNER_EMAIL || '').trim().toLowerCase();
  event.locals.user = !error && user && ownerEmail && user.email?.toLowerCase() === ownerEmail ? user : null;
  if (event.url.pathname.startsWith('/dashboard') && !event.locals.user) throw redirect(303, '/login');
  if (event.url.pathname === '/login' && event.locals.user) throw redirect(303, '/dashboard');
  return resolve(event);
};
