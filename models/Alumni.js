import mongoose from 'mongoose';

const AlumniSchema = new mongoose.Schema({
    // Datos personales
    idNumber: { type: String, required: true, unique: true, match: [/^[VE]-\d+$/, 'Formato cédula inválido (Ej: V-12345678)'] }, // Cédula
    firstName: { type: String, required: true },          // Nombres
    lastName: { type: String, required: true },          // Apellidos
    birthDate: { type: Date, required: true },           // Fecha de nacimiento
    email: { type: String, required: true, unique: true, match: /^\S+@\S+\.\S+$/ },
    location: { type: String, required: true },          // Ubicación

    // Datos académicos
    degree: {                                           // Carrera
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
    mention: { type: String },                          // Mención
    studentId: { type: String, required: true, unique: true }, // Nº Expediente
    graduationDate: { type: Date, required: true },     // Fecha de grado

    // Control de registro
    isRegistered: { type: Boolean, default: false } // Indica si completó el registro
}, {
    timestamps: true,
    minimize: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Método para comparar contFFraseñas
AlumniSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('Alumni', AlumniSchema);