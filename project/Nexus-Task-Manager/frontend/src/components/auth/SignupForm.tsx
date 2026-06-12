import { useState } from 'react';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import { PasswordStrength } from './PasswordStrength';

interface SignupFormProps {
  onLogin: () => void;
}

export function SignupForm({ onLogin }: SignupFormProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore(s => s.setAuth);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res = await authApi.signup({ fullName, email, password });
      const { user, accessToken, refreshToken } = res.data;
      setAuth(user, accessToken, refreshToken);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Signup failed';
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
        <h1 className="auth-h1">Create your account</h1>
        <p className="auth-sub mt-1 mb-6">Spin up a fresh workspace in seconds.</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="auth-label">Full name</label>
            <input className="auth-input" type="text" placeholder="Ada Lovelace" value={fullName} onChange={e => setFullName(e.target.value)} required autoFocus />
          </div>
          <div className="mb-3">
            <label className="auth-label">Email</label>
            <input className="auth-input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="mb-1">
            <label className="auth-label">Password</label>
            <div className="pwd-wrap">
              <input className="auth-input" type={showPwd ? 'text' : 'password'} placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
              <button type="button" className="pwd-eye" onClick={() => setShowPwd(v => !v)}>{showPwd ? '🙈' : '👁'}</button>
            </div>
            <PasswordStrength password={password} />
          </div>
          <div className="mb-5 mt-3">
            <label className="auth-label">Confirm password</label>
            <div className="pwd-wrap">
              <input className="auth-input" type={showPwd2 ? 'text' : 'password'} placeholder="Repeat password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
              <button type="button" className="pwd-eye" onClick={() => setShowPwd2(v => !v)}>{showPwd2 ? '🙈' : '👁'}</button>
            </div>
            {error && <div className="auth-error" style={{ display: 'block' }}>{error}</div>}
          </div>

          <button className="auth-btn" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button>
        </form>

        <div className="grow-line my-5" />
        <div className="text-center text-[12.5px] text-white/65">
          Already have an account? <button className="auth-link" onClick={onLogin}>Log in</button>
        </div>
      </div>
    </div>
  );
}
