/**
 * @fileoverview Punto de entrada principal del servidor
 * @module server
 * @requires dotenv
 * @requires ./src/app
 * @requires ./src/config/db
 * @requires ./src/config/logger
 * @requires ./src/services/notification.service
 * @requires ./src/services/eventScheduler.service
 * @requires ./src/middlewares/socketAuth
 * 
 * @description
 * Este archivo maneja:
 * - Inicialización del servidor Express
 * - Conexión a la base de datos con reintentos
 * - Manejo de errores y señales del sistema
 * - Configuración de variables de entorno
 */

import dotenv from 'dotenv';
import { server, io, notificationService, chatService } from './app.js'; // Importa la app configurada
import connectDB from './config/db.js';
import logger from './config/logger.js';
import EventScheduler from './services/eventScheduler.service.js';
import { socketAuthenticate } from './middlewares/socketAuth.js';

// Cargar variables de entorno
dotenv.config();

/**
 * @constant {boolean} isProduction
 * @description Indica si el entorno actual es de producción
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * @constant {number} PORT
 * @description Puerto del servidor (tomado de variables de entorno o 3000 por defecto)
 */
const PORT = process.env.PORT || 3000; // Puerto por defecto

/**
 * @constant {number} MAX_SERVER_RETRIES
 * @description Máximo número de reintentos para iniciar el servidor
 */
const MAX_SERVER_RETRIES = 6; // Límite de reintentos

/**
 * @constant {number} SERVER_RETRY_DELAY
 * @description Tiempo de espera entre reintentos (en milisegundos)
 */
const SERVER_RETRY_DELAY = 10000; // 10 segundos entre intentos

/**
 * @let {number} serverRetryCount
 * @description Contador de reintentos actuales
 */
let serverRetryCount = 0;

/**
 * @function configureSocketIO
 * @description Configura los eventos y manejadores de Socket.io
 */
function configureSocketIO() {
    // Aplicar middleware de autenticación
    io.use(socketAuthenticate);

    // Configurar eventos de socket
    chatService.setupSocketEvents();

    // Manejar errores globales de Socket.io
    io.on('connection_error', (error) => {
        logger.error('Error de conexión global con Socket.io:', {
            error: error.message,
            stack: !isProduction ? error.stack : undefined
        });
    });

    logger.info('Socket.io configurado correctamente');
}

function configureServices() {
    // Configurar el scheduler de eventos
    const eventScheduler = new EventScheduler(io);
    eventScheduler.start();

    // Manejar apagado limpio
    process.on('SIGTERM', () => {
        eventScheduler.stop();
        process.exit(0);
    });

    process.on('SIGINT', () => {
        eventScheduler.stop();
        process.exit(0);
    });
}

/**
 * @async
 * @function startServer
 * @description Inicia el servidor con manejo de errores y reintentos
 * 
 * @throws {Error} Si no puede conectar a la base de datos
 * @throws {Error} Si no puede iniciar el servidor después de varios intentos
 * 
 * @example
 * startServer(); // Inicia el servidor con configuración automática
 */
async function startServer() {
    try {
        await connectDB();

        // Configurar Socket.io
        configureSocketIO();

        // Configurar servicios
        configureServices();

        // Iniciar el servidor
        // httpServer.listen(PORT, () => {
        //     logger.info(`Servidor escuchando en puerto ${PORT}`);
        //     serverRetryCount = 0; // Resetear contador al éxito
        // });

        // Iniciar el servidor en todas las interfaces de red
        server.listen(PORT, '0.0.0.0', () => {
            logger.info(`Servidor escuchando en puerto ${PORT}`);
            serverRetryCount = 0; // Resetear contador al éxito
        });

        // Manejar errores del servidor
        server.on('error', (err) => {
            logger.error('Error en el servidor:', {
                error: err.message,
                stack: !isProduction ? err.stack : undefined
            });
        });

        // Manejar rechazos no manejados
        process.on('unhandledRejection', (err) => {
            logger.error('Unhandled Rejection:', {
                error: err.message,
                stack: !isProduction ? err.stack : undefined
            });
        });

    } catch (error) {
        serverRetryCount++;
        logger.error(`Fallo durante el inicio (Intento ${serverRetryCount}/${MAX_SERVER_RETRIES}):`, {
            error: error.message,
            stack: !isProduction ? error.stack : undefined
        });

        if (serverRetryCount >= MAX_SERVER_RETRIES) {
            logger.error('Máximo de reintentos alcanzado. Saliendo...');
            return process.exit(1);
        }

        // Esperar antes de reintentar
        await new Promise(resolve => setTimeout(resolve, SERVER_RETRY_DELAY));
        return startServer();
    }
}

/**
 * @event SIGTERM
 * @description Maneja señal de terminación para apagado limpio
 */
process.on('SIGTERM', () => {
    logger.info('Recibida señal SIGTERM. Cerrando servidor...', {
        signal: 'SIGTERM',
        uptime: process.uptime()
    });
    process.exit(0);
});

/**
 * @event SIGINT
 * @description Maneja señal de interrupción (Ctrl+C)
 */
process.on('SIGINT', () => {
    logger.info('Recibida señal SIGINT. Cerrando servidor...', {
        signal: 'SIGINT',
        uptime: process.uptime()
    });
    process.exit(0);
});

// Iniciar el servidor
startServer();