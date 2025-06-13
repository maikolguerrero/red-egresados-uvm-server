import Notification from '../models/Notification.js';
import AppError from '../middlewares/AppError.js';

export default class NotificationController {
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

      const notification = await Notification.findOneAndUpdate(
        { _id: id, user: userId },
        { read: true },
        { new: true }
      ).populate('fromUser', 'username profilePicture');

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

      const notification = await Notification.findOneAndDelete({
        _id: id,
        user: userId
      });

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
}