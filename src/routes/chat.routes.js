import express from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import ChatController from '../controllers/chat.controller.js';

export default function chatRoutes(chatService) {
    const router = express.Router();
    const chatController = new ChatController(chatService);

    /**
     * @swagger
     * /api/chat/conversation/{userId}:
     *   get:
     *     summary: Obtener conversación con un usuario
     *     tags: [Chat]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: userId
     *         required: true
     *         schema:
     *           type: string
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           default: 1
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 20
     *     responses:
     *       200:
     *         description: Lista de mensajes
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 data:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/PrivateMessage'
     */
    router.get(
        '/conversation/:userId',
        authenticate,
        chatController.getConversation
    );


        /**
       * @swagger
       * /api/chat/conversations:
       *   get:
       *     summary: Obtener todas las conversaciones del usuario
       *     tags: [Chat]
       *     security:
       *       - bearerAuth: []
       *     responses:
       *       200:
       *         description: Lista de conversaciones
       *         content:
       *           application/json:
       *             schema:
       *               type: object
       *               properties:
       *                 success:
       *                   type: boolean
       *                 data:
       *                   type: array
       *                   items:
       *                     $ref: '#/components/schemas/Conversation'
       */
        router.get(
            '/conversations',
            authenticate,
            chatController.getConversations
        );

    return router;
}