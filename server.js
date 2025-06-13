/**
 * @fileoverview Punto de entrada principal del servidor
 * @module server
 * @requires dotenv
 * @requires ./src/app
 * @requires ./src/config/db
 * @requires ./src/config/logger
 * @requires ./src/services/notification.service
 * 
 * @description
 * Este archivo maneja:
 * - Inicialización del servidor Express
 * - Conexión a la base de datos con reintentos
 * - Manejo de errores y señales del sistema
 * - Configuración de variables de entorno
 */

import dotenv from 'dotenv';
import { app, httpServer, io } from './src/app.js'; // Importa la app configurada
import connectDB from './src/config/db.js';
import logger from './src/config/logger.js';
import NotificationService from './src/services/notification.service.js';

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
    // Manejar la conexión del socket
    io.on('connection', (socket) => {
        logger.info('Nuevo cliente conectado:', { socketId: socket.id });

        // Autenticación del socket
        socket.on('authenticate', (userId) => {
            if (userId) {
                socket.join(`user_${userId}`);
                logger.info(`Usuario ${userId} suscrito a notificaciones`, {
                    socketId: socket.id,
                    userId
                });
            }
        });

        // Manejar la desconexión del socket
        socket.on('disconnect', () => {
            logger.info('Cliente desconectado:', { socketId: socket.id });
        });

        // Manejar errores del socket
        socket.on('error', (error) => {
            logger.error('Error en Socket.io:', {
                socketId: socket.id,
                error: error.message,
                stack: !isProduction ? error.stack : undefined
            });
        });
    });

    logger.info('Socket.io configurado correctamente');
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

        // Iniciar el servidor
        httpServer.listen(PORT, () => {
            logger.info(`Servidor escuchando en puerto ${PORT}`);
            serverRetryCount = 0; // Resetear contador al éxito
        });

        // Manejar errores del servidor
        httpServer.on('error', (err) => {
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