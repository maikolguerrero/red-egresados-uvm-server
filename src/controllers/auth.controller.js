import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Alumni from '../models/Alumni.js';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import TokenBlacklist from '../models/TokenBlacklist.js';
import { AppError } from '../middlewares/error/index.js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

export default class AuthController {
    constructor(emailService) {
        this.emailService = emailService;
    }

    /**
     * Método para generar tokens JWT
     */
    _generateToken(userId, role) {
        if (!userId || !role) {
            throw new Error('Missing required fields for token generation');
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
     * Registro de egresados (con validación contra datos precargados)
     */
    registerAlumni = async (req, res, next) => {
        try {
            req.logger.debug('Inicio registro egresado', {
                studentId: req.body.studentId,
                ip: req.ip
            });
            const { idNumber, studentId, firstName, lastName, birthDate, degree, graduationDate, email, username, password } = req.body;

            // Verificar datos contra los registros precargados
            const alumni = await Alumni.findOne({
                idNumber,
                studentId,
                firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
                lastName: { $regex: new RegExp(`^${lastName}$`, 'i') },
                email: { $regex: new RegExp(`^${email}$`, 'i') },
                degree,
                graduationDate: {
                    $gte: new Date(new Date(graduationDate).setHours(0, 0, 0, 0)),
                    $lte: new Date(new Date(graduationDate).setHours(23, 59, 59, 999))
                },
                birthDate: {
                    $gte: new Date(new Date(birthDate).setHours(0, 0, 0, 0)),
                    $lte: new Date(new Date(birthDate).setHours(23, 59, 59, 999))
                }
            });

            if (!alumni) {
                throw new AppError(
                    'No se encontró coincidencia con nuestros registros de egresados',
                    404,
                    'ALUMNI_NOT_FOUND',
                    {
                        action: 'register_validation',
                        idNumber: req.body.idNumber,
                        studentId: req.body.studentId,
                        ip: req.ip,
                        context: 'security' // Importante para seguimiento
                    }
                );
            }

            if (alumni.isRegistered) {
                throw new AppError(
                    'Este egresado ya tiene una cuenta registrada',
                    409,
                    'ALUMNI_ALREADY_REGISTERED',
                    {
                        action: 'register_duplicate',
                        alumniId: alumni._id,
                        ip: req.ip
                    }
                );
            }

            // Validar unicidad del username
            const existingUser = await User.findOne({ username });
            if (existingUser) {
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
                alumni: alumni._id,
                username,
                email,
                password: hashedPassword,
                role: 'egresado',
                isVerified: false,
                isActive: false,
                verificationToken,
                verificationTokenExpires
            });

            // Actualizar registro del egresado
            alumni.isRegistered = true;
            alumni.registrationDate = new Date();
            await alumni.save();

            // Éxito (logger solo para confirmación)
            req.logger.info('Egresado registrado', {
                userId: user._id,
                alumniId: alumni._id
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
    * Reenvío de correo de verificación
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
    * Verificación de email
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
     * Registro de administradores (sin vinculación a Alumni)
     */
    registerAdmin = async (req, res, next) => {
        try {
            const { fullName, username, email, password } = req.body;

            req.logger.debug('Inicio registro administrador', {
                action: 'admin_registration',
                requestedBy: req.user?._id,
                ip: req.ip
            });

            // Solo administradores pueden crear otros administradores
            if (req.user?.role !== 'admin') {
                throw new AppError(
                    'No autorizado para crear administradores',
                    403,
                    'ADMIN_CREATION_UNAUTHORIZED',
                    {
                        action: 'admin_registration',
                        context: 'security',
                        attemptingUser: req.user?._id,
                        ip: req.ip
                    }
                );
            }

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
     * Login
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
            res.json({ success: true, message: 'Inicio de sesión exitoso' });
        } catch (error) {
            next(error);
        }
    }

    // Renovar tokens
    refreshToken = async (req, res, next) => {
        try {
            const refreshTokenCookie = req.cookies.refreshToken || req.body.refreshToken;

            if (!refreshTokenCookie) {
                throw new AppError('Refresh token requerido', 401, 'REFRESH_TOKEN_REQUIRED', {
                    action: 'login_failed',
                    context: 'security',
                    userId: storedToken?.user?._id,
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
                throw new AppError('Refresh token inválido o expirado', 401, 'INVALID_REFRESH_TOKEN', {
                    action: 'login_failed',
                    context: 'security',
                    userId: storedToken?.user?._id,
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
                        userId: storedToken?.user?._id,
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
                        userId: storedToken?.user?._id,
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
     * Logout
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
                sameSite: 'none',
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
     * Solicitud de restablecimiento de contraseña
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
     * Procesar restablecimiento de contraseña
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
}