import logger from '../config/logger.js';

/**
 * @fileoverview Middlewares para manejo centralizado de errores
 * @module middlewares/errorHandler
 * @requires ../config/logger - Logger personalizado
 * 
 * @description  
 * Sistema de manejo de errores con:
 * - Detección automática de tipos de error (validación, seguridad, etc.)  
 * - Logging contextualizado por categorías  
 * - Respuestas adaptativas por entorno (dev/prod)  
 * - Soporte para request tracing (requestId)  
 * - Protección de información sensible en producción
 */

/**
 * Middleware para rutas no encontradas (404)
 * @function notFoundHandler
 * @param {Object} req - Objeto de petición Express
 * @param {string} req.originalUrl - URL solicitada
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función next de Express
 * 
 * @example
 * // Uso al final de las rutas:
 * app.use(notFoundHandler);
 */
export const notFoundHandler = (req, res, next) => {
    const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
    error.status = 404;
    error.errorCode = 'NOT_FOUND';
    next(error);
};

/**
 * Middleware global para manejo de errores
 * @function globalErrorHandler
 * @param {Error|AppError} err - Error capturado
 * @param {Object} req - Objeto de petición Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función next de Express
 * 
 * @description  
 * Clasifica errores en categorías:
 * 1. **Errores de servidor (500+)** - Log nivel error  
 * 2. **Errores de seguridad (401/403)** - Log nivel warn  
 * 3. **Errores de validación** - Log detallado  
 * 4. **Otros errores de cliente (400-499)** - Log básico  
 * 
 * @returns {Object} Respuesta JSON estructurada:
 * - success: false  
 * - message: Descripción segura por entorno  
 * - [errorCode]: Código identificativo (dev)  
 * - [metadata]: Datos adicionales (dev)  
 * 
 * @example
 * // Uso después de todas las rutas:
 * app.use(globalErrorHandler);
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
            errorCount: err.errors?.length || 0,
            errors: err.errors
        });
    } else if (isClientError) {
        // Otros errores del cliente
        currentLogger.warn(err.message, logMetadata);
    }

    // Construcción de la respuesta al cliente
    const response = {
        success: false,
        // requestId: req.requestId
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
    } else {

        if (isValidationError && err.errors) response.errors = err.errors;

        let errorMessage = err.message;

        // Comprobar si es un error de validación con una estructura conocida
        if (err.errors) {
            // Puedes iterar sobre todos los errores
            const firstErrorKey = Object.keys(err.errors)[0];
            if (firstErrorKey) {
                // Accede al mensaje del primer error encontrado
                errorMessage = err.errors[firstErrorKey].message;
                response.errors = err.errors;
            }
        }

        // Si la estructura anterior no se encuentra, buscar en metadatos como fallback
        if (err?.metadata?.errors?.[0]?.message) {
            errorMessage = err.metadata.errors[0].message;
        }

        response.message = errorMessage;
    }

    // Manejar errores de tamaño de archivo
    if (err.code === "LIMIT_FILE_SIZE") {
        response.message = 'El archivo es demasiado grande, por favor sube un archivo menor a 10MB';
    }

    res.status(statusCode).json(response);
};