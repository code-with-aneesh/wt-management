import { Handle } from '@sveltejs/kit';
import { getAuth } from 'firebase/auth';

export const handle: Handle = async ({ event, resolve }) => {
  console.log(`[Middleware] Request for: ${event.url.pathname}`);
  const publicPaths = [
    '/manifest.webmanifest',
    '/img72.png',
    '/img96.png',
    '/favicon.png',
    '/favicon.ico',
    '/sw.js',
    '/registerSW.js'
  ];

  if (publicPaths.includes(event.url.pathname)) {
    console.log(`[Middleware] Bypassing auth for ${event.url.pathname}`);
    return resolve(event);
  }

  console.log('[Middleware] Checking Firebase auth...');
  try {
    const auth = getAuth();
    const token = event.request.headers.get('authorization')?.split('Bearer ')[1];
    if (!token) {
      console.log(`[Middleware] No auth token provided for ${event.url.pathname}`);
      throw new Error('Unauthorized');
    }
    const user = await auth.verifyIdToken(token);
    console.log(`[Middleware] User authenticated: ${user.uid}`);
    return resolve(event);
  } catch (error) {
    console.error(`[Middleware] Firebase auth error for ${event.url.pathname}: ${error.message}`);
    throw new Error('Unauthorized');
  }
};