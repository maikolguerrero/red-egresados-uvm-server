import dotenv from 'dotenv';
import app from './src/app.js'; // Importa la app configurada
import connectDB from './src/config/db.js';
import logger from './src/config/logger.js';

// Cargar variables de entorno
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000; // Puerto por defecto
const MAX_SERVER_RETRIES = 6; // Límite de reintentos
const SERVER_RETRY_DELAY = 10000; // 10 segundos entre intentos
let serverRetryCount = 0;

// Iniciar el servidor
async function startServer() {
    try {
        await connectDB();

        const server = app.listen(PORT, () => {
            logger.info(`Servidor escuchando en puerto ${PORT}`);
            serverRetryCount = 0; // Resetear contador al éxito
        });

        server.on('error', (err) => {
            logger.error('Error en el servidor:', err);
        });

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

// Iniciar con manejo de señales
process.on('SIGTERM', () => {
    logger.info('Recibida señal SIGTERM. Cerrando servidor...');
    process.exit(0);
});

// Iniciar el servidor
startServer();