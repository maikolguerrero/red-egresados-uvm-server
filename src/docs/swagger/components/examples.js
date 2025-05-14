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