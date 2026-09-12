import winston from 'winston';

winston.addColors({
  error: 'red',
  debug: 'magenta',
  warn: 'yellow',
  info: 'green',
  data: 'cyan',
});

export const logger = winston.createLogger({
  levels: {
    error: 0,
    debug: 1,
    warn: 2,
    info: 3,
    data: 4,
  },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(
      ({ level, message }) => `${level}: ${String(message)}`,
    ),
  ),
  transports: [new winston.transports.Console()],
});
