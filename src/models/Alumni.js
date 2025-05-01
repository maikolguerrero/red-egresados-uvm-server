import mongoose from 'mongoose';

const AlumniSchema = new mongoose.Schema({
    /**
    * Datos personales
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
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (doc, ret) => {
            delete ret.__v;
            return ret;
        }
    },
    toObject: {
        virtuals: true,
        transform: (doc, ret) => {
            delete ret.__v;
            return ret;
        }
    }
});

export default mongoose.model('Alumni', AlumniSchema);