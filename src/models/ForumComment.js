import mongoose from 'mongoose';

const ForumCommentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: [true, 'El contenido es requerido'],
        maxlength: [2000, 'El comentario no puede exceder 2000 caracteres'],
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    thread: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumThread',
        required: true
    },
    parentComment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumComment',
        default: null,
        validate: {
            validator: async function (value) {
                if (!value) return true;
                const parent = await mongoose.model('ForumComment').findById(value);
                return !parent.parentComment;
            },
            message: 'No se permiten respuestas anidadas más allá del primer nivel'
        }
    },
    mentions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    media: {
        type: {
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
            ret.likeCount = ret.likes ? ret.likes.length : 0;

            // Transformación para media
            if (ret.media) {
                const { _id, ...rest } = ret.media;
                ret.media = { id: _id, ...rest };
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

            // Transformación para media
            if (ret.media) {
                const { _id, ...rest } = ret.media;
                ret.media = { id: _id, ...rest };
            }
            return ret;
        }
    }
});

// Middleware para extraer menciones antes de guardar
ForumCommentSchema.pre('save', async function (next) {
    if (this.isModified('content')) {
        const mentionRegex = /@([a-zA-Z0-9_]+)/g;
        const mentions = [];
        let match;

        while ((match = mentionRegex.exec(this.content)) !== null) {
            const user = await mongoose.model('User').findOne({ username: match[1] });
            if (user) mentions.push(user._id);
        }

        this.mentions = mentions;
    }
    next();
});

export default mongoose.model('ForumComment', ForumCommentSchema);