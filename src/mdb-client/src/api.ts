export interface Credentials { email: string; password: string }
export type SchoolRole = 'Student' | 'Instructor' | 'SchoolAdmin' | 'SchoolManager';
export interface Membership { schoolId: string; schoolName: string; role: SchoolRole }
export interface Member extends Membership { userId: string; email: string; name: string }
export interface User { id: string; email: string; roles: string[]; memberships: Membership[] }
export interface PlatformUser extends User { name: string }
export interface School { id: string; name: string; slug: string }
export interface CreateSchool { name: string; slug: string }
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
    throw new Error(messages || problem?.title || (response.status === 401
      ? 'Sign-in failed. Check your email and password, or try again later if your account is locked.'
      : response.status === 403
        ? 'You do not have permission to perform this action.'
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
  listUsers: (token: string, signal?: AbortSignal) => request<PlatformUser[]>('/api/platform/users', {
    headers: { Authorization: `Bearer ${token}` }, signal,
  }),
  impersonate: (id: string, token: string) => request<Tokens>(`/api/platform/users/${encodeURIComponent(id)}/impersonate`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` },
  }),
  stopImpersonating: (token: string) => request<void>('/api/impersonation/stop', {
    method: 'POST', headers: { Authorization: `Bearer ${token}` },
  }),
  register: (credentials: Credentials) => request<void>('/auth/register', json(credentials)),
  login: (credentials: Credentials) => request<Tokens>('/auth/login', json(credentials)),
  me: (token: string) => request<User>('/api/me', { headers: { Authorization: `Bearer ${token}` } }),
  listMembers: (token: string, role?: SchoolRole, signal?: AbortSignal) => request<Member[]>(`/api/memberships${role ? `?role=${role}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` }, signal,
  }),
  assignMembership: (member: { schoolId: string; email: string; role: SchoolRole }, token: string) => request<Member>('/api/memberships', {
    ...json(member), method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  }),
  listSchools: (token: string, signal?: AbortSignal) => request<School[]>('/api/schools', {
    headers: { Authorization: `Bearer ${token}` }, signal,
  }),
  createSchool: (school: CreateSchool, token: string) => request<School>('/api/schools', {
    ...json(school),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  }),
};
