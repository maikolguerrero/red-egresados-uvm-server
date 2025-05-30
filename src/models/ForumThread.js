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
    media: {
        type: {
            url: String,
            publicId: String,
            mediaType: {
                type: String,
                enum: ['image', 'video']
            },
            width: Number,
            height: Number,
            duration: Number // Solo para videos
        },
        required: false
    },
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

ForumThreadSchema.index({ title: 'text', content: 'text' });

export default mongoose.model('ForumThread', ForumThreadSchema);