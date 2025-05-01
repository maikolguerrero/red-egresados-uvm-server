import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from './error/index.js';

// Middleware para autenticación
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
                'No autorizado - Token no proporcionado',
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

// Middleware para autorización
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