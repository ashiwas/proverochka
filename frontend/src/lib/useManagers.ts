import { useEffect, useState } from 'react';
import { api } from './api';
import { useAuth } from '../store/auth';
import type { User } from './types';

export function useManagers(): User[] {
  const isAdmin = useAuth((s) => s.isAdmin)();
  const [managers, setManagers] = useState<User[]>([]);
  useEffect(() => {
    if (!isAdmin) return;
    api.get('/users').then((r) => setManagers(r.data.filter((u: User) => !u.isBlocked))).catch(() => {});
  }, [isAdmin]);
  return managers;
}
