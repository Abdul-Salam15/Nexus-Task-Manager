import { useRef } from 'react';

interface OtpInputProps {
  value: string[];
  onChange: (v: string[]) => void;
}

export function OtpInput({ value, onChange }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return;
    const next = [...value];
    next[i] = v.slice(-1);
    onChange(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...value];
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    onChange(next);
    refs.current[Math.min(text.length, 5)]?.focus();
  };

  return (
    <div className="otp-row">
      {[0, 1, 2, 3, 4, 5].map(i => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          className={`otp-box ${value[i] ? 'filled' : ''}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
        />
      ))}
    </div>
  );
}
