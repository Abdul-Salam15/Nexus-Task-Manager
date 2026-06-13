import { useState } from 'react';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';

interface LoginFormProps {
  onSignup: () => void;
  onForgot: () => void;
}

export function LoginForm({ onSignup, onForgot }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore(s => s.setAuth);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      const { user, accessToken, refreshToken } = res.data;
      setAuth(user, accessToken, refreshToken);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen active">
      <div className="auth-card slide-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="auth-logo"><span className="text-white font-black text-xl">N</span></div>
          <div>
            <div className="font-bold text-[16px] leading-tight">Nexus</div>
            <div className="text-[10.5px] mono text-white/55 uppercase tracking-widest">Task Intelligence</div>
          </div>
        </div>
        <h1 className="auth-h1">Welcome back</h1>
        <p className="auth-sub mt-1 mb-6">Sign in to your workspace to continue.</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="auth-label">Email</label>
            <input className="auth-input" type="email" placeholder="you@company.com" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="mb-2">
            <label className="auth-label">Password</label>
            <div className="pwd-wrap">
              <input className="auth-input" type={showPwd ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="button" className="pwd-eye" onClick={() => setShowPwd(v => !v)}>{showPwd ? '🙈' : '👁'}</button>
            </div>
            {error && <div className="auth-error" style={{ display: 'block' }}>{error}</div>}
          </div>

          <div className="flex justify-end mb-5">
            <button type="button" className="auth-link text-[12px]" onClick={onForgot}>Forgot password?</button>
          </div>

          <button className="auth-btn" disabled={loading}>{loading ? 'Logging in…' : 'Log in'}</button>
        </form>

        <div className="grow-line my-5" />
        <div className="text-center text-[12.5px] text-white/65">
          Don't have an account? <button className="auth-link" onClick={onSignup}>Sign up</button>
        </div>
      </div>
    </div>
  );
}
