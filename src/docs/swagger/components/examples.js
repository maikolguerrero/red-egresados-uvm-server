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