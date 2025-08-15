export default class ChatController {
    constructor(chatService) {
        this.chatService = chatService;
    }

    getConversation = async (req, res, next) => {
        try {
            const { userId } = req.params;
            const { id: currentUserId } = req.user;
            const { page = 1, limit = 20 } = req.query;

            const conversation = await this.chatService.getConversation(
                currentUserId,
                userId,
                parseInt(page),
                parseInt(limit)
            );

            res.json({
                success: true,
                data: conversation
            });
        } catch (error) {
            next(error);
        }
    };

    getConversations = async (req, res, next) => {
        try {
            const conversations = await this.chatService.getConversations(req.user.id);
            res.json({
                success: true,
                data: conversations
            });
        } catch (error) {
            next(error);
        }
    };
}