import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    // Para egresados
    alumni: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Alumni',
        required: function () { return this.role === 'egresado'; }
    },

    // Para administradores (sin relación con Alumni)
    fullName: {
        type: String,
        required: function () { return this.role === 'admin'; },
        trim: true
    },

    // Campos comunes
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        minlength: 4,
        maxlength: 20
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
    },
    password: {
        type: String,
        required: true,
        select: false,
        minlength: 8
    },
    role: {
        type: String,
        enum: ['egresado', 'admin'],
        required: true
    },

    // Campos para verificación por email
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: {
        type: String,
        select: false
    },
    verificationTokenExpires: {
        type: Date,
        select: false
    },
    verificationDate: {
        type: Date,
        select: false
    },
    // Campos para manejo de intentos de verificación
    verificationAttempts: {
        type: Number,
        default: 0,
        max: 3,  // Límite de intentos
        select: false
    },
    lastVerificationAttempt: {
        type: Date,
        select: false
    },

    // Campos para manejo de sesión
    lastLogin: Date,
    isActive: {
        type: Boolean,
        default: false
    },

    // Campos para restablecimiento de contraseña
    resetPasswordToken: {
        type: String,
        select: false
    },
    resetPasswordExpires: {
        type: Date,
        select: false
    },
    resetPasswordAttempts: {
        type: Number,
        default: 0,
        max: 3,  // Límite de intentos
        select: false
    },
    lastResetPasswordAttempt: {
        type: Date,
        select: false
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (doc, ret) => {
            delete ret.__v;
            delete ret.verificationToken;
            delete ret.verificationTokenExpires;
            return ret;
        }
    },
    toObject: {
        virtuals: true,
        transform: (doc, ret) => {
            delete ret.__v;
            delete ret.verificationToken;
            delete ret.verificationTokenExpires;
            return ret;
        }
    }
});

export default mongoose.model('User', UserSchema);