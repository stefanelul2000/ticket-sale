import { useState } from 'react';
import { api } from '../../../lib/api';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { inputStyle } from '../../styles';

type Props = {
  setView: (view: 'register' | 'login') => void;
  publicNav: React.ReactNode;
  setRegisterNotice: (notice: string) => void;
};

export function RegisterView({ setView, publicNav, setRegisterNotice }: Props) {
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', username: '', password: '', password_confirmation: '' });
  const [registerError, setRegisterError] = useState('');

  const registerEmailInvalid = registerForm.email.length > 0 && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(registerForm.email);
  const registerPasswordChecks = [
    { label: 'Min 12 characters', ok: registerForm.password.length >= 12 },
    { label: 'Upper & lower case', ok: /[a-z]/.test(registerForm.password) && /[A-Z]/.test(registerForm.password) },
    { label: 'Number', ok: /\d/.test(registerForm.password) },
    { label: 'Symbol', ok: /[^A-Za-z0-9]/.test(registerForm.password) },
  ];
  const registerConfirmOk = registerForm.password.length > 0 && registerForm.password === registerForm.password_confirmation;

  return (
    <Layout header={publicNav}>
      <div style={{ display: 'grid', gap: 16, maxWidth: 460, margin: '0 auto' }}>
        <Card title="Register">
          <form
            style={{ display: 'grid', gap: 12 }}
            onSubmit={async (e) => {
              e.preventDefault();
              setRegisterError('');
              setRegisterNotice('');
              if (!registerForm.name || !registerForm.email || !registerForm.username || !registerForm.password || !registerForm.password_confirmation) {
                setRegisterError('Please fill out all fields.');
                return;
              }
              if (registerEmailInvalid) {
                setRegisterError('Please enter a valid email.');
                return;
              }
              if (!registerPasswordChecks.every((rule) => rule.ok)) {
                setRegisterError('Password does not meet requirements.');
                return;
              }
              if (!registerConfirmOk) {
                setRegisterError('Passwords must match.');
                return;
              }
              try {
                await api.register(registerForm);
                setRegisterNotice('Account submitted for approval. An admin must activate your access before you can log in.');
                setView('login');
              } catch (err: any) {
                setRegisterError(err?.response?.data?.message || 'Registration failed. Please try again.');
              }
            }}
          >
            <input
              placeholder="Full name"
              value={registerForm.name}
              onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="Email"
              value={registerForm.email}
              onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
              style={inputStyle}
            />
            {registerEmailInvalid && <div style={{ color: '#ff8c8c', fontSize: 13 }}>Please enter a valid email.</div>}
            <input
              placeholder="Username"
              value={registerForm.username}
              onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Password"
              value={registerForm.password}
              onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
              style={inputStyle}
            />
            {registerForm.password.length > 0 && (
              <div style={{ display: 'grid', gap: 4, textAlign: 'left' }}>
                {registerPasswordChecks.map((rule) => (
                  <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: 6, color: rule.ok ? '#43d9ad' : '#ff8c8c', fontSize: 13 }}>
                    <span>{rule.ok ? '✓' : '•'}</span>
                    <span>{rule.label}</span>
                  </div>
                ))}
              </div>
            )}
            <input
              type="password"
              placeholder="Confirm password"
              value={registerForm.password_confirmation}
              onChange={(e) =>
                setRegisterForm({ ...registerForm, password_confirmation: e.target.value })
              }
              style={inputStyle}
            />
            {registerForm.password_confirmation.length > 0 && (
              <div style={{ textAlign: 'left', color: registerConfirmOk ? '#43d9ad' : '#ff8c8c', fontSize: 13 }}>
                {registerConfirmOk ? 'Matches password' : 'Must match password'}
              </div>
            )}
            {registerError && <div style={{ color: '#ff8c8c', fontSize: 13, textAlign: 'left' }}>{registerError}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              <Button variant="ghost" type="button" onClick={() => setView('login')}>
                Back to login
              </Button>
              <Button type="submit">Create account</Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
}
