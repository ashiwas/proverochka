import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiError } from '../lib/api';
import { useAuth } from '../store/auth';
import { Button, Input, Field } from '../components/ui';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuth((s) => s.setAuth);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { login, password });
      setAuth(data.token, data.refreshToken, data.user);
      navigate('/');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-elevated">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-sm">
        <h1 className="text-xl font-extrabold tracking-tight text-brand-700">UPRES</h1>
        <p className="mb-6 text-sm text-ink-soft">Вход в систему</p>
        {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="space-y-4">
          <Field label="Логин"><Input value={login} onChange={(e) => setLogin(e.target.value)} autoFocus /></Field>
          <Field label="Пароль"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        </div>
        <Button type="submit" className="mt-6 w-full" disabled={loading}>{loading ? 'Вход…' : 'Войти'}</Button>
      </form>
    </div>
  );
}
