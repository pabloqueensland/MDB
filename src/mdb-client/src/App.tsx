import InlineAlert from './components/shared/InlineAlert';
import Brand from './components/shared/Brand';
import Footer from './components/shared/Footer';
import './App.css';
import Button from './components/shared/Button';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuthStore } from './stores/authStore';
import Dashboard from './components/dashboard/Dashboard';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

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

  if (user) {
    return <Dashboard key={user.id} />;
  }

  return (
    <div className="app-shell">
      <aside className="story">
        <Brand href="/" />
        <div className="story-content">
          <span className="eyebrow"><span className="little-line" /> YOUR PRACTICE, YOUR PACE</span>
          <h1>Every great dancer<br />starts with<br /><em>one step.</em></h1>
          <p>A place for the moves you’re learning,<br className="desktop-break" /> the progress you’re making, and what comes next.</p>
          <div className="dance-art" aria-hidden="true"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="orbit orbit-three" /><span className="step step-one">01</span><span className="step step-two">02</span><span className="step step-three">03</span><span className="art-caption">FIND YOUR RHYTHM</span></div>
        </div>
        <footer className="story-footer"><span>A LITTLE PRACTICE. A LITTLE PROGRESS.</span><span>✳</span></footer>
      </aside>
      <main>
          <section className="auth-card" aria-labelledby="auth-title">
            <span className="section-number">01 / GET STARTED</span>
            <div className="tabs" aria-label="Account options">
              <Button variant="tab" type="button" aria-pressed={mode === 'login'} className={mode === 'login' ? 'active' : ''} disabled={isLoading} onClick={() => switchMode('login')}>Sign in</Button>
              <Button variant="tab" type="button" aria-pressed={mode === 'register'} className={mode === 'register' ? 'active' : ''} disabled={isLoading} onClick={() => switchMode('register')}>Create account</Button>
            </div>
            <h2 id="auth-title">{mode === 'login' ? 'Back for more.' : 'Make your first move.'}</h2>
            <p className="intro">{mode === 'login' ? 'Sign in and pick up where you left off.' : 'Create your account. Find your rhythm.'}</p>
            <form onSubmit={submit}>
              <TextField id="email" label="Email address" type="email" autoComplete="email" fullWidth
                placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isLoading} />

              <TextField id="password" label="Password" type={showPassword ? 'text' : 'password'} fullWidth
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'} placeholder="Enter your password"
                value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isLoading}
                helperText={mode === 'register' ? 'At least 6 characters, with uppercase, lowercase, a number and a symbol.' : undefined}
                slotProps={{
                  htmlInput: { minLength: mode === 'register' ? 6 : undefined },
                  input: { endAdornment: <InputAdornment position="end">
                    <Button variant="ghost" size="compact" disabled={isLoading} aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</Button>
                  </InputAdornment> },
                }} />

              {mode === 'register' && <TextField id="confirm" label="Confirm password" fullWidth
                type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Enter your password again"
                value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required disabled={isLoading} />}
              {(formError || error) && <InlineAlert>{formError || error}</InlineAlert>}
              <Button fullWidth type="submit" disabled={isLoading}>{isLoading ? 'One moment…' : mode === 'login' ? 'Sign in' : 'Create account'}<span aria-hidden="true">↗</span></Button>
            </form>
            <p className="switch-copy">{mode === 'login' ? 'New to MDB?' : 'Already have an account?'} <Button variant="ghost" size="compact" disabled={isLoading} onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Start your journey' : 'Sign in'}</Button></p>
          </section>
        <Footer />
      </main>
    </div>
  );
}
