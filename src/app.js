import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import EmailService from './services/email.service.js';
import { notFoundHandler, globalErrorHandler } from './middlewares/errorHandler.js';
import { requestIdMiddleware } from './middlewares/requestId.js';
import alumniRoutes from './routes/alumni.routes.js';
import authRoutes from './routes/auth.routes.js';
import logger from './config/logger.js';
import httpLogger from './utils/httpLogger.js';

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

// Configuración CORS
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

// Exportar la aplicación
export default app;