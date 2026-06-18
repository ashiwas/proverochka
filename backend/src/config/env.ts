import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwtSecret: required('JWT_SECRET', 'dev-secret-change-me'),
  // Короткий access-токен: при истечении клиент молча обновляет его по refresh-токену.
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  // Срок жизни refresh-токена в днях.
  refreshTokenDays: parseInt(process.env.REFRESH_TOKEN_DAYS || '30', 10),
};
