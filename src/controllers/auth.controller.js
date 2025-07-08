/**
 * @fileoverview Controlador para operaciones de autenticación (login, registro, tokens)
 * @module controllers/auth.controller
 * @requires bcrypt
 * @requires jsonwebtoken
 * @requires ../models/EgresadoPregrado
 * @requires ../models/EgresadoPostgrado
 * @requires ../models/User
 * @requires ../models/UserProfile
 * @requires ../models/RefreshToken
 * @requires ../models/TokenBlacklist
 * @requires AppError
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import EgresadoPregrado from '../models/EgresadoPregrado.js';
import EgresadoPostgrado from '../models/EgresadoPostgrado.js';
import User from '../models/User.js';
import UserProfile from '../models/UserProfile.js';
import RefreshToken from '../models/RefreshToken.js';
import TokenBlacklist from '../models/TokenBlacklist.js';
import AppError from '../middlewares/AppError.js';
import dotenv from 'dotenv';
import { date } from 'yup';

// Cargar variables de entorno
dotenv.config();

/**
 * @classdesc Controlador para operaciones relacionadas con autenticación
 * @class AuthController
 * 
 * @description
 * Maneja todas las operaciones relacionadas con:
 * - Registro
 * - Login
 * - Generación de tokens
 * 
 * @example
 * // Uso típico en rutas:
 * const authController = new AuthController();
 * router.post('/register', authController.registerAlumni);
 */
export default class AuthController {

    /**
     * @description Crea una instancia del controlador de autenticación
     * @param {EmailService} emailService - Servicio de envío de emails
     * @example
     * const emailService = new EmailService();
     * const authController = new AuthController(emailService);
     */
    constructor(emailService) {
        this.emailService = emailService;
    }

    /**
     * @private
     * @method _generateToken
     * @description Genera un par de tokens JWT (access y refresh)
     * @param {string} userId - ID del usuario
     * @param {string} role - Rol del usuario
     * @returns {Object} Objeto con accessToken y refreshToken
     * @throws {Error} Si faltan userId o role
     */
    _generateToken(userId, role) {
        if (!userId || !role) {
            throw new AppError(
                'Faltan campos obligatorios para generar el token',
                404,
                'TOKEN_GENERATION_ERROR',
                {
                    action: 'token_generation',
                    userId,
                    role,
                    context: 'security'
                }
            );
        }

        const accessToken = jwt.sign(
            { id: userId, role },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m' } // Access token expira en 15 minutos
        );

        const refreshToken = jwt.sign(
            { id: userId },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d' } // Refresh token expira en 7 días
        );

        return { accessToken, refreshToken };
    }

    /**
     * @method
     * @async
     * @description Registra un nuevo egresado validando contra datos precargados
     * @param {Object} req - Objeto de petición Express
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON
     * @throws {AppError} Con errores específicos:
     *  - 404 si no se encuentra el egresado en registros precargados
     *  - 409 si el egresado ya está registrado o el username existe
     *  - 500 si falla el envío del email de verificación
     */
    registerAlumni = async (req, res, next) => {
        try {
            req.logger.debug('Inicio registro egresado', {
                studentId: req.body.studentId,
                ip: req.ip
            });
            const { cedula, nombreCompleto, username, email, password } = req.body;

            // Verificar en pregrado y postgrado
            const [pregrado, postgrado] = await Promise.all([
                EgresadoPregrado.findOne({
                    cedula,
                    nombreCompleto: { $regex: new RegExp(`^${nombreCompleto}$`, 'i') }
                }),
                EgresadoPostgrado.findOne({
                    cedula,
                    nombreCompleto: { $regex: new RegExp(`^${nombreCompleto}$`, 'i') }
                })
            ]);

            if (!pregrado && !postgrado) {
                throw new AppError('No se encontró coincidencia con nuestros registros', 404);
            }

            // Validar unicidad del cédula
            const existingUserCedula = await User.findOne({ cedula });
            if (existingUserCedula) {
                throw new AppError(
                    'El usuario ya está registrado',
                    409,
                    'CEDULA_TAKEN',
                    {
                        action: 'register_cedula_conflict',
                        cedula,
                        ip: req.ip,
                        context: 'validation'
                    }
                );
            }

            // Validar unicidad del username
            const existingUserUsername = await User.findOne({ username });
            if (existingUserUsername) {
                throw new AppError(
                    'El nombre de usuario ya está registrado',
                    409,
                    'USERNAME_TAKEN',
                    {
                        action: 'register_username_conflict',
                        username,
                        ip: req.ip,
                        context: 'validation'
                    }
                );
            }

            // Crear hash de la contraseña
            const hashedPassword = await bcrypt.hash(password, 10);

            // Generar token de verificación
            const verificationToken = this.emailService.generateVerificationToken();
            const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

            // Crear usuario (sin activar)
            const user = await User.create({
                cedula,
                username,
                email,
                password: hashedPassword,
                role: 'egresado',
                isVerified: false,
                isActive: false,
                verificationToken,
                verificationTokenExpires,
                // Asignar las relaciones
                ...(pregrado && { pregrado: [pregrado._id] }),
                ...(postgrado && { postgrado: [postgrado._id] })
            });

            // Actualizar los registros de egresados con el usuario
            if (pregrado) {
                pregrado.user = user._id;
                await pregrado.save();
            }

            if (postgrado) {
                postgrado.user = user._id;
                await postgrado.save();
            }

            // Crear perfil del usuario
            const newProfile = await UserProfile.create({
                user: user._id
            });

            // Actualizar el usuario con la referencia al perfil
            await User.findByIdAndUpdate(user._id, { profile: newProfile._id });

            // Éxito (logger solo para confirmación)
            req.logger.info('Egresado registrado', {
                userId: user._id
            });

            // Enviar email de verificación
            const emailResult = await this.emailService.sendVerificationEmail(email, verificationToken);
            if (!emailResult.success) {
                throw new AppError(
                    'El registro fue exitoso, pero falló el envío del correo. Contacta al administrador.',
                    500,
                    'EMAIL_SEND_FAILURE',
                    {
                        action: 'email_verification',
                        userId: user._id,
                        email,
                        error: emailResult.error, // Detalles técnicos (solo para logs)
                        isCritical: true // Para alertas en producción
                    }
                );
            }

            res.status(201).json({
                success: true,
                message: 'Registro exitoso. Por favor verifica tu email para activar tu cuenta.',
                data: {
                    user: {
                        id: user._id,
                        username: user.username
                    }
                }
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * @method
     * @async
     * @description Reenvía el correo de verificación a usuarios no verificados
     * @param {Object} req - Objeto de petición Express
     * @param {string} req.body.email - Email a verificar
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON
     * @throws {AppError} Con errores específicos:
     *  - 404 si el usuario no existe
     *  - 400 si la cuenta ya está verificada
     *  - 429 si se excede el límite de intentos (3 cada 24 horas)
     */
    resendVerificationEmail = async (req, res, next) => {
        try {
            const { email } = req.body;

            req.logger.debug('Inicio reenvío verificación', { email, ip: req.ip });

            // Buscar usuario por email
            const user = await User.findOne({ email })
                .select('+verificationAttempts')
                .select('+lastVerificationAttempt');

            if (!user) {
                throw new AppError(
                    'Usuario no encontrado',
                    404,
                    'USER_NOT_FOUND',
                    {
                        action: 'resend_verification',
                        email,
                        context: 'security',
                        ip: req.ip
                    }
                );
            }

            // Verificar si ya está activo
            if (user.isVerified || user.isActive) {
                throw new AppError(
                    'La cuenta ya está verificada',
                    400,
                    'ALREADY_VERIFIED',
                    {
                        action: 'resend_verification',
                        userId: user._id,
                        context: 'validation'
                    }
                );
            }

            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            // Verificar intentos máximos (ej: 3 intentos en 24 horas)
            if (user.verificationAttempts >= 3 && user.lastVerificationAttempt > oneDayAgo) {
                throw new AppError(
                    'Límite de intentos excedido',
                    429,
                    'VERIFICATION_LIMIT_EXCEEDED',
                    {
                        action: 'resend_verification',
                        context: 'security',
                        userId: user._id,
                        attempts: user.verificationAttempts,
                        lastAttempt: user.lastVerificationAttempt,
                        ip: req.ip
                    }
                );
            }

            // Generar nuevo token y actualizar usuario
            const newToken = this.emailService.generateVerificationToken();
            user.verificationToken = newToken;
            user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
            user.verificationAttempts += 1;
            user.lastVerificationAttempt = new Date();
            await user.save();

            // Eviar correo
            const emailResult = await this.emailService.sendVerificationEmail(email, newToken);

            if (!emailResult.success) {
                throw new AppError(
                    'No se pudo reenviar el correo. Contacta al administrador.',
                    500,
                    'EMAIL_SEND_FAILURE',
                    {
                        action: 'resend_verification',
                        userId: user._id,
                        email,
                        error: emailResult.error, // Solo para logs
                        isCritical: true
                    }
                );
            }

            req.logger.info('Correo reenviado exitosamente', {
                action: 'resend_verification',
                userId: user._id,
                email,
                attempts: user.verificationAttempts
            });

            res.json({
                success: true,
                message: 'Correo de verificación reenviado. Revisa tu bandeja de entrada.'
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * @method
     * @async
     * @description Verifica una cuenta de usuario mediante token
     * @param {Object} req - Objeto de petición Express
     * @param {string} req.validatedQuery.token - Token de verificación
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON
     * @throws {AppError} Con errores específicos:
     *  - 400 si el token es inválido o expiró
     */
    verifyEmail = async (req, res, next) => {
        try {
            const { token } = req.validatedQuery;

            req.logger.debug('Inicio verificación de email', {
                tokenPresent: !!token,
                ip: req.ip
            });

            const user = await User.findOne({
                verificationToken: token,
                verificationTokenExpires: { $gt: new Date() }
            });

            if (!user) {
                throw new AppError(
                    'Token inválido o expirado',
                    400,
                    'INVALID_VERIFICATION_TOKEN',
                    {
                        action: 'email_verification',
                        context: 'security',
                        tokenPresent: !!token,
                        ip: req.ip
                    }
                );
            }
            user.isVerified = true;
            user.isActive = true;
            user.verificationDate = new Date();
            user.verificationToken = undefined;
            user.verificationTokenExpires = undefined;
            await user.save();

            req.logger.info('Email verificado exitosamente', {
                action: 'email_verification',
                userId: user._id,
                email: user.email,
                verificationDate: user.verificationDate
            });

            res.json({
                success: true,
                message: 'Email verificado correctamente',
                data: {
                    id: user._id,
                    username: user.username,
                    role: user.role
                }
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * @method
     * @async
     * @description Registra un nuevo administrador (requiere rol superadmin)
     * @param {Object} req - Objeto de petición Express
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON
     * @throws {AppError} Con errores específicos:
     *  - 403 si el solicitante no es administrador
     *  - 409 si el username o email ya existen
     */
    registerAdmin = async (req, res, next) => {
        try {
            const { fullName, username, email, password } = req.body;

            req.logger.debug('Inicio registro administrador', {
                action: 'admin_registration',
                requestedBy: req.user?._id,
                ip: req.ip
            });

            // Verificar unicidad
            const existingUser = await User.findOne({ $or: [{ username }, { email }] });
            if (existingUser) {
                throw new AppError(
                    'El nombre de usuario o email ya están registrados',
                    409,
                    'USER_ALREADY_EXISTS',
                    {
                        action: 'admin_registration',
                        conflictFields: {
                            username: existingUser.username === username,
                            email: existingUser.email === email
                        },
                        existingUserId: existingUser._id,
                        requestedBy: req.user?._id
                    }
                );
            }

            // Crear hash de la contraseña
            const hashedPassword = await bcrypt.hash(password, 10);

            // Crear usuario admin
            const user = await User.create({
                fullName,
                username,
                email,
                password: hashedPassword,
                role: 'admin',
                isVerified: true,
                isActive: true
            });

            req.logger.info('Administrador registrado exitosamente', {
                action: 'admin_registration',
                adminId: user._id,
                createdBy: req.user._id,
                email: user.email
            });

            res.status(201).json({
                success: true,
                data: {
                    id: user._id,
                    username: user.username,
                    role: user.role,
                    fullName: user.fullName
                }
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * @method
     * @async
     * @description Obtiene la lista de administradores con paginación
     * @param {Object} req - Objeto de petición Express
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON con resultados paginados
     */
    /**
     * @method
     * @async
     * @description Obtiene la lista de administradores con paginación
     * @param {Object} req - Objeto de petición Express
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON con resultados paginados
     */
    getAdmins = async (req, res, next) => {
        try {
            const { search, isActive, page = 1, limit = 10, sort = 'username', order = 'asc' } = req.query;
            const skip = (page - 1) * limit;
            const sortOrder = order === 'desc' ? -1 : 1;

            req.logger.debug('Inicio obtención de lista de administradores', {
                ip: req.ip,
                queryParams: req.query
            });

            // Construir filtro base
            const filter = {
                role: { $in: ['admin', 'superadmin'] }
            };

            // Aplicar filtro de búsqueda
            if (search) {
                const searchRegex = new RegExp(search, 'i');
                filter.$or = [
                    { fullName: { $regex: searchRegex } },
                    { username: { $regex: searchRegex } },
                    { email: { $regex: searchRegex } }
                ];
            }

            // Aplicar filtro de estado
            if (isActive !== undefined) {
                filter.isActive = isActive === 'true';
            }

            // Validar campo de ordenamiento
            const validSortFields = ['username', 'fullName', 'email', 'lastLogin', 'createdAt'];
            const sortField = validSortFields.includes(sort) ? sort : 'username';

            // Obtener total y resultados
            const [total, admins] = await Promise.all([
                User.countDocuments(filter),
                User.find(filter)
                    .select('-password -__v -verificationToken -resetPasswordToken')
                    .sort({ [sortField]: sortOrder })
                    .skip(skip)
                    .limit(parseInt(limit))
            ]);

            // Formatear respuesta
            res.json({
                success: true,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit),
                    limit: parseInt(limit)
                },
                data: admins.map(admin => ({
                    id: admin._id,
                    username: admin.username,
                    email: admin.email,
                    fullName: admin.fullName,
                    role: admin.role,
                    profilePicture: admin.profilePicture,
                    isActive: admin.isActive,
                    lastLogin: admin.lastLogin,
                    createdAt: admin.createdAt
                }))
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * @method
     * @async
     * @description Elimina un administrador por username (solo para superadmins)
     * @param {Object} req - Objeto de petición Express
     * @param {string} req.params.username - Username del administrador a eliminar
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON
     * @throws {AppError} Con errores específicos:
     *  - 400 si se intenta auto-eliminar o eliminar superadmin
     *  - 403 si no tiene permisos
     *  - 404 si el admin no existe
     */
    deleteAdmin = async (req, res, next) => {
        try {
            const { username } = req.params;
            const currentUser = req.user;

            req.logger.debug('Inicio de eliminación de administrador', {
                action: 'delete_admin',
                requestedBy: currentUser._id,
                targetUsername: username,
                ip: req.ip
            });

            // Verificar que no sea auto-eliminación
            if (username === currentUser.username) {
                throw new AppError(
                    'No puedes eliminarte a ti mismo',
                    400,
                    'SELF_DELETION_NOT_ALLOWED',
                    {
                        action: 'admin_deletion',
                        context: 'validation',
                        userId: currentUser._id,
                        username: currentUser.username,
                        ip: req.ip
                    }
                );
            }

            // Buscar el admin a eliminar por username (case insensitive)
            const adminToDelete = await User.findOne({
                username: { $regex: new RegExp(`^${username}$`, 'i') }
            });

            if (!adminToDelete) {
                throw new AppError(
                    'Administrador no encontrado',
                    404,
                    'ADMIN_NOT_FOUND',
                    {
                        action: 'admin_deletion',
                        context: 'validation',
                        username,
                        requestedBy: currentUser._id,
                        ip: req.ip
                    }
                );
            }

            // Verificar que no sea superadmin
            if (adminToDelete.role === 'superadmin') {
                throw new AppError(
                    'No puedes eliminar a un superadministrador',
                    400,
                    'SUPERADMIN_DELETION_NOT_ALLOWED',
                    {
                        action: 'admin_deletion',
                        context: 'security',
                        username,
                        role: adminToDelete.role,
                        requestedBy: currentUser._id,
                        ip: req.ip
                    }
                );
            }

            // Verificar que sea admin (no egresado)
            if (adminToDelete.role !== 'admin') {
                throw new AppError(
                    'Solo se pueden eliminar administradores',
                    400,
                    'INVALID_USER_ROLE',
                    {
                        action: 'admin_deletion',
                        context: 'validation',
                        username,
                        role: adminToDelete.role,
                        requestedBy: currentUser._id,
                        ip: req.ip
                    }
                );
            }

            // Eliminar el admin
            await User.findOneAndDelete({
                username: { $regex: new RegExp(`^${username}$`, 'i') }
            });

            req.logger.info('Administrador eliminado exitosamente', {
                action: 'admin_deletion_success',
                username,
                deletedBy: currentUser._id,
                ip: req.ip
            });

            res.json({
                success: true,
                message: 'Administrador eliminado correctamente'
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * @method
     * @async
     * @description Autentica un usuario y genera tokens JWT
     * @param {Object} req - Objeto de petición Express
     * @param {string} req.body.emailOrUsername - Email o nombre de usuario
     * @param {string} req.body.password - Contraseña
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía:
     *  - Cookies HTTP-only con tokens JWT
     *  - JSON con datos básicos del usuario
     * @throws {AppError} Con errores específicos:
     *  - 401 si las credenciales son inválidas
     *  - 403 si la cuenta no está verificada/inactiva
     *  - 500 si hay error al generar tokens
     */
    login = async (req, res, next) => {
        try {
            const { emailOrUsername, password } = req.body;

            req.logger.debug('Inicio de proceso de login', {
                action: 'login_attempt',
                credentialsPresent: !!emailOrUsername && !!password,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            // Buscar usuario por email O username
            const user = await User.findOne({
                $or: [
                    { email: emailOrUsername },
                    { username: emailOrUsername }
                ]
            }).select('+password'); // Incluir contraseña para comparar

            if (!user) {
                throw new AppError(
                    'Credenciales inválidas',
                    401,
                    'INVALID_CREDENTIALS',
                    {
                        action: 'login_failed',
                        context: 'security',
                        attempted: emailOrUsername,
                        reason: 'user_not_found',
                        ip: req.ip,
                        userAgent: req.headers['user-agent']
                    }
                );
            }

            // Verificar contraseña
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                throw new AppError(
                    'Credenciales inválidas',
                    401,
                    'INVALID_CREDENTIALS',
                    {
                        action: 'login_failed',
                        context: 'security',
                        userId: user._id,
                        reason: 'password_mismatch',
                        ip: req.ip,
                        userAgent: req.headers['user-agent']
                    }
                );
            }

            // Verificar estado de suspensión
            const { wasSuspended, isNowActive } = await user.checkSuspensionStatus();
            if (wasSuspended) {
                throw new AppError(
                    'Cuenta suspendida',
                    403,
                    'ACCOUNT_SUSPENDED',
                    {
                        action: 'login_blocked',
                        context: 'security',
                        userId: user._id,
                        status: {
                            wasSuspended: true,
                            isNowActive: false
                        },
                        ip: req.ip
                    }
                );
            }

            // Actualizar último acceso
            user.lastLogin = new Date();
            await user.save();

            // Verificar si la cuenta está activa y verificada
            if (!user.isVerified || !user.isActive) {
                throw new AppError(
                    'Cuenta no verificada o inactiva',
                    403,
                    'ACCOUNT_INACTIVE',
                    {
                        action: 'login_blocked',
                        context: 'security',
                        userId: user._id,
                        status: {
                            isVerified: user.isVerified,
                            isActive: user.isActive
                        },
                        ip: req.ip
                    }
                );
            }

            // Generar tokens
            const { accessToken, refreshToken } = this._generateToken(user._id, user.role);

            // Configurar expiración de cookies
            const REFRESH_TOKEN_COOKIE_EXPIRES_IN_MS = parseInt(process.env.REFRESH_TOKEN_COOKIE_EXPIRES_IN) || (7 * 24 * 60 * 60 * 1000);
            const ACCESS_TOKEN_COOKIE_EXPIRES_IN_MS = parseInt(process.env.ACCESS_TOKEN_COOKIE_EXPIRES_IN) || (15 * 60 * 1000);
            const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_COOKIE_EXPIRES_IN_MS);
            const accessExpiresAt = new Date(Date.now() + ACCESS_TOKEN_COOKIE_EXPIRES_IN_MS);

            // Guardar refresh token en la base de datos
            const refreshTokenDoc = await RefreshToken.create({
                token: refreshToken,
                user: user._id,
                expiresAt: refreshExpiresAt,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            if (!refreshTokenDoc) {
                throw new AppError(
                    'Error al generar token de refresco',
                    500,
                    'REFRESH_TOKEN_ERROR',
                    {
                        action: 'login_failed',
                        context: 'security',
                        userId: user._id,
                        reason: 'refresh_token_generation_failed',
                        ip: req.ip,
                        userAgent: req.headers['user-agent']
                    }
                );
            }

            req.logger.info('Login exitoso', {
                action: 'login_success',
                userId: user._id,
                role: user.role,
                authMethod: 'jwt',
                ip: req.ip
            });

            const isProduction = process.env.NODE_ENV === 'production';

            const cookieOptions = {
                httpOnly: true,
                secure: isProduction,
                sameSite: 'lax',
                domain: isProduction ? process.env.DOMAIN : undefined,
                path: '/'
            };

            // Configurar cookies
            res.cookie('refreshToken', refreshToken, {
                ...cookieOptions,
                maxAge: refreshExpiresAt
            });

            res.cookie('accessToken', accessToken, {
                ...cookieOptions,
                maxAge: accessExpiresAt
            });

            // Responder con éxito
            res.json({
                success: true,
                requestId: req.requestId,
                message: 'Inicio de sesión exitoso',
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * @method
     * @async
     * @description Renueva los tokens JWT usando un refresh token válido
     * @param {Object} req - Objeto de petición Express
     * @param {string} [req.cookies.refreshToken] - Token de refresco en cookie
     * @param {string} [req.body.refreshToken] - Token de refresco en body
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía:
     *  - Nuevas cookies HTTP-only con tokens actualizados
     * @throws {AppError} Con errores específicos:
     *  - 400 si no se proporciona refresh token
     *  - 401 si el token es inválido o expiró
     *  - 500 si hay error al renovar tokens
     */
    refreshToken = async (req, res, next) => {
        try {
            const refreshTokenCookie = req.cookies?.refreshToken || req.body?.refreshToken || null;

            if (!refreshTokenCookie) {
                // Limpiar cookies si no hay refresh token para evitar problemas
                const isProduction = process.env.NODE_ENV === 'production';
                const cookieOptions = {
                    httpOnly: true,
                    secure: isProduction,
                    sameSite: 'lax',
                    domain: isProduction ? process.env.DOMAIN : undefined,
                    path: '/'
                };
                res.clearCookie('accessToken', cookieOptions);
                res.clearCookie('refreshToken', cookieOptions);

                throw new AppError('Refresh token requerido', 401, 'REFRESH_TOKEN_REQUIRED', {
                    action: 'login_failed',
                    context: 'security',
                    reason: 'refresh_token_generation_failed',
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                });
            }

            // Verificar token en la base de datos
            const storedToken = await RefreshToken.findOne({
                token: refreshTokenCookie,
                isRevoked: false,
                expiresAt: { $gt: new Date() }
            }).populate('user');

            if (!storedToken) {
                // Limpiar cookies si el refresh token es inválido o expirado
                const isProduction = process.env.NODE_ENV === 'production';
                const cookieOptions = {
                    httpOnly: true,
                    secure: isProduction,
                    sameSite: 'lax',
                    domain: isProduction ? process.env.DOMAIN : undefined,
                    path: '/'
                };
                res.clearCookie('accessToken', cookieOptions);
                res.clearCookie('refreshToken', cookieOptions);

                throw new AppError('Refresh token inválido o expirado', 401, 'INVALID_REFRESH_TOKEN', {
                    action: 'login_failed',
                    context: 'security',
                    reason: 'refresh_token_generation_failed',
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                });
            }

            // Verificar firma del token
            jwt.verify(refreshTokenCookie, process.env.REFRESH_TOKEN_SECRET);

            // Generar nuevos tokens
            const { accessToken, refreshToken } = this._generateToken(storedToken?.user?._id, storedToken?.user?.role);

            // Revocar el refresh token anterior
            storedToken.isRevoked = true;
            await storedToken.save();

            // Configurar expiración de cookies
            const REFRESH_TOKEN_COOKIE_EXPIRES_IN_MS = parseInt(process.env.REFRESH_TOKEN_COOKIE_EXPIRES_IN) || (7 * 24 * 60 * 60 * 1000);
            const ACCESS_TOKEN_COOKIE_EXPIRES_IN_MS = parseInt(process.env.ACCESS_TOKEN_COOKIE_EXPIRES_IN) || (15 * 60 * 1000);
            const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_COOKIE_EXPIRES_IN_MS);
            const accessExpiresAt = new Date(Date.now() + ACCESS_TOKEN_COOKIE_EXPIRES_IN_MS);

            // Guardar el nuevo refresh token
            const refreshTokenDoc = await RefreshToken.create({
                token: refreshToken,
                user: storedToken?.user?._id,
                expiresAt: refreshExpiresAt,
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            if (!refreshTokenDoc) {
                throw new AppError(
                    'Error al generar token de refresco',
                    500,
                    'REFRESH_TOKEN_ERROR',
                    {
                        action: 'login_failed',
                        context: 'security',
                        reason: 'refresh_token_generation_failed',
                        ip: req.ip,
                        userAgent: req.headers['user-agent']
                    }
                );
            }

            if (!refreshTokenDoc) {
                throw new AppError(
                    'Error al generar token de refresco',
                    500,
                    'REFRESH_TOKEN_ERROR',
                    {
                        action: 'login_failed',
                        context: 'security',
                        reason: 'refresh_token_generation_failed',
                        ip: req.ip,
                        userAgent: req.headers['user-agent']
                    }
                );
            }

            const isProduction = process.env.NODE_ENV === 'production';

            const cookieOptions = {
                httpOnly: true,
                secure: isProduction,
                sameSite: 'lax',
                domain: isProduction ? process.env.DOMAIN : undefined,
                path: '/'
            };

            // Enviar nuevas cookies
            res.cookie('refreshToken', refreshToken, {
                ...cookieOptions,
                maxAge: refreshExpiresAt
            });

            res.cookie('accessToken', accessToken, {
                ...cookieOptions,
                maxAge: accessExpiresAt
            });

            res.json({
                success: true,
                message: 'Tokens renovados'
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * @method
     * @async
     * @description Invalida los tokens de sesión y limpia las cookies
     * @param {Object} req - Objeto de petición Express
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía:
     *  - Respuesta de éxito después de invalidar tokens
     * @throws {AppError} Si ocurre un error al invalidar los tokens
     */
    logout = async (req, res, next) => {
        try {
            const user = req.user;
            const accessToken = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
            const refreshToken = req.cookies.refreshToken;

            req.logger.debug('Inicio de cierre de sesión', {
                action: 'logout_init',
                userId: user?._id,
                ip: req.ip
            });

            // Revocar refresh token
            if (refreshToken) {
                try {
                    await RefreshToken.findOneAndUpdate(
                        { token: refreshToken },
                        { $set: { isRevoked: true } }
                    );
                } catch (error) {
                    req.logger.warn('Error al revocar token de refresco', {
                        action: 'logout_failed',
                        error: error.message
                    });
                }
            }

            // Invalidar token en blacklist (si existe)
            if (accessToken) {
                try {
                    const decoded = jwt.decode(accessToken);
                    if (decoded?.exp) {
                        await TokenBlacklist.create({
                            token: accessToken,
                            expiresAt: new Date(decoded.exp * 1000)
                        });
                    }
                } catch (error) {
                    req.logger.warn('Error al invalidar token', {
                        action: 'token_invalidation_failed',
                        error: error.message
                    });
                }
            }

            // Opciones IDÉNTICAS a las de creación de cookie
            const isProduction = process.env.NODE_ENV === 'production';
            const cookieOptions = {
                httpOnly: true,
                secure: isProduction,
                sameSite: 'lax',
                domain: isProduction ? process.env.DOMAIN : undefined,
                path: '/'
            };

            // Borrar cookies
            res.clearCookie('accessToken', cookieOptions);
            res.clearCookie('refreshToken', cookieOptions);

            req.logger.info('Cierre de sesión exitoso', {
                action: 'logout_success',
                userId: user?._id,
                ip: req.ip
            });

            res.status(200).json({
                success: true,
                message: 'Sesión cerrada correctamente',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * @method
     * @async
     * @description Maneja la solicitud de restablecimiento de contraseña
     * @param {Object} req - Objeto de petición Express
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, siempre envía éxito (por seguridad)
     * @throws {AppError} Con errores específicos:
     *  - 429 si se excede el límite de intentos (3 cada 24 horas)
     */
    checkSession = (req, res) => {
        res.json({
            success: true,
            requestId: req.requestId,
            message: 'Sesión válida',
            user: {
                id: req.user.id,
                username: req.user.username,
                role: req.user.role
            }
        });
    }

    /**
     * @method
     * @async
     * @description Maneja la solicitud de restablecimiento de contraseña
     * @param {Object} req - Objeto de petición Express
     * @param {string} req.body.emailOrUsername - Email o nombre de usuario
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, siempre envía éxito (por seguridad)
     * @throws {AppError} Con errores específicos:
     *  - 429 si se excede el límite de intentos (3 cada 24 horas)
     */
    forgotPassword = async (req, res, next) => {
        try {
            const { emailOrUsername } = req.body;

            const response = {
                success: true,
                message: 'Si el email del usuario existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña'
            };

            req.logger.debug('Solicitud de restablecimiento de contraseña', {
                action: 'password_reset_request',
                emailOrUsernamePresent: !!emailOrUsername,
                ip: req.ip
            });

            // Buscar usuario por email
            const user = await User.findOne({
                $or: [
                    { email: emailOrUsername },
                    { username: emailOrUsername }
                ]
            }).select('+resetPasswordAttempts').select('+lastResetPasswordAttempt');

            if (!user) {
                req.logger.info('Solicitud de restablecimiento para usuario no registrado', {
                    action: 'password_reset_unknown_user',
                    emailOrUsername,
                    ip: req.ip
                });
                return res.json(response);
            }

            if (!user.isVerified || !user.isActive) {
                req.logger.info('Solicitud de restablecimiento para usuario no verificado o inactivo', {
                    action: 'password_reset_unknown_user',
                    emailOrUsername,
                    ip: req.ip
                });
                return res.json(response);
            }

            // Verificar límite de intentos (máximo 3 en 24 horas)
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            if (user?.resetPasswordAttempts >= 3 && user?.lastResetPasswordAttempt > oneDayAgo) {
                throw new AppError(
                    'Límite de intentos excedido',
                    429,
                    'PASSWORD_RESET_LIMIT',
                    {
                        action: 'password_reset_limit',
                        context: 'security',
                        userId: user?._id,
                        attempts: user?.resetPasswordAttempts,
                        lastAttempt: user?.lastResetPasswordAttempt,
                        ip: req.ip
                    }
                );
            }

            // Generar token de restablecimiento
            const resetToken = this.emailService.generateVerificationToken();
            const resetTokenExpires = new Date(now.getTime() + 3600000); // 1 hora

            // Actualizar usuario
            user.resetPasswordToken = resetToken;
            user.resetPasswordExpires = resetTokenExpires;
            user.resetPasswordAttempts += 1;
            user.lastResetPasswordAttempt = now;
            await user.save();

            // Enviar email
            const emailResult = await this.emailService.sendPasswordResetEmail(user.email, resetToken);

            if (!emailResult.success) {
                req.logger.error('Error al enviar email de restablecimiento', {
                    action: 'password_reset_email_failed',
                    userId: user._id,
                    email: user.email,
                    error: emailResult.error,
                    ip: req.ip
                });
                // No se lanza error para no revelar información
            } else {
                req.logger.info('Email de restablecimiento enviado', {
                    action: 'password_reset_sent',
                    userId: user._id,
                    email: user.email,
                    attempts: user.resetPasswordAttempts,
                    ip: req.ip
                });
            }

            res.json(response);
        } catch (error) {
            next(error);
        }
    }

    /**
     * @method
     * @async
     * @description Restablece la contraseña usando un token válido
     * @param {Object} req - Objeto de petición Express
     * @param {string} req.body.token - Token de restablecimiento
     * @param {string} req.body.newPassword - Nueva contraseña
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON
     * @throws {AppError} Con errores específicos:
     *  - 400 si el token es inválido o expiró
     *  - 400 si la nueva contraseña no cumple los requisitos
     */
    resetPassword = async (req, res, next) => {
        try {
            const { token, newPassword } = req.body;

            req.logger.debug('Intento de restablecimiento de contraseña', {
                action: 'password_reset_process',
                tokenPresent: !!token,
                ip: req.ip
            });

            // Buscar usuario con token válido
            const user = await User.findOne({
                resetPasswordToken: token,
                resetPasswordExpires: { $gt: new Date() }
            });

            if (!user) {
                throw new AppError(
                    'Token inválido o expirado',
                    400,
                    'INVALID_RESET_TOKEN',
                    {
                        action: 'password_reset_attempt',
                        context: 'security',
                        tokenPresent: !!token,
                        ip: req.ip
                    }
                );
            }

            // Hashear nueva contraseña
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Actualizar contraseña y limpiar token
            user.password = hashedPassword;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            user.resetPasswordAttempts = 0; // Resetear contador de intentos
            await user.save();

            req.logger.info('Contraseña restablecida exitosamente', {
                action: 'password_reset_success',
                userId: user._id,
                ip: req.ip
            });

            // Enviar notificación por email
            const emailResult = await this.emailService.sendPasswordChangedNotification(user.email);
            if (!emailResult.success) {
                req.logger.error('Error al enviar notificación de cambio', {
                    action: 'password_change_notification_failed',
                    userId: user._id,
                    error: emailResult.error,
                    ip: req.ip
                });
            }

            res.json({
                success: true,
                message: 'Contraseña actualizada correctamente. Se ha enviado una notificación a tu email.'
            });

        } catch (error) {
            req.logger.error('Error en authController', {
                method: 'resetPassword',
                error: error.message,
                stack: error.stack,
                body: req.body
            });
            next(error);
        }
    }

    /**
     * @method
     * @async
     * @description Cambia el email del usuario autenticado
     * @param {Object} req - Objeto de petición Express
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON
     * @throws {AppError} Con errores específicos:
     *  - 401 si la contraseña actual es incorrecta
     *  - 409 si el nuevo email ya está en uso
     *  - 500 si falla el envío del email de verificación
     */
    changeEmail = async (req, res, next) => {
        try {
            const { newEmail, currentPassword } = req.body;
            const user = req.user;

            req.logger.debug('Inicio de cambio de email', {
                userId: user._id,
                newEmail,
                ip: req.ip
            });

            // Buscar contraseña actual
            const userPassword = await User.findById(user.id, 'password');

            // Verificar que la contraseña actual sea correcta
            const isMatch = await bcrypt.compare(currentPassword, userPassword.password);
            if (!isMatch) {
                throw new AppError(
                    'Contraseña actual incorrecta',
                    401,
                    'INVALID_PASSWORD',
                    {
                        action: 'change_email_attempt',
                        context: 'security',
                        userId: user._id,
                        ip: req.ip
                    }
                );
            }

            // Verificar que el nuevo email no esté en uso
            const emailExists = await User.findOne({ email: newEmail });
            if (emailExists) {
                throw new AppError(
                    'El nuevo email ya está en uso',
                    409,
                    'EMAIL_ALREADY_EXISTS',
                    {
                        action: 'change_email_conflict',
                        context: 'validation',
                        userId: user._id,
                        newEmail,
                        ip: req.ip
                    }
                );
            }

            // Generar token de verificación para el nuevo email
            const verificationToken = this.emailService.generateVerificationToken();
            const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

            // Guardar el nuevo email pendiente de verificación
            user.pendingEmail = newEmail;
            user.emailVerificationToken = verificationToken;
            user.emailVerificationTokenExpires = verificationTokenExpires;
            await user.save();

            // Enviar email de verificación al nuevo correo
            const emailResult = await this.emailService.sendEmailChangeVerification(
                newEmail,
                verificationToken
            );

            if (!emailResult.success) {
                throw new AppError(
                    'No se pudo enviar el email de verificación. Por favor intenta nuevamente.',
                    500,
                    'EMAIL_SEND_FAILURE',
                    {
                        action: 'change_email_send_failed',
                        context: 'email_service',
                        userId: user._id,
                        newEmail,
                        error: emailResult.error,
                        isCritical: true
                    }
                );
            }

            req.logger.info('Solicitud de cambio de email exitosa', {
                userId: user._id,
                oldEmail: user.email,
                newEmail,
                ip: req.ip
            });

            res.json({
                success: true,
                message: 'Se ha enviado un enlace de verificación a tu nuevo correo. Por favor verifícalo para completar el cambio.'
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * @method
     * @async
     * @description Verifica el cambio de email mediante token
     * @param {Object} req - Objeto de petición Express
     * @param {string} req.validatedQuery.token - Token de verificación
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON
     * @throws {AppError} Con errores específicos:
     *  - 400 si el token es inválido o expiró
     *  - 404 si no se encuentra usuario con ese token
     */
    verifyEmailChange = async (req, res, next) => {
        try {
            const { token } = req.query;

            req.logger.debug('Verificación de cambio de email', {
                tokenPresent: !!token,
                ip: req.ip
            });

            // Buscar usuario con token válido y email pendiente
            const user = await User.findOne({
                emailVerificationToken: token,
                emailVerificationTokenExpires: { $gt: new Date() },
                pendingEmail: { $exists: true, $ne: null }
            }).select('+emailVerificationToken +emailVerificationTokenExpires +pendingEmail');

            if (!user) {
                throw new AppError(
                    'Error al verificar el cambio de email',
                    400,
                    'INVALID_EMAIL_CHANGE_TOKEN',
                    {
                        action: 'verify_email_change',
                        context: 'security',
                        tokenPresent: !!token,
                        ip: req.ip
                    }
                );
            }

            req.logger.debug('Usuario encontrado', {
                userId: user._id,
                oldEmail: user.email,
                newEmail: user.pendingEmail,
                ip: req.ip
            });

            // Actualizar el email y limpiar campos temporales
            const oldEmail = user.email;
            req.logger.debug('Email cambiado', {
                userId: user._id,
                oldEmail,
                newEmail: user.pendingEmail,
                ip: req.ip
            });
            user.email = user.pendingEmail;
            user.pendingEmail = undefined;
            user.emailVerificationToken = undefined;

            user.emailVerificationTokenExpires = undefined;
            req.logger.debug('datos de user', {
                userId: user._id,
                oldEmail,
                newEmail: user.email,
                ip: req.ip
            });
            req.logger.debug('email', {
                email: user.email
            });
            await user.save();

            req.logger.info('Email cambiado exitosamente', {
                userId: user._id,
                oldEmail,
                newEmail: user.email,
                ip: req.ip
            });

            // Enviar notificación al antiguo email
            await this.emailService.sendEmailChangeNotification(oldEmail);

            res.json({
                success: true,
                message: 'Email actualizado correctamente',
                data: {
                    id: user._id,
                    newEmail: user.email
                }
            });

        } catch (error) {
            next(error);
        }
    }
}