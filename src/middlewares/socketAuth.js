import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from './AppError.js';
import logger from '../config/logger.js';
import cookie from 'cookie';

/**
 * @middleware socketAuthenticate
 * @description Middleware de autenticación JWT para Socket.io
 * @param {Object} socket - Objeto socket de Socket.io
 * @param {Function} next - Función para continuar
 */
export const socketAuthenticate = async (socket, next) => {
    try {
        // 1. Intentar obtener token de cookies
        const cookies = cookie.parse(socket.handshake.headers.cookie || '');
        const tokenFromCookies = cookies.accessToken;

        // 2. O también de auth
        const tokenFromAuth = socket.handshake.auth?.token || socket.handshake.query?.token;

        const token = tokenFromCookies || tokenFromAuth;

        if (!token) {
            throw new AppError(
                'Sesión expirada',
                401,
                'MISSING_AUTH_TOKEN',
                {
                    context: 'socket-auth',
                    socketId: socket.id,
                    ip: socket.handshake.address
                }
            );
        }

        // 2. Verificar token (usando el mismo secreto que en REST)
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        logger.debug('Token de socket verificado', {
            context: 'socket-auth',
            userId: decoded.id,
            socketId: socket.id
        });

        // 3. Obtener usuario (con la misma lógica que en REST)
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            throw new AppError(
                'Usuario no encontrado',
                401,
                'USER_NOT_FOUND',
                {
                    context: 'socket-auth',
                    socketId: socket.id,
                    decodedToken: decoded
                }
            );
        }

        if (!user.isActive) {
            throw new AppError(
                'Cuenta desactivada',
                403,
                'ACCOUNT_DISABLED',
                {
                    context: 'socket-auth',
                    userId: user._id,
                    socketId: socket.id
                }
            );
        }

        // 4. Adjuntar usuario al socket para uso posterior
        socket.user = user;
        socket.userId = user._id;

        logger.info('Conexión de socket autenticada', {
            context: 'socket-auth',
            userId: user._id,
            username: user.username,
            socketId: socket.id
        });

        next();
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            logger.error('Error en autenticación de socket:', {
                context: 'socket-auth',
                error: error.message,
                socketId: socket.id,
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            });
        }

        // Manejo específico de errores JWT
        if (error instanceof jwt.JsonWebTokenError) {
            if (error.name === 'TokenExpiredError') {
                error = new AppError(
                    'Sesión expirada',
                    401,
                    'TOKEN_EXPIRED',
                    { context: 'socket-auth' }
                );
            } else {
                error = new AppError(
                    'Sesión expirada',
                    401,
                    'INVALID_TOKEN',
                    { context: 'socket-auth' }
                );
            }
        }

        next(error);
    }
};

/**
 * @middleware socketAuthorize
 * @description Middleware de autorización por roles para Socket.io
 * @param {Array} roles - Roles permitidos
 */
export const socketAuthorize = (...roles) => {
    return (socket, next) => {
        try {
            if (!roles.includes(socket.user.role)) {
                throw new AppError(
                    'No autorizado - Rol insuficiente',
                    403,
                    'UNAUTHORIZED_ROLE',
                    {
                        context: 'socket-auth',
                        requiredRoles: roles,
                        userRole: socket.user.role,
                        userId: socket.user._id,
                        socketId: socket.id
                    }
                );
            }
            next();
        } catch (error) {
            next(error);
        }
    };
};