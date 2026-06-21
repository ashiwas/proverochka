import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { apiRouter } from './router';
import { errorHandler, notFoundHandler } from './middleware/error';

const app = express();

// За обратным прокси (nginx и т.п.) — чтобы rate-limit видел реальный IP клиента.
app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
    // Чтобы фронт мог прочитать имя файла при скачивании готового КП.
    exposedHeaders: ['Content-Disposition'],
  }),
);
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`CRM API listening on http://localhost:${env.port}`);
});
