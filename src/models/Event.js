/**
 * @module models/Event
 * @description Modelo para eventos con:
 * - Información básica (título, descripción, tipo, fecha, ubicación)
 * - Organizadores y invitados especiales
 * - Relación con usuario que creó el evento
 * - Capacidad y estado (activo/inactivo)
 * - Etiquetas y medios (imágenes y videos)
 * @example
 * // Buscar evento por ID:
 * const event = await Event.findById('id_del_evento');
 */

import mongoose from 'mongoose';

/**
 * @typedef {Object} Event
 * @description Evento registrado en el sistema
 * @property {mongoose.Types.ObjectId} _id - ID único generado por MongoDB
 * @property {string} title - Título del evento (requerido, max 100 chars)
 * @property {string} description - Descripción del evento (requerido, max 2000 chars)
 * @property {'conferencia'|'taller'|'seminario'|'social'|'networking'|'otros'} eventType - Tipo del evento (requerido)
 * @property {Date} startDate - Fecha de inicio del evento (requerido)
 * @property {Date} endDate - Fecha de finalización del evento (requerido)
 * @property {string} location - Ubicación del evento (requerido)
 * @property {string} virtualLink - Enlace virtual del evento
 * @property {Array<string>} organizers - Organizadores del evento
 * @property {Array<string>} specialGuests - Invitados especiales
 * @property {mongoose.Types.ObjectId} createdBy - ID del usuario que creó el evento (requerido)
 * @property {number} capacity - Capacidad del evento
 * @property {boolean} certificate - Indica si el evento tiene certificado
 * @property {string} imageUrl - URL de la imagen del evento
 * @property {boolean} isActive - Indica si el evento está activo
 * @property {Array<string>} tags - Etiquetas del evento
 * @property {Date} createdAt - Fecha de creación (auto)
 * @property {Date} updatedAt - Fecha de actualización (auto)
 */

/**
 * @constant {mongoose.Schema} EventSchema
 * @description Esquema Mongoose para eventos con:
 * - Validación estricta de campos
 * - Timestamps automáticos
 * - Transform para eliminar campos internos en respuestas JSON
 * 
 * @see {@link https://mongoosejs.com/docs/guide.html|Mongoose Schemas}
 */
const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'El título es requerido'],
    trim: true,
    maxlength: [100, 'El título no puede exceder 100 caracteres']
  },
  description: {
    type: String,
    required: [true, 'La descripción es requerida'],
    maxlength: [2000, 'La descripción no puede exceder 2000 caracteres']
  },
  eventType: {
    type: String,
    enum: ['conferencia', 'taller', 'seminario', 'social', 'networking', 'otros'],
    required: true
  },
  startDate: {
    type: Date,
    required: [true, 'La fecha de inicio es requerida']
  },
  endDate: {
    type: Date,
    required: [true, 'La fecha de finalización es requerida'],
    validate: {
      validator: function (value) {
        return value > this.startDate;
      },
      message: 'La fecha de fin debe ser posterior a la de inicio'
    }
  },
  location: {
    type: String,
    required: [true, 'La ubicación es requerida'],
    trim: true
  },
  virtualLink: {
    type: String,
    trim: true
  },
  organizers: [{
    type: String
  }],
  specialGuests: [{
    type: String
  }],
  createdBy: {
    type: String,
    ref: 'User',
    required: true
  },
  capacity: {
    type: Number,
    min: [0, 'La capacidad debe ser al menos 0']
  },
  certificate: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  media: [
    {
      mediaType: {
        type: String,
        enum: ['image', 'video']
      },
      url: String,
      publicId: String,
      duration: Number, // en segundos
      format: String,
      dimensions: {
        width: Number,
        height: Number
      }
    }
  ],
  savedByUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }]
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      // Transformación principal del documento
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;

      // Transformación anidada para imágenes
      if (ret.media) {
        ret.media = ret.media.map(media => {
          const { _id, ...rest } = media;
          return { id: _id, ...rest };
        });
      }

      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (doc, ret) => {
      // Misma transformación para toObject
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;

      if (ret.media) {
        ret.media = ret.media.map(media => {
          const { _id, ...rest } = media;
          return { id: _id, ...rest };
        });
      }

      return ret;
    }
  }
});

// Índices para búsquedas frecuentes
EventSchema.index({ title: 'text', description: 'text' });
EventSchema.index({ startDate: 1 });
EventSchema.index({ eventType: 1 });
EventSchema.index({ tags: 1 });

export default mongoose.model('Event', EventSchema);