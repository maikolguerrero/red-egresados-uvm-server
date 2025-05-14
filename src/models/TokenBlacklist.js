/**
 * @module models/TokenBlacklist
 * @description Modelo para manejar tokens JWT invalidados con:
 * - Auto-purga mediante TTL index (1 día)
 * - Prevención de reuso de tokens
 * @example
 * // Añadir token inválido:
 * await TokenBlacklist.create({
 *   token: 'eyJhbGciOi...',
 *   expiresAt: new Date(Date.now() + 3600000)
 * });
 */

import mongoose from 'mongoose';

/**
 * @typedef {Object} TokenBlacklist
 * @property {string} token - JWT invalidado (único)
 * @property {Date} expiresAt - Fecha de expiración del token
 * @property {Date} createdAt - Fecha de registro (auto)
 */
const TokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: '1d' } // Autoeliminación después de 1 día
  }
}, { timestamps: true });

export default mongoose.model('TokenBlacklist', TokenBlacklistSchema);