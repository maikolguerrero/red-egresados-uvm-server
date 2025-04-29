import { randomUUID } from 'crypto';
import logger from '../config/logger.js';

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