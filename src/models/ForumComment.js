import mongoose from 'mongoose';

const ForumCommentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: [true, 'El contenido es requerido'],
        maxlength: [2000, 'El comentario no puede exceder 2000 caracteres']
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
        ref: 'ForumComment'
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // likeCount: {
    //     type: Number,
    //     default: 0,
    //     set: value => value.length
    // },
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
    isSolution: {
        type: Boolean,
        default: false
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

export default mongoose.model('ForumComment', ForumCommentSchema);