import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from './AppError.js';

/**
 * @fileoverview Middlewares de autenticación y autorización JWT
 * @module middlewares/auth.middleware
 * @requires jsonwebtoken - Para verificación de tokens
 * @requires ../models/User - Modelo de usuario
 * @requires ./AppError - Clase de errores personalizados
 * 
 * @description  
 * Middlewares para:
 * - Autenticación con JWT (cookie o header)  
 * - Control de acceso basado en roles  
 * - Protección de rutas con manejo de errores detallado
 */

/**
 * Middleware de autenticación JWT
 * @function authenticate
 * @async
 * @param {Object} req - Objeto de petición Express
 * @param {Object} req.cookies - Cookies HTTP-Only
 * @param {string} [req.cookies.accessToken] - Token JWT en cookie
 * @param {Object} req.headers - Headers HTTP
 * @param {string} [req.headers.authorization] - Header Authorization (Bearer)
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función next de Express
 * 
 * @throws {AppError} 
 * - 401 Si no hay token (MISSING_AUTH_TOKEN)
 * - 401 Si token es inválido/vencido (INVALID_TOKEN/TOKEN_EXPIRED)
 * - 401 Si usuario no existe (USER_NOT_FOUND)
 * - 403 Si cuenta está inactiva (ACCOUNT_DISABLED)
 * 
 * @example
 * // Uso en rutas:
 * router.get('/ruta-protegida', authenticate, (req, res) => {...});
 */
export const authenticate = async (req, res, next) => {
    try {
        let accessToken;

        // 1. Intentar obtener el token de las cookies (para HTTP-Only)
        if (req.cookies && req.cookies.accessToken) {
            accessToken = req.cookies.accessToken;
            req.logger.debug('Token obtenido de cookies', { context: 'auth' });
        }
        // 2. Opcional: mantener soporte para header Authorization (para compatibilidad)
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            accessToken = req.headers.authorization.split(' ')[1];
            req.logger.debug('Token obtenido de headers', { context: 'auth' });
        }

        if (!accessToken) {
            throw new AppError(
                'No autorizado',
                401,
                'MISSING_AUTH_TOKEN',
                {
                    context: 'security',
                    action: 'authentication',
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                }
            );
        }

        // Verificar token
        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

        req.logger.debug('Token verificado', {
            context: 'auth',
            userId: decoded.id
        });

        // Obtener usuario
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            throw new AppError(
                'No autorizado - Usuario no encontrado',
                401,
                'USER_NOT_FOUND',
                {
                    context: 'security',
                    action: 'authentication',
                    decodedToken: decoded,
                    ip: req.ip
                }
            );
        }

        if (!user.isActive) {
            throw new AppError(
                'Cuenta desactivada',
                403,
                'ACCOUNT_DISABLED',
                {
                    context: 'security',
                    action: 'authentication',
                    userId: user._id,
                    ip: req.ip
                }
            );
        }

        req.user = user;
        req.logger.debug('Autenticación exitosa', {
            context: 'auth',
            userId: user._id,
            role: user.role
        });
        next();

    } catch (error) {
        // Manejo específico para errores de JWT
        if (error instanceof jwt.JsonWebTokenError) {
            if (error.name === 'TokenExpiredError') {
                error = new AppError(
                    'Token expirado',
                    401,
                    'TOKEN_EXPIRED',
                    {
                        context: 'security',
                        action: 'authentication',
                        expiredAt: error.expiredAt
                    }
                );
            } else {
                error = new AppError(
                    'Token inválido',
                    401,
                    'INVALID_TOKEN',
                    {
                        context: 'security',
                        action: 'authentication',
                        errorType: error.name
                    }
                );
            }
        }
        next(error);
    }
};

/**
 * @fileoverview Middlewares de autenticación y autorización JWT
 * @module middlewares/auth.middleware
 * @requires jsonwebtoken - Para verificación de tokens
 * @requires ../models/User - Modelo de usuario
 * @requires ./AppError - Clase de errores personalizados
 * 
 * @description  
 * Middlewares para:
 * - Autenticación con JWT (cookie o header)  
 * - Control de acceso basado en roles  
 * - Protección de rutas con manejo de errores detallado
 */

/**
 * Middleware de autenticación JWT
 * @function authenticate
 * @async
 * @param {Object} req - Objeto de petición Express
 * @param {Object} req.cookies - Cookies HTTP-Only
 * @param {string} [req.cookies.accessToken] - Token JWT en cookie
 * @param {Object} req.headers - Headers HTTP
 * @param {string} [req.headers.authorization] - Header Authorization (Bearer)
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función next de Express
 * 
 * @throws {AppError} 
 * - 401 Si no hay token (MISSING_AUTH_TOKEN)
 * - 401 Si token es inválido/vencido (INVALID_TOKEN/TOKEN_EXPIRED)
 * - 401 Si usuario no existe (USER_NOT_FOUND)
 * - 403 Si cuenta está inactiva (ACCOUNT_DISABLED)
 * 
 * @example
 * // Uso en rutas:
 * router.get('/ruta-protegida', authenticate, (req, res) => {...});
 */
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            throw new AppError(
                `No tienes acceso a este recurso`,
                403,
                'UNAUTHORIZED_ROLE',
                {
                    context: 'authorization',
                    action: 'access_control',
                    requiredRoles: roles,
                    userRole: req.user.role,
                    userId: req.user._id,
                    path: req.path,
                    ip: req.ip
                }
            );
        }
        next();
    };
};