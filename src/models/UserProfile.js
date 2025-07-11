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
 * 
 * @property {Object} contact - Información de contacto
 * @property {string} contact.phone - Número telefónico
 * @property {boolean} contact.phone.isPublic - Indica si el número telefónico es público
 * 
 * @property {string} contact.alternateEmail - Email alternativo
 * @property {boolean} contact.alternateEmail.isPublic - Indica si el email alternativo es público
 * 
 * @property {string} contact.website - URL del sitio web personal
 * @property {boolean} contact.website.isPublic - Indica si el sitio web es público
 * 
 * @property {Object} socialMedia - Información de redes sociales
 * @property {string} socialMedia.instagram - URL de Instagram
 * @property {boolean} socialMedia.instagram.isPublic - Indica si el URL de Instagram es público
 * 
 * @property {string} socialMedia.facebook - URL de Facebook
 * @property {boolean} socialMedia.facebook.isPublic - Indica si el URL de Facebook es público
 * 
 * @property {string} socialMedia.linkedin - URL de LinkedIn
 * @property {boolean} socialMedia.linkedin.isPublic - Indica si el URL de LinkedIn es público
 * 
 * @property {string} socialMedia.x - URL de X
 * @property {boolean} socialMedia.x.isPublic - Indica si el URL de X es público
 * 
 * @property {string} socialMedia.github - URL de GitHub
 * @property {boolean} socialMedia.github.isPublic - Indica si el URL de GitHub es público
 * 
 * @property {string} socialMedia.youtube - URL de YouTube
 * @property {boolean} socialMedia.youtube.isPublic - Indica si el URL de YouTube es público
 * 
 * @property {string} socialMedia.tiktok - URL de TikTok
 * @property {boolean} socialMedia.tiktok.isPublic - Indica si el URL de TikTok es público
 * 
 * @property {string} socialMedia.whatsapp - URL de WhatsApp
 * @property {boolean} socialMedia.whatsapp.isPublic - Indica si el URL de WhatsApp es público
 * 
 * @property {string} socialMedia.telegram - URL de Telegram
 * @property {boolean} socialMedia.telegram.isPublic - Indica si el URL de Telegram es público
 * 
 * @property {Object} professional - Información profesional
 * @property {string} professional.title - Titulo profesional
 * @property {boolean} professional.title.isPublic - Indica si el titulo profesional es público
 * 
 * @property {string} professional.summary - Resumen profesional
 * @property {boolean} professional.summary.isPublic - Indica si el resumen profesional es público
 * 
 * @property {Array<string>} professional.skills - Habilidades profesionales
 * @property {boolean} professional.skills.isPublic - Indica si las habilidades profesionales son públicas
 * 
 * @property {Array<string>} professional.interests - Intereses profesionales
 * @property {boolean} professional.interests.isPublic - Indica si los intereses profesionales son públicos
 * 
 * @property {Array<Object>} experience - Experiencia laboral
 * @property {string} experience.position - Titulo de la posición
 * @property {string} experience.company - Empresa
 * @property {Date} experience.startDate - Fecha de inicio
 * @property {Date} experience.endDate - Fecha de fin
 * @property {boolean} experience.current - Indica si es la experiencia actual
 * @property {string} experience.description - Descripción de la experiencia
 * @property {boolean} experience.isPublic - Indica si la experiencia es pública
 * 
 * @property {Array<Object>} education - Educación adicional
 * @property {string} education.institution - Institución
 * @property {string} education.degree - Grado obtenido
 * @property {string} education.fieldOfStudy - Campo de estudio
 * @property {number} education.startYear - Año de inicio
 * @property {number} education.endYear - Año de fin
 * @property {boolean} education.isPublic - Indica si la educación es pública
 * 
 * @property {Array<Object>} certifications - Certificaciones
 * @property {string} certifications.name - Nombre de la certificación
 * @property {boolean} certifications.isPublic - Indica si la certificación es pública
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
    birthDate: {
      value: Date,
      isPublic: { type: Boolean, default: false }
    },
    location: {
      value: String,
      isPublic: { type: Boolean, default: false }
    },
  },

  /**
   * Sección Contacto
   */
  contact: {
    phone: {
      value: {
        type: String,
        trim: true,
        match: [/^\+?\d{7,15}$/, 'Número telefónico inválido']
      },
      isPublic: { type: Boolean, default: false }
    },
    alternateEmail: {
      value: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Email inválido']
      },
      isPublic: { type: Boolean, default: false }
    },
    website: {
      value: {
        type: String,
        trim: true
      },
      isPublic: { type: Boolean, default: true }
    }
  },

  // Sección Redes Sociales
  socialMedia: {
    instagram: {
      value: { type: String, trim: true },
      isPublic: { type: Boolean, default: true }
    },
    facebook: {
      value: { type: String, trim: true },
      isPublic: { type: Boolean, default: true }
    },
    linkedin: {
      value: { type: String, trim: true },
      isPublic: { type: Boolean, default: true }
    },
    x: {
      value: { type: String, trim: true },
      isPublic: { type: Boolean, default: true }
    },
    github: {
      value: { type: String, trim: true },
      isPublic: { type: Boolean, default: true }
    },
    youtube: {
      value: { type: String, trim: true },
      isPublic: { type: Boolean, default: true }
    },
    tiktok: {
      value: { type: String, trim: true },
      isPublic: { type: Boolean, default: true }
    },
    whatsapp: {
      value: { type: String, trim: true },
      isPublic: { type: Boolean, default: false }
    },
    telegram: {
      value: { type: String, trim: true },
      isPublic: { type: Boolean, default: false }
    },
  },

  // Sección Profesional
  professional: {
    title: { value: String, isPublic: Boolean },
    summary: { value: String, isPublic: Boolean },
    skills: {
      values: [{ type: String }],
      isPublic: Boolean
    },
    interests: {
      values: [{ type: String }],
      isPublic: Boolean
    }
  },

  experience: {
    items: [{
      position: { type: String, required: true, trim: true },
      company: { type: String, required: true, trim: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date },
      current: { type: Boolean, default: false },
      description: { type: String }
    }],
    isPublic: { type: Boolean, default: true }
  },

  education: {
    items: [{
      institution: { type: String, required: true, trim: true },
      degree: { type: String, trim: true },
      fieldOfStudy: { type: String, trim: true },
      startYear: { type: Number },
      endYear: { type: Number }
    }],
    isPublic: { type: Boolean, default: true }
  },

  certifications: {
    items: [{
      name: { type: String, required: true, trim: true },
      issuingOrganization: { type: String, required: true },
      issueDate: { type: Date },
      credentialID: { type: String, trim: true },
      credentialURL: { type: String, trim: true }
    }],
    isPublic: { type: Boolean, default: true }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      delete ret.createdAt;
      delete ret.updatedAt;

      // Transformar los arrays para usar id en lugar de _id
      ['experience', 'education', 'certifications'].forEach(field => {
        if (ret[field]?.items) {
          ret[field].items = ret[field].items.map(item => {
            // Si tiene _id (por compatibilidad con datos existentes)
            if (item._id) {
              item.id = item._id.toString();
              delete item._id;
            }
            return item;
          });
        }
      });
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

      // Transformar los arrays para usar id en lugar de _id
      ['experience', 'education', 'certifications'].forEach(field => {
        if (ret[field]?.items) {
          ret[field].items = ret[field].items.map(item => {
            // Si tiene _id (por compatibilidad con datos existentes)
            if (item._id) {
              item.id = item._id.toString();
              delete item._id;
            }
            return item;
          });
        }
      });
      return ret;
    }
  }
});

export default mongoose.model('UserProfile', UserProfileSchema);