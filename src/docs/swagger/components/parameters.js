/**
 * @fileoverview Componentes de parámetros para la documentación Swagger
 * @module docs/swagger/components/parameters
 * @description
 * Este archivo contiene parámetros estructurados que pueden ser reutilizados
 * en múltiples endpoints de la API.
 *
 * Los parámetros siguen el estándar OpenAPI 3.0 y se organizan por categorías:
 * - Parámetros de eventos
 */


// =============================================
// Sección 10: Parámetros de Eventos
// =============================================
/**
 * @swagger
 * components:
 *   parameters:
 *     eventId:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: string
 *         format: mongo-id
 *       description: ID del evento
 *       example: "507f1f77bcf86cd799439011"
 *
 *     pageQuery:
 *       in: query
 *       name: page
 *       schema:
 *         type: integer
 *         minimum: 1
 *         default: 1
 *       description: Número de página
 *
 *     limitQuery:
 *       in: query
 *       name: limit
 *       schema:
 *         type: integer
 *         minimum: 1
 *         maximum: 100
 *         default: 10
 *       description: Cantidad de items por página
 */

// =============================================
// Sección 11: Parámetros de Proyectos
// =============================================
/**
 * @swagger
 * components:
 *   parameters:
 *     projectId:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: string
 *         format: mongo-id
 *       description: ID del proyecto
 *       example: "507f1f77bcf86cd799439011"
 */

// =============================================
// Sección 12: Parámetros de Notificaciones
// =============================================
/**
 * @swagger
 * components:
 *   parameters:
 *     notificationId:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: string
 *         format: mongo-id
 *       description: ID de la notificación
 *       example: "507f1f77bcf86cd799439011"
 */