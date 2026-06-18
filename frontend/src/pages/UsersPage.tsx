import { useCallback, useEffect, useState } from 'react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../store/auth';
import type { User, Role } from '../lib/types';
import { Modal } from '../components/Modal';
import { Button, Input, Select, Field, Badge } from '../components/ui';

const ROLE_LABELS: Record<Role, string> = { ADMIN: 'Администратор', MANAGER: 'Менеджер' };

export default function UsersPage() {
  const me = useAuth((s) => s.user);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [pwdUser, setPwdUser] = useState<User | null>(null);

  const load = useCallback(async () => {
    try { const { data } = await api.get('/users'); setUsers(data); }
    catch (e) { setError(apiError(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleBlock = async (u: User) => {
    try { await api.patch(`/users/${u.id}/block`, { isBlocked: !u.isBlocked }); load(); }
    catch (e) { setError(apiError(e)); }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Пользователи</h1>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>+ Новый пользователь</Button>
      </div>

      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-elevated text-left text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-3">Имя</th>
              <th className="px-4 py-3">Логин</th>
              <th className="px-4 py-3">Роль</th>
              <th className="px-4 py-3">Лиды</th>
              <th className="px-4 py-3">Задачи</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-line hover:bg-elevated">
                <td className="px-4 py-3 font-medium text-ink">{u.name}{u.id === me?.id && <span className="ml-1 text-xs text-ink-faint">(вы)</span>}</td>
                <td className="px-4 py-3 text-ink-soft">{u.login}</td>
                <td className="px-4 py-3"><Badge color={u.role === 'ADMIN' ? 'brand' : 'gray'}>{ROLE_LABELS[u.role]}</Badge></td>
                <td className="px-4 py-3 text-ink-soft">{u._count?.leads ?? 0}</td>
                <td className="px-4 py-3 text-ink-soft">{u._count?.tasks ?? 0}</td>
                <td className="px-4 py-3">{u.isBlocked ? <Badge color="red">Заблокирован</Badge> : <Badge color="green">Активен</Badge>}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(u); setFormOpen(true); }}>Изменить</Button>
                    <Button size="sm" variant="ghost" onClick={() => setPwdUser(u)}>Пароль</Button>
                    {u.id !== me?.id && (
                      <Button size="sm" variant={u.isBlocked ? 'outline' : 'ghost'} onClick={() => toggleBlock(u)}>
                        {u.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-ink-faint">Нет пользователей</td></tr>}
          </tbody>
        </table>
      </div>

      {formOpen && <UserFormModal user={editing} onClose={() => setFormOpen(false)} onSaved={load} />}
      {pwdUser && <PasswordModal user={pwdUser} onClose={() => setPwdUser(null)} />}
    </div>
  );
}

function UserFormModal({ user, onClose, onSaved }: { user: User | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(user?.name || '');
  const [login, setLogin] = useState(user?.login || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(user?.role || 'MANAGER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      if (user) await api.patch(`/users/${user.id}`, { name, login, role });
      else await api.post('/users', { name, login, password, role });
      onSaved(); onClose();
    } catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  };

  return (
    <Modal open onClose={onClose} title={user ? 'Редактировать пользователя' : 'Новый пользователь'}>
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="space-y-3">
        <Field label="Имя"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Логин"><Input value={login} onChange={(e) => setLogin(e.target.value)} /></Field>
        {!user && <Field label="Пароль"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>}
        <Field label="Роль">
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="MANAGER">Менеджер</option>
            <option value="ADMIN">Администратор</option>
          </Select>
        </Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Отмена</Button>
        <Button onClick={submit} disabled={loading || !name || !login || (!user && password.length < 6)}>Сохранить</Button>
      </div>
    </Modal>
  );
}

function PasswordModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(''); setLoading(true);
    try { await api.patch(`/users/${user.id}/password`, { password }); setDone(true); }
    catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Смена пароля — ${user.name}`}>
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {done ? (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Пароль обновлён.</div>
      ) : (
        <Field label="Новый пароль (минимум 6 символов)">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>{done ? 'Закрыть' : 'Отмена'}</Button>
        {!done && <Button onClick={submit} disabled={loading || password.length < 6}>Сменить</Button>}
      </div>
    </Modal>
  );
}
