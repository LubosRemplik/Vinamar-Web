const KEY = 'vinamar_admin_token';

export const getAdminToken = (): string | null =>
  typeof window === 'undefined' ? null : localStorage.getItem(KEY);

export const clearAdminToken = (): void => {
  if (typeof window !== 'undefined') localStorage.removeItem(KEY);
};

// Drop the session and bounce to the login screen — used on explicit logout and
// whenever an admin request comes back 401 (expired/invalid token).
export const adminLogout = (): void => {
  clearAdminToken();
  if (typeof window !== 'undefined') window.location.href = '/admin/login';
};
