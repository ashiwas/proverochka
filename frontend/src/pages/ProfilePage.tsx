import { useState } from 'react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../store/auth';
import { Button, Input, Field, Badge } from '../components/ui';

export default function ProfilePage() {
  const user = useAuth((s) => s.user);
  const isAdmin = useAuth((s) => s.isAdmin)();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const changePassword = async () => {
    if (!user) return;
    setError(''); setDone(false); setLoading(true);
    try {
      await api.patch(`/users/${user.id}/password`, { password });
      setDone(true); setPassword('');
    } catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-xl font-bold text-ink">Профиль</h1>

      <div className="space-y-3 rounded-xl border border-line bg-surface p-5">
        <div className="flex justify-between">
          <span className="text-sm text-ink-soft">Имя</span>
          <span className="text-sm font-medium text-ink">{user?.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-ink-soft">Логин</span>
          <span className="text-sm font-medium text-ink">{user?.login}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-ink-soft">Роль</span>
          <Badge color={isAdmin ? 'brand' : 'gray'}>{isAdmin ? 'Администратор' : 'Менеджер'}</Badge>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Смена пароля</h2>
        {isAdmin ? (
          <>
            {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            {done && <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Пароль обновлён.</div>}
            <Field label="Новый пароль (минимум 6 символов)">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <div className="mt-4">
              <Button onClick={changePassword} disabled={loading || password.length < 6}>Сменить пароль</Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-soft">
            Смену пароля выполняет администратор в разделе «Пользователи». Обратитесь к администратору.
          </p>
        )}
      </div>
    </div>
  );
}
