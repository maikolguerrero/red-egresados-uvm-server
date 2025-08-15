import { randomUUID } from 'crypto';
import logger from '../config/logger.js';

/**
 * @fileoverview Middleware para generación y manejo de Request IDs
 * @module middlewares/requestId
 * @requires crypto - Para generación de UUIDs
 * @requires ../config/logger - Logger personalizado
 * 
 * @description  
 * Middleware que:
 * - Genera un ID único para cada solicitud (UUID v4)  
 * - Inyecta el ID en el objeto `req` y headers HTTP  
 * - Crea un logger hijo con contexto de la solicitud  
 * - Permite tracing de logs a través del sistema
 */

/**
 * Middleware que genera y gestiona Request IDs
 * @function requestIdMiddleware
 * @param {Object} req - Objeto de petición Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función next de Express
 * 
 * @property {string} req.requestId - UUID generado (añadido al request)
 * @property {Object} req.logger - Logger hijo con contexto (añadido al request)
 * @property {string} res.header['X-Request-ID'] - UUID en headers de respuesta
 * 
 * @example
 * // Uso típico (debe ser el primer middleware):
 * app.use(requestIdMiddleware);
 * 
 * @example
 * // Acceso posterior al requestId:
 * router.get('/', (req, res) => {
 *   console.log(`Request ID: ${req.requestId}`);
 * });
 */
export const requestIdMiddleware = (req, res, next) => {
    const requestId = randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Crear child logger con requestId y datos básicos de la request
    req.logger = logger.child({
        requestId,
        httpMethod: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });

    next();
};