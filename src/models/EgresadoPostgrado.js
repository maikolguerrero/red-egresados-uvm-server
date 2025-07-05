import mongoose from 'mongoose';

const EgresadoPostgradoSchema = new mongoose.Schema({
  cedula: {
    type: String,
    required: true,
    match: [/^[VE]-\d+$/, 'Formato cédula inválido (Ej: V-12345678)']
  },
  nombreCompleto: {
    type: String,
    required: true,
    trim: true
  },
  programa: {
    type: String,
    required: true
  },
  actaGrado: {
    type: String,
    required: true
  },
  fechaGrado: {
    type: Date,
    required: true
  },
  numeroAsignado: {
    type: String,
    required: true
  },
  tomo: {
    type: String,
    required: true
  },
  folio: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Índice compuesto para evitar duplicados
EgresadoPostgradoSchema.index({ cedula: 1, programa: 1, fechaGrado: 1 }, { unique: true });

export default mongoose.model('EgresadoPostgrado', EgresadoPostgradoSchema);