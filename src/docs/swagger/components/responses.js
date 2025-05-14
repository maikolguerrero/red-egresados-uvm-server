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
 *                   details: ["Requiere rol 'admin'"]
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
