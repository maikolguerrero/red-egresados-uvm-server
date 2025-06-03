/**
 * @fileoverview Configuración principal de la aplicación Express
 * @module app
 * @requires express
 * @requires cors
 * @requires cookie-parser
 * @requires compression
 * @requires helmet
 * @requires express-rate-limit
 * @requires nodemailer
 * @requires ./services/email.service
 * @requires ./middlewares/errorHandler
 * @requires ./middlewares/requestId
 * @requires ./routes/auth.routes
 * @requires ./routes/alumni.routes
 * @requires ./routes/event.routes
 * @requires ./routes/forum.routes
 * @requires ./config/logger
 * @requires ./utils/httpLogger
 * @requires ./config/swagger
 * 
 * @description
 * Este archivo configura y exporta la aplicación Express principal con:
 * - Middlewares de seguridad (Helmet, CORS, rate limiting)
 * - Configuración de rutas
 * - Manejo de errores
 * - Servicios esenciales (email)
 * - Documentación Swagger (solo en desarrollo)
 */

/**
 * @environment
 * @description Variables de entorno requeridas para la configuración:
 * @property {string} NODE_ENV - Entorno de ejecución (development/production)
 * @property {string} FRONTEND_URL - URL del frontend en producción
 * @property {string} EMAIL_SERVICE - Servicio de email para Nodemailer
 * @property {string} EMAIL_USER - Usuario para autenticación de email
 * @property {string} EMAIL_PASSWORD - Contraseña para autenticación de email
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import EmailService from './services/email.service.js';
import FileService from './services/file.service.js';
import { notFoundHandler, globalErrorHandler } from './middlewares/errorHandler.js';
import { requestIdMiddleware } from './middlewares/requestId.js';
import authRoutes from './routes/auth.routes.js';
import alumniRoutes from './routes/alumni.routes.js';
import eventRoutes from './routes/event.routes.js';
import forumRoutes from './routes/forum.routes.js';
import logger from './config/logger.js';
import httpLogger from './utils/httpLogger.js';
import swaggerDocs from './config/swagger.js';

/**
 * @constant {express.Application} app
 * @description Instancia principal de la aplicación Express
 */
const app = express();

/**
 * @constant {boolean} isProduction
 * @description Indica si la aplicación se ejecuta en entorno de producción
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * @function compression
 * @description Middleware de compresión GZIP para respuestas HTTP
 * @see {@link https://expressjs.com/en/resources/middleware/compression.html}
 */
app.use(compression());

/**
 * @constant {RateLimit} apiLimiter
 * @description Limitador de tasa para rutas API (100 solicitudes cada 15 minutos)
 * @property {number} windowMs - Ventana de tiempo en milisegundos (15 minutos)
 * @property {number} limit - Máximo de solicitudes por ventana
 * @property {string} message - Mensaje de error cuando se excede el límite
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: 'Demasiadas peticiones a la API'
});

/**
 * @constant {RateLimit} apiLimiter
 * @description Limitador de tasa para rutas API (100 solicitudes cada 15 minutos)
 * @property {number} windowMs - Ventana de tiempo en milisegundos (15 minutos)
 * @property {number} limit - Máximo de solicitudes por ventana
 * @property {string} message - Mensaje de error cuando se excede el límite
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: 'Demasiados intentos de acceso.'
});

/**
 * @middleware SecurityHeaders
 * @description Configuración base de headers de seguridad para todos los entornos
 * - Elimina el header X-Powered-By
 * - Configura X-Content-Type-Options para prevenir MIME sniffing
 */
app.use((req, res, next) => {
    // Headers esenciales que no interfieren con desarrollo
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
});

/**
 * @middleware helmet
 * @description Configuración mejorada de Helmet con opciones específicas por entorno
 * @property {boolean} contentSecurityPolicy - Desactivado (manejado por frontend)
 * @property {object} hsts - HSTS solo en producción (2 años, incluye subdominios)
 * @property {object} frameguard - Previene embedding en iframes
 * @property {object} referrerPolicy - Política balanceada para referrers
 * @see {@link https://helmetjs.github.io/}
 */
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

/**
 * @middleware ProductionSecurityHeaders
 * @description Headers adicionales de seguridad solo para producción
 * - Permissions-Policy: Restringe geolocalización y micrófono
 * - CORP: Politica same-site para recursos cross-origin
 * - X-Permitted-Cross-Domain-Policies: none
 */
if (isProduction) {
    app.use((req, res, next) => {
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
        res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
        next();
    });
}

/**
 * @constant {object} corsOptions
 * @description Configuración CORS con opciones específicas por entorno
 * @property {Array} origin - URLs permitidas (diferentes en desarrollo/producción)
 * @property {boolean} credentials - Permite cookies en cross-origin
 * @property {Array} methods - Métodos HTTP permitidos
 * @property {Array} allowedHeaders - Headers permitidos
 * @property {Array} exposedHeaders - Headers expuestos al frontend
 * @property {number} maxAge - Tiempo de cache para preflight requests (24h)
 */
const corsOptions = {
    origin: isProduction ? [
        process.env.FRONTEND_URL,
        // otras URLs de producción
    ] : [
        'http://localhost:5173',
        'http://localhost:3000'
    ],
    credentials: true, // Permite cookies en cross-origin
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Length', 'X-Request-ID'],
    maxAge: 86400 // Preflight cache por 24 horas
};

/**
 * @constant {nodemailer.Transporter} transporter
 * @description Configuración del transporter de Nodemailer para envío de emails
 * @property {string} service - Servicio de email (ej: Gmail)
 * @property {object} auth - Credenciales de autenticación
 */
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

/**
 * @constant {EmailService} emailService
 * @description Instancia del servicio de email con transporter y logger configurados
 */
const emailService = new EmailService(transporter, logger);

/**
 * @constant {FileService} fileService
 * @description Instancia del servicio de archivos con logger configurado
 */
const fileService = new FileService(logger);

// Middlewares principales
app.use(requestIdMiddleware); // Generar ID único para cada solicitud
app.use(cors(corsOptions));   // Habilitar CORS con configuración personalizada
app.use(cookieParser());      // Parsear cookies en las solicitudes
app.use(express.json());      // Parsear cuerpos JSON en las solicitudes
app.use(express.urlencoded({ extended: true })); // Parsear formularios URL-encoded
app.use(httpLogger);          // Logger personalizado para solicitudes HTTP

/**
 * @function swaggerDocs
 * @description Configura la documentación Swagger UI (solo en desarrollo)
 * @see {@link ./config/swagger.js}
 */
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    swaggerDocs(app);
}

/**
 * @route /api/auth
 * @description Rutas de autenticación con limitador de tasa específico
 * @see {@link ./routes/auth.routes.js}
 */
app.use('/api/auth', authLimiter, authRoutes(emailService));

/**
 * @route /api/alumni
 * @description Rutas de egresados con limitador de tasa específico
 * @see {@link ./routes/alumni.routes.js}
 */
app.use('/api/alumni', apiLimiter , alumniRoutes(fileService));

/**
 * @route /api/events
 * @description Rutas de eventos con limitador de tasa específico
 * @see {@link ./routes/event.routes.js}
 */
app.use('/api/events', apiLimiter, eventRoutes(fileService));

/**
 * @route /api/forum
 * @description Rutas de foro con limitador de tasa específico
 * @see {@link ./routes/forum.routes.js}
 */
app.use('/api/forum', apiLimiter, forumRoutes(fileService));

app.use(notFoundHandler); // Maneja rutas no encontradas
app.use(globalErrorHandler); // Maneja errores

// Exportar la aplicación
export default app;