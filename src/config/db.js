/**
 * @fileoverview Módulo de conexión a MongoDB con manejo avanzado de errores
 * @module config/db
 * @requires mongoose - ODM para MongoDB
 * @requires dotenv - Manejo de variables de entorno
 * @requires ./logger - Logger personalizado
 * 
 * @description  
 * Configuración robusta de conexión a MongoDB con:
 * - Validación de URI y variables de entorno  
 * - Manejo de eventos (conexión/desconexión/errores)  
 * - Cierre elegante en señales SIGINT/SIGTERM  
 * - Verificación de salud en producción  
 * - Logging detallado para troubleshooting
 */

/**
 * @typedef {Object} MongoOptions
 * @property {number} [serverSelectionTimeoutMS=3000] - Tiempo de espera para selección de servidor (ms)
 * @property {number} [socketTimeoutMS=30000] - Tiempo de espera de sockets (ms)
 * @property {number} [maxPoolSize=5] - Tamaño máximo del pool de conexiones
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

/**
 * Establece conexión con MongoDB y configura manejadores de eventos
 * @function connectDB
 * @async
 * @param {MongoOptions} [customOptions={}] - Opciones personalizadas para la conexión
 * @returns {Promise<void>} No retorna valor, pero establece la conexión
 * @throws {Error} 
 * - Si falta MONGODB_URI en .env
 * - Si la URI tiene formato inválido
 * - Si falla la conexión inicial
 * 
 * @example
 * // Conexión básica
 * await connectDB();
 * 
 * // Conexión con opciones personalizadas
 * await connectDB({
 *   serverSelectionTimeoutMS: 5000,
 *   maxPoolSize: 10
 * });
 */

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