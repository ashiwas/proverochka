import { Router } from 'express';
import { authRouter } from './modules/auth/auth.controller';
import { usersRouter } from './modules/users/users.controller';
import { leadsRouter } from './modules/leads/leads.controller';
import { tasksRouter } from './modules/tasks/tasks.controller';
import { leadCommentsRouter, commentsRouter } from './modules/comments/comments.controller';
import { leadHistoryRouter } from './modules/history/history.controller';
import { dashboardRouter } from './modules/dashboard/dashboard.controller';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/leads', leadsRouter);
// nested sub-resources on a lead
apiRouter.use('/leads/:id/comments', leadCommentsRouter);
apiRouter.use('/leads/:id/history', leadHistoryRouter);
apiRouter.use('/tasks', tasksRouter);
apiRouter.use('/comments', commentsRouter);
apiRouter.use('/dashboard', dashboardRouter);
