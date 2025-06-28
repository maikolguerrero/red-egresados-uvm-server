/**
 * @fileoverview Configuración principal de la aplicación Express
 * @module app
 * @requires express
 * @requires http
 * @requires socket.io
 * @requires cors
 * @requires cookie-parser
 * @requires compression
 * @requires helmet
 * @requires express-rate-limit
 * @requires nodemailer
 * @requires ./services/email.service
 * @requires ./services/file.service
 * @requires ./services/notification.service
 * @requires ./services/chat.service
 * @requires ./middlewares/errorHandler
 * @requires ./middlewares/requestId
 * @requires ./routes/auth.routes
 * @requires ./routes/alumni.routes
 * @requires ./routes/event.routes
 * @requires ./routes/forum.routes
 * @requires ./routes/notification.routes
 * @requires ./routes/project.routes
 * @requires ./routes/notification.routes
 * @requires ./routes/chat.routes
 * @requires ./routes/landingContent.routes
 * @requires ./routes/landingHome.routes
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
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import EmailService from './services/email.service.js';
import FileService from './services/file.service.js';
import NotificationService from './services/notification.service.js';
import ChatService from './services/chat.service.js';
import { notFoundHandler, globalErrorHandler } from './middlewares/errorHandler.js';
import { requestIdMiddleware } from './middlewares/requestId.js';
import authRoutes from './routes/auth.routes.js';
import alumniRoutes from './routes/alumni.routes.js';
import eventRoutes from './routes/event.routes.js';
import forumRoutes from './routes/forum.routes.js';
import projectRoutes from './routes/project.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import chatRoutes from './routes/chat.routes.js';
import landingContentRoutes from './routes/landingContent.routes.js';
import homeContentRoutes from './routes/landingHome.routes.js';
import logger from './config/logger.js';
import httpLogger from './utils/httpLogger.js';
import swaggerDocs from './config/swagger.js';

/**
 * @constant {boolean} isProduction
 * @description Indica si la aplicación se ejecuta en entorno de producción
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * @constant {express.Application} app
 * @description Instancia principal de la aplicación Express
 */
const app = express();

/**
 * @constant {http.Server} httpServer
 * @description Servidor HTTP creado a partir de la app Express
 */
const httpServer = createServer(app);

/**
 * @constant {socket.io.Server} io
 * @description Instancia de Socket.io configurada
 */
const io = new Server(httpServer, {
    cors: {
        origin: isProduction ? [process.env.FRONTEND_URL] : ['http://localhost:5173', 'http://localhost:3000', 'http://192.168.0.105:5173'],
        // origin: isProduction ? [process.env.FRONTEND_URL] : 'http://localhost:5173',/192.168.0.105:5173/
        methods: ['GET', 'POST'],
        credentials: true
    }
});

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
    limit: 1000,
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
    limit: 500,
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
        'http://localhost:3000',
        'http://192.168.0.105:5173'
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

/**
 * @constant {NotificationService} notificationService
 * @description Instancia del servicio de notificaciones con logger configurado
 */
const notificationService = new NotificationService(io, logger);

/**
 * @constant {ChatService} chatService
 * @description Instancia del servicio de chat con logger configurado
 */
const chatService = new ChatService(io, logger, notificationService);

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
app.use('/api/alumni', apiLimiter, alumniRoutes(fileService));

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
app.use('/api/forum', apiLimiter, forumRoutes(fileService, notificationService));

/**
 * @route /api/projects
 * @description Rutas de proyectos con limitador de tasa específico
 * @see {@link ./routes/project.routes.js}
 */
app.use('/api/projects', apiLimiter, projectRoutes(fileService, notificationService));

/**
 * @route /api/notifications
 * @description Rutas de notificaciones con limitador de tasa específico
 * @see {@link ./routes/notification.routes.js}
 */
app.use('/api/notifications', apiLimiter, notificationRoutes(notificationService));

/**
 * @route /api/chat
 * @description Rutas de chat con limitador de tasa específico
 * @see {@link ./routes/chat.routes.js}
 */
app.use('/api/chat', apiLimiter, chatRoutes(chatService));

/**
 * @route /api/content/landing
 * @description Rutas de contenido de la landing page con limitador de tasa específico
 * @see {@link ./routes/content.routes.js}
 */
app.use('/api/content/landing', apiLimiter, landingContentRoutes(fileService, logger));

/**
 * @route /api/content/home
 * @description Rutas de contenido de la home page con limitador de tasa específico
 * @see {@link ./routes/content.routes.js}
 */
app.use('/api/content/home', apiLimiter, homeContentRoutes(fileService, logger));

// Ruta para recibir desconexiones via sendBeacon
app.post('/api/socket/disconnect', (req, res) => {
    try {
        const data = req.body;
        logger.info('Desconexión por cierre de pestaña', {
            userId: data.userId,
            type: data.type,
            timestamp: new Date().toISOString()
        });
        res.status(200).json({ success: true });
    } catch (error) {
        logger.error('Error en endpoint de desconexión', {
            error: error.message
        });
        res.status(500).json({ success: false });
    }
});

app.use(notFoundHandler); // Maneja rutas no encontradas
app.use(globalErrorHandler); // Maneja errores

// Exportar los componentes principales
export { app, io, httpServer, notificationService, chatService };