import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import mongoose from 'mongoose';
import { contactRouter } from './router/contact';
import { chatRouter } from './router/chat.routes';
import { messageRouter } from './router/message.routes';
import { requestLogger, logger } from './utils/logger';

const app = new Elysia()
const port = process.env.PORT || 3000

// Conexión a MongoDB
const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-app';

mongoose.connect(mongoUrl)
  .then(() => logger.info('Conectado a MongoDB'))
  .catch(err => logger.error('Error al conectar a MongoDB', err));

// Middlewares
try {
  // Logger de peticiones
  app.use(requestLogger());
  app.use(cors());

  // Configuración de Swagger
  app.use(
    swagger({
      documentation: {
        info: {
          title: 'Back A P4',
          version: '1.0.0'
        }
      },
      path: '/docs'
    })
  );

  // Rutas
  app.use(contactRouter);
  app.use(chatRouter);
  app.use(messageRouter);

  // Manejador de errores global
  app.onError(({ code, error, set }) => {
    logger.error(`Error [${code}]`, error);
    set.status = 500;
    return { error: 'Error interno del servidor' };
  });

  app.listen(port, () => {
    logger.info(`Servidor iniciado en http://localhost:${port}`);
    logger.info(`Documentación de la API disponible en http://localhost:${port}/docs`);
  });
} catch (error) {
  logger.error('Error al iniciar la aplicación', error as Error);
  process.exit(1);
}