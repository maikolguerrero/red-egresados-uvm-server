import Notification from '../models/Notification.js';
import ForumComment from '../models/ForumComment.js';
import User from '../models/User.js';
import logger from '../config/logger.js';

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

            // Emitir conteo actualizado
            const unreadCount = await Notification.countDocuments({
                user: userId,
                read: false
            });

            this.io.to(`user_${userId}`).emit('notification_count', unreadCount);

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

            const message = `@${commenterUsername} te mencionó en un comentario: "${comment.content.substring(0, 50)}${comment.content.length > 50 ? '...' : ''}"`;

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

    /**
     * @method notifyAdminsAboutReport
     * @description Notifica a los admins sobre un nuevo reporte
     */
    async notifyAdminsAboutReport(report, reporterUsername, thread, comment) {
        // Obtener todos los admins
        const admins = await User.find({
            role: { $in: ['superadmin', 'admin'] }
        }).select('_id');

        // Notificar a cada admin
        await Promise.all(admins.map(async admin => {
            const contentType = report.comment ? 'comentario' : 'hilo';

            const reason = report.reason === 'spam' ? 'Spam' :
                report.reason === 'inappropriate' ? 'Contenido inapropiado' :
                    report.reason === 'harassment' ? 'Acoso' :
                        report.reason === 'other' ? 'Otro' : 'Desconocido';

            const message = `@${reporterUsername} reportó el ${contentType} "${report.comment ? comment.content : thread.title}" por: "${reason}"`;

            await this.createNotification({
                userId: admin._id,
                type: 'new_report',
                data: {
                    reportId: report.id,
                    threadId: report.thread,
                    commentId: report.comment,
                    message,
                    reason: report.reason
                },
                fromUser: report.reporter
            });
        }));
    }

    /**
     * @method notifyUserAboutReportResolution
     * @description Notifica al usuario sobre la resolución de su reporte
     */
    async notifyUserAboutReportResolution(report, contentDeleted, adminMessage) {
        const contentType = report.comment ? 'comentario' : 'hilo';
        let message = `Tu reporte sobre el ${contentType} "${report.comment ? report.comment.content : report.thread.title}" ha sido procesado. `;

        if (report.adminAction === 'deleted') {
            message += 'El contenido fue eliminado.';
        } else if (report.adminAction === 'warning') {
            message += 'Se ha enviado una advertencia al usuario.';
        } else if (report.adminAction === 'banned_user') {
            message += 'El contenido fue eliminado y se ha prohibido el acceso al usuario.';
        } else {
            message += 'No se tomó ninguna acción.';
        }

        // if (adminMessage) {
        //     message += `\nNota del administrador: ${adminMessage}`;
        // }

        await this.createNotification({
            userId: report.reporter,
            type: 'report_resolved',
            data: {
                // reportId: report._id,
                reportId: report.id,
                threadId: report.thread,
                commentId: report.comment,
                message,
                action: report.adminAction,
                contentDeleted
            },
            fromUser: report.resolvedBy
        });
    }

    /**
     * @method sendWarningNotification
     * @description Envía una notificación de advertencia al usuario
     */
    async sendWarningNotification({
        targetUserId,
        senderId,
        message,
        context, // { threadId?, commentId?, reportId?, etc }
        warningType, // 'content_warning', 'behavior_warning', etc
        severity = 'medium' // 'low', 'medium', 'high'
    }) {
        try {
            return this.createNotification({
                userId: targetUserId,
                type: 'user_warning',
                data: {
                    message: message,
                    warningType,
                    ...context,
                    severity: severity // Puedes usar: 'low', 'medium', 'high'
                },
                fromUser: senderId
            });
        } catch (error) {
            this.logger.error('Error sending warning notification:', {
                error: error.message,
                targetUserId,
                warningType
            });
            throw error;
        }
    }

    /**
     * @method sendEventReminder
     * @description Notifica cuando alguien menciona a un usuario en un comentario
     */
    async sendEventReminder({ userId, event, daysUntil = null, minutesUntil = null }) {
        try {
            logger.debug('Enviando recordatorio de evento:', {
                userId,
                eventId: event._id,
                eventTitle: event.title,
                daysUntil,
                minutesUntil
            });

            // Convertir minutos a horas
            const hoursUntil = Math.floor(minutesUntil / 60);

            // Convertir el restante de minutos a minutos
            const minutesRest = minutesUntil % 60;

            // Generar el mensaje
            const message = (daysUntil == null || daysUntil == undefined || daysUntil < 1)
                ? (hoursUntil == null || hoursUntil == undefined || hoursUntil < 1)
                    ? `El evento "${event.title}" es en ${minutesRest} minuto(s). ¡No te lo pierdas!`
                    : `El evento "${event.title}" es en ${hoursUntil} hora(s). ¡No te lo pierdas!`
                : `El evento "${event.title}" es en ${daysUntil} día(s). ¡No te lo pierdas!`;

            return this.createNotification({
                userId,
                type: 'event_reminder',
                data: {
                    eventId: event._id,
                    eventTitle: event.title,
                    startDate: event.startDate,
                    message,
                    daysUntil,
                    minutesUntil
                },
                fromUser: null // Es una notificación del sistema
            });
        } catch (error) {
            this.logger.error('Error al enviar recordatorio de evento:', {
                error: error.message,
                stack: !isProduction ? error.stack : undefined,
                action: 'sendEventReminder'
            });
            throw error;
        }
    }

    /**
     * @method sendProjectJoinRequest
     * @description Notifica a los admins del proyecto sobre una nueva solicitud de unión
     */
    async sendProjectJoinRequest({ project, requesterId, requesterUsername, message }) {
        try {
            const admins = project.collaborators
                .filter(c => c.role === 'admin' || c.role === 'creator')
                .map(c => c.user._id);

            // Crear notificaciones para cada admin
            const notifications = admins.map(adminId =>
                this.createNotification({
                    userId: adminId,
                    type: 'project_join_request',
                    data: {
                        projectId: project._id,
                        message: `@${requesterUsername} quiere unirse a tu proyecto "${project.title}"`,
                        requesterUsername,
                        requestMessage: message
                    },
                    fromUser: requesterId
                })
            );

            return Promise.all(notifications);
        } catch (error) {
            this.logger.error('Error sending project join request notification:', {
                error: error.message,
                stack: !isProduction ? error.stack : undefined,
                action: 'sendProjectJoinRequest'
            });
            throw error;
        }
    }

    /**
     * @method sendProjectRequestUpdate
     * @description Notifica al solicitante sobre el estado de su solicitud
     */
    async sendProjectRequestUpdate({ requesterId, project, status, reviewerId, reviewMessage }) {

        try {
            const statusMessage = {
                approved: `Tu solicitud para unirte a "${project.title}" ha sido aprobada`,
                rejected: `Tu solicitud para unirte a "${project.title}" ha sido rechazada`
            }[status];

            return this.createNotification({
                userId: requesterId,
                type: 'project_request_update',
                data: {
                    projectId: project._id,
                    message: statusMessage,
                    status,
                    reviewMessage
                },
                fromUser: reviewerId
            });
        } catch (error) {
            this.logger.error('Error sending project request update notification:', {
                error: error.message,
                stack: !isProduction ? error.stack : undefined,
                action: 'sendProjectRequestUpdate'
            });
            throw error;
        }
    }

    /**
     * @method markAsRead
     * @description Marca una notificación como leída
     */
    async markAsRead(notificationId, userId) {
        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, user: userId, read: false },
            { read: true },
            { new: true }
        );

        if (notification) {
            const unreadCount = await Notification.countDocuments({
                user: userId,
                read: false
            });
            this.io.to(`user_${userId}`).emit('notification_count', unreadCount);
        }
        return notification;
    }

    /**
     * @method deleteNotification
     * @description Elimina una notificación
     */
    async deleteNotification(notificationId, userId) {
        const notification = await Notification.findOneAndDelete({
            _id: notificationId,
            user: userId
        });

        if (!notification) {
            return null;
        }

        if (!notification.read) {
            const unreadCount = await Notification.countDocuments({
                user: userId,
                read: false
            });
            this.io.to(`user_${userId}`).emit('notification_count', unreadCount);
        }
        return notification;
    }

    /**
     * @method sendBulkNotificationToGraduates
     * @description Envía una notificación a todos los usuarios egresados
     */
    async sendBulkNotificationToGraduates({ message, fromAdminId }) {
        try {
            this.logger.info('Enviando notificación masiva a egresados', { message, fromAdminId });

            // Obtener todos los usuarios egresados
            const graduates = await User.find({
                role: 'egresado',
                isActive: true
            }).select('_id');

            // Crear notificaciones para cada egresado
            const notifications = graduates.map(graduate =>
                this.createNotification({
                    userId: graduate._id,
                    type: 'system',
                    data: {
                        message,
                        isBulk: true
                    },
                    fromUser: fromAdminId
                })
            );

            await Promise.all(notifications);

            this.logger.info('Notificaciones masivas enviadas con éxito', {
                totalSent: graduates.length
            });

            return {
                message: `Notificación enviada a ${graduates.length} egresados`,
                totalSent: graduates.length
            };
        } catch (error) {
            this.logger.error('Error al enviar notificaciones masivas:', {
                error: error.message,
                stack: !isProduction ? error.stack : undefined,
                action: 'sendBulkNotificationToGraduates'
            });
            throw error;
        }
    }
}