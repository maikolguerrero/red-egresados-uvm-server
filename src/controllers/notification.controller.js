import Notification from '../models/Notification.js';
import AppError from '../middlewares/AppError.js';

export default class NotificationController {
  constructor(notificationService) {
    this.notificationService = notificationService;
  }

  /**
   * @method getNotifications
   * @description Obtiene las notificaciones del usuario
   */
  getNotifications = async (req, res, next) => {
    try {
      const { id: userId } = req.user;
      const { page = 1, limit = 10, read, type } = req.query;

      const filter = { user: userId };
      if (read !== undefined) filter.read = read;
      if (type) filter.type = type;

      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('fromUser', 'username profilePicture');

      const total = await Notification.countDocuments({ user: userId });

      res.json({
        success: true,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit)
        },
        data: notifications.map(notification => notification.toObject())
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @method markAsRead
   * @description Marca una notificación como leída
   */
  markAsRead = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { id: userId } = req.user;

      const notification = await this.notificationService.markAsRead(id, userId);

      if (!notification) {
        throw new AppError('Notificación no encontrada', 404);
      }

      res.json({
        success: true,
        data: notification
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @method deleteNotification
   * @description Elimina una notificación
   */
  deleteNotification = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { id: userId } = req.user;

      const notification = await this.notificationService.deleteNotification(id, userId);

      if (!notification) {
        throw new AppError('Notificación no encontrada', 404);
      }

      res.json({
        success: true,
        message: 'Notificación eliminada'
      });
    } catch (error) {
      next(error);
    }
  }

  getUnreadCount = async (req, res, next) => {
    try {
      const count = await Notification.countDocuments({
        user: req.user.id,
        read: false
      });

      res.json({
        success: true,
        count
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @method sendBulkNotificationToGraduates
   * @description Envía una notificación a todos los egresados (solo admin)
   */
  sendBulkNotificationToGraduates = async (req, res, next) => {
    try {
      const { message } = req.body;

      const result = await this.notificationService.sendBulkNotificationToGraduates({
        message,
        fromAdminId: req.user.id
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}