/**
 * @module models/User
 * @description Modelo para usuarios del sistema con:
 * - Autenticación segura (JWT + refresh tokens)
 * - Gestión de roles (egresado/admin)
 * - Verificación por email
 * - Restablecimiento de contraseña
 * - Relación 1:1 con Alumni para egresados
 * @example
 * // Buscar usuario activo por email:
 * const user = await User.findOne({ email: 'correo@uvm.edu.ve', isActive: true })
 *                        .select('+password');
 */

import mongoose from 'mongoose';

/**
 * @typedef {Object} User
 * @description Usuario registrado en el sistema
 * @property {mongoose.Types.ObjectId} _id - ID único generado por MongoDB
 * @property {string} username - Nombre de usuario (único, min 4, max 20 chars)
 * @property {string} email - Email institucional (validado por regex)
 * @property {string} password - Hash bcrypt de la contraseña
 * @property {'egresado'|'admin'} role - Rol del sistema
 * @property {Object} profilePicture - Información de la foto de perfil
 * @property {string} profilePicture.url - URL de la foto de perfil
 * @property {string} profilePicture.publicId - ID público de la foto de perfil
 * @property {string} profilePicture.format - Formato de la foto de perfil
 * @property {Object} profilePicture.dimensions - Dimensiones de la foto de perfil
 * @property {number} profilePicture.dimensions.width - Ancho de la foto de perfil
 * @property {number} profilePicture.dimensions.height - Alto de la foto de perfil
 * @property {Date} profilePicture.uploadedAt - Fecha de subida de la foto de perfil
 * @property {boolean} isVerified - Indica si el email fue verificado
 * @property {boolean} isActive - Indica si la cuenta está habilitada
 * @property {Date} lastLogin - Fecha del último acceso
 * @property {mongoose.Types.ObjectId} [alumni] - Referencia a Alumni (solo role=egresado)
 * @property {string} [fullName] - Nombre completo (solo role=admin)
 * @property {Date} createdAt - Fecha de creación (auto)
 * @property {Date} updatedAt - Fecha de actualización (auto)
 */

/**
 * @constant {mongoose.Schema} UserSchema
 * @description Esquema Mongoose para usuarios con:
 * - Validación estricta de campos
 * - Seguridad: campos sensibles con select:false
 * - Comportamiento condicional según rol
 * - Timestamps automáticos
 * - Transform para eliminar campos internos en respuestas JSON
 * 
 * @see {@link https://mongoosejs.com/docs/guide.html|Mongoose Schemas}
 */
const UserSchema = new mongoose.Schema({
    /**
     * Relación con Alumni (solo egresados)
     */
    alumni: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Alumni',
        required: function () { return this.role === 'egresado'; }
    },

    /**
     * Relación con UserProfile
     */
    profile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserProfile'
    },

    /**
     * Datos para administradores (solo role=admin)
     */
    fullName: {
        type: String,
        required: function () { return this.role === 'admin'; },
        trim: true
    },

    /**
     * Credenciales
     */
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
        minlength: 8,
        /**
         * @description Validación personalizada de contraseña:
         * - Mínimo 8 caracteres
         * - Requiere: 1 mayúscula, 1 minúscula, 1 número
         * - Se hashea con bcrypt antes de guardar
         */
        // validate: {
        //     validator: function (v) {
        //         return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(v);
        //     },
        //     message: props => `La contraseña debe tener al menos 8 caracteres con: 1 mayúscula, 1 minúscula y 1 número`
        // }
    },
    role: {
        type: String,
        enum: ['egresado', 'admin'],
        required: true
    },
    profilePicture: {
        url: {
            type: String,
            default: null
        },
        publicId: {
            type: String,
            default: null
        },
        format: String,
        dimensions: {
            width: Number,
            height: Number
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    },

    /**
     * Verificación de email
     */
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

    /**
     * Gestión de sesión
     */
    lastLogin: Date,
    isActive: {
        type: Boolean,
        default: false
    },

    /**
     * Restablecimiento de contraseña
     */
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
    /**
    * @description Configuración para transformar documentos en JSON:
    * - Añade virtuals
    * - Elimina campos internos (__v, tokens)
    * @constant {object} toJSON
    */
    toJSON: {
        virtuals: true,
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            delete ret.password;
            delete ret.verificationToken;
            delete ret.verificationTokenExpires;
            delete ret.resetPasswordToken;
            delete ret.resetPasswordExpires;
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
            delete ret.password;
            delete ret.verificationToken;
            delete ret.verificationTokenExpires;
            delete ret.resetPasswordToken;
            delete ret.resetPasswordExpires;
            delete ret.createdAt;
            delete ret.updatedAt;
            return ret;
        }
    }
});

export default mongoose.model('User', UserSchema);