/**
 * @module models/Alumni
 * @description Modelo de egresados con: 
 * - Validación contra registros oficiales
 * - Relación 1:1 con User para autenticación
 * @example
 * // Buscar egresado por cédula:
 * const alumni = await Alumni.findOne({ idNumber: 'V-12345678' });
 */

import mongoose from 'mongoose';

/**
 * @typedef {Object} Alumni
 * @description Egresado registrado en el sistema
 * @property {mongoose.Types.ObjectId} _id - ID único generado por MongoDB
 * @property {string} idNumber - Cédula (formato V/E-12345678)
 * @property {string} firstName - Nombres
 * @property {string} lastName - Apellidos
 * @property {Date} birthDate - Fecha de nacimiento
 * @property {string} email - Email institucional validado
 * @property {string} location - Ubicación geográfica
 * @property {string} degree - Carrera cursada
 * @property {string} [mention] - Mención/Especialización (opcional)
 * @property {string} studentId - Número de expediente único
 * @property {Date} graduationDate - Fecha de graduación
 * @property {boolean} isRegistered - Indica si completó registro en plataforma
 * @property {Date} [registrationDate] - Fecha de registro en plataforma
 * @property {Date} createdAt - Fecha de creación (auto)
 * @property {Date} updatedAt - Fecha de actualización (auto)
 */

const AlumniSchema = new mongoose.Schema({
    /**
     * Datos Personales
     */
    // Cédula
    idNumber: {
        type: String,
        required: true,
        unique: true,
        match: [/^[VE]-\d+$/, 'Formato cédula inválido (Ej: V-12345678)']
    },
    // Nombres
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    // Apellidos
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    // Fecha de nacimiento
    birthDate: {
        type: Date,
        required: true
    },
    // Email
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
    },
    // Ubicación
    location: {
        type: String,
        required: true
    },

    /**
     * Datos académicos
     */
    // Carrera
    degree: {
        type: String,
        required: true,
        /**
         * @description Carreras disponibles en el sistema:
         * - Licenciatura en Administración de Empresas
         * - Licenciatura en Contaduría Pública
         * - Ingeniería de Computación
         * - Ingeniería Industrial
         * - Derecho
         * - Ciencias Políticas y Administrativas
        */
        enum: [
            'Licenciatura en Administración de Empresas',
            'Licenciatura en Contaduría Pública',
            'Ingeniería de Computación',
            'Ingeniería Industrial',
            'Derecho',
            'Ciencias Políticas y Administrativas'
        ]
    },
    // Mención
    mention: {
        type: String,
        trim: true
    },
    // Nº Expediente
    studentId: {
        type: String,
        required: true,
        unique: true
    },
    // Fecha de grado
    graduationDate: {
        type: Date,
        required: true
    },

    /**
    * Control de registro
    */
    // Indica si completó el registro
    isRegistered: {
        type: Boolean,
        default: false
    },
    // Fecha de registro
    registrationDate: {
        type: Date
    },
    /**
     * Relación con usuario (solo egresados)
     */
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        unique: true,
        sparse: true
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            delete ret.createdAt;
            delete ret.updatedAt;
            return ret;
        }
    },
    toObject: {
        virtuals: true,
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            delete ret.createdAt;
            delete ret.updatedAt;
            return ret;
        }
    }
});

export default mongoose.model('Alumni', AlumniSchema);