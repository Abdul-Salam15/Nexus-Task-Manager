function pwdStrength(p: string): { level: number; label: string } {
  if (!p) return { level: 0, label: '' };
  if (p.length < 6) return { level: 1, label: 'Weak · too short' };
  const hasNum = /\d/.test(p);
  const hasSym = /[^A-Za-z0-9]/.test(p);
  if (p.length >= 8 && hasNum && hasSym) return { level: 3, label: 'Strong' };
  return { level: 2, label: 'Fair · add a number & symbol' };
}

export function PasswordStrength({ password }: { password: string }) {
  const { level, label } = pwdStrength(password);
  const cls = level === 1 ? 'weak' : level === 2 ? 'fair' : level === 3 ? 'strong' : '';
  return (
    <div>
      <div className={`strength flex gap-1 mt-2 ${cls}`}>
        <div className="seg" /><div className="seg" /><div className="seg" />
      </div>
      <div className="strength-label mt-1 text-[11px] mono uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.55)' }}>
        {label}
      </div>
    </div>
  );
}
