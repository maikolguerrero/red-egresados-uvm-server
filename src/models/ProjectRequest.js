import mongoose from 'mongoose';

const ProjectRequestSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    message: {
        type: String,
        maxlength: 500
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: {
        type: Date
    },
    expiresAt: { // Este campo contendrá la fecha exacta de eliminación
        type: Date,
        required: true,
        default: () => {
            const now = Date.now(); // Hora actual en milisegundos
            const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000; // 30 días en milisegundos
            return new Date(now + thirtyDaysInMs); // Retorna la fecha exacta de expiración
        }
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    },
    toObject: {
        virtuals: true,
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

// Índices para búsqueda rápida
ProjectRequestSchema.index({ project: 1, user: 1, status: 1 });

// Índice para autoeliminación
ProjectRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('ProjectRequest', ProjectRequestSchema);