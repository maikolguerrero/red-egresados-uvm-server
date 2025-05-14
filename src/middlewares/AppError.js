/**
 * @fileoverview Clase para errores personalizados de la aplicación
 * @module middlewares/AppError
 * @extends Error
 * 
 * @description
 * Error personalizado con soporte para:
 * - Códigos de estado HTTP
 * - Códigos de error personalizados
 * - Metadatos estructurados para logging/tracing
 * - Compatibilidad completa con Error nativo
 */

/**
 * Clase base para errores personalizados
 * @class
 * @extends Error
 * 
 * @example
 * // Uso básico:
 * throw new AppError('Recurso no encontrado', 404);
 * 
 * @example
 * // Con metadatos avanzados:
 * throw new AppError('Error de validación', 400, 'VALIDATION_ERROR', {
 *   field: 'email',
 *   reason: 'formato inválido',
 *   requestId: 'abc123'
 * });
 */

export default class AppError extends Error {
  /**
   * Crea una instancia de error personalizado
   * @param {string} message - Descripción legible del error
   * @param {number} [statusCode=500] - Código HTTP (default: 500)
   * @param {string} [code='APP_ERROR'] - Código interno identificativo
   * @param {Object} [metadata={}] - Metadatos adicionales para debugging
   * 
   * @property {number} status - Código HTTP (alias de statusCode)
   * @property {string} code - Código interno del error
   * @property {Object} metadata - Datos técnicos adicionales
   * @property {string} stack - Stack trace (heredado de Error)
   */
  constructor(message, statusCode = 500, code = 'APP_ERROR', metadata = {}) {
    super(message);
    this.status = statusCode;
    this.code = code;
    this.metadata = metadata; // Objeto para datos adicionales
  }
}