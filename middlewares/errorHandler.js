import logger from '../config/logger.js';

// Maneja rutas no encontradas
export const notFoundHandler = (req, res, next) => {
    const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
    error.status = 404;
    next(error); // Pasa el error al siguiente middleware
};

// Maneja errores no controlados
export const globalErrorHandler = (err, req, res, next) => {
    const statusCode = err.status || 500;
    const isProduction = process.env.NODE_ENV === 'production';

    // Usar logger de la request si está disponible, o el global
    const currentLogger = req.logger || logger;

    // Determinar si es un error de seguridad
    const isSecurityError = [401, 403].includes(statusCode) || err.context === 'security';

    // Preparar metadata base para logs
    const logMetadata = {
        code: err.code,
        requestId: req.requestId,  // Añadir requestId a todos los logs
        path: req.path,
        method: req.method,
        ip: isSecurityError ? req.ip : undefined,  // IP solo para errores relevantes
        userAgent: isSecurityError ? req.headers['user-agent'] : undefined,
        ...err.metadata  // Metadata adicional del error
    };

    // No mostrar stack en producción
    if (!isProduction && err.stack) {
        logMetadata.stack = err.stack;
    }

    // Loggear según tipo de error
    if (statusCode >= 500) {
        // Errores del servidor (500+)
        currentLogger.error(err.message, {
            ...logMetadata,
            context: 'server',
            // Incluir información adicional para errores graves
            ...(err.details && { details: err.details })
        });
    } else if (isSecurityError) {
        // Errores de seguridad (401, 403 o con contexto 'security')
        currentLogger.warn(err.message, {
            ...logMetadata,
            context: 'security',
            userId: req.user?._id  // Incluir ID de usuario si está disponible
        });
    } else if (statusCode >= 400) {
        // Otros errores del cliente (400-499)
        currentLogger.warn(err.message, logMetadata);
    }

    // Respuesta al cliente
    res.status(statusCode).json({
        success: false,
        error: {
            message: err.message,
            ...(!isProduction && { stack: err.stack }),
            ...(err.code && { code: err.code }),
            requestId: req.requestId  // Incluir en respuesta
        }
    });
};