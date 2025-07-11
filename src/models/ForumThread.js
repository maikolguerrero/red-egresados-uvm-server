import mongoose from 'mongoose';

const ForumThreadSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'El título es requerido'],
        maxlength: [200, 'El título no puede exceder 200 caracteres']
    },
    content: {
        type: String,
        required: [true, 'El contenido es requerido'],
        maxlength: [5000, 'El contenido no puede exceder 5000 caracteres']
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['general', 'empleos', 'eventos', 'carreras', 'proyectos']
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    media: [{
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
    }],
    tags: [{
        type: String,
        maxlength: [20, 'Cada tag no puede exceder 20 caracteres']
    }],
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
            ret.likeCount = ret.likes ? ret.likes.length : 0;

            // Transformación anidada para imágenes
            if (ret.media) {
                ret.media = ret.media.map(image => {
                    const { _id, ...rest } = image;
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
            ret.likeCount = ret.likes ? ret.likes.length : 0;

            // Transformación anidada para imágenes
            if (ret.media) {
                ret.media = ret.media.map(image => {
                    const { _id, ...rest } = image;
                    return { id: _id, ...rest };
                });
            }
            return ret;
        }
    }
});

// Virtual para comentarios
ForumThreadSchema.virtual('comments', {
    ref: 'ForumComment',
    localField: '_id',
    foreignField: 'thread'
});

// Indice para popularidad
ForumThreadSchema.index({
    likeCount: -1,
    commentCount: -1,
    viewCount: -1
});

ForumThreadSchema.index({ title: 'text', content: 'text' });
ForumThreadSchema.index({ category: 1 });
ForumThreadSchema.index({ tags: 1 });

export default mongoose.model('ForumThread', ForumThreadSchema);