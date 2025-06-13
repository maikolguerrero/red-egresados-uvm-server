import Notification from '../models/Notification.js';
import ForumComment from '../models/ForumComment.js';

const isProduction = process.env.NODE_ENV === 'production';

export default class NotificationService {
    constructor(io, logger) {
        this.io = io;
        this.logger = logger.child({ service: 'NotificationService' });
    }

    /**
     * @method createNotification
     * @description Crea una notificación y la envía al usuario correspondiente
     */
    async createNotification({ userId, type, data, fromUser }) {
        this.logger.info('Creando notificación', { userId, type, data, fromUser });
        try {
            const notification = await Notification.create({
                user: userId,
                type,
                data,
                fromUser,
                read: false
            });

            // Emitir la notificación al usuario específico
            this.io.to(`user_${userId}`).emit('new_notification', notification);

            return notification;
        } catch (error) {
            this.logger.error('Error creating notification:', {
                error: error.message,
                stack: !isProduction ? error.stack : undefined,
                action: 'createNotification'
            });
        }
    }

    /**
     * @method sendLikeNotification
     * @description Notifica cuando alguien da like a un hilo/comentario
     */
    async sendLikeNotification({ targetUserId, item, likerId, likerUsername, targetType, targetId }) {
        try {
            let message = '';
            let additionalData = {};

            if (targetType === 'thread') {
                message = `A @${likerUsername} le gustó tu hilo: "${item.title}"`;
                additionalData = {
                    threadId: targetId
                };
            } else if (targetType === 'comment') {
                // Obtener el comentario y el hilo relacionado
                const comment = await ForumComment.findById(targetId)
                    .select('content thread')
                    .populate({
                        path: 'thread',
                        select: 'title _id'
                    })
                    .lean();

                message = `A @${likerUsername} le gustó tu comentario: "${comment.content.substring(0, 50)}${comment.content.length > 50 ? '...' : ''}"`;
                additionalData = {
                    threadId: comment.thread._id,
                    commentId: targetId
                };
            }

            return this.createNotification({
                userId: targetUserId,
                type: 'like',
                data: {
                    ...additionalData,
                    targetType,
                    targetId,
                    message,
                    likerUsername
                },
                fromUser: likerId
            });
        } catch (error) {
            this.logger.error('Error al enviar notificación de like:', {
                error: error.message,
                stack: !isProduction ? error.stack : undefined,
                action: 'sendLikeNotification'
            });
            // En caso de error, enviar una notificación básica
            return this.createNotification({
                userId: targetUserId,
                type: 'like',
                data: {
                    targetType,
                    targetId,
                    message: `A @${likerUsername} le gustó tu ${targetType}`,
                    likerUsername
                },
                fromUser: likerId
            });
        }
    }

    /**
     * @method sendThreadCommentNotification
     * @description Notifica al creador del hilo cuando alguien comenta
     */
    async sendThreadCommentNotification({ thread, comment, commenterId, commenterUsername }) {
        try {
            // No notificar si el autor comenta su propio hilo
            if (thread.author._id.toString() === commenterId.toString()) {
                return null;
            }

            const message = `@${commenterUsername} comentó tu hilo: "${comment.content.substring(0, 50)}${comment.content.length > 50 ? '...' : ''}"`;

            return this.createNotification({
                userId: thread.author._id,
                type: 'thread_comment',
                data: {
                    threadId: thread._id,
                    commentId: comment._id,
                    message,
                    commenterUsername
                },
                fromUser: commenterId
            });
        } catch (error) {
            this.logger.error('Error al enviar notificación de comentario en hilo:', {
                error: error.message,
                stack: !isProduction ? error.stack : undefined,
                action: 'sendThreadCommentNotification'
            });
            // En caso de error, enviar una notificación básica
            return this.createNotification({
                userId: thread.author._id,
                type: 'thread_comment',
                data: {
                    threadId: thread._id,
                    commentId: comment._id,
                    message: `@${commenterUsername} comentó tu hilo`,
                    commenterUsername
                },
                fromUser: commenterId
            });
        }
    }

    /**
     * @method sendCommentReplyNotification
     * @description Notifica al autor del comentario y al autor del hilo cuando alguien responde
     */
    async sendCommentReplyNotification({ parentComment, reply, replierId, replierUsername }) {
        try {
            const notifications = [];

            // 1. Notificar al autor del comentario padre (si no es el mismo que responde)
            if (!parentComment.author._id.equals(replierId)) {
                // const messageToCommentAuthor = `${replierUsername} respondió a tu comentario en "${parentComment.thread.title}": "${reply.content.substring(0, 50)}${reply.content.length > 50 ? '...' : ''}"`;
                const messageToCommentAuthor = `@${replierUsername} respondió a tu comentario: "${reply.content.substring(0, 50)}${reply.content.length > 50 ? '...' : ''}"`;

                notifications.push(
                    this.createNotification({
                        userId: parentComment.author._id,
                        type: 'comment_reply',
                        data: {
                            threadId: parentComment.thread._id,
                            parentCommentId: parentComment._id,
                            replyId: reply._id,
                            message: messageToCommentAuthor,
                            replierUsername
                        },
                        fromUser: replierId
                    })
                );
            }

            // 2. Notificar al autor del hilo (si no es el mismo que responde y no es el autor del comentario)
            if (!parentComment.thread.author._id.equals(replierId) &&
                !parentComment.thread.author._id.equals(parentComment.author._id)) {
                const messageToThreadAuthor = `@${replierUsername} respondió a un comentario en tu hilo: "${reply.content.substring(0, 50)}${reply.content.length > 50 ? '...' : ''}"`;

                notifications.push(
                    this.createNotification({
                        userId: parentComment.thread.author._id,
                        type: 'thread_activity',
                        data: {
                            threadId: parentComment.thread._id,
                            parentCommentId: parentComment._id,
                            replyId: reply._id,
                            message: messageToThreadAuthor,
                            replierUsername
                        },
                        fromUser: replierId
                    })
                );
            }

            return Promise.all(notifications);
        } catch (error) {
            this.logger.error('Error al enviar notificación de respuesta:', {
                error: error.message,
                stack: !isProduction ? error.stack : undefined,
                action: 'sendCommentReplyNotification'
            });
            // En caso de error, enviar una notificación básica
            return this.createNotification({
                userId: parentComment.thread.author._id,
                type: 'thread_comment',
                data: {
                    threadId: parentComment.thread._id,
                    commentId: reply._id,
                    message: `@${replierUsername} respondió a tu comentario`,
                    replierUsername
                },
                fromUser: replierId
            });
        }
    }

    /**
     * @method sendMentionNotification
     * @description Notifica cuando alguien menciona a un usuario en un comentario
     */
    async sendMentionNotification({ mentionedUserId, comment, thread, commenterId, commenterUsername }) {
        try {
            // Evitar notificar si el usuario se menciona a sí mismo
            if (mentionedUserId.equals(commenterId)) {
                return null;
            }

            const message = `${commenterUsername} te mencionó en un comentario: "${comment.content.substring(0, 50)}${comment.content.length > 50 ? '...' : ''}"`;

            return this.createNotification({
                userId: mentionedUserId,
                type: 'mention',
                data: {
                    threadId: thread._id,
                    threadTitle: thread.title,
                    commentId: comment._id,
                    message,
                    commenterUsername,
                },
                fromUser: commenterId
            });
        } catch (error) {
            this.logger.error('Error al enviar notificación de mención:', {
                error: error.message,
                stack: !isProduction ? error.stack : undefined,
                action: 'sendMentionNotification'
            });
            // En caso de error, enviar una notificación básica
            return this.createNotification({
                userId: mentionedUserId,
                type: 'mention',
                data: {
                    threadId: thread._id,
                    commentId: comment._id,
                    message: `@${commenterUsername} te mencionó en un comentario`,
                    commenterUsername
                },
                fromUser: commenterId
            });
        }
    }
}