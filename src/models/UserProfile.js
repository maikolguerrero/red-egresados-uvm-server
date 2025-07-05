/**
 * @module models/UserProfile
 * @description Modelo para perfiles de usuarios con:
 * - Información de contacto
 * - Redes sociales
 * - Información profesional
 * - Experiencia laboral
 * - Educación adicional
 * - Certificaciones
 * @example
 * // Buscar perfil de usuario por ID:
 * const userProfile = await UserProfile.findOne({ user: 'id_del_usuario' });
 */

import mongoose from 'mongoose';

/**
 * @typedef {Object} UserProfile
 * @description Perfil de usuario registrado en el sistema
 * @property {mongoose.Types.ObjectId} user - ID del usuario al que pertenece el perfil
 * @property {Object} contact - Información de contacto
 * @property {string} contact.phone - Número telefónico
 * @property {string} contact.alternateEmail - Email alternativo
 * @property {string} contact.website - URL del sitio web personal
 * @property {Object} socialMedia - Información de redes sociales
 * @property {string} socialMedia.instagram - URL de Instagram
 * @property {string} socialMedia.facebook - URL de Facebook
 * @property {string} socialMedia.linkedin - URL de LinkedIn
 * @property {string} socialMedia.x - URL de X
 * @property {string} socialMedia.github - URL de GitHub
 * @property {string} socialMedia.youtube - URL de YouTube
 * @property {string} socialMedia.tiktok - URL de TikTok
 * @property {string} socialMedia.whatsapp - URL de WhatsApp
 * @property {string} socialMedia.telegram - URL de Telegram
 * @property {Object} professional - Información profesional
 * @property {string} professional.title - Titulo profesional
 * @property {string} professional.summary - Resumen profesional
 * @property {Array<string>} professional.skills - Habilidades profesionales
 * @property {Array<string>} professional.interests - Intereses profesionales
 * @property {Array<Object>} experience - Experiencia laboral
 * @property {string} experience.position - Titulo de la posición
 * @property {string} experience.company - Empresa
 * @property {Date} experience.startDate - Fecha de inicio
 * @property {Date} experience.endDate - Fecha de fin
 * @property {boolean} experience.current - Indica si es la experiencia actual
 * @property {string} experience.description - Descripción de la experiencia
 * @property {Array<Object>} education - Educación adicional
 * @property {string} education.institution - Institución
 * @property {string} education.degree - Grado obtenido
 * @property {string} education.fieldOfStudy - Campo de estudio
 * @property {number} education.startYear - Año de inicio
 * @property {number} education.endYear - Año de fin
 * @property {Array<Object>} certifications - Certificaciones
 * @property {string} certifications.name - Nombre de la certificación
 * @property {string} certifications.issuingOrganization - Organización que otorga la certificación
 * @property {Date} certifications.issueDate - Fecha de emisión
 * @property {string} certifications.credentialID - ID de la certificación
 * @property {string} certifications.credentialURL - URL de la certificación
 * @property {Date} createdAt - Fecha de creación (auto)
 * @property {Date} updatedAt - Fecha de actualización (auto)
 */


/**
 * @constant {mongoose.Schema} UserProfileSchema
 * @description Esquema Mongoose para perfiles de usuarios con:
 * - Validación estricta de campos
 * - Timestamps automáticos
 * - Transform para eliminar campos internos en respuestas JSON
 * 
 * @see {@link https://mongoosejs.com/docs/guide.html|Mongoose Schemas}
 */

const UserProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  /**
   * Datos Personales
   */
  personalData: {
    // Fecha de nacimiento
    birthDate: Date,
    // Ubicación
    location: String,
  },

  /**
   * Sección Contacto
   */
  contact: {
    phone: {
      type: String,
      trim: true,
      match: [/^\+?\d{7,15}$/, 'Número telefónico inválido']
    },
    alternateEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Email inválido']
    },
    website: {
      type: String,
      trim: true
    }
  },
  // Sección Redes Sociales
  socialMedia: {
    instagram: { type: String, trim: true },
    facebook: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    x: { type: String, trim: true },
    github: { type: String, trim: true },
    youtube: { type: String, trim: true },
    tiktok: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    telegram: { type: String, trim: true },
  },
  // Sección Profesional
  professional: {
    title: { type: String, trim: true, maxlength: 100 },
    summary: { type: String, maxlength: 2000 },
    skills: [{ type: String, trim: true }],
    interests: [{ type: String, trim: true }]
  },
  // Experiencia Laboral
  experience: [{
    position: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    current: { type: Boolean, default: false },
    description: { type: String }
  }],
  // Educación Adicional (no la de la universidad)
  education: [{
    institution: { type: String, required: true, trim: true },
    degree: { type: String, trim: true },
    fieldOfStudy: { type: String, trim: true },
    startYear: { type: Number },
    endYear: { type: Number }
  }],
  // Certificaciones
  certifications: [{
    name: { type: String, required: true, trim: true },
    issuingOrganization: { type: String, required: true },
    issueDate: { type: Date },
    credentialID: { type: String, trim: true },
    credentialURL: { type: String, trim: true }
  }]
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      delete ret.createdAt;
      delete ret.updatedAt;
      return ret;
    }
  },
  toObject: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      delete ret.createdAt;
      delete ret.updatedAt;
      return ret;
    }
  }
});

export default mongoose.model('UserProfile', UserProfileSchema);