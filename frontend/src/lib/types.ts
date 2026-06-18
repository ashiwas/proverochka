export type Role = 'ADMIN' | 'MANAGER';

export type LeadStatus =
  | 'NEW' | 'DEADLINE_SHIFT' | 'GET_FEEDBACK' | 'WARM'
  | 'AWAITING_PAYMENT' | 'IN_PROGRESS' | 'CLOSED';

export type TaskType = 'CALL' | 'PROMISED_CALL' | 'GET_FEEDBACK' | 'WORK_CHECK' | 'START_WORK' | 'OTHER';
export type DerivedTaskStatus = 'ACTIVE' | 'DONE' | 'OVERDUE';

export interface User {
  id: string; name: string; login: string; role: Role;
  isBlocked?: boolean; createdAt?: string;
  _count?: { leads: number; tasks: number };
}

export interface Assignee { id: string; name: string; login?: string; }

export interface ExtraPhone { name: string; phone: string; }

/** Результат глобального поиска по базе (виден всем, без доступа к чужому лиду). */
export interface LeadLookupResult {
  id: string;
  companyName: string;
  status: LeadStatus;
  manager: string;
  mine: boolean;
}

export interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  mainPhone: string;
  extraPhones: ExtraPhone[];
  website?: string | null;
  yandexMapsUrl?: string | null;
  twoGisUrl?: string | null;
  status: LeadStatus;
  assigneeId: string;
  assignee: Assignee;
  createdAt: string;
  updatedAt: string;
  nextTask: Task | null;
  hasOverdueTasks: boolean;
  activeTaskCount: number;
  overdueTaskCount: number;
}

export interface Task {
  id: string;
  type: TaskType;
  text: string;
  dueAt: string;
  status: 'ACTIVE' | 'DONE';
  derivedStatus: DerivedTaskStatus;
  isOverdue: boolean;
  completedAt?: string | null;
  leadId: string;
  lead?: { id: string; companyName: string; status: LeadStatus };
  assigneeId: string;
  assignee?: { id: string; name: string };
  createdAt: string;
}

export interface Comment {
  id: string; text: string; leadId: string;
  author: { id: string; name: string }; createdAt: string;
}

export interface HistoryEntry {
  id: string; action: string; details?: any;
  user: { id: string; name: string }; createdAt: string;
}
