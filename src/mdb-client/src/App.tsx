import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuthStore } from './stores/authStore';

export default function App() {
  const user = useAuthStore((state) => state.user);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const logout = useAuthStore((state) => state.logout);
  const clearError = useAuthStore((state) => state.clearError);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const expiresAt = useAuthStore((state) => state.expiresAt);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!expiresAt) {
      return;
    }
    const timer = window.setTimeout(logout, Math.max(0, expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [expiresAt, logout]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    if (mode === 'register' && password !== confirmPassword) {
      setFormError('Your passwords do not match.');
      return;
    }
    const credentials = { email: email.trim(), password };
    if (mode === 'register') {
      await register(credentials);
    } else {
      await login(credentials);
    }
    setPassword('');
    setConfirmPassword('');
  }

  function switchMode(next: 'login' | 'register') {
    setMode(next);
    setPassword('');
    setConfirmPassword('');
    setFormError('');
    clearError();
  }

  return (
    <div className="app-shell">
      <aside className="story">
        <a className="brand" href="/" aria-label="MDB home"><span className="brand-mark">m</span> MDB<span className="brand-caption">MOVE. DANCE. BECOME.</span></a>
        <div className="story-content">
          <span className="eyebrow"><span className="little-line" /> YOUR PRACTICE, YOUR PACE</span>
          <h1>Every great dancer<br />starts with<br /><em>one step.</em></h1>
          <p>A place for the moves you’re learning,<br className="desktop-break" /> the progress you’re making, and what comes next.</p>
          <div className="dance-art" aria-hidden="true"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="orbit orbit-three" /><span className="step step-one">01</span><span className="step step-two">02</span><span className="step step-three">03</span><span className="art-caption">FIND YOUR RHYTHM</span></div>
        </div>
        <footer className="story-footer"><span>A LITTLE PRACTICE. A LITTLE PROGRESS.</span><span>✳</span></footer>
      </aside>
      <main>
        <div className="top-note">YOUR NEXT CHAPTER STARTS HERE <span>↗</span></div>
        {user ? (
          <section className="auth-card" aria-labelledby="account-title">
            <span className="section-number">01 / YOUR SPACE</span>
            <div className="success-mark" aria-hidden="true">✓</div>
            <h2 id="account-title">You’re in.</h2>
            <p className="intro">Welcome to MDB. Your next step is yours to take.</p>
            <div className="account-info"><span>SIGNED IN AS</span><strong>{user.email}</strong></div>
            <div className="coming-next"><span>UP NEXT</span><h3>Your practice starts here.</h3><p>The move library and progress tracking are coming next. Your account is ready.</p></div>
            <button className="primary" onClick={logout}>Sign out <span aria-hidden="true">↗</span></button>
          </section>
        ) : (
          <section className="auth-card" aria-labelledby="auth-title">
            <span className="section-number">01 / GET STARTED</span>
            <div className="tabs" aria-label="Account options">
              <button type="button" aria-pressed={mode === 'login'} className={mode === 'login' ? 'active' : ''} disabled={isLoading} onClick={() => switchMode('login')}>Sign in</button>
              <button type="button" aria-pressed={mode === 'register'} className={mode === 'register' ? 'active' : ''} disabled={isLoading} onClick={() => switchMode('register')}>Create account</button>
            </div>
            <h2 id="auth-title">{mode === 'login' ? 'Back for more.' : 'Make your first move.'}</h2>
            <p className="intro">{mode === 'login' ? 'Sign in and pick up where you left off.' : 'Create your account. Find your rhythm.'}</p>
            <form onSubmit={submit}>
              <label htmlFor="email">Email address</label>
              <input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isLoading} />
              <label htmlFor="password">Password</label>
              <div className="password-field"><input id="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={mode === 'register' ? 6 : undefined} disabled={isLoading} aria-describedby={mode === 'register' ? 'password-help' : undefined} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></div>
              {mode === 'register' && <><p id="password-help" className="field-help">At least 6 characters, with uppercase, lowercase, a number and a symbol.</p><label htmlFor="confirm">Confirm password</label><input id="confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Enter your password again" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required disabled={isLoading} /></>}
              {(formError || error) && <p className="error" role="alert">{formError || error}</p>}
              <button className="primary" type="submit" disabled={isLoading}>{isLoading ? 'One moment…' : mode === 'login' ? 'Sign in' : 'Create account'}<span aria-hidden="true">↗</span></button>
            </form>
            <p className="switch-copy">{mode === 'login' ? 'New to MDB?' : 'Already have an account?'} <button disabled={isLoading} onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Start your journey' : 'Sign in'}</button></p>
          </section>
        )}
        <footer className="main-footer"><span>MADE FOR YOUR NEXT MOVE.</span><span>MDB / 2026</span></footer>
      </main>
    </div>
  );
}
