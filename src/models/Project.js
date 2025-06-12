import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'El título es requerido'],
        maxlength: [100, 'El título no puede exceder 100 caracteres'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'La descripción es requerida'],
        maxlength: [5000, 'La descripción no puede exceder 5000 caracteres']
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    collaborators: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['creator', 'admin', 'member'],
            default: 'member'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed', 'paused', 'cancelled'],
        default: 'not_started'
    },
    tags: [{
        type: String,
        maxlength: [20, 'Cada tag no puede exceder 20 caracteres']
    }],
    media: [{
        mediaType: {
            type: String,
            enum: ['image', 'video', 'document']
        },
        url: String,
        publicId: String,
        format: String,
        dimensions: {
            width: Number,
            height: Number
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    viewCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;

            if (ret.media) {
                ret.media = ret.media.map(media => {
                    const { _id, ...rest } = media;
                    return { id: _id, ...rest };
                });
            }

            if (ret.collaborators) {
                ret.collaborators = ret.collaborators.map(collaborator => {
                    const { _id, ...rest } = collaborator;
                    return { id: _id, ...rest };
                });
            }

            return ret;
        }
    },
    toObject: {
        virtuals: true,
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;

            if (ret.media) {
                ret.media = ret.media.map(media => {
                    const { _id, ...rest } = media;
                    return { id: _id, ...rest };
                });
            }

            if (ret.collaborators) {
                ret.collaborators = ret.collaborators.map(collaborator => {
                    const { _id, ...rest } = collaborator;
                    return { id: _id, ...rest };
                });
            }

            return ret;
        }
    }
});

// Índices para búsqueda
ProjectSchema.index({ title: 'text', description: 'text' });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ tags: 1 });
ProjectSchema.index({ owner: 1 });
ProjectSchema.index({ 'collaborators.user': 1 });

export default mongoose.model('Project', ProjectSchema);