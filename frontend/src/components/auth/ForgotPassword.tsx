import { useState, useEffect } from 'react';
import { authApi } from '../../api/auth.api';
import { OtpInput } from './OtpInput';
import { PasswordStrength } from './PasswordStrength';

interface ForgotPasswordProps {
  onBack: () => void;
}

export function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await authApi.forgotRequest(email);
      setStep(2);
      setTimer(60);
    } catch { setError('Something went wrong. Try again.'); }
    finally { setLoading(false); }
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    if (otp.some(d => !d)) { setError('Enter all 6 digits'); return; }
    setError(''); setLoading(true);
    try {
      const res = await authApi.forgotVerify(email, otp.join(''));
      setResetToken(res.data.resetToken);
      setStep(3);
    } catch { setError('Invalid or expired code'); }
    finally { setLoading(false); }
  }

  async function handleResend() {
    if (timer > 0) return;
    try { await authApi.forgotRequest(email); setTimer(60); setError(''); } catch {}
  }

  async function handleStep3(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await authApi.forgotReset(resetToken, newPassword);
      onBack();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Reset failed';
      setError(msg);
    } finally { setLoading(false); }
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

        {/* Step 1: email */}
        {step === 1 && (
          <div>
            <h1 className="auth-h1">Reset your password</h1>
            <p className="auth-sub mt-1 mb-6">We'll send a 6-digit code to verify it's you.</p>
            <form onSubmit={handleStep1}>
              <div className="mb-5">
                <label className="auth-label">Email</label>
                <input className="auth-input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                {error && <div className="auth-error" style={{ display: 'block' }}>{error}</div>}
              </div>
              <button className="auth-btn" disabled={loading}>{loading ? 'Sending…' : 'Send reset code'}</button>
            </form>
          </div>
        )}

        {/* Step 2: OTP */}
        {step === 2 && (
          <div>
            <h1 className="auth-h1">Enter verification code</h1>
            <p className="auth-sub mt-1 mb-5">We sent a 6-digit code to <span className="text-white">{email}</span>.</p>
            <form onSubmit={handleStep2}>
              <div className="mb-2">
                <OtpInput value={otp} onChange={setOtp} />
              </div>
              {error && <div className="auth-error" style={{ display: 'block' }}>{error}</div>}
              <div className="flex items-center justify-between text-[12px] text-white/55 mt-3 mb-5">
                <span>Code expires in <span className="mono text-white">{timer}s</span></span>
                <button type="button" className="auth-link" onClick={handleResend} disabled={timer > 0} style={timer > 0 ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}>Resend code</button>
              </div>
              <button className="auth-btn" disabled={loading || otp.some(d => !d)}>{loading ? 'Verifying…' : 'Verify code'}</button>
            </form>
          </div>
        )}

        {/* Step 3: new password */}
        {step === 3 && (
          <div>
            <h1 className="auth-h1">Set a new password</h1>
            <p className="auth-sub mt-1 mb-6">Choose something strong you'll remember.</p>
            <form onSubmit={handleStep3}>
              <div className="mb-1">
                <label className="auth-label">New password</label>
                <div className="pwd-wrap">
                  <input className="auth-input" type={showPwd ? 'text' : 'password'} placeholder="At least 8 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} autoFocus />
                  <button type="button" className="pwd-eye" onClick={() => setShowPwd(v => !v)}>{showPwd ? '🙈' : '👁'}</button>
                </div>
                <PasswordStrength password={newPassword} />
              </div>
              <div className="mb-5 mt-3">
                <label className="auth-label">Confirm password</label>
                <div className="pwd-wrap">
                  <input className="auth-input" type={showPwd2 ? 'text' : 'password'} placeholder="Repeat password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
                  <button type="button" className="pwd-eye" onClick={() => setShowPwd2(v => !v)}>{showPwd2 ? '🙈' : '👁'}</button>
                </div>
                {error && <div className="auth-error" style={{ display: 'block' }}>{error}</div>}
              </div>
              <button className="auth-btn" disabled={loading}>{loading ? 'Updating…' : 'Reset password'}</button>
            </form>
          </div>
        )}

        <div className="step-dots mt-5">
          <span className={step >= 1 ? 'on' : ''} />
          <span className={step >= 2 ? 'on' : ''} />
          <span className={step >= 3 ? 'on' : ''} />
        </div>

        <div className="grow-line my-5" />
        <div className="text-center text-[12.5px] text-white/65">
          <button className="auth-link" onClick={onBack}>← Back to log in</button>
        </div>
      </div>
    </div>
  );
}
