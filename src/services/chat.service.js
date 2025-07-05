import PrivateMessage from '../models/PrivateMessage.js';
import User from '../models/User.js';

export default class ChatService {
  constructor(io, logger, notificationService) {
    this.io = io;
    this.logger = logger.child({ service: 'ChatService' });
    this.notificationService = notificationService;
    this.userSockets = new Map(); // userId: Set<socketId>
    this.userStatus = new Map(); // Para estado en tiempo real
    this.setupSocketEvents = this.setupSocketEvents.bind(this);
    this.notifyConversationUpdate = this.notifyConversationUpdate.bind(this);
  }

  setupSocketEvents() {
    this.io.on('connection', async (socket) => {
      if (socket.userId) {
        if (!this.userSockets.has(socket.userId)) {
          this.userSockets.set(socket.userId, new Set());
          // Primer socket del usuario - actualizar estado
          await this.updateUserOnlineStatus(socket.userId, true);
        }
        this.userSockets.get(socket.userId).add(socket.id);

        // Unir al usuario a su sala privada
        socket.join(`user_${socket.userId}`);
        this.logger.info(`Usuario ${socket.userId} conectado`);
      }

      // Configurar handlers
      this.setupMessageHandlers(socket);
      this.setupPresenceHandlers(socket);
      this.setupDisconnectHandler(socket);
      this.setupStatusHandlers(socket);


      socket.on('get_unread_notification_count', async (callback) => {
        try {
          if (!socket.userId) {
            return callback({ success: false, error: 'No autenticado' });
          }

          const count = await Notification.countDocuments({
            user: socket.userId,
            read: false
          });

          callback({ success: true, count });
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      });

      socket.on('notification_deleted', async () => {
        try {
          if (!socket.userId) return;

          const unreadCount = await Notification.countDocuments({
            user: socket.userId,
            read: false
          });

          // Emitir el nuevo conteo al usuario
          io.to(`user_${socket.userId}`).emit('notification_count', unreadCount);
        } catch (error) {
          console.error('Error actualizando conteo:', error);
        }
      });
    });
  }

  // Nuevo método para notificar actualizaciones
  async notifyConversationUpdate(userId, contactId) {
    try {
      const conversations = await this.getConversations(userId);
      const updatedConversation = conversations.find(c => c.userId.equals(contactId));

      this.io.to(`user_${userId}`).emit('conversation_updated', {
        contactId,
        conversation: updatedConversation
      });

      // También emitir actualización completa de la lista
      this.io.to(`user_${userId}`).emit('conversations_updated', conversations);
    } catch (error) {
      this.logger.error('Error notificando actualización:', error);
    }
  }

  // Añade nuevo handler para estado
  setupStatusHandlers(socket) {
    socket.on('check_user_online', (userId, callback) => {
      const isOnline = this.isUserOnline(userId);
      callback({ isOnline });
    });

    socket.on('get_last_seen', async (userId, callback) => {
      try {
        const user = await User.findById(userId).select('lastSeen');
        callback({ lastSeen: user.lastSeen });
      } catch (error) {
        callback({ error: 'Error fetching last seen' });
      }
    });
  }

  setupMessageHandlers(socket) {
    // Manejar mensajes privados
    socket.on('private_message', async (data, callback) => {
      try {
        const message = await this.saveMessage({
          sender: socket.userId,
          receiver: data.receiver,
          content: data.content,
          read: data.read || false,
        });

        // Enviar mensaje al receptor
        this.io.to(`user_${data.receiver}`).emit('new_private_message', message);

        await this.notifyConversationUpdate(socket.userId, data.receiver);
        await this.notifyConversationUpdate(data.receiver, socket.userId);

        callback({ success: true, message });

        // Si el receptor está viendo el chat, marcar como leído inmediatamente
        if (this.isUserViewingChat(data.receiver, socket.userId)) {
          await this.markMessagesAsRead([message._id], socket.userId);
        }
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Manejar marcado como leído
    socket.on('mark_as_read', async ({ messageIds }, callback) => {
      try {
        const messages = await PrivateMessage.find({ _id: { $in: messageIds } });
        const contactIds = [...new Set(messages.map(m => m.sender.toString()))];

        await this.markMessagesAsRead(messageIds, socket.userId);

        // Notificar actualización para cada contacto
        for (const contactId of contactIds) {
          await this.notifyConversationUpdate(socket.userId, contactId);
        }

        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });
  }

  setupPresenceHandlers(socket) {
    let currentViewingChat = null;

    // socket.on('user_viewing_chat', async ({ contactId }) => {
    //   try {
    //     currentViewingChat = contactId;

    //     // Notificar al contacto
    //     this.io.to(`user_${contactId}`).emit('contact_viewing_chat', {
    //       userId: socket.userId,
    //       isViewing: true
    //     });

    //     // Marcar mensajes como leídos
    //     await this.markMessagesAsViewed(socket.userId, contactId);
    //   } catch (error) {
    //     this.logger.error('Error en user_viewing_chat:', error);
    //   }
    // });

    socket.on('user_viewing_chat', async ({ contactId }) => {
      try {
        currentViewingChat = contactId;

        // Notificar al contacto
        this.io.to(`user_${contactId}`).emit('contact_viewing_chat', {
          userId: socket.userId,
          isViewing: true
        });

        // Marcar mensajes como leídos
        const unreadMessages = await PrivateMessage.find({
          receiver: socket.userId,
          sender: contactId,
          read: false
        });

        if (unreadMessages.length > 0) {
          await this.markMessagesAsRead(
            unreadMessages.map(msg => msg._id),
            socket.userId
          );
        }
      } catch (error) {
        this.logger.error('Error en user_viewing_chat:', error);
      }
    });

    socket.on('user_left_chat', () => {
      if (currentViewingChat) {
        this.io.to(`user_${currentViewingChat}`).emit('contact_viewing_chat', {
          userId: socket.userId,
          isViewing: false
        });
      }
    });
  }

  setupDisconnectHandler(socket) {
    const handleDisconnect = async (reason) => {
      this.logger.info(`Usuario ${socket.userId} desconectado. Razón: ${reason}`, {
        userId: socket.userId,
        socketId: socket.id,
        reason: reason
      });
      if (socket.userId) {
        const sockets = this.userSockets.get(socket.userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.userSockets.delete(socket.userId);
            await this.updateUserOnlineStatus(socket.userId, false);
          }
        }
      }

      // Notificar a los contactos que el usuario ya no está viendo los chats
      if (this.currentViewingChats && this.currentViewingChats.has(socket.userId)) {
        const contactId = this.currentViewingChats.get(socket.userId);
        this.io.to(`user_${contactId}`).emit('contact_viewing_chat', {
          userId: socket.userId,
          isViewing: false
        });
        this.currentViewingChats.delete(socket.userId);
      }
    };

    // Manejar desconexión normal
    socket.on('disconnect', () => handleDisconnect('disconnect'));

    // Manejar desconexión manual (logout)
    socket.on('manual_disconnect', (data) => {
      this.logger.info(`Desconexión manual para usuario ${socket.userId}`, {
        userId: socket.userId,
        reason: data.reason || 'logout'
      });
      handleDisconnect('manual_disconnect');
    });
  }

  async saveMessage(data) {
    try {
      // Validación básica
      if (!data.sender || !data.receiver || !data.content) {
        throw new Error('Datos del mensaje incompletos');
      }

      // Crear y guardar el mensaje
      const newMessage = await PrivateMessage.create({
        sender: data.sender,
        receiver: data.receiver,
        content: data.content,
        read: data.read || false,
        readAt: data.read ? new Date() : null
      });

      // Populate para obtener datos del remitente
      const savedMessage = await PrivateMessage.findById(newMessage._id)
        .populate('sender', 'username profilePicture')
        .populate('receiver', 'username profilePicture');

      this.logger.info('Mensaje guardado correctamente', {
        messageId: savedMessage._id,
        sender: savedMessage.sender._id,
        receiver: savedMessage.receiver._id
      });

      return savedMessage;
    } catch (error) {
      this.logger.error('Error al guardar mensaje:', {
        error: error.message,
        data: data
      });
      throw error;
    }
  }

  isUserOnline(userId) {
    const sockets = this.io.sockets.adapter.rooms.get(`user_${userId}`);
    return sockets && sockets.size > 0;
  }

  async getConversation(user1, user2, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const messages = await PrivateMessage.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 }
      ]
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit + 1) // Pedimos 1 de más para saber si hay más páginas
      .populate('sender', 'username profilePicture')
      .populate('receiver', 'username profilePicture');

    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop(); // Eliminamos el mensaje extra
    }
    return {
      messages,
      totalMessages: messages.length,
      currentPage: page,
      totalPages: Math.ceil(messages.length / limit),
      hasMore
    };
  }

  async markMessagesAsRead(messageIds, readerId) {
    // 1. Actualizar en base de datos
    const updateResult = await PrivateMessage.updateMany(
      { _id: { $in: messageIds }, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    // 2. Obtener los mensajes actualizados
    const messages = await PrivateMessage.find({ _id: { $in: messageIds } })
      .populate('sender', 'username firstName lastName profilePicture')
      .populate('receiver', 'username firstName lastName profilePicture');

    // 3. Notificar a los remitentes que sus mensajes fueron leídos
    const senderIds = [...new Set(messages.map(m => m.sender._id.toString()))];

    senderIds.forEach(senderId => {
      this.io.to(`user_${senderId}`).emit('messages_read', {
        messageIds: messages.filter(m => m.sender._id.toString() === senderId).map(m => m._id),
        readerId,
        readAt: new Date()
      });
    });

    // 4. Notificar actualización de conversaciones
    const contactIds = [...new Set(messages.map(m =>
      m.sender._id.toString() === readerId ?
        m.receiver._id.toString() :
        m.sender._id.toString()
    ))];

    for (const contactId of contactIds) {
      await this.notifyConversationUpdate(readerId, contactId);
      if (contactId !== readerId) {
        await this.notifyConversationUpdate(contactId, readerId);
      }
    }

    return messages;
  }

  async markMessagesAsViewed(viewerId, contactId) {
    const unreadMessages = await PrivateMessage.find({
      receiver: viewerId,
      sender: contactId,
      read: false
    });

    if (unreadMessages.length > 0) {
      await this.markMessagesAsRead(
        unreadMessages.map(msg => msg._id),
        viewerId
      );
    }
  }

  isUserViewingChat(userId, contactId) {
    // Verificar si el usuario está viendo el chat con el contacto
    const socketId = this.userSockets.get(userId);
    if (!socketId) return false;

    const socket = this.io.sockets.sockets.get(socketId);
    return socket && socket.rooms.has(`user_${contactId}`);
  }

  // Nuevo método para actualizar estado
  async updateUserOnlineStatus(userId, isOnline) {
    try {
      await User.findByIdAndUpdate(userId, {
        isOnline,
        lastSeen: isOnline ? null : new Date()
      });

      // Emitir cambio de estado
      this.io.emit('user_status_change', {
        userId,
        isOnline,
        lastSeen: isOnline ? null : new Date()
      });

    } catch (error) {
      this.logger.error('Error updating user status', {
        userId,
        error: error.message
      });
    }
  }

  async getConversations(userId) {
    try {
      // 1. Obtener todos los mensajes del usuario
      const messages = await PrivateMessage.find({
        $or: [
          { sender: userId },
          { receiver: userId }
        ]
      })
        .sort({ createdAt: -1 })
        .select('-__v')
        .lean()


      // 2. Procesar para agrupar por contacto
      const conversationsMap = new Map();

      messages.forEach(message => {
        const contactId = message.sender.equals(userId)
          ? message.receiver
          : message.sender;

        if (!conversationsMap.has(contactId.toString())) {
          conversationsMap.set(contactId.toString(), {
            userId: contactId,
            unreadCount: 0,
            lastMessage: null
          });
        }

        const conversation = conversationsMap.get(contactId.toString());

        // Solo contar no leídos donde el usuario actual es el receptor
        if (message.receiver.equals(userId) && !message.read) {
          conversation.unreadCount++;
        }

        // Establecer el último mensaje (el primero que encontremos por el sort)
        if (!conversation.lastMessage) {
          // Aplica la transformación para _id aquí
          const transformedMessage = { ...message }; // Crea una copia para no modificar el original
          transformedMessage.id = transformedMessage._id;
          delete transformedMessage._id;
          conversation.lastMessage = transformedMessage;
        }
      });

      // 3. Obtener información de los usuarios
      const conversationsArray = Array.from(conversationsMap.values());
      const userIds = conversationsArray.map(c => c.userId);

      const users = await User.find({ _id: { $in: userIds } })
        .select('username profilePicture')
        .populate({
          path: 'pregrado',
          select: 'nombreCompleto -_id',
          options: { limit: 1 } // Solo necesitamos el primer registro para el nombre
        })
        .populate({
          path: 'postgrado',
          select: 'nombreCompleto -_id',
          options: { limit: 1 } // Solo necesitamos el primer registro para el nombre
        })
        .lean();

      // 4. Combinar la información
      const conversations = conversationsArray.map(conv => {
        const user = users.find(u => u._id.equals(conv.userId));
        // const alumni = user.alumni;

        return {
          userId: conv.userId,
          username: user.username,
          // Obtener el nombreCompleto del primer pregrado o postgrado
          nombreCompleto: user.pregrado?.[0]?.nombreCompleto ||
            user.postgrado?.[0]?.nombreCompleto ||
            user.username,
          profilePicture: user.profilePicture,
          lastMessage: conv.lastMessage,
          unreadCount: conv.unreadCount
        };
      });

      // 5. Ordenar por fecha del último mensaje
      conversations.sort((a, b) =>
        new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0)
      );

      return conversations;
    } catch (error) {
      this.logger.error('Error al obtener conversaciones:', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
}