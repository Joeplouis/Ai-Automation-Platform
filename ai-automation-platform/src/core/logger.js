import pino from 'pino';
import pinoHttp from 'pino-http';

const isProd = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isProd ? undefined : { target: 'pino-pretty', options: { colorize: true } }
});

export function httpLogger() {
  return pinoHttp({
    logger,
    customProps: (req) => ({ requestId: req.id }),
  });
}

export function withError(err) {
  return { err: { message: err.message, stack: err.stack } };
}
