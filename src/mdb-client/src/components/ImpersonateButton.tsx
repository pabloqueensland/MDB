import { useAuthStore } from '../stores/authStore';

export default function ImpersonateButton({ userId }: { userId: string }) {
  const user = useAuthStore((state) => state.user);
  const adminSession = useAuthStore((state) => state.adminSession);
  const busy = useAuthStore((state) => state.impersonationBusy);
  const impersonate = useAuthStore((state) => state.impersonate);

  if (!user?.roles.includes('PlatformAdmin') || adminSession) {
    return null;
  }

  return <button className="secondary impersonate-button" disabled={busy || user.id === userId}
    onClick={() => { void impersonate(userId); }}>{user.id === userId ? 'Your account' : busy ? 'Switching…' : 'View as user'}</button>;
}
