/**
 * @fileoverview Definición de esquemas OpenAPI para la API
 * @module docs/swagger/components/schemas
 * @description
 * Este archivo contiene todos los esquemas de datos utilizados en la documentación Swagger,
 * incluyendo:
 * - Modelos de solicitud (request bodies)
 * - Modelos de respuesta
 * - Definiciones de errores estandarizados
 * - Enums y tipos compartidos
 * 
 * Los esquemas siguen el estándar OpenAPI 3.0 y están organizados por categorías:
 * 1. Autenticación
 * 2. Registro de usuarios
 * 3. Manejo de errores
 * 4. Verificación de email
 * 5. Gestión de contraseñas
 */

// =============================================
// Sección 1: Esquemas de Autenticación
// =============================================

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - emailOrUsername
 *         - password
 *       description: Credenciales para inicio de sesión
 *       properties:
 *         emailOrUsername:
 *           type: string
 *           example: "jperez@uvm.edu.ve"
 *           description: |
 *             Email institucional o nombre de usuario.
 *             El email debe pertenecer al dominio @uvm.edu.ve
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *           example: "Uvm2024*"
 *           description: |
 *             Contraseña que cumpla con:
 *             - Mínimo 8 caracteres
 *             - Al menos 1 mayúscula
 *             - Al menos 1 número
 *             - Al menos 1 símbolo especial
 *       example:
 *         emailOrUsername: "jperez@uvm.edu.ve"
 *         password: "SecurePassword123*"
 * 
 *     RefreshTokenRequest:
 *       type: object
 *       description: Solicitud para renovar tokens JWT
 *       properties:
 *         refreshToken:
 *           type: string
 *           description: |
 *             Token de refresco (opcional si se envía en cookies HTTP-Only).
 *             Válido por 7 días.
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * 
 *     LogoutResponse:
 *       type: object
 *       description: Respuesta exitosa al cerrar sesión
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Sesión cerrada correctamente"
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: |
 *         **Mecanismo de autenticación**:  
 *         - JWT en formato Bearer Token  
 *         **Opciones de envío**:  
 *         1. Cookie HTTP-Only (recomendado): `accessToken=abc123`  
 *         2. Header Authorization: `Bearer <token>`  
 *         **Duración**:  
 *         - Access Token: 15 minutos  
 *         - Refresh Token: 7 días
 */

// =============================================
// Sección 2: Esquemas de Registro
// =============================================

/**
 * @swagger
 * components:
 *   schemas:
 *     AlumniRegistrationRequest:
 *       type: object
 *       required:
 *         - idNumber
 *         - studentId
 *         - firstName
 *         - lastName
 *         - birthDate
 *         - degree
 *         - graduationDate
 *         - email
 *         - username
 *         - password
 *       description: Datos requeridos para registro de egresados
 *       properties:
 *         idNumber:
 *           type: string
 *           pattern: '^[VE]-\d+$'
 *           example: "V-12345678"
 *           description: |
 *             Cédula de identidad con formato:
 *             - V- para venezolanos
 *             - E- para extranjeros
 *             - Seguido de 6-8 dígitos
 *         studentId:
 *           type: string
 *           example: "UV20230001"
 *           description: Número de expediente único
 *         firstName:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           example: "Juan"
 *           description: Nombres (solo letras y espacios)
 *         lastName:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           example: "Pérez"
 *           description: Apellidos (solo letras y espacios)
 *         birthDate:
 *           type: string
 *           format: date
 *           example: "1990-05-15"
 *           description: Fecha de nacimiento en formato YYYY-MM-DD
 *         degree:
 *           $ref: '#/components/examples/AlumniDegreeEnum'
 *         graduationDate:
 *           type: string
 *           format: date
 *           example: "2020-07-20"
 *           description: Fecha de graduación en formato YYYY-MM-DD
 *         email:
 *           type: string
 *           format: email
 *           pattern: '^[^@]+@uvm\.edu\.ve$'
 *           example: "juan.perez@uvm.edu.ve"
 *           description: Email institucional (@uvm.edu.ve)
 *         username:
 *           type: string
 *           pattern: '^[a-z0-9_]{4,20}$'
 *           example: "jperez2020"
 *           description: |
 *             Nombre de usuario con:
 *             - 4-20 caracteres
 *             - Solo minúsculas, números y guiones bajos
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *           pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
 *           example: "Uvm2024*"
 *           description: Contraseña segura con requisitos complejos
 * 
 *     AdminRegistrationRequest:
 *       type: object
 *       required:
 *         - fullName
 *         - username
 *         - email
 *         - password
 *       description: Datos para registro de administradores (solo por otros admins)
 *       properties:
 *         fullName:
 *           type: string
 *           minLength: 5
 *           maxLength: 100
 *           example: "María González"
 *           description: Nombre completo del administrador
 *         username:
 *           type: string
 *           pattern: '^[a-z0-9_]{4,20}$'
 *           example: "mgonzalez"
 *           description: Nombre de usuario (mismas reglas que egresados)
 *         email:
 *           type: string
 *           format: email
 *           pattern: '^[^@]+@uvm\.edu\.ve$'
 *           example: "maria.gonzalez@uvm.edu.ve"
 *           description: Email institucional
 *         password:
 *           type: string
 *           minLength: 8
 *           pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
 *           example: "AdminSecure123*"
 * 
 *   examples:
 *     AlumniDegreeEnum:
 *       description: Carreras disponibles para egresados
 *       value:
 *         - "Licenciatura en Administración de Empresas"
 *         - "Licenciatura en Contaduría Pública"
 *         - "Ingeniería de Computación"
 *         - "Ingeniería Industrial"
 *         - "Derecho"
 *         - "Ciencias Políticas y Administrativas"
 */

// =============================================
// Sección 3: Manejo de Errores
// =============================================

/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       description: Formato estándar para respuestas de error
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *           description: Siempre false para respuestas de error
 *         requestId:
 *           type: string
 *           example: "req_a1b2c3d4"
 *           description: ID único para tracking de errores
 *         error:
 *           type: object
 *           description: Detalles del error
 *           properties:
 *             code:
 *               type: string
 *               pattern: '^[A-Z]+_[0-9]{3}$'
 *               example: "AUTH_401"
 *               description: |
 *                 Código de error estructurado:
 *                 - Prefijo: Área del error (AUTH, DB, VALIDATION)
 *                 - Sufijo: HTTP status code
 *             message:
 *               type: string
 *               example: "Token no proporcionado"
 *               description: Descripción legible del problema
 *             details:
 *               type: array
 *               items:
 *                 type: string
 *               example: ["Se requiere autenticación para este recurso"]
 *               description: Detalles técnicos opcionales
 *             timestamp:
 *               type: string
 *               format: date-time
 *               example: "2024-05-03T12:00:00Z"
 *               description: Cuando ocurrió el error
 *             validationErrors:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ValidationError'
 *               description: Solo presente para errores 400
 *           required:
 *             - code
 *             - message
 *       required:
 *         - success
 *         - error
 * 
 *     ValidationError:
 *       type: object
 *       description: Error de validación para un campo específico
 *       properties:
 *         field:
 *           type: string
 *           example: "password"
 *           description: Nombre del campo con error
 *         message:
 *           type: string
 *           example: "Debe contener al menos 8 caracteres"
 *           description: Mensaje legible del error
 *         rule:
 *           type: string
 *           example: "minLength"
 *           description: Regla de validación violada
 * 
 *   examples:
 *     ErrorExamples:
 *       invalidCredentials:
 *         summary: Credenciales inválidas
 *         value:
 *           success: false
 *           requestId: "req_123456"
 *           error:
 *             code: "AUTH_401"
 *             message: "Credenciales inválidas"
 *             details: ["El usuario no existe o la contraseña es incorrecta"]
 *             timestamp: "2024-05-03T12:00:00Z"
 */

// =============================================
// Sección 4: Verificación de Email
// =============================================

/**
 * @swagger
 * components:
 *   schemas:
 *     EmailVerificationRequest:
 *       type: object
 *       required:
 *         - token
 *       description: Token para verificar dirección de email
 *       properties:
 *         token:
 *           type: string
 *           description: |
 *             Token JWT de verificación recibido por email.
 *             Válido por 24 horas.
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * 
 *     ResendVerificationRequest:
 *       type: object
 *       required:
 *         - email
 *       description: Solicitud para reenviar email de verificación
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           pattern: '^[^@]+@uvm\.edu\.ve$'
 *           example: "juan.perez@uvm.edu.ve"
 *           description: Email institucional a verificar
 * 
 *   examples:
 *     VerificationSuccess:
 *       summary: Verificación exitosa
 *       value:
 *         success: true
 *         message: "Email verificado correctamente"
 *         data:
 *           userId: "507f1f77bcf86cd799439011"
 *           isActive: true
 * 
 *     VerificationRateLimit:
 *       summary: Límite de reenvíos
 *       value:
 *         success: false
 *         error:
 *           code: "RATE_429"
 *           message: "Límite de reenvíos alcanzado"
 *           details: ["Por favor espere 24 horas antes de solicitar otro correo"]
 *           timestamp: "2024-05-03T14:30:00Z"
 */

// =============================================
// Sección 5: Gestión de Contraseñas
// =============================================

/**
 * @swagger
 * components:
 *   schemas:
 *     ForgotPasswordRequest:
 *       type: object
 *       required:
 *         - email
 *       description: Solicitud para restablecer contraseña
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           pattern: '^[^@]+@uvm\.edu\.ve$'
 *           example: "juan.perez@uvm.edu.ve"
 *           description: Email institucional registrado
 * 
 *     ResetPasswordRequest:
 *       type: object
 *       required:
 *         - token
 *         - newPassword
 *       description: Datos para establecer nueva contraseña
 *       properties:
 *         token:
 *           type: string
 *           description: |
 *             Token temporal recibido por email.
 *             Válido por 1 hora.
 *           example: "abc123def456"
 *         newPassword:
 *           type: string
 *           minLength: 8
 *           pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$'
 *           example: "NewSecurePassword123*"
 *           description: Nueva contraseña que cumpla políticas de seguridad
 * 
 *   examples:
 *     PasswordResetSuccess:
 *       summary: Contraseña actualizada
 *       value:
 *         success: true
 *         message: "Contraseña actualizada correctamente"
 * 
 *     PasswordResetError:
 *       summary: Token inválido
 *       value:
 *         success: false
 *         error:
 *           code: "AUTH_400"
 *           message: "Token inválido"
 *           details: ["El token de restablecimiento no existe o ha expirado"]
 *           timestamp: "2024-05-03T15:30:00Z"
 */

// =============================================
// Sección 6: Headers y Configuraciones
// =============================================

/**
 * @swagger
 * components:
 *   headers:
 *     SetCookieHeader:
 *       description: |
 *         Configura cookies HTTP-Only para autenticación JWT.
 *         **Características**:
 *         - Secure en producción
 *         - SameSite=Lax
 *         - HttpOnly para prevenir XSS
 *       schema:
 *         type: string
 *         example: |
 *           accessToken=abc123; Path=/; HttpOnly; SameSite=Lax; Max-Age=900
 *           refreshToken=xyz789; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800
 */

// =============================================
// Sección 7: Esquemas de Egresados
// =============================================
/**
 * @swagger
 * components:
 *   schemas:
 *     AlumniProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: mongo-id
 *           example: "507f1f77bcf86cd799439011"
 *         idNumber:
 *           type: string
 *           example: "V-12345678"
 *         firstName:
 *           type: string
 *           example: "Juan"
 *         lastName:
 *           type: string
 *           example: "Pérez"
 *         birthDate:
 *           type: string
 *           format: date
 *           example: "1990-05-15"
 *         email:
 *           type: string
 *           format: email
 *           example: "juan.perez@uvm.edu.ve"
 *         location:
 *           type: string
 *           example: "Valera, Trujillo"
 *         degree:
 *           type: string
 *           example: "Ingeniería de Computación"
 *         mention:
 *           type: string
 *           example: "Sistemas Distribuidos"
 *         studentId:
 *           type: string
 *           example: "UV20230001"
 *         graduationDate:
 *           type: string
 *           format: date
 *           example: "2020-07-20"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         user:
 *           type: object
 *           properties:
 *             username:
 *               type: string
 *               example: "jperez2020"
 *             isActive:
 *               type: boolean
 *               example: true
 *             lastLogin:
 *               type: string
 *               format: date-time
 *             memberSince:
 *               type: string
 *               format: date-time
 */