import { timingSafeEqual } from 'node:crypto';

export function adminCredentialsValid(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME ?? 'owner';
  const expectedPass = process.env.ADMIN_PASSWORD ?? '';
  return safeEqual(username, expectedUser) && safeEqual(password, expectedPass);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    return false;
  }
  return timingSafeEqual(ab, bb);
}
