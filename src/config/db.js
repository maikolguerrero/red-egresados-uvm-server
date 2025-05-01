import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

const connectDB = async (customOptions = {}) => {

  const logDatabaseError = (message, metadata = {}) => {
    logger.error(message, {
      context: 'database',
      severity: 'critical',
      ...metadata
    });
    process.exit(1);
  };

  // =============================================
  // 1. Configuración base
  // =============================================
  const defaultOptions = {
    serverSelectionTimeoutMS: 3000,
    socketTimeoutMS: 30000,
    maxPoolSize: 5
  };

  const options = { ...defaultOptions, ...customOptions };

  // =============================================
  // 2. Validaciones iniciales (fase temprana)
  // =============================================
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    logDatabaseError('Falta la variable MONGODB_URI en .env', {
      type: 'configuration'
    });
  }

  if (!MONGODB_URI.match(/^mongodb(\+srv)?:\/\//)) {
    logDatabaseError('Formato de URI de MongoDB inválido', {
      type: 'configuration',
      invalidUri: MONGODB_URI.replace(/\/\/.*@/, '//[REDACTED]@')
    });
  }

  // =============================================
  // 3. Configuración de eventos (para monitoreo)
  // =============================================
  mongoose.connection.on('connected', () => {
    logger.info('Conexión a MongoDB establecida', {
      context: 'database',
      event: 'connection',
      host: mongoose.connection.host,
      dbName: mongoose.connection.name
    });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('Desconectado de MongoDB', {
      context: 'database',
      event: 'disconnection',
      lastKnownHost: mongoose.connection?.host
    });
  });

  mongoose.connection.on('error', (err) => {
    logger.error('Error de conexión a MongoDB', {
      context: 'database',
      event: 'connection_error',
      error: {
        name: err.name,
        message: err.message,
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
      }
    });
  });

  // =============================================
  // 4. Manejo de cierre elegante
  // =============================================

  const handleShutdown = async (signal) => {
    logger.warn(`Recibida señal ${signal}. Cerrando conexión a MongoDB...`, {
      context: 'database',
      event: 'shutdown',
      signal: signal,
      action: 'closing_connection'
    });

    try {
      await mongoose.connection.close();
      logger.info('Conexión a MongoDB cerrada correctamente', {
        context: 'database',
        event: 'shutdown',
        status: 'completed'
      });
    } catch (error) {
      logger.error('Error al cerrar conexión a MongoDB', {
        context: 'database',
        event: 'shutdown_error',
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
        },
        severity: 'high'
      });
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));  // Ctrl+C
  process.on('SIGTERM', () => handleShutdown('SIGTERM')); // Kill command

  // =============================================
  // 5. Conexión principal
  // =============================================
  try {
    logger.info('Iniciando conexión a MongoDB', {
      context: 'database',
      action: 'connecting',
      host: new URL(MONGODB_URI).hostname
    });

    await mongoose.connect(MONGODB_URI, options);

    // Verificación opcional (solo en producción)
    if (process.env.NODE_ENV === 'production') {
      await mongoose.connection.db.admin().ping();
      // console.log('🩺 [Salud] Ping a MongoDB exitoso');
      logger.info('Verificación de salud de MongoDB exitosa', {
        context: 'database',
        action: 'healthcheck',
        status: 'healthy'
      });
    }

  } catch (error) {
    const errorDetails = {
      context: 'database',
      action: 'connection_failed',
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      },
      host: new URL(MONGODB_URI).hostname,
      severity: 'critical',
      troubleshooting: [
        'Verificar que el servicio de MongoDB esté activo',
        'Revisar credenciales de conexión',
        'Validar configuración de red/firewall'
      ]
    };

    logger.error('Error crítico al conectar a MongoDB', errorDetails);
    throw error; // Simplemente relanza el error original para startServer()
  }
}

export default connectDB;