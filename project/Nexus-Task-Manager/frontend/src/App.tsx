import { useState, useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { AppShell } from './components/layout/AppShell';
import { LoginForm } from './components/auth/LoginForm';
import { SignupForm } from './components/auth/SignupForm';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { authApi } from './api/auth.api';

type AuthView = 'login' | 'signup' | 'forgot';

export function App() {
  const { user, accessToken, setAuth, clearAuth } = useAuthStore();
  const [authView, setAuthView] = useState<AuthView>('login');
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    // Try to rehydrate user from stored token
    if (accessToken && !user) {
      authApi.getMe()
        .then(res => setAuth(res.data.user, accessToken, localStorage.getItem('nexus_refresh_token') || ''))
        .catch(() => clearAuth())
        .finally(() => setHydrating(false));
    } else {
      setHydrating(false);
    }

    // Listen for forced logout from interceptor
    const handler = () => clearAuth();
    window.addEventListener('nexus:logout', handler);
    return () => window.removeEventListener('nexus:logout', handler);
  }, []);

  if (hydrating) {
    return (
      <div className="auth-screen active">
        <div className="text-[14px] blink" style={{ color: 'var(--ink-3)' }}>Loading…</div>
      </div>
    );
  }

  if (!user) {
    if (authView === 'signup') return <SignupForm onLogin={() => setAuthView('login')} />;
    if (authView === 'forgot') return <ForgotPassword onBack={() => setAuthView('login')} />;
    return <LoginForm onSignup={() => setAuthView('signup')} onForgot={() => setAuthView('forgot')} />;
  }

  return <AppShell />;
}
