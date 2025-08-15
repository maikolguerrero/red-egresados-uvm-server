import morgan from 'morgan';
import logger from '../config/logger.js';

/**
 * @fileoverview Logger HTTP personalizado para Express
 * @module utils/httpLogger
 * @requires morgan - Middleware de logging HTTP
 * @requires ../config/logger - Logger personalizado (Winston)
 * 
 * @description  
 * Configuración avanzada de logging HTTP que:
 * - Usa formatos diferentes para dev/prod  
 * - Filtra rutas de healthcheck  
 * - Integra Morgan con Winston  
 * - Proporciona metadata estructurada
 */

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Determina el formato del log basado en el entorno
 * @function format
 * @private
 * @returns {string} Formato de log para Morgan
 * 
 * @example
 * // En producción:
 * 'IP - usuario [fecha] "METODO URL HTTP/VER" status bytes "referrer" "user-agent"'
 * 
 * @example
 * // En desarrollo:
 * 'METODO URL status tiempo(ms) - bytes'
 */
const format = () => {
    return isProduction
        ? ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
        : ':method :url :status :response-time ms - :res[content-length]';
};

/**
 * Stream personalizado que redirige logs a Winston
 * @type {Object}
 * @property {Function} write - Procesa mensajes de Morgan
 * 
 * @example
 * logger.http('GET /api/users 200 12.5 ms - 423');
 */
const stream = {
    write: (message) => logger.http(message.trim())
};

/**
 * Determina el formato del log basado en el entorno
 * @function format
 * @private
 * @returns {string} Formato de log para Morgan
 * 
 * @example
 * // En producción:
 * 'IP - usuario [fecha] "METODO URL HTTP/VER" status bytes "referrer" "user-agent"'
 * 
 * @example
 * // En desarrollo:
 * 'METODO URL status tiempo(ms) - bytes'
 */
const skip = (req, res) => {
    return req.path === '/healthcheck';
};

/**
 * Middleware de logging HTTP configurado
 * @type {Function}
 * 
 * @description  
 * Combina:
 * - Formato condicional por entorno  
 * - Stream personalizado a Winston  
 * - Filtro de rutas  
 * 
 * @example
 * // Uso en Express:
 * app.use(httpLogger);
 */
const httpLogger = morgan(format(), { stream, skip });

export default httpLogger;