import { useState } from 'react';
import { api, apiError } from '../../lib/api';
import { useAuth } from '../../store/auth';
import type { User, ExtraPhone } from '../../lib/types';
import { Modal } from '../../components/Modal';
import { Button, Input, Field, Select } from '../../components/ui';

export function LeadFormModal({
  open, onClose, onCreated, managers,
}: { open: boolean; onClose: () => void; onCreated: () => void; managers: User[] }) {
  const isAdmin = useAuth((s) => s.isAdmin)();
  const [f, setF] = useState({
    companyName: '', contactName: '', mainPhone: '',
    website: '', yandexMapsUrl: '', twoGisUrl: '', assigneeId: '',
  });
  const [extraPhones, setExtraPhones] = useState<ExtraPhone[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const addPhone = () => setExtraPhones((p) => [...p, { name: '', phone: '' }]);
  const setPhone = (i: number, k: keyof ExtraPhone, v: string) =>
    setExtraPhones((p) => p.map((e, idx) => (idx === i ? { ...e, [k]: v } : e)));
  const removePhone = (i: number) => setExtraPhones((p) => p.filter((_, idx) => idx !== i));

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      await api.post('/leads', {
        companyName: f.companyName, contactName: f.contactName, mainPhone: f.mainPhone,
        extraPhones: extraPhones.filter((e) => e.phone.trim()),
        website: f.website || undefined, yandexMapsUrl: f.yandexMapsUrl || undefined, twoGisUrl: f.twoGisUrl || undefined,
        assigneeId: isAdmin && f.assigneeId ? f.assigneeId : undefined,
      });
      onCreated(); onClose();
    } catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Новый лид">
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Название компании *"><Input value={f.companyName} onChange={(e) => set('companyName', e.target.value)} /></Field>
        <Field label="Имя ЛПР *"><Input value={f.contactName} onChange={(e) => set('contactName', e.target.value)} /></Field>
        <Field label="Основной телефон *"><Input value={f.mainPhone} onChange={(e) => set('mainPhone', e.target.value)} /></Field>
        <Field label="Сайт"><Input value={f.website} onChange={(e) => set('website', e.target.value)} placeholder="https://" /></Field>
        <Field label="Яндекс Карты"><Input value={f.yandexMapsUrl} onChange={(e) => set('yandexMapsUrl', e.target.value)} placeholder="https://" /></Field>
        <Field label="2ГИС"><Input value={f.twoGisUrl} onChange={(e) => set('twoGisUrl', e.target.value)} placeholder="https://" /></Field>
        {isAdmin && (
          <Field label="Ответственный">
            <Select value={f.assigneeId} onChange={(e) => set('assigneeId', e.target.value)}>
              <option value="">— Я —</option>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-ink-soft">Дополнительные телефоны</span>
          <Button size="sm" variant="outline" onClick={addPhone}>+ Телефон</Button>
        </div>
        <div className="space-y-2">
          {extraPhones.length === 0 && <div className="text-xs text-ink-faint">Можно добавить несколько номеров с подписью (например «Бухгалтерия»).</div>}
          {extraPhones.map((e, i) => (
            <div key={i} className="flex items-end gap-2 rounded-lg border border-line bg-elevated p-2.5">
              <Field className="w-2/5" label="Имя / отдел">
                <Input placeholder="Например, Бухгалтерия" value={e.name} onChange={(ev) => setPhone(i, 'name', ev.target.value)} />
              </Field>
              <Field className="flex-1" label="Телефон">
                <Input placeholder="+7 900 000-00-00" value={e.phone} onChange={(ev) => setPhone(i, 'phone', ev.target.value)} />
              </Field>
              <Button variant="outline" title="Удалить номер" onClick={() => removePhone(i)}>✕</Button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Отмена</Button>
        <Button onClick={submit} disabled={loading || !f.companyName || !f.contactName || !f.mainPhone}>Создать</Button>
      </div>
    </Modal>
  );
}
