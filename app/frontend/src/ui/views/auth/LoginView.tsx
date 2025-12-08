import { useState } from 'react';
import { useAuth } from '../../../state/useAuth';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { inputStyle } from '../../styles'; // We need to extract styles too

type Props = {
  setView: (view: 'register' | 'login') => void;
  publicNav: React.ReactNode;
  setupSuccess: boolean;
  registerNotice: string;
};

export function LoginView({ setView, publicNav, setupSuccess, registerNotice }: Props) {
  const { login, loading, error } = useAuth();
  const [form, setForm] = useState({ username: '', password: '', remember: true });
  const [loginError, setLoginError] = useState<string | null>(null);

  return (
    <Layout header={publicNav}>
      <div style={{ display: 'grid', gap: 16, maxWidth: 420, margin: '80px auto 0', textAlign: 'center' }}>
        {(setupSuccess || registerNotice) && (
          <Card>
            {setupSuccess && <div style={{ color: '#43d9ad', fontWeight: 600 }}>Setup completed successfully. Please log in.</div>}
            {registerNotice && <div style={{ color: '#ffb86c', fontWeight: 600 }}>{registerNotice}</div>}
          </Card>
        )}
        <Card title="Login" titleAlign="center">
          <form
            style={{ display: 'grid', gap: 12 }}
            onSubmit={(e) => {
              e.preventDefault();
              setLoginError(null);
              if (!form.username && !form.password) {
                setLoginError('No login data supplied.');
                return;
              }
              if (!form.username) {
                setLoginError('The username field is required.');
                return;
              }
              if (!form.password) {
                setLoginError('The password field is required.');
                return;
              }
              login(form.username, form.password, form.remember).catch(() => {
                setLoginError('Invalid credentials.');
              });
            }}
          >
            <input
              placeholder="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={inputStyle}
            />
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: '#d7e2fb',
                fontSize: 14,
                padding: '8px 10px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <input
                type="checkbox"
                checked={form.remember}
                onChange={(e) => setForm({ ...form, remember: e.target.checked })}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.35)',
                  background: '#0f1624',
                  accentColor: '#43d9ad',
                }}
              />
              Remember me on this device
            </label>
            {(loginError || error) && <div style={{ color: '#ff8c8c' }}>{loginError || 'Invalid credentials.'}</div>}
            <Button disabled={loading} type="submit">
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
            <Button variant="ghost" type="button" onClick={() => setView('register')}>
              Create account
            </Button>
          </form>
        </Card>
      </div>
    </Layout>
  );
}
