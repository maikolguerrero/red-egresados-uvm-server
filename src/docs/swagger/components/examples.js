/**
 * @fileoverview Componentes de ejemplos para la documentación Swagger
 * @module docs/swagger/components/examples
 * @description
 * Este archivo contiene ejemplos estructurados de respuestas de error y éxito
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
 *   examples:
 *     AlumniRegistrationError:
 *       value:
 *         success: false
 *         error:
 *           code: "ALUMNI_404"
 *           message: "Datos no coinciden con registros"
 *           details: ["Verifique su cédula o número de expediente"]
 *           timestamp: "2024-05-03T12:10:20Z"
 */

/**
 * @swagger
 * components:
 *   examples:
 *     ProfilePictureSuccess:
 *       summary: Foto de perfil actualizada
 *       value:
 *         success: true
 *         data:
 *           profilePicture: "https://res.cloudinary.com/uvm/image/upload/v123/profile_abc123.webp"
 *           userId: "507f1f77bcf86cd799439011"
 *
 *     InvalidFileTypeError:
 *       summary: Tipo de archivo no soportado
 *       value:
 *         success: false
 *         error:
 *           code: "FILE_400"
 *           message: "Tipo de archivo no permitido"
 *           details: ["Formatos soportados: JPG, JPEG, PNG, GIF"]
 *           timestamp: "2024-05-03T12:15:30Z"
 *
 *     NoFileProvidedError:
 *       summary: No se proporcionó archivo
 *       value:
 *         success: false
 *         error:
 *           code: "FILE_400"
 *           message: "No se proporcionó archivo"
 *           details: ["El campo 'picture' es requerido"]
 *           timestamp: "2024-05-03T12:16:45Z"
 *
 *     FileTooLargeError:
 *       summary: Archivo excede tamaño máximo
 *       value:
 *         success: false
 *         error:
 *           code: "FILE_413"
 *           message: "El archivo excede el tamaño máximo"
 *           details: ["Tamaño máximo permitido: 10MB"]
 *           timestamp: "2024-05-03T12:17:20Z"
 *
 *     ImageUploadError:
 *       summary: Error al subir imagen
 *       value:
 *         success: false
 *         error:
 *           code: "FILE_500"
 *           message: "Error al procesar la imagen"
 *           details: ["Error en el servidor de almacenamiento"]
 *           timestamp: "2024-05-03T12:18:00Z"
 */

// =============================================
// Sección 10: Ejemplos de Eventos
// =============================================
/**
 * @swagger
 * components:
 *   examples:
 *     EventCreated:
 *       summary: Ejemplo de evento creado
 *       value:
 *         success: true
 *         data:
 *           $ref: '#/components/schemas/Event'
 *
 *     EventList:
 *       summary: Ejemplo de lista de eventos
 *       value:
 *         success: true
 *         data:
 *           - $ref: '#/components/schemas/Event'
 *           - $ref: '#/components/schemas/Event'
 *         pagination:
 *           total: 25
 *           page: 1
 *           pages: 3
 *           limit: 10
 *
 *     EventImageAdded:
 *       summary: Ejemplo de imagen añadida
 *       value:
 *         success: true
 *         data:
 *           $ref: '#/components/schemas/EventImage'
 *
 *     EventVideoAdded:
 *       summary: Ejemplo de video añadido
 *       value:
 *         success: true
 *         data:
 *           $ref: '#/components/schemas/EventVideo'
 *
 *     EventDeleted:
 *       summary: Ejemplo de evento eliminado
 *       value:
 *         success: true
 *         message: "Evento eliminado correctamente"
 *         data:
 *           deletedEventId: "507f1f77bcf86cd799439011"
 *           deletedMediaCount: 3
 *
 *     EventImageDeleted:
 *       summary: Ejemplo de imagen eliminada
 *       value:
 *         success: true
 *         message: "Imagen eliminada correctamente"
 *         data:
 *           deletedImageId: "507f1f77bcf86cd799439012"
 *           remainingImages: 2
 *
 *     EventVideoDeleted:
 *       summary: Ejemplo de video eliminado
 *       value:
 *         success: true
 *         message: "Video eliminado correctamente"
 *         data:
 *           deletedVideoId: "507f1f77bcf86cd799439013"
 *           remainingVideos: 1
 */

// =============================================
// Sección 11: Ejemplos de Proyectos
// =============================================
/**
 * @swagger
 * components:
 *   examples:
 *     ProjectCreated:
 *       summary: Ejemplo de proyecto creado
 *       value:
 *         success: true
 *         data:
 *           $ref: '#/components/schemas/Project'
 * 
 *     ProjectList:
 *       summary: Ejemplo de lista de proyectos
 *       value:
 *         success: true
 *         data:
 *           - $ref: '#/components/schemas/Project'
 *           - $ref: '#/components/schemas/Project'
 *         pagination:
 *           total: 25
 *           page: 1
 *           pages: 3
 *           limit: 10
 * 
 *     ProjectImageAdded:
 *       summary: Ejemplo de imagen añadida
 *       value:
 *         success: true
 *         data:
 *           $ref: '#/components/schemas/ProjectMedia'
 * 
 *     ProjectVideoAdded:
 *       summary: Ejemplo de video añadido
 *       value:
 *         success: true
 *         data:
 *           $ref: '#/components/schemas/ProjectMedia'
 * 
 *     ProjectDeleted:
 *       summary: Ejemplo de proyecto eliminado
 *       value:
 *         success: true
 *         message: "Proyecto eliminado correctamente"
 *         data:
 *           deletedProjectId: "507f1f77bcf86cd799439011"
 *           deletedMediaCount: 3
 * 
 *     CollaboratorAdded:
 *       summary: Ejemplo de colaborador añadido
 *       value:
 *         success: true
 *         data:
 *           user:
 *             id: "507f1f77bcf86cd799439012"
 *             username: "jperez"
 *             profilePicture: "https://example.com/profile.jpg"
 *           role: "member"
 *           joinedAt: "2025-05-28T16:45:30Z"
 */

// =============================================
// Sección 12: Ejemplos de Notificaciones
// =============================================
/**
 * @swagger
 * components:
 *   examples:
 *     NotificationList:
 *       summary: Ejemplo de lista de notificaciones
 *       value:
 *         success: true
 *         data:
 *           - id: "507f1f77bcf86cd799439011"
 *             type: "mention"
 *             data:
 *               message: "@jperez te mencionó en un comentario"
 *               threadId: "507f1f77bcf86cd799439013"
 *               threadTitle: "Oportunidades laborales en TI"
 *               commentId: "507f1f77bcf86cd799439014"
 *               commentContent: "Gracias por compartir, @mrodriguez!"
 *             fromUser:
 *               id: "507f1f77bcf86cd799439015"
 *               username: "jperez"
 *               profilePicture: "https://example.com/profile.jpg"
 *             read: false
 *             createdAt: "2025-05-28T16:45:30Z"
 *           - id: "507f1f77bcf86cd799439012"
 *             type: "like"
 *             data:
 *               message: "A @lgonzalez le gustó tu comentario"
 *               threadId: "507f1f77bcf86cd799439016"
 *               threadTitle: "Evento de egresados 2025"
 *               commentId: "507f1f77bcf86cd799439017"
 *               likerUsername: "lgonzalez"
 *             fromUser:
 *               id: "507f1f77bcf86cd799439018"
 *               username: "lgonzalez"
 *               profilePicture: "https://example.com/profile2.jpg"
 *             read: true
 *             createdAt: "2025-05-28T14:30:15Z"
 *         pagination:
 *           total: 15
 *           page: 1
 *           pages: 2
 *           limit: 10
 *
 *     NotificationMarkedAsRead:
 *       summary: Ejemplo de notificación marcada como leída
 *       value:
 *         success: true
 *         data:
 *           id: "507f1f77bcf86cd799439011"
 *           read: true
 *           updatedAt: "2025-05-28T17:00:00Z"
 *
 *     NotificationDeleted:
 *       summary: Ejemplo de notificación eliminada
 *       value:
 *         success: true
 *         message: "Notificación eliminada"
 */