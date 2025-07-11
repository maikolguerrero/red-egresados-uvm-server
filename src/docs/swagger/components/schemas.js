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
 * 6. Gestión de egresados
 * 7. Manejo de eventos
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

// =============================================
// Sección 8: Esquemas de Perfil de Usuario
// =============================================
/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: mongo-id
 *           example: "507f1f77bcf86cd799439011"
 *         user:
 *           type: string
 *           format: mongo-id
 *           example: "507f1f77bcf86cd799439012"
 *         personalData:
 *           type: object
 *           properties:
 *             birthDate:
 *               type: object
 *               properties:
 *                 value:
 *                   type: string
 *                   format: date-time
 *                   example: "1990-01-01T00:00:00.000Z"
 *                 isPublic:
 *                   type: boolean
 *                   example: false
 *             location:
 *               type: object
 *               properties:
 *                 value:
 *                   type: string
 *                   example: "Bogotá, Colombia"
 *                 isPublic:
 *                   type: boolean
 *                   example: true
 *         contact:
 *           type: object
 *           properties:
 *             phone:
 *               type: object
 *               properties:
 *                 value:
 *                   type: string
 *                   example: "+573001234567"
 *                 isPublic:
 *                   type: boolean
 *                   example: false
 *             alternateEmail:
 *               type: object
 *               properties:
 *                 value:
 *                   type: string
 *                   format: email
 *                   example: "personal@example.com"
 *                 isPublic:
 *                   type: boolean
 *                   example: false
 *             website:
 *               type: object
 *               properties:
 *                 value:
 *                   type: string
 *                   format: url
 *                   example: "https://miweb.com"
 *                 isPublic:
 *                   type: boolean
 *                   example: true
 *         socialMedia:
 *           type: object
 *           properties:
 *             instagram:
 *               type: object
 *               properties:
 *                 value:
 *                   type: string
 *                   example: "@usuario"
 *                 isPublic:
 *                   type: boolean
 *                   example: true
 *             facebook:
 *               type: object
 *               properties:
 *                 value:
 *                   type: string
 *                   format: url
 *                   example: "https://facebook.com/usuario"
 *                 isPublic:
 *                   type: boolean
 *                   example: true
 *             linkedin:
 *               type: object
 *               properties:
 *                 value:
 *                   type: string
 *                   format: url
 *                   example: "https://linkedin.com/in/usuario"
 *                 isPublic:
 *                   type: boolean
 *                   example: true
 *             x:
 *               type: object
 *               properties:
 *                 value:
 *                   type: string
 *                   format: url
 *                   example: "https://x.com/usuario"
 *                 isPublic:
 *                   type: boolean
 *                   example: true
 *             youtube:
 *               type: object
 *               properties:
 *                 value:
 *                   type: string
 *                   format: url
 *                   example: "https://youtube.com/usuario"
 *                 isPublic:
 *                   type: boolean
 *                   example: true
 *             tiktok:
 *               type: object
 *               properties:
 *                 value:
 *                   type: string
 *                   format: url
 *                   example: "https://tiktok.com/@usuario"
 *                 isPublic:
 *                   type: boolean
 *                   example: true
 *             whatsapp:
 *               type: object
 *               properties:
 *                 value:
 *                   type: string
 *                   example: "+573001234567"
 *                 isPublic:
 *                   type: boolean
 *                   example: false
 *             telegram:
 *               type: object
 *               properties:
 *                 value:
 *                   type: string
 *                   example: "@usuario"
 *                 isPublic:
 *                   type: boolean
 *                   example: false
 *             github:
 *               type: object
 *               properties:
 *                 value:
 *                   type: string
 *                   format: url
 *                   example: "https://github.com/usuario"
 *                 isPublic:
 *                   type: boolean
 *                   example: true
 *         professional:
 *           type: object
 *           properties:
 *             title:
 *               type: object
 *               properties:
 *                 value:
 *                   type: string
 *                   example: "Ingeniero de Software"
 *                 isPublic:
 *                   type: boolean
 *                   example: true
 *             summary:
 *               type: object
 *               properties:
 *                 value:
 *                   type: string
 *                   example: "Experto en desarrollo web con 5 años de experiencia..."
 *                 isPublic:
 *                   type: boolean
 *                   example: true
 *             skills:
 *               type: object
 *               properties:
 *                 values:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["JavaScript", "React", "Node.js"]
 *                 isPublic:
 *                   type: boolean
 *                   example: true
 *             interests:
 *               type: object
 *               properties:
 *                 values:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Tecnología", "Viajes", "Música"]
 *                 isPublic:
 *                   type: boolean
 *                   example: true
 *         experience:
 *           type: object
 *           properties:
 *             items:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: "507f1f77bcf86cd799439013"
 *                   position:
 *                     type: string
 *                     example: "Desarrollador Senior"
 *                   company:
 *                     type: string
 *                     example: "Acme Inc."
 *                   startDate:
 *                     type: string
 *                     format: date
 *                     example: "2020-01-01"
 *                   endDate:
 *                     type: string
 *                     format: date
 *                     example: "2022-12-31"
 *                   current:
 *                     type: boolean
 *                     example: false
 *                   description:
 *                     type: string
 *                     example: "Desarrollo de aplicaciones empresariales"
 *             isPublic:
 *               type: boolean
 *               example: true
 *         education:
 *           type: object
 *           properties:
 *             items:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: "507f1f77bcf86cd799439014"
 *                   institution:
 *                     type: string
 *                     example: "Universidad XYZ"
 *                   degree:
 *                     type: string
 *                     example: "Maestría en Ciencias de la Computación"
 *                   fieldOfStudy:
 *                     type: string
 *                     example: "Inteligencia Artificial"
 *                   startYear:
 *                     type: integer
 *                     example: 2010
 *                   endYear:
 *                     type: integer
 *                     example: 2012
 *             isPublic:
 *               type: boolean
 *               example: true
 *         certifications:
 *           type: object
 *           properties:
 *             items:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: "507f1f77bcf86cd799439015"
 *                   name:
 *                     type: string
 *                     example: "Certificado AWS Developer"
 *                   issuingOrganization:
 *                     type: string
 *                     example: "Amazon Web Services"
 *                   issueDate:
 *                     type: string
 *                     format: date
 *                     example: "2021-05-01"
 *                   credentialID:
 *                     type: string
 *                     example: "AWS-123456789"
 *                   credentialURL:
 *                     type: string
 *                     format: url
 *                     example: "https://aws.amazon.com/certification"
 *             isPublic:
 *               type: boolean
 *               example: true
 *
 *     UserProfileUpdate:
 *       type: object
 *       properties:
 *         personalData:
 *           $ref: '#/components/schemas/PersonalDataUpdate'
 *         contact:
 *           $ref: '#/components/schemas/ContactUpdate'
 *         socialMedia:
 *           $ref: '#/components/schemas/SocialMediaUpdate'
 *         professional:
 *           $ref: '#/components/schemas/ProfessionalUpdate'
 *         experience:
 *           $ref: '#/components/schemas/ExperienceUpdate'
 *         education:
 *           $ref: '#/components/schemas/EducationUpdate'
 *         certifications:
 *           $ref: '#/components/schemas/CertificationsUpdate'
 *
 *     PersonalDataUpdate:
 *       type: object
 *       properties:
 *         birthDate:
 *           type: object
 *           properties:
 *             value:
 *               type: string
 *               format: date-time
 *             isPublic:
 *               type: boolean
 *         location:
 *           type: object
 *           properties:
 *             value:
 *               type: string
 *             isPublic:
 *               type: boolean
 *
 *     ContactUpdate:
 *       type: object
 *       properties:
 *         phone:
 *           type: object
 *           properties:
 *             value:
 *               type: string
 *             isPublic:
 *               type: boolean
 *         alternateEmail:
 *           type: object
 *           properties:
 *             value:
 *               type: string
 *               format: email
 *             isPublic:
 *               type: boolean
 *         website:
 *           type: object
 *           properties:
 *             value:
 *               type: string
 *               format: url
 *             isPublic:
 *               type: boolean
 *
 *     SocialMediaUpdate:
 *       type: object
 *       properties:
 *         instagram:
 *           type: object
 *           properties:
 *             value:
 *               type: string
 *             isPublic:
 *               type: boolean
 *         facebook:
 *           type: object
 *           properties:
 *             value:
 *               type: string
 *               format: url
 *             isPublic:
 *               type: boolean
 *         linkedin:
 *           type: object
 *           properties:
 *             value:
 *               type: string
 *               format: url
 *             isPublic:
 *               type: boolean
 *         x:
 *           type: object
 *           properties:
 *             value:
 *               type: string
 *               format: url
 *             isPublic:
 *               type: boolean
 *         youtube:
 *           type: object
 *           properties:
 *             value:
 *               type: string
 *               format: url
 *             isPublic:
 *               type: boolean
 *         tiktok:
 *           type: object
 *           properties:
 *             value:
 *               type: string
 *               format: url
 *             isPublic:
 *               type: boolean
 *         whatsapp:
 *           type: object
 *           properties:
 *             value:
 *               type: string
 *             isPublic:
 *               type: boolean
 *         telegram:
 *           type: object
 *           properties:
 *             value:
 *               type: string
 *             isPublic:
 *               type: boolean
 *         github:
 *           type: object
 *           properties:
 *             value:
 *               type: string
 *               format: url
 *             isPublic:
 *               type: boolean
 *
 *     ProfessionalUpdate:
 *       type: object
 *       properties:
 *         title:
 *           type: object
 *           properties:
 *             value:
 *               type: string
 *             isPublic:
 *               type: boolean
 *         summary:
 *           type: object
 *           properties:
 *             value:
 *               type: string
 *             isPublic:
 *               type: boolean
 *         skills:
 *           type: object
 *           properties:
 *             values:
 *               type: array
 *               items:
 *                 type: string
 *             isPublic:
 *               type: boolean
 *         interests:
 *           type: object
 *           properties:
 *             values:
 *               type: array
 *               items:
 *                 type: string
 *             isPublic:
 *               type: boolean
 *
 *     ExperienceUpdate:
 *       type: object
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               position:
 *                 type: string
 *               company:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               current:
 *                 type: boolean
 *               description:
 *                 type: string
 *         isPublic:
 *           type: boolean
 *
 *     EducationUpdate:
 *       type: object
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               institution:
 *                 type: string
 *               degree:
 *                 type: string
 *               fieldOfStudy:
 *                 type: string
 *               startYear:
 *                 type: integer
 *               endYear:
 *                 type: integer
 *         isPublic:
 *           type: boolean
 *
 *     CertificationsUpdate:
 *       type: object
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               issuingOrganization:
 *                 type: string
 *               issueDate:
 *                 type: string
 *                 format: date
 *               credentialID:
 *                 type: string
 *               credentialURL:
 *                 type: string
 *                 format: url
 *         isPublic:
 *           type: boolean
 */

// =============================================
// Sección 9: Esquemas de Foto de Perfil
// =============================================
/**
 * @swagger
 * components:
 *   schemas:
 *     ProfilePictureData:
 *       type: object
 *       properties:
 *         profilePicture:
 *           type: string
 *           format: uri
 *           example: "https://res.cloudinary.com/uvm/image/upload/v123/profile_abc123.webp"
 *           description: URL segura de la imagen en formato WebP
 *         userId:
 *           type: string
 *           format: mongo-id
 *           example: "507f1f77bcf86cd799439011"
 *           description: ID del usuario actualizado
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *           description: Indica si la operación fue exitosa
 *         data:
 *           type: object
 *           description: Datos de respuesta específicos del endpoint
 *           properties:
 *             profilePicture:
 *               type: string
 *               format: uri
 *               example: "https://res.cloudinary.com/uvm/image/upload/v123/profile_abc123.webp"
 *               description: URL segura de la imagen en formato WebP
 *             userId:
 *               type: string
 *               format: mongo-id
 *               example: "507f1f77bcf86cd799439011"
 *               description: ID del usuario actualizado
 *       required:
 *         - success
 *         - data
 *
 *     ProfilePictureResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 profilePicture:
 *                   type: string
 *                   format: uri
 *                 userId:
 *                   type: string
 *                   format: mongo-id
 *               required:
 *                 - profilePicture
 *                 - userId
 */

// =============================================
// Sección 10: Esquemas de Eventos
// =============================================
/**
 * @swagger
 * components:
 *   schemas:
 *     UserBasic:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: mongo-id
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         profilePicture:
 *           type: string
 *           format: uri
 *           nullable: true
 *
 *     Pagination:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 100
 *         page:
 *           type: integer
 *           example: 1
 *         pages:
 *           type: integer
 *           example: 10
 *         limit:
 *           type: integer
 *           example: 10
 *
 *     EventMediaItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: mongo-id
 *         url:
 *           type: string
 *           format: uri
 *         publicId:
 *           type: string
 *         uploadedBy:
 *           $ref: '#/components/schemas/UserBasic'
 *         uploadedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     EventRequest:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - eventType
 *         - startDate
 *         - endDate
 *         - location
 *       properties:
 *         title:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *           example: "Conferencia de Inteligencia Artificial"
 *         description:
 *           type: string
 *           minLength: 10
 *           maxLength: 2000
 *           example: "Evento anual sobre los últimos avances en IA aplicada a la educación"
 *         eventType:
 *           type: string
 *           enum: [conferencia, taller, seminario, social, networking, otros]
 *           example: "conferencia"
 *         startDate:
 *           type: string
 *           format: date-time
 *           example: "2024-08-15T09:00:00Z"
 *         endDate:
 *           type: string
 *           format: date-time
 *           example: "2024-08-15T13:00:00Z"
 *         location:
 *           type: string
 *           example: "Auditorio Principal UVM, Valera"
 *         virtualLink:
 *           type: string
 *           format: uri
 *           nullable: true
 *           example: "https://zoom.us/j/1234567890"
 *         organizers:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Pedro Rodríguez", "Juan Pérez"]
 *         specialGuests:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Invitado 1", "Invitado 2"]
 *         capacity:
 *           type: integer
 *           minimum: 1
 *           example: 150
 *         certificate:
 *           type: boolean
 *           example: true
 *         isActive:
 *           type: boolean
 *           example: true
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["tecnología", "educación"]
 *
 *     EventUpdateRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *           example: "Conferencia de Inteligencia Artificial"
 *           nullable: true
 *         description:
 *           type: string
 *           minLength: 10
 *           maxLength: 2000
 *           example: "Evento anual sobre los últimos avances en IA aplicada a la educación"
 *           nullable: true
 *         eventType:
 *           type: string
 *           enum: [conferencia, taller, seminario, social, networking, otros]
 *           example: "conferencia"
 *           nullable: true
 *         startDate:
 *           type: string
 *           format: date-time
 *           example: "2024-08-15T09:00:00Z"
 *           nullable: true
 *         endDate:
 *           type: string
 *           format: date-time
 *           example: "2024-08-15T13:00:00Z"
 *           nullable: true
 *         location:
 *           type: string
 *           example: "Auditorio Principal UVM, Valera"
 *           nullable: true
 *         virtualLink:
 *           type: string
 *           format: uri
 *           example: "https://zoom.us/j/1234567890?pwd=UVMEgresados"
 *           nullable: true
 *         organizers:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Pedro Rodríguez", "Juan Pérez"]
 *           nullable: true
 *         specialGuests:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Invitado 1", "Invitado 2"]
 *           nullable: true
 *         capacity:
 *           type: integer
 *           minimum: 1
 *           nullable: true
 *         certificate:
 *           type: boolean
 *           example: true
 *           nullable: true
 *         isActive:
 *           type: boolean
 *           example: true
 *           nullable: true
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["tecnología", "educación"]
 *           nullable: true
 *
 *     EventResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               $ref: '#/components/schemas/Event'
 *
 *     Event:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: mongo-id
 *           example: "6834c5a7ce256a0130c9b2cc"
 *         title:
 *           type: string
 *           example: "Conferencia de Inteligencia Artificial"
 *         description:
 *           type: string
 *           example: "Evento anual sobre los últimos avances en IA aplicada a la educación"
 *         eventType:
 *           type: string
 *           example: "conferencia"
 *         startDate:
 *           type: string
 *           format: date-time
 *           example: "2024-08-15T09:00:00.000Z"
 *         endDate:
 *           type: string
 *           format: date-time
 *           example: "2024-08-15T13:00:00.000Z"
 *         location:
 *           type: string
 *           example: "Auditorio Principal UVM, Valera"
 *         virtualLink:
 *           type: string
 *           example: "https://zoom.us/j/1234567890?pwd=UVMEgresados"
 *         organizers:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Pedro Rodríguez", "Juan Pérez"]
 *         specialGuests:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Invitado 1", "Invitado 2"]
 *         createdBy:
 *           $ref: '#/components/schemas/UserBasic'
 *         attendees:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/UserBasic'
 *         capacity:
 *           type: integer
 *           example: 150
 *         certificate:
 *           type: boolean
 *           example: true
 *         isActive:
 *           type: boolean
 *           example: true
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["tecnología", "educación"]
 *         media:
 *           $ref: '#/components/schemas/EventMedia'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-05-26T19:48:55.938Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-05-27T16:33:57.484Z"
 *
 *     EventMedia:
 *       type: object
 *       properties:
 *         images:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EventImage'
 *         videos:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EventVideo'
 *
 *     EventImage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: mongo-id
 *           example: "6835e9314eeeccaa5ff6629a"
 *         url:
 *           type: string
 *           format: uri
 *           example: "https://res.cloudinary.com/dawmvdyoz/image/upload/v1748363568/uvm-alumni/events/images/event-6834c5a7ce256a0130c9b2cc/img_event-6834c5a7ce256a0130c9b2cc_1748363567369.webp"
 *         publicId:
 *           type: string
 *           example: "uvm-alumni/events/images/event-6834c5a7ce256a0130c9b2cc/img_event-6834c5a7ce256a0130c9b2cc_1748363567369"
 *         format:
 *           type: string
 *           example: "webp"
 *         dimensions:
 *           type: object
 *           properties:
 *             width:
 *               type: integer
 *               example: 1200
 *             height:
 *               type: integer
 *               example: 630
 *         uploadedBy:
 *           $ref: '#/components/schemas/UserBasic'
 *         uploadedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-05-27T16:32:49.379Z"
 *
 *     EventVideo:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: mongo-id
 *           example: "6835e95d4eeeccaa5ff662a4"
 *         url:
 *           type: string
 *           format: uri
 *           example: "https://res.cloudinary.com/dawmvdyoz/video/upload/v1748363609/uvm-alumni/events/videos/event-6834c5a7ce256a0130c9b2cc/vid_event-6834c5a7ce256a0130c9b2cc_1748363607628.mp4"
 *         publicId:
 *           type: string
 *           example: "uvm-alumni/events/videos/event-6834c5a7ce256a0130c9b2cc/vid_event-6834c5a7ce256a0130c9b2cc_1748363607628"
 *         duration:
 *           type: number
 *           format: float
 *           example: 13.802993
 *         format:
 *           type: string
 *           example: "mp4"
 *         dimensions:
 *           type: object
 *           properties:
 *             width:
 *               type: integer
 *               example: 1280
 *             height:
 *               type: integer
 *               example: 720
 *         uploadedBy:
 *           $ref: '#/components/schemas/UserBasic'
 *         uploadedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-05-27T16:33:33.226Z"
 *
 *     EventListResponse:
 *       properties:
 *             data:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Event'
 *             pagination:
 *               $ref: '#/components/schemas/Pagination'
 *
 *     EventMediaResponse:
 *           properties:
 *             data:
 *               oneOf:
 *                 - $ref: '#/components/schemas/EventImage'
 *                 - $ref: '#/components/schemas/EventVideo'
 *
 *     EventDeletionResponse:
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 deletedEventId:
 *                   type: string
 *                   format: mongo-id
 *                   example: "6834c5a7ce256a0130c9b2cc"
 *                 deletedMediaCount:
 *                   type: integer
 *                   example: 3
 *
 *     MediaDeletionResponse:
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 deletedMediaId:
 *                   type: string
 *                   format: mongo-id
 *                   example: "6835e95d4eeeccaa5ff662a4"
 *                 remainingCount:
 *                   type: integer
 *                   example: 2
 */

// =============================================
// Sección 11: Esquemas de Foro
// =============================================
/**
 * @swagger
 * components:
 *   schemas:
 *     ForumThread:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: mongo-id
 *           example: "507f1f77bcf86cd799439011"
 *         title:
 *           type: string
 *           example: "Oportunidades laborales en TI"
 *         content:
 *           type: string
 *           example: "Comparto esta oportunidad..."
 *         author:
 *           $ref: '#/components/schemas/UserBasic'
 *         category:
 *           type: string
 *           enum: [general, empleos, eventos, carreras, proyectos]
 *           example: "empleos"
 *         likes:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/UserBasic'
 *         commentCount:
 *           type: integer
 *           example: 15
 *           description: Número total de comentarios en el hilo
 *         media:
 *           type: array
 *           items:
 *             oneOf:
 *               - $ref: '#/components/schemas/ForumImage'
 *               - $ref: '#/components/schemas/ForumVideo'
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["empleo", "TI", "remoto"]
 *         viewCount:
 *           type: integer
 *           example: 42
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     ForumComment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: mongo-id
 *           example: "507f1f77bcf86cd799439012"
 *         content:
 *           type: string
 *           example: "Gracias por compartir, ¿cómo aplico?"
 *         author:
 *           $ref: '#/components/schemas/UserBasic'
 *         thread:
 *           type: string
 *           format: mongo-id
 *           example: "507f1f77bcf86cd799439011"
 *         parentComment:
 *           type: string
 *           format: mongo-id
 *           nullable: true
 *           example: null
 *         mentions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/UserBasic'
 *         likes:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/UserBasic'
 *         media:
 *           oneOf:
 *             - $ref: '#/components/schemas/ForumImage'
 *             - $ref: '#/components/schemas/ForumVideo'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     ForumImage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: mongo-id
 *         mediaType:
 *           type: string
 *           enum: [image]
 *         url:
 *           type: string
 *           format: uri
 *         publicId:
 *           type: string
 *         format:
 *           type: string
 *           enum: [jpeg, jpg, png, webp, gif]
 *         dimensions:
 *           type: object
 *           properties:
 *             width:
 *               type: integer
 *             height:
 *               type: integer
 *
 *     ForumVideo:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: mongo-id
 *         mediaType:
 *           type: string
 *           enum: [video]
 *         url:
 *           type: string
 *           format: uri
 *         publicId:
 *           type: string
 *         duration:
 *           type: number
 *         format:
 *           type: string
 *           enum: [mp4, webm, mov, avi]
 *         dimensions:
 *           type: object
 *           properties:
 *             width:
 *               type: integer
 *             height:
 *               type: integer
 *
 *     ThreadRequest:
 *       type: object
 *       required:
 *         - title
 *         - content
 *         - category
 *       properties:
 *         title:
 *           type: string
 *           minLength: 5
 *           maxLength: 200
 *           example: "Oportunidades laborales en el área de TI"
 *         content:
 *           type: string
 *           minLength: 10
 *           maxLength: 5000
 *           example: "Comparto esta oportunidad en una empresa internacional..."
 *         category:
 *           type: string
 *           enum: [general, empleos, eventos, carreras, proyectos]
 *           example: "empleos"
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *             minLength: 2
 *             maxLength: 20
 *           maxItems: 5
 *           example: ["empleo", "TI", "remoto"]
 *
 *     ThreadUpdate:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           minLength: 5
 *           maxLength: 200
 *           example: "Oportunidades laborales en el área de TI (Actualizado)"
 *           nullable: true
 *         content:
 *           type: string
 *           minLength: 10
 *           maxLength: 5000
 *           example: "Comparto esta oportunidad en una empresa internacional..."
 *           nullable: true
 *         category:
 *           type: string
 *           enum: [general, empleos, eventos, carreras, proyectos]
 *           example: "empleos"
 *           nullable: true
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *             minLength: 2
 *             maxLength: 20
 *           maxItems: 5
 *           example: ["empleo", "TI", "remoto"]
 *           nullable: true
 *
 *     CommentRequest:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         content:
 *           type: string
 *           minLength: 1
 *           maxLength: 2000
 *           example: "Gracias por compartir, ¿cómo aplico?"
 *         parentCommentId:
 *           type: string
 *           format: mongo-id
 *           nullable: true
 *           example: null
 *
 *     CommentUpdate:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         content:
 *           type: string
 *           minLength: 1
 *           maxLength: 2000
 *           example: "Gracias por compartir, ¿cómo aplico?"
 *
 *     LikeResponse:
 *       type: object
 *       properties:
 *         action:
 *           type: string
 *           enum: [liked, unliked]
 *           example: "liked"
 *         likeCount:
 *           type: integer
 *           example: 5
 *         isLiked:
 *           type: boolean
 *           example: true
 */

/**
 * @swagger
 * components:
 *   responses:
 *     ThreadSuccess:
 *       description: Operación con hilo exitosa
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForumThread'
 *
 *     ThreadListSuccess:
 *       description: Lista de hilos obtenida exitosamente
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ForumThread'
 *               pagination:
 *                 $ref: '#/components/schemas/Pagination'
 *
 *     ThreadWithComments:
 *       description: Hilo con comentarios anidados
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 format: mongo-id
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               comments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: mongo-id
 *                     content:
 *                       type: string
 *                     author:
 *                       $ref: '#/components/schemas/UserBasic'
 *                     replies:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: mongo-id
 *                           content:
 *                             type: string
 *                           author:
 *                             $ref: '#/components/schemas/UserBasic'
 *
 *     CommentSuccess:
 *       description: Operación con comentario exitosa
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForumComment'
 *
 *     LikeSuccess:
 *       description: Operación de like exitosa
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LikeResponse'
 *
 *     ThreadNotFound:
 *       description: Hilo no encontrado
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           examples:
 *             notFound:
 *               value:
 *                 success: false
 *                 error:
 *                   code: "THREAD_404"
 *                   message: "Hilo no encontrado"
 *                   details: ["No se encontró el hilo con ID 507f1f77bcf86cd799439011"]
 *
 *     CommentNotFound:
 *       description: Comentario no encontrado
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           examples:
 *             notFound:
 *               value:
 *                 success: false
 *                 error:
 *                   code: "COMMENT_404"
 *                   message: "Comentario no encontrado"
 *                   details: ["No se encontró el comentario con ID 507f1f77bcf86cd799439012"]
 *
 *     MediaNotFound:
 *       description: Medio no encontrado en el hilo/comentario
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           examples:
 *             notFound:
 *               value:
 *                 success: false
 *                 error:
 *                   code: "MEDIA_404"
 *                   message: "Medio no encontrado"
 *                   details: ["La imagen/video solicitado no existe en este hilo/comentario"]
 */

/**
 * @swagger
 * components:
 *   parameters:
 *     threadId:
 *       in: path
 *       name: threadId
 *       required: true
 *       schema:
 *         type: string
 *         format: mongo-id
 *       description: ID del hilo
 *       example: "507f1f77bcf86cd799439011"
 *
 *     commentId:
 *       in: path
 *       name: commentId
 *       required: true
 *       schema:
 *         type: string
 *         format: mongo-id
 *       description: ID del comentario
 *       example: "507f1f77bcf86cd799439012"
 *
 *     mediaId:
 *       in: path
 *       name: mediaId
 *       required: true
 *       schema:
 *         type: string
 *         format: mongo-id
 *       description: ID del medio (imagen o video)
 *       example: "507f1f77bcf86cd799439013"
 *
 *     likeType:
 *       in: path
 *       name: type
 *       required: true
 *       schema:
 *         type: string
 *         enum: [thread, comment]
 *       description: Tipo de elemento a likear (hilo o comentario)
 *       example: "thread"
 */

// =============================================
// Sección 11: Esquemas de Proyectos
// =============================================
/**
 * @swagger
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: mongo-id
 *           example: "507f1f77bcf86cd799439011"
 *         title:
 *           type: string
 *           example: "Plataforma de egresados UVM"
 *         description:
 *           type: string
 *           example: "Desarrollo de una plataforma para conectar egresados de la UVM"
 *         owner:
 *           $ref: '#/components/schemas/UserBasic'
 *         collaborators:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Collaborator'
 *         status:
 *           type: string
 *           enum: [not_started, in_progress, completed, paused, cancelled]
 *           example: "in_progress"
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["desarrollo", "web", "uvm"]
 *         media:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProjectMedia'
 *         startDate:
 *           type: string
 *           format: date-time
 *           example: "2025-01-15T00:00:00Z"
 *         endDate:
 *           type: string
 *           format: date-time
 *           example: "2025-06-30T00:00:00Z"
 *         isPublic:
 *           type: boolean
 *           example: true
 *         viewCount:
 *           type: integer
 *           example: 42
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-01-10T12:30:45Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-01-20T14:15:22Z"
 *       required:
 *         - title
 *         - description
 *         - owner
 *         - collaborators
 *         - status
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ProjectResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               $ref: '#/components/schemas/Project'
 *
 *     ProjectListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         pagination:
 *           $ref: '#/components/schemas/Pagination'
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Project'
 *
 *     ProjectMediaResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               $ref: '#/components/schemas/ProjectMedia'
 *
 *     ProjectMedia:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: mongo-id
 *         mediaType:
 *           type: string
 *           enum: [image, video, document]
 *         url:
 *           type: string
 *           format: uri
 *         publicId:
 *           type: string
 *         format:
 *           type: string
 *           nullable: true
 *         dimensions:
 *           type: object
 *           nullable: true
 *           properties:
 *             width:
 *               type: integer
 *             height:
 *               type: integer
 *         duration:
 *           type: number
 *           nullable: true
 *         uploadedBy:
 *           $ref: '#/components/schemas/UserBasic'
 *
 *     CollaboratorRequest:
 *       type: object
 *       required:
 *         - username
 *       properties:
 *         username:
 *           type: string
 *           example: "username"
 *         role:
 *           type: string
 *           enum: [admin, member]
 *           default: member
 *
 *     Collaborator:
 *       type: object
 *       properties:
 *         user:
 *           $ref: '#/components/schemas/UserBasic'
 *         role:
 *           type: string
 *           enum: [creator, admin, member]
 *         joinedAt:
 *           type: string
 *           format: date-time
 *
 *     UpdateRoleRequest:
 *       type: object
 *       required:
 *         - username
 *         - newRole
 *       properties:
 *         username:
 *           type: string
 *           example: "johndoe"
 *         newRole:
 *           type: string
 *           enum: [admin, member]
 *           example: "admin"
 *
 *     UpdateRoleResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           $ref: '#/components/schemas/Collaborator'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ProjectUpdateRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           maxLength: 100
 *           description: Nuevo título del proyecto
 *           example: "Nuevo nombre del proyecto"
 *         description:
 *           type: string
 *           maxLength: 5000
 *           description: Nueva descripción del proyecto
 *           example: "Esta es una descripción actualizada del proyecto"
 *         status:
 *           type: string
 *           enum: [not_started, in_progress, completed, paused, cancelled]
 *           description: Nuevo estado del proyecto
 *           example: "in_progress"
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *             maxLength: 20
 *           description: Nuevas etiquetas del proyecto
 *           example: ["desarrollo", "web"]
 *         startDate:
 *           type: string
 *           format: date
 *           description: Nueva fecha de inicio del proyecto
 *           example: "2025-06-01"
 *         endDate:
 *           type: string
 *           format: date
 *           description: Nueva fecha de finalización del proyecto
 *           example: "2025-12-31"
 *         isPublic:
 *           type: boolean
 *           description: Indica si el proyecto es público o privado
 *           example: true
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ProjectRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: mongo-id
 *         project:
 *           type: string
 *           format: mongo-id
 *         user:
 *           $ref: '#/components/schemas/UserBasic'
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         message:
 *           type: string
 *         reviewedBy:
 *           $ref: '#/components/schemas/UserBasic'
 *         reviewedAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ProjectRequestResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           $ref: '#/components/schemas/ProjectRequest'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CancelRequestResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             cancelledRequestId:
 *               type: string
 *               format: mongo-id
 */

// =============================================
// Sección 12: Esquemas de Notificaciones
// =============================================
/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: mongo-id
 *           example: "507f1f77bcf86cd799439011"
 *         user:
 *           type: string
 *           format: mongo-id
 *           example: "507f1f77bcf86cd799439012"
 *         type:
 *           type: string
 *           enum: [like, mention, thread_comment, comment_reply, thread_activity]
 *           example: "mention"
 *         data:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *               example: "@jperez te mencionó en un comentario"
 *             threadId:
 *               type: string
 *               format: mongo-id
 *               example: "507f1f77bcf86cd799439013"
 *             threadTitle:
 *               type: string
 *               example: "Oportunidades laborales en TI"
 *             commentId:
 *               type: string
 *               format: mongo-id
 *               example: "507f1f77bcf86cd799439014"
 *             commentContent:
 *               type: string
 *               example: "Gracias por compartir, @mrodriguez!"
 *             likerUsername:
 *               type: string
 *               example: "jperez"
 *             commenterUsername:
 *               type: string
 *               example: "mrodriguez"
 *             replierUsername:
 *               type: string
 *               example: "lgonzalez"
 *         fromUser:
 *           $ref: '#/components/schemas/UserBasic'
 *         read:
 *           type: boolean
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-05-28T16:45:30Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-05-28T16:45:30Z"
 *
 *     NotificationListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Notification'
 *         pagination:
 *           $ref: '#/components/schemas/Pagination'
 *
 *     NotificationUpdateResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Notification'
 *
 *     NotificationDeleteResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Notificación eliminada"
 */

// =============================================
// Sección 13: Esquemas de Mensajes Privados
// =============================================
/**
 * @swagger
 * components:
 *   schemas:
 *     PrivateMessage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: mongo-id
 *         sender:
 *           $ref: '#/components/schemas/UserBasic'
 *         receiver:
 *           $ref: '#/components/schemas/UserBasic'
 *         content:
 *           type: string
 *         read:
 *           type: boolean
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [image, video, document]
 *         createdAt:
 *           type: string
 *           format: date-time
 */

// =============================================
// Sección 14: Esquemas de Mensajes de Socket
// =============================================
/**
 * @swagger
 * components:
 *   schemas:
 *     SocketMessage:
 *       type: object
 *       required:
 *         - sender
 *         - receiver
 *         - content
 *       properties:
 *         sender:
 *           type: string
 *           format: mongo-id
 *         receiver:
 *           type: string
 *           format: mongo-id
 *         content:
 *           type: string
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [image, video, document]
 */

// =============================================
// Sección 15: Esquemas de Reportes
// =============================================
/**
 * @swagger
 * components:
 *   schemas:
 *     ForumReport:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: mongo-id
 *           example: "507f1f77bcf86cd799439021"
 *         reporter:
 *           id:
 *             type: string
 *             format: mongo-id
 *             example: "507f1f77bcf86cd799439022"
 *         thread:
 *           id:
 *             type: string
 *             format: mongo-id
 *             example: "507f1f77bcf86cd799439021"
 *         comment:
 *           id:
 *             type: string
 *             format: mongo-id
 *             example: "507f1f77bcf86cd799439022"
 *         reason:
 *           type: string
 *           enum: [spam, inappropriate, harassment, other]
 *           example: "inappropriate"
 *         description:
 *           type: string
 *           example: "El contenido contiene lenguaje ofensivo"
 *         status:
 *           type: string
 *           enum: [pending, resolved, rejected]
 *           example: "pending"
 *         adminAction:
 *           type: string
 *           enum: [deleted, warning, no_action, banned_user]
 *           example: "deleted"
 *         resolvedBy:
 *           id:
 *             type: string
 *             format: mongo-id
 *             example: "507f1f77bcf86cd799439022"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     ReportRequest:
 *       type: object
 *       required:
 *         - reason
 *       properties:
 *         threadId:
 *           type: string
 *           format: mongo-id
 *           example: "507f1f77bcf86cd799439011"
 *           description: ID del hilo reportado (debe proporcionar threadId o commentId)
 *         commentId:
 *           type: string
 *           format: mongo-id
 *           example: "507f1f77bcf86cd799439012"
 *           description: ID del comentario reportado (debe proporcionar threadId o commentId)
 *         reason:
 *           type: string
 *           enum: [spam, inappropriate, harassment, other]
 *           example: "inappropriate"
 *         description:
 *           type: string
 *           maxLength: 500
 *           example: "El contenido contiene lenguaje ofensivo"
 *
 *     ResolveReportRequest:
 *       type: object
 *       required:
 *         - action
 *       properties:
 *         action:
 *           type: string
 *           enum: [deleted, warning, no_action, banned_user]
 *           example: "deleted"
 *         message:
 *           type: string
 *           maxLength: 200
 *           example: "El contenido viola nuestras normas de comunidad"
 *         severity:
 *           type: string
 *           enum: [low, medium, high]
 *           default: "medium"
 *         suspensionDuration:
 *           type: integer
 *           description: Duración en milisegundos (solo para action=banned_user)
 *           example: 604800000
 *
 *     ReportListResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ForumReport'
 *         pagination:
 *           $ref: '#/components/schemas/Pagination'
 */

/**
 * @swagger
 * components:
 *   parameters:
 *     reportId:
 *       in: path
 *       name: reportId
 *       required: true
 *       schema:
 *         type: string
 *         format: mongo-id
 *       description: ID del reporte
 *       example: "507f1f77bcf86cd799439021"
 *
 *     reportStatus:
 *       in: query
 *       name: status
 *       schema:
 *         type: string
 *         enum: [pending, resolved, rejected]
 *       description: Filtrar reportes por estado
 *       example: "pending"
 */

/**
 * @swagger
 * components:
 *   responses:
 *     ReportSuccess:
 *       description: Operación con reporte exitosa
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForumReport'
 *
 *     ReportListSuccess:
 *       description: Lista de reportes obtenida exitosamente
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReportListResponse'
 *
 *     ReportNotFound:
 *       description: Reporte no encontrado
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           examples:
 *             notFound:
 *               value:
 *                 success: false
 *                 error:
 *                   code: "REPORT_404"
 *                   message: "Reporte no encontrado"
 */

/**
 * @swagger
 * components:
 *   responses:
 *     CannotDeletePendingReport:
 *       description: No se puede eliminar un reporte pendiente
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           examples:
 *             pendingReport:
 *               value:
 *                 success: false
 *                 error:
 *                   code: "CANNOT_DELETE_PENDING_REPORT"
 *                   message: "No se puede eliminar un reporte pendiente"
 */

/**
 * @swagger
 * components:
 *   responses:
 *     ReportsCleanupSuccess:
 *       description: Reportes no pendientes eliminados exitosamente
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *               data:
 *                 type: object
 *                 properties:
 *                   deletedCount:
 *                     type: integer
 *               message:
 *                 type: string
 */