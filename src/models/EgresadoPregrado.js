import mongoose from 'mongoose';

const EgresadoPregradoSchema = new mongoose.Schema({
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
  carrera: {
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
      delete ret.actaGrado;
      delete ret.fechaGrado;
      delete ret.numeroAsignado;
      delete ret.tomo;
      delete ret.folio;
      delete ret.createdAt;
      delete ret.updatedAt;
      return ret;
    }
  },
  toObject: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.actaGrado;
      delete ret.fechaGrado;
      delete ret.numeroAsignado;
      delete ret.tomo;
      delete ret.folio;
      delete ret.createdAt;
      delete ret.updatedAt;
      return ret;
    }
  }
});

// Índice compuesto para evitar duplicados
EgresadoPregradoSchema.index({ cedula: 1, carrera: 1, fechaGrado: 1 }, { unique: true });

export default mongoose.model('EgresadoPregrado', EgresadoPregradoSchema);