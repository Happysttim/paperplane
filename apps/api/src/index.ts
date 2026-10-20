import { app } from './app';
import router from './route';
import config from './config';
import { pool } from './database';
import { redis } from './redis';
import { logger } from './logger';
app.use(router);
const server = app.listen(config.listenPort, () =>
  logger.info('Paperplane API listening on ' + config.listenPort),
);
const shutdown = () => {
  server.close(() => {
    void Promise.all([pool.end(), redis.quit()]).finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
