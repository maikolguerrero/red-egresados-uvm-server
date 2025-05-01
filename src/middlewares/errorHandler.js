import logger from '../config/logger.js';

/**
 * Middleware para manejar rutas no encontradas (404)
 */
export const notFoundHandler = (req, res, next) => {
    const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
    error.status = 404;
    error.errorCode = 'NOT_FOUND';
    next(error);
};

/**
 * Middleware principal para manejo de errores
 */
export const globalErrorHandler = (err, req, res, next) => {
    const statusCode = err.status || err.statusCode || 500;
    const isProduction = process.env.NODE_ENV === 'production';
    const currentLogger = req.logger || logger;

    // Clasificación de tipos de error
    const isSecurityError = [401, 403].includes(statusCode) || err.context === 'security';
    const isValidationError = err.errorCode === 'VALIDATION_ERROR';
    const isClientError = statusCode >= 400 && statusCode < 500;

    // Configuración de metadata para logs
    const logMetadata = {
        code: err.errorCode || err.code,
        requestId: req.requestId,
        path: req.path,
        method: req.method,
        ...(isSecurityError && {
            ip: req.ip,
            userAgent: req.headers['user-agent']
        }),
        ...(err.metadata || {})
    };

    // Stack trace solo en desarrollo
    if (!isProduction && err.stack) {
        logMetadata.stack = err.stack;
    }

    // Sistema de logging mejorado
    if (statusCode >= 500) {
        // Errores del servidor (500+)
        currentLogger.error(err.message, {
            ...logMetadata,
            context: 'server_error',
            userId: req.user?._id
        });
    } else if (isSecurityError) {
        // Errores de seguridad
        currentLogger.warn(err.message, {
            ...logMetadata,
            context: 'security',
            userId: req.user?._id
        });
    } else if (isValidationError) {
        // Errores de validación
        currentLogger.warn('Error de validación', {
            ...logMetadata,
            context: 'validation',
            errorCount: err.errors?.length || 0
        });
    } else if (isClientError) {
        // Otros errores del cliente
        currentLogger.warn(err.message, logMetadata);
    }

    // Construcción de la respuesta al cliente
    const response = {
        success: false,
        requestId: req.requestId
    };

    // Mensaje seguro para producción
    if (isProduction && statusCode >= 500) {
        response.message = 'Ocurrió un error en el servidor';
    } else {
        response.message = err.message;
    }

    // Información adicional según entorno
    if (!isProduction) {
        if (err.errorCode) response.errorCode = err.errorCode;
        if (err.metadata) response.metadata = err.metadata;
        if (isValidationError && err.errors) response.errors = err.errors;
    } else if (isValidationError) {
        // En producción, solo indicar que hubo errores de validación
        response.message = 'Error en los datos enviados';
    }

    // Respuesta especial para errores de autenticación en producción
    if (isProduction && isSecurityError) {
        response.message = 'Error de autenticación';
    }

    res.status(statusCode).json(response);
};