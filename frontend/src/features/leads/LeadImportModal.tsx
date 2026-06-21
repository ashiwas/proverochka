import { useState } from 'react';
import * as XLSX from 'xlsx';
import { api, apiError } from '../../lib/api';
import { useAuth } from '../../store/auth';
import type { User, ExtraPhone } from '../../lib/types';
import { Modal } from '../../components/Modal';
import { Button, Field, Select } from '../../components/ui';
import { guessTimezone, isValidTimeZone } from '../../lib/timezones';

interface ParsedLead {
  companyName: string;
  contactName: string;
  mainPhone: string;
  extraPhones: ExtraPhone[];
  website?: string;
  yandexMapsUrl?: string;
  twoGisUrl?: string;
  city?: string;
  timezone?: string;
}

// Сопоставление заголовков столбцов (нижний регистр, без пробелов по краям).
const COLUMN_ALIASES: Record<keyof Omit<ParsedLead, 'extraPhones'> | 'extraPhone', string[]> = {
  companyName: ['название компании', 'компания', 'company', 'company name'],
  contactName: ['имя лпр', 'лпр', 'контакт', 'имя', 'contact', 'contact name'],
  mainPhone: ['телефон', 'основной телефон', 'основной', 'phone', 'main phone'],
  extraPhone: ['доп. телефон', 'дополнительный телефон', 'доп телефон', 'доп. телефоны', 'extra phone'],
  website: ['сайт', 'website', 'url'],
  yandexMapsUrl: ['яндекс карты', 'яндекс', 'yandex', 'yandex maps'],
  twoGisUrl: ['2гис', '2gis', 'двагис'],
  city: ['город', 'city'],
  timezone: ['таймзона', 'часовой пояс', 'timezone', 'tz'],
};

function pick(row: Record<string, any>, aliases: string[]): string {
  for (const key of Object.keys(row)) {
    if (aliases.includes(key.trim().toLowerCase())) {
      const v = row[key];
      return v === undefined || v === null ? '' : String(v).trim();
    }
  }
  return '';
}

function rowsToLeads(rows: Record<string, any>[]): { valid: ParsedLead[]; invalid: number } {
  const valid: ParsedLead[] = [];
  let invalid = 0;
  for (const row of rows) {
    const companyName = pick(row, COLUMN_ALIASES.companyName);
    const contactName = pick(row, COLUMN_ALIASES.contactName);
    const mainPhone = pick(row, COLUMN_ALIASES.mainPhone);
    if (!companyName || !contactName || !mainPhone) { invalid++; continue; }

    const extraRaw = pick(row, COLUMN_ALIASES.extraPhone);
    const extraPhones: ExtraPhone[] = extraRaw
      ? extraRaw.split(/[,;]/).map((p) => p.trim()).filter(Boolean).map((phone) => ({ name: '', phone }))
      : [];

    // Таймзона: берём явную (если это валидная IANA-зона), иначе подбираем по городу.
    const city = pick(row, COLUMN_ALIASES.city);
    const tzRaw = pick(row, COLUMN_ALIASES.timezone);
    const timezone = (tzRaw && isValidTimeZone(tzRaw) ? tzRaw : guessTimezone(city)) || undefined;

    valid.push({
      companyName, contactName, mainPhone, extraPhones,
      website: pick(row, COLUMN_ALIASES.website) || undefined,
      yandexMapsUrl: pick(row, COLUMN_ALIASES.yandexMapsUrl) || undefined,
      twoGisUrl: pick(row, COLUMN_ALIASES.twoGisUrl) || undefined,
      city: city || undefined,
      timezone,
    });
  }
  return { valid, invalid };
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Название компании', 'Имя ЛПР', 'Основной телефон', 'Доп. телефон', 'Сайт', 'Яндекс Карты', '2ГИС', 'Город', 'Таймзона'],
    ['ООО Пример', 'Иван Петров', '+7 900 000-00-00', '+7 900 111-11-11', 'https://example.ru', '', '', 'Москва', ''],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Лиды');
  XLSX.writeFile(wb, 'leads-template.xlsx');
}

export function LeadImportModal({
  open, onClose, onImported, managers,
}: { open: boolean; onClose: () => void; onImported: () => void; managers: User[] }) {
  const isAdmin = useAuth((s) => s.isAdmin)();
  const [parsed, setParsed] = useState<ParsedLead[] | null>(null);
  const [invalidCount, setInvalidCount] = useState(0);
  const [fileName, setFileName] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; failedCount: number } | null>(null);

  const handleFile = async (file: File) => {
    setError(''); setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
      const { valid, invalid } = rowsToLeads(rows);
      setParsed(valid); setInvalidCount(invalid); setFileName(file.name);
    } catch (e) {
      setError('Не удалось прочитать файл. Поддерживаются .xlsx, .xls, .csv');
    }
  };

  const submit = async () => {
    if (!parsed || parsed.length === 0) return;
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/leads/import', {
        leads: parsed,
        assigneeId: isAdmin && assigneeId ? assigneeId : undefined,
      });
      setResult({ created: data.created, failedCount: data.failedCount });
      onImported();
    } catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Импорт лидов из Excel">
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {result ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            Импортировано лидов: {result.created}{result.failedCount ? `, не удалось: ${result.failedCount}` : ''}.
          </div>
          <div className="flex justify-end"><Button onClick={onClose}>Готово</Button></div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            Загрузите таблицу со столбцами: <b>Название компании</b>, <b>Имя ЛПР</b>, <b>Основной телефон</b> (обязательные),
            а также по желанию: Доп. телефон, Сайт, Яндекс Карты, 2ГИС, Город, Таймзона.
            Таймзону можно не заполнять — она подберётся по городу.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer">
              <span className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                Выбрать файл
              </span>
              <input
                type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
              />
            </label>
            <Button variant="outline" onClick={downloadTemplate}>Скачать шаблон</Button>
            {fileName && <span className="text-sm text-ink-faint">{fileName}</span>}
          </div>

          {isAdmin && (
            <Field label="Назначить ответственного на все импортируемые лиды">
              <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">— Я —</option>
                {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </Field>
          )}

          {parsed && (
            <div className="rounded-lg border border-line bg-elevated px-3 py-2 text-sm text-ink-soft">
              Готово к импорту: <b className="text-ink">{parsed.length}</b>
              {invalidCount > 0 && <> · пропущено (нет обязательных полей): {invalidCount}</>}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Отмена</Button>
            <Button onClick={submit} disabled={loading || !parsed || parsed.length === 0}>
              {loading ? 'Импорт…' : `Импортировать${parsed?.length ? ` (${parsed.length})` : ''}`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
