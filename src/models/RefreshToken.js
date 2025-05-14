/**
 * @module models/RefreshToken
 * @description Modelo para manejar tokens de refresco JWT con:
 * - Auto-expiración (1 día)
 * - Trazabilidad de dispositivos (IP, userAgent)
 * - Revocación manual
 * @example
 * // Crear token para usuario:
 * const refreshToken = await RefreshToken.create({
 *   token: 'eyJhbGciOi...',
 *   user: userId,
 *   ip: '192.168.1.1',
 *   userAgent: 'Mozilla/5.0'
 * });
 */

import mongoose from 'mongoose';

/**
 * @typedef {Object} RefreshToken
 * @property {string} token - JWT firmado
 * @property {mongoose.Types.ObjectId} user - Relación con User
 * @property {Date} expiresAt - Fecha de expiración (autoeliminación)
 * @property {string} ip - Dirección IP del dispositivo
 * @property {string} userAgent - Navegador/dispositivo origen
 * @property {boolean} isRevoked - Revocación manual
 * @property {Date} createdAt - Fecha de creación (auto)
 * @property {Date} updatedAt - Fecha de actualización (auto)
 */
const RefreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    /**
     * @description Token JWT generado con:
     * - Secreto: REFRESH_TOKEN_SECRET
     * - Expiración: 7 días (configurable)
     */
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    /**
     * @description Referencia a usuario dueño del token.
     * Eliminación en cascada manejada por middleware.
     */
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    /**
       * @description Autoeliminación del documento mediante TTL index.
       * @see {@link https://www.mongodb.com/docs/manual/core/index-ttl/}
       */
    index: { expires: '1d' }
  },
  ip: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    /**
   * @description Identificación del navegador/dispositivo.
   * Ej: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
   */
    required: true
  },
  isRevoked: {
    type: Boolean,
    /**
    * @description Bandera para revocación manual.
    * - true: Token invalidado (ej: logout)
    * - false: Token válido
    */
    default: false
  }
}, {
  timestamps: true
});

export default mongoose.model('RefreshToken', RefreshTokenSchema);