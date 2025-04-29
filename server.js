import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import EmailService from './services/email.service.js';
import { notFoundHandler, globalErrorHandler } from './middlewares/errorHandler.js';
import { requestIdMiddleware } from './middlewares/requestId.js';
import connectDB from './config/db.js';
import alumniRoutes from './routes/alumni.routes.js';
import authRoutes from './routes/auth.routes.js';
import logger from './config/logger.js';
import httpLogger from './utils/httpLogger.js';

// Cargar variables de entorno
dotenv.config();

// Crear la aplicación Express
const app = express();

const isProduction = process.env.NODE_ENV === 'production';

// Middleware de compresión
app.use(compression());

// Limiter general para rutas API
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: 'Demasiadas peticiones a la API'
});

// Limiter para autenticación (más estricto)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: 'Demasiados intentos de acceso.'
});

// Configuración BASE de seguridad para todos los entornos
app.use((req, res, next) => {
    // Headers esenciales que no interfieren con desarrollo
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
});

// Configuración MEJORADA de Helmet por entorno
app.use(helmet({
    contentSecurityPolicy: false, // Siempre desactivado (lo maneja frontend)
    hsts: isProduction ? {
        maxAge: 63072000, // 2 años
        includeSubDomains: true,
        preload: true
    } : false,
    frameguard: { action: 'deny' }, // Bueno para todos los entornos
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, // Balance seguridad/usabilidad
    ...(!isProduction && {
        // Desactivar protecciones que molestan en desarrollo
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false
    })
}));

// Headers adicionales SOLO para producción
if (isProduction) {
    app.use((req, res, next) => {
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
        res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
        next();
    });
}

const corsOptions = {
    origin: isProduction ? [
        process.env.FRONTEND_URL,
        // otras URLs de producción
    ] : [
        'http://localhost:5173',
        'http://localhost:3000'
    ],
    credentials: true, // Permite cookies en cross-origin
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Length', 'X-Request-ID'],
    maxAge: 86400 // Preflight cache por 24 horas
};

// Configuración del transporter
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Creación de servicios
const emailService = new EmailService(transporter, logger);

// Middlewares
app.use(requestIdMiddleware); // Generar ID de solicitud
app.use(cors(corsOptions));  // Permitir solicitudes desde el frontend
app.use(cookieParser()); // Parsear cookies
app.use(express.json()); // Parsear JSON en las solicitudes
app.use(express.urlencoded({ extended: true })); // Parsear formularios
app.use(httpLogger); // Logger de peticiones HTTP

// Rutas
app.use('/api/auth', authLimiter, authRoutes(emailService));
app.use('/api/alumni', apiLimiter, alumniRoutes);

app.use(notFoundHandler); // Maneja rutas no encontradas
app.use(globalErrorHandler); // Maneja errores

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

startServer();