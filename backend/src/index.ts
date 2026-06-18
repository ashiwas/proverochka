import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { apiRouter } from './router';
import { errorHandler, notFoundHandler } from './middleware/error';

const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`CRM API listening on http://localhost:${env.port}`);
});
