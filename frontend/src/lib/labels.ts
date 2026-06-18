import { LeadStatus, TaskType, DerivedTaskStatus } from './types';

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  'NEW', 'DEADLINE_SHIFT', 'GET_FEEDBACK', 'WARM', 'AWAITING_PAYMENT', 'IN_PROGRESS', 'CLOSED',
];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'Новый лид',
  DEADLINE_SHIFT: 'Перенос сроков',
  GET_FEEDBACK: 'Получить обратную связь',
  WARM: 'Тёплые',
  AWAITING_PAYMENT: 'Ждём оплату',
  IN_PROGRESS: 'В работе',
  CLOSED: 'Закрытые',
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  CALL: 'Позвонить',
  PROMISED_CALL: 'Обещал позвонить',
  GET_FEEDBACK: 'Получить обратную связь',
  WORK_CHECK: 'Проверка работы',
  START_WORK: 'Запуск в работу',
  OTHER: 'Другое',
};

export const TASK_STATUS_LABELS: Record<DerivedTaskStatus, string> = {
  ACTIVE: 'Активная', DONE: 'Выполнена', OVERDUE: 'Просрочена',
};

export const HISTORY_LABELS: Record<string, string> = {
  LEAD_CREATED: 'Создал лид',
  LEAD_UPDATED: 'Изменил данные лида',
  STATUS_CHANGED: 'Изменил статус',
  ASSIGNEE_CHANGED: 'Сменил ответственного',
  TASK_CREATED: 'Создал задачу',
  TASK_UPDATED: 'Изменил задачу',
  TASK_COMPLETED: 'Выполнил задачу',
  TASK_DELETED: 'Удалил задачу',
  COMMENT_ADDED: 'Добавил комментарий',
  COMMENT_DELETED: 'Удалил комментарий',
};
