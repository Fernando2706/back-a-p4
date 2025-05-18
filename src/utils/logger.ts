import { Elysia } from 'elysia';
import { format } from 'date-fns';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private getTimestamp(): string {
    return format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const timestamp = this.getTimestamp();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(meta && Object.keys(meta).length > 0 && { meta })
    };

    const logString = JSON.stringify(logEntry);
    
    switch (level) {
      case 'error':
        console.error(logString);
        break;
      case 'warn':
        console.warn(logString);
        break;
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(logString);
        }
        break;
      default:
        console.log(logString);
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    const errorInfo = error ? { 
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      } 
    } : {};
    this.log('error', message, { ...errorInfo, ...meta });
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, meta);
    }
  }
}

export const logger = new Logger();

// Middleware para Elysia
export const requestLogger = () => {
  return (app: Elysia) =>
    app.onRequest(({ request, set }) => {
      const start = Date.now();
      const { method, url } = request;
      
      logger.info('Incoming request', { method, url });

      // Usamos el hook onAfterHandle para registrar la respuesta
      app.onAfterHandle(({ response, set }) => {
        const responseTime = Date.now() - start;
        const status = typeof response === 'object' && response !== null && 'status' in response 
          ? (response as { status: number }).status 
          : 200;
        
        const logData = {
          method,
          url,
          status,
          responseTime: `${responseTime}ms`
        };

        if (status >= 500) {
          logger.error('Request error', undefined, logData);
        } else if (status >= 400) {
          logger.warn('Request warning', logData);
        } else {
          logger.info('Request completed', logData);
        }

        return response;
      });
    });
};
