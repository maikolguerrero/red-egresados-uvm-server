import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: [
            'like',
            'mention',
            'thread_mention',
            'thread_comment',
            'comment_reply',
            'thread_activity',
            'event_reminder',
            'project_join_request',
            'project_request_update',
            'new_report',
            'report_resolved',
            'user_warning',
            'system'
        ]
    },
    data: {
        type: {
            // Campos comunes
            message: String,
            // Campos para likes
            targetType: String,
            targetId: mongoose.Schema.Types.ObjectId,
            likerUsername: String,
            // Campos para hilos
            threadId: mongoose.Schema.Types.ObjectId,
            threadTitle: String,
            // Campos para comentarios
            commentId: mongoose.Schema.Types.ObjectId,
            commentContent: String,
            commenterUsername: String,
            isThreadAuthor: Boolean,
            // Campos para respuestas
            parentCommentId: mongoose.Schema.Types.ObjectId,
            parentCommentContent: String,
            replyId: mongoose.Schema.Types.ObjectId,
            replyContent: String,
            replierUsername: String,
            // Campos para reportes
            reportId: mongoose.Schema.Types.ObjectId,
            // Campos para recordatorios de eventos
            eventTitle: String,
            eventDate: Date,
            daysUntil: Number,
            minutesUntil: Number,
            // Campos para solicitudes de proyectos
            projectId: mongoose.Schema.Types.ObjectId,
            requesterUsername: String,
            requestMessage: String,
            reviewMessage: String,
            // Campos para advertencias
            severity: String,
        },
        required: true
    },
    fromUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    read: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            ret.data.id = ret.data._id;
            delete ret.data._id;
            return ret;
        }
    },
    toObject: {
        virtuals: true,
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            ret.data.id = ret.data._id;
            delete ret.data._id;
            return ret;
        }
    }
});

export default mongoose.model('Notification', NotificationSchema);