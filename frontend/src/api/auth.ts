// Authentication State and Token Management

const TOKEN_KEY = 'fa_jwt_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    // Notify ProfileProvider (and any other listener) that authentication happened
    // so they can fetch profile data without requiring a full page reload.
    window.dispatchEvent(new Event('fa:login'));
  }
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}
