import express from 'express';
import AuthController from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate, validateQuery } from '../middlewares/validate.middleware.js';
import {
    loginSchema,
    alumniRegistrationSchema,
    adminRegisterSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    emailVerificationSchema,
    resendVerificationSchema,
    changeEmailSchema
} from '../schemas/auth.schemas.js';

/**
 * @swagger
 * tags:
 *   name: Autenticación
 *   description: Endpoints para manejo de autenticación
 */

/**
 * @fileoverview Rutas de autenticación para la API REST
 * @module routes/auth
 * @requires express
 * @requires ../controllers/auth.controller
 * @requires ../middlewares/auth.middleware
 * @requires ../middlewares/validate.middleware
 * @requires ../schemas/auth.schemas
 * 
 * @description  
 * Configura todas las rutas relacionadas con autenticación:  
 * - Login/logout  
 * - Registro (egresados/admins)  
 * - Verificación de email  
 * - Recuperación de contraseña  
 * 
 * @see {@link ./auth.controller} Para la lógica de negocio
 */

/**
 * @function authRoutes
 * @description Factory function que devuelve un router de Express con todas las rutas de autenticación
 * @param {EmailService} emailService - Instancia del servicio de emails
 * @returns {express.Router} Router configurado con middlewares y handlers
 * 
 * @example
 * // Uso típico:
 * const emailService = new EmailService();
 * const authRouter = authRoutes(emailService);
 * app.use('/api/auth', authRouter);
 */
export default function authRoutes(emailService) {
    const router = express.Router();
    const authController = new AuthController(emailService);

    /**
     * @swagger
     * /api/auth/login:
     *   post:
     *     summary: Inicio de sesión en la plataforma
     *     description: |
     *       Autentica un usuario y devuelve cookies HTTP-Only con tokens JWT.
     *       - accessToken: válido por 15 minutos
     *       - refreshToken: válido por 7 días
     *     tags: [Autenticación]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/LoginRequest'
     *     responses:
     *       200:
     *         description: Login exitoso
     *         headers:
     *           Set-Cookie:
     *             schema:
     *               type: string
     *             description: Cookies HTTP-Only con tokens JWT
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 message:
     *                   type: string
     *                   example: "Inicio de sesión exitoso"
     *       400:
     *         description: Validación fallida
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             examples:
     *               validationError:
     *                 $ref: '#/components/examples/ErrorExamples/invalidCredentials'
     *       401:
     *         description: Credenciales inválidas
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       429:
     *         description: Demasiados intentos de login
     *         headers:
     *           Retry-After:
     *             schema:
     *               type: integer
     *               example: 300
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    router.post('/login', validate(loginSchema), authController.login);

    /**
     * @swagger
     * /api/auth/logout:
     *   post:
     *     summary: Cierre de sesión
     *     description: |
     *       Invalida los tokens de autenticación y limpia las cookies.
     *       **Flujo**:
     *       1. Revoca el refresh token en la base de datos
     *       2. Invalida el access token agregándolo a la blacklist
     *       3. Elimina las cookies de autenticación
     *     tags: [Autenticación]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Logout exitoso
     *         headers:
     *           Set-Cookie:
     *             schema:
     *               type: string
     *             description: "Limpia las cookies de autenticación"
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 message:
     *                   type: string
     *                   example: "Sesión cerrada correctamente"
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       500:
     *         description: Error del servidor
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             examples:
     *               databaseError:
     *                 value:
     *                   success: false
     *                   error:
     *                     code: "DB_500"
     *                     message: "Error al revocar tokens"
     *                     details: ["Error de conexión con MongoDB"]
     */
    router.post('/logout', authenticate, authController.logout);

    /**
     * @swagger
     * /api/auth/check-session:
     *   get:
     *     summary: Verifica si hay una sesión activa
     *     tags: [Autenticación]
     *     responses:
     *       200:
     *         description: Sesión válida
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 isAuthenticated:
     *                   type: boolean
     *                   example: true
     *       401:
     *         description: No autenticado
     */
    router.get('/check-session', authenticate, authController.checkSession);

    /**
     * @swagger
     * /api/auth/refresh-token:
     *   post:
     *     summary: Renovar tokens de acceso
     *     description: |
     *       Genera nuevos tokens JWT usando un refresh token válido.
     *       **Mecanismo**:
     *       - Acepta refresh token en cookie (HTTP-Only) o en el body
     *       - Devuelve nuevas cookies con tokens actualizados
     *       - Invalida el refresh token anterior
     *     tags: [Autenticación]
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               refreshToken:
     *                 type: string
     *                 description: "Opcional si ya se envió en cookies"
     *     responses:
     *       200:
     *         description: Tokens renovados
     *         headers:
     *           Set-Cookie:
     *             schema:
     *               type: string
     *             description: "Nuevas cookies HTTP-Only con accessToken y refreshToken"
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 message:
     *                   type: string
     *                   example: "Tokens renovados exitosamente"
     *       400:
     *         description: Error en la solicitud
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             examples:
     *               missingToken:
     *                 value:
     *                   success: false
     *                   error:
     *                     code: "AUTH_400"
     *                     message: "Refresh token requerido"
     *       401:
     *         description: Token inválido o expirado
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             examples:
     *               invalidToken:
     *                 value:
     *                   success: false
     *                   error:
     *                     code: "AUTH_401"
     *                     message: "Refresh token inválido"
     *                     details: ["Token revocado o no encontrado"]
     *       429:
     *         description: Demasiadas solicitudes
     *         headers:
     *           Retry-After:
     *             schema:
     *               type: integer
     *               example: 60
     */
    router.post('/refresh-token', authController.refreshToken);

    /**
     * @swagger
     * /api/auth/register/alumni:
     *   post:
     *     summary: Registro de egresados
     *     description: |
     *       Permite el registro de egresados validando contra datos precargados en el sistema.
     *       **Requisitos**:
     *       - Todos los campos son obligatorios (excepto mención y ubicación)
     *       - El email debe ser institucional (@uvm.edu.ve)
     *       - Se enviará un correo de verificación
     *     tags: [Autenticación]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/AlumniRegistrationRequest'
     *           examples:
     *             egresadoValido:
     *               value:
     *                 idNumber: "V-12345678"
     *                 studentId: "UV20230001"
     *                 firstName: "Juan"
     *                 lastName: "Pérez"
     *                 birthDate: "1990-05-15"
     *                 degree: "Ingeniería de Computación"
     *                 graduationDate: "2020-07-20"
     *                 email: "juan.perez@uvm.edu.ve"
     *                 username: "jperez2020"
     *                 password: "Password123*"
     *     responses:
     *       201:
     *         description: Registro exitoso (pendiente de verificación)
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 message:
     *                   type: string
     *                   example: "Registro exitoso. Por favor verifica tu email."
     *                 data:
     *                   type: object
     *                   properties:
     *                     userId:
     *                       type: string
     *                       format: mongo-id
     *                       example: "507f1f77bcf86cd799439011"
     *       400:
     *         description: Validación fallida
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             examples:
     *               invalidData:
     *                 value:
     *                   success: false
     *                   error:
     *                     code: "VALIDATION_400"
     *                     message: "Error de validación"
     *                     details: ["El formato de cédula es inválido"]
     *       404:
     *         description: Egresado no encontrado en registros
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             examples:
     *               notFound:
     *                 value:
     *                   success: false
     *                   error:
     *                     code: "ALUMNI_404"
     *                     message: "Datos no coinciden con nuestros registros"
     *       409:
     *         description: Conflictos de registro
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             examples:
     *               duplicateUser:
     *                 value:
     *                   success: false
     *                   error:
     *                     code: "USER_409"
     *                     message: "Usuario ya registrado"
     *                     details: ["El email o username ya existen"]
     *       500:
     *         description: Error en el servidor
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             examples:
     *               emailError:
     *                 value:
     *                   success: false
     *                   error:
     *                     code: "EMAIL_500"
     *                     message: "Error al enviar correo"
     */
    router.post('/register/alumni', validate(alumniRegistrationSchema), authController.registerAlumni);

    /**
     * @swagger
     * /api/auth/register/admin:
     *   post:
     *     summary: Registro de administradores
     *     description: |
     *       Permite a administradores existentes registrar nuevos administradores.
     *       **Requisitos**:
     *       - Requiere autenticación con rol 'superadmin'
     *       - Todos los campos son obligatorios
     *       - El email debe ser institucional
     *     tags: [Autenticación]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/AdminRegistrationRequest'
     *           examples:
     *             adminEjemplo:
     *               value:
     *                 fullName: "María González"
     *                 username: "mgonzalez"
     *                 email: "maria.gonzalez@uvm.edu.ve"
     *                 password: "Admin123*"
     *     responses:
     *       201:
     *         description: Administrador registrado
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 data:
     *                   type: object
     *                   properties:
     *                     id:
     *                       type: string
     *                       format: mongo-id
     *                     username:
     *                       type: string
     *                     role:
     *                       type: string
     *                       enum: [superadmin]
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       403:
     *         description: Acceso prohibido
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             examples:
     *               forbidden:
     *                 value:
     *                   success: false
     *                   error:
     *                     code: "AUTH_403"
     *                     message: "Requiere rol de superadministrador"
     *       409:
     *         description: Conflicto de datos
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             examples:
     *               duplicateAdmin:
     *                 value:
     *                   success: false
     *                   error:
     *                     code: "ADMIN_409"
     *                     message: "El administrador ya existe"
     */
    router.post('/register/admin',
        authenticate,
        authorize('superadmin'),
        validate(adminRegisterSchema),
        authController.registerAdmin);

    /**
     * @swagger
     * /api/auth/verify-email:
     *   get:
     *     summary: Verificar dirección de email
     *     description: |
     *       Valida un token de verificación de email y activa la cuenta del usuario.
     *       **Flujo**:
     *       1. Usuario hace clic en enlace recibido por email
     *       2. Frontend redirige a esta ruta con el token como query param
     *       3. Servidor valida el token y activa la cuenta
     *     tags: [Autenticación]
     *     parameters:
     *       - in: query
     *         name: token
     *         required: true
     *         schema:
     *           type: string
     *         description: Token de verificación recibido por email
     *         example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     *     responses:
     *       200:
     *         description: Email verificado exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 message:
     *                   type: string
     *                   example: "Email verificado correctamente"
     *                 data:
     *                   type: object
     *                   properties:
     *                     userId:
     *                       type: string
     *                       format: mongo-id
     *                       example: "507f1f77bcf86cd799439011"
     *                     isActive:
     *                       type: boolean
     *                       example: true
     *       400:
     *         description: Token inválido o expirado
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             examples:
     *               invalidToken:
     *                 value:
     *                   success: false
     *                   error:
     *                     code: "EMAIL_400"
     *                     message: "Token de verificación inválido"
     *                     details: ["El token no existe o ha expirado"]
     *       410:
     *         description: Token ya utilizado
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             examples:
     *               usedToken:
     *                 value:
     *                   success: false
     *                   error:
     *                     code: "EMAIL_410"
     *                     message: "Token ya utilizado"
     *                     details: ["Este enlace de verificación ya fue usado"]
     *       500:
     *         description: Error interno del servidor
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    router.get('/verify-email', validateQuery(emailVerificationSchema), authController.verifyEmail);

    /**
     * @swagger
     * /api/auth/resend-verification:
     *   post:
     *     summary: Reenviar correo de verificación
     *     description: |
     *       Envía un nuevo correo de verificación a usuarios no verificados.
     *       **Restricciones**:
     *       - Máximo 3 intentos cada 24 horas
     *       - Solo para cuentas no verificadas
     *     tags: [Autenticación]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *                 example: "juan.perez@uvm.edu.ve"
     *                 description: "Email registrado que requiere verificación"
     *     responses:
     *       200:
     *         description: Correo reenviado exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 message:
     *                   type: string
     *                   example: "Correo de verificación reenviado"
     *       400:
     *         description: Cuenta ya verificada
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             examples:
     *               alreadyVerified:
     *                 value:
     *                   success: false
     *                   error:
     *                     code: "EMAIL_400"
     *                     message: "Cuenta ya verificada"
     *                     details: ["Este email ya fue verificado previamente"]
     *       404:
     *         description: Email no registrado
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             examples:
     *               emailNotFound:
     *                 value:
     *                   success: false
     *                   error:
     *                     code: "USER_404"
     *                     message: "Email no registrado"
     *                     details: ["No existe usuario con este email"]
     *       429:
     *         description: Límite de intentos excedido
     *         headers:
     *           Retry-After:
     *             schema:
     *               type: integer
     *               example: 86400
     *             description: "Segundos hasta que se puede reintentar (24h)"
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             examples:
     *               rateLimit:
     *                 value:
     *                   success: false
     *                   error:
     *                     code: "RATE_429"
     *                     message: "Límite de reenvíos alcanzado"
     *                     details: ["Máximo 3 intentos cada 24 horas"]
     */
    router.post('/resend-verification', validate(resendVerificationSchema), authController.resendVerificationEmail);

    /**
     * @swagger
     * /api/auth/forgot-password:
     *   post:
     *     summary: Solicitar restablecimiento de contraseña
     *     description: |
     *       Envía un correo con un enlace para restablecer la contraseña.
     *       **Flujo**:
     *       1. Usuario ingresa su email
     *       2. Sistema envía email con token temporal (válido por 1 hora)
     *       3. Usuario hace clic en enlace recibido
     *     tags: [Autenticación]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email or username
     *             properties:
     *               emailOrUsername:
     *                 type: string
     *                 format: email or username
     *                 example: "juan.perez@uvm.edu.ve"
     *                 description: "Email registrado en el sistema"
     *     responses:
     *       200:
     *         description: Solicitud procesada (siempre devuelve éxito para evitar email enumeration)
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 message:
     *                   type: string
     *                   example: "Si el email existe, recibirás instrucciones"
     *       400:
     *         description: Validación fallida
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             examples:
     *               invalidEmail:
     *                 value:
     *                   success: false
     *                   error:
     *                     code: "VALIDATION_400"
     *                     message: "Formato de email inválido"
     *                     details: ["Debe ser un email institucional @uvm.edu.ve"]
     *       429:
     *         description: Demasiados intentos
     *         headers:
     *           Retry-After:
     *             schema:
     *               type: integer
     *               example: 3600
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             examples:
     *               rateLimit:
     *                 value:
     *                   success: false
     *                   error:
     *                     code: "RATE_429"
     *                     message: "Demasiadas solicitudes"
     *                     details: ["Por favor espere 1 hora antes de reintentar"]
     */
    router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);

    /**
     * @swagger
     * /api/auth/reset-password:
     *   post:
     *     summary: Restablecer contraseña
     *     description: |
     *       Permite establecer una nueva contraseña usando un token válido.
     *       **Requisitos**:
     *       - Token debe ser válido y no expirado (1 hora)
     *       - Nueva contraseña debe cumplir políticas de seguridad
     *     tags: [Autenticación]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - token
     *               - newPassword
     *             properties:
     *               token:
     *                 type: string
     *                 description: "Token recibido por email"
     *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     *               newPassword:
     *                 type: string
     *                 format: password
     *                 minLength: 8
     *                 pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$'
     *                 description: "Debe contener mayúsculas, minúsculas, números y símbolos"
     *     responses:
     *       200:
     *         description: Contraseña actualizada exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 message:
     *                   type: string
     *                   example: "Contraseña actualizada correctamente"
     *       400:
     *         description: Token inválido o contraseña no cumple requisitos
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             examples:
     *               invalidToken:
     *                 value:
     *                   success: false
     *                   error:
     *                     code: "AUTH_400"
     *                     message: "Token inválido o expirado"
     *               weakPassword:
     *                 value:
     *                   success: false
     *                   error:
     *                     code: "VALIDATION_400"
     *                     message: "Contraseña insegura"
     *                     details: ["Debe contener al menos 8 caracteres con mayúsculas, números y símbolos"]
     *       500:
     *         description: Error al actualizar contraseña
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             examples:
     *               databaseError:
     *                 value:
     *                   success: false
     *                   error:
     *                     code: "DB_500"
     *                     message: "Error al guardar nueva contraseña"
     */
    router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

    /**
     * @swagger
     * /api/auth/change-email:
     *   post:
     *     summary: Solicitar cambio de email
     *     description: |
     *       Permite a un usuario autenticado solicitar un cambio de email.
     *       Requiere confirmación mediante un enlace enviado al nuevo email.
     *     tags: [Autenticación]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - newEmail
     *               - currentPassword
     *             properties:
     *               newEmail:
     *                 type: string
     *                 format: email
     *                 example: "nuevo.correo@uvm.edu.ve"
     *                 description: Nuevo email a verificar
     *               currentPassword:
     *                 type: string
     *                 format: password
     *                 description: Contraseña actual para confirmar la identidad
     *     responses:
     *       200:
     *         description: Solicitud exitosa, se ha enviado un email de verificación
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 message:
     *                   type: string
     *                   example: "Se ha enviado un enlace de verificación a tu nuevo correo"
     *       400:
     *         description: Validación fallida
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       401:
     *         description: No autorizado (contraseña incorrecta o no autenticado)
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       409:
     *         description: El nuevo email ya está en uso
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    router.post('/change-email', authenticate, validate(changeEmailSchema), authController.changeEmail);

    /**
     * @swagger
     * /api/auth/verify-email-change:
     *   get:
     *     summary: Verificar cambio de email
     *     description: |
     *       Confirma el cambio de email usando un token recibido por correo.
     *       El token es válido por 24 horas.
     *     tags: [Autenticación]
     *     parameters:
     *       - in: query
     *         name: token
     *         required: true
     *         schema:
     *           type: string
     *         description: Token de verificación recibido por email
     *     responses:
     *       200:
     *         description: Email cambiado exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 message:
     *                   type: string
     *                   example: "Email actualizado correctamente"
     *                 data:
     *                   type: object
     *                   properties:
     *                     id:
     *                       type: string
     *                       format: mongo-id
     *                     newEmail:
     *                       type: string
     *                       format: email
     *       400:
     *         description: Token inválido o expirado
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    router.get('/verify-email-change', authController.verifyEmailChange);

    return router;
}