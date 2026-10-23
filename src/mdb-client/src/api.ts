export interface Credentials { email: string; password: string }
export interface User { id: string; email: string }
export interface Tokens { accessToken: string; refreshToken: string; expiresIn: number }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, options);
  } catch {
    throw new Error('Could not reach the API. Check that Docker is running and try again.');
  }
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    const messages = problem?.errors ? Object.values(problem.errors).flat().join(' ') : null;
    throw new Error(messages || (response.status === 401
      ? 'Sign-in failed. Check your email and password, or try again later if your account is locked.'
      : 'The request could not be completed. Please try again.'));
  }
  const text = await response.text();
  return text ? JSON.parse(text) as T : undefined as T;
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const api = {
  register: (credentials: Credentials) => request<void>('/auth/register', json(credentials)),
  login: (credentials: Credentials) => request<Tokens>('/auth/login', json(credentials)),
  me: (token: string) => request<User>('/api/me', { headers: { Authorization: `Bearer ${token}` } }),
};
