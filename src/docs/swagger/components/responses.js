/**
 * @fileoverview Componentes de respuestas para la documentación Swagger
 * @module docs/swagger/components/responses
 * @description
 * Este archivo contiene respuestas estructuradas de error y éxito
 * que pueden ser reutilizados en múltiples endpoints de la API.
 *
 * Los ejemplos siguen el estándar OpenAPI 3.0 y se organizan por categorías:
 * - Errores de validación
 * - Errores de autenticación
 * - Respuestas exitosas
 */

/**
 * @swagger
 * components:
 *   responses:
 *     UnauthorizedError:
 *       description: |
 *         **Posibles causas**:
 *         - Token no proporcionado
 *         - Token inválido o expirado
 *         - Cuenta no verificada
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           examples:
 *             missingToken:
 *               value:
 *                 success: false
 *                 error:
 *                   code: "AUTH_401"
 *                   message: "Token no proporcionado"
 *                   details: ["Se requiere autenticación para este recurso"]
 *                   timestamp: "2024-05-03T12:00:00Z"
 *                   requestId: "req_a1b2c3d4"
 *             invalidToken:
 *               value:
 *                 success: false
 *                 error:
 *                   code: "AUTH_401"
 *                   message: "Token inválido"
 *                   details: ["El token proporcionado no es válido o ha expirado"]
 *                   timestamp: "2024-05-03T12:01:30Z"
 *
 *     ValidationError:
 *       description: Error en validación de datos de entrada
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/ErrorResponse'
 *               - type: object
 *                 properties:
 *                   error:
 *                     properties:
 *                       validationErrors:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             field:
 *                               type: string
 *                               example: "password"
 *                             message:
 *                               type: string
 *                               example: "Debe contener al menos 8 caracteres"
 *           examples:
 *             alumniRegistration:
 *               value:
 *                 success: false
 *                 error:
 *                   code: "VALIDATION_400"
 *                   message: "Error de validación"
 *                   details: ["3 errores encontrados"]
 *                   validationErrors:
 *                     - field: "idNumber"
 *                       message: "Formato de cédula inválido (Ej: V-12345678)"
 *                     - field: "email"
 *                       message: "Debe ser email institucional (@uvm.edu.ve)"
 *                     - field: "password"
 *                       message: "Debe contener mayúsculas, números y símbolos"
 *
 *     ForbiddenError:
 *       description: |
 *         **Acceso denegado**:
 *         - Rol insuficiente
 *         - Cuenta desactivada
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           examples:
 *             adminRequired:
 *               value:
 *                 success: false
 *                 error:
 *                   code: "AUTH_403"
 *                   message: "Acceso restringido a administradores"
 *                   details: ["Requiere rol 'admin' o 'superadmin'"]
 *                   timestamp: "2024-05-03T12:05:45Z"
 *
 *     ConflictError:
 *       description: Conflicto de datos
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           examples:
 *             duplicateEmail:
 *               value:
 *                 success: false
 *                 error:
 *                   code: "USER_409"
 *                   message: "Email ya registrado"
 *                   details: ["El email juan.perez@uvm.edu.ve ya existe"]
 */


/**
 * @swagger
 * components:
 *   responses:
 *     ServerError:
 *       description: Error interno del servidor
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           examples:
 *             default:
 *               value:
 *                 success: false
 *                 requestId: "45c1b575-910b-4c1a-9750-04c807a27e21"
 *                 message: "Error interno del servidor"
 *                 error:
 *                   code: "SERVER_500"
 *                   message: "Ocurrió un error inesperado"
 *                   details: ["Error al procesar la solicitud"]
 *                   timestamp: "2025-05-28T16:45:30Z"
 */

/**
 * @swagger
 * components:
 *   responses:
 *     FileUploadSuccess:
 *       description: Archivo subido exitosamente
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SuccessResponse'
 *           examples:
 *             profilePicture:
 *               value:
 *                 success: true
 *                 data:
 *                   profilePicture: "https://res.cloudinary.com/uvm/image/upload/v123/profile_abc123.webp"
 *                   userId: "507f1f77bcf86cd799439011"
 */

// =============================================
// Sección 10: Respuestas de Eventos
// =============================================
/**
 * @swagger
 * components:
 *   responses:
 *     EventSuccess:
 *       description: Operación con evento exitosa
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventResponse'
 *
 *     EventListSuccess:
 *       description: Lista de eventos obtenida exitosamente
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventListResponse'
 *
 *     EventMediaSuccess:
 *       description: Operación con medios de evento exitosa
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventMediaResponse'
 *
 *     EventDeleted:
 *       description: Evento eliminado exitosamente
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventDeletionResponse'
 *
 *     MediaDeleted:
 *       description: Medio eliminado exitosamente
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MediaDeletionResponse'
 *
 *     EventNotFound:
 *       description: Evento no encontrado
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           examples:
 *             notFound:
 *               value:
 *                 success: false
 *                 error:
 *                   code: "EVENT_404"
 *                   message: "Evento no encontrado"
 *                   details: ["No se encontró el evento con ID 507f1f77bcf86cd799439011"]
 *
 *     MediaNotFound:
 *       description: Medio no encontrado en el evento
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
 *                   details: ["La imagen/video solicitado no existe en este evento"]
 */


// =============================================
// Sección 11: Respuestas de Proyectos
// =============================================
/**
 * @swagger
 * components:
 *   responses:
 *     ProjectSuccess:
 *       description: Operación con proyecto exitosa
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectResponse'
 * 
 *     ProjectListSuccess:
 *       description: Lista de proyectos obtenida exitosamente
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectListResponse'
 * 
 *     ProjectMediaSuccess:
 *       description: Operación con medios de proyecto exitosa
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectMediaResponse'
 * 
 *     ProjectNotFound:
 *       description: Proyecto no encontrado
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           examples:
 *             notFound:
 *               value:
 *                 success: false
 *                 error:
 *                   code: "PROJECT_404"
 *                   message: "Proyecto no encontrado"
 *                   details: ["No se encontró el proyecto con ID 507f1f77bcf86cd799439011"]
 * 
 *     CollaboratorResponse:
 *       description: Respuesta de operación con colaborador
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Collaborator'
 */

// =============================================
// Sección 12: Respuestas de Notificaciones
// =============================================
/**
 * @swagger
 * components:
 *   responses:
 *     NotificationSuccess:
 *       description: Operación con notificación exitosa
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Notification'
 *
 *     NotificationListSuccess:
 *       description: Lista de notificaciones obtenida exitosamente
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationListResponse'
 *
 *     NotificationNotFound:
 *       description: Notificación no encontrada
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           examples:
 *             notFound:
 *               value:
 *                 success: false
 *                 error:
 *                   code: "NOTIFICATION_404"
 *                   message: "Notificación no encontrada"
 *                   details: ["No se encontró la notificación con ID 507f1f77bcf86cd799439011"]
 */