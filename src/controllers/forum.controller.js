import ForumThread from '../models/ForumThread.js';
import ForumComment from '../models/ForumComment.js';
import AppError from '../middlewares/AppError.js';

export default class ForumController {
    /**
     * @description Crea una instancia del controlador de autenticación
     * @param {FileService} fileService - Servicio de envío de emails
     * @example
     * const fileService = new FileService();
     * const eventController = new EventController(fileService);
     */
    constructor(fileService) {
        this.fileService = fileService;
    }

    /**
     * @method createThread
     * @description Crea un nuevo hilo con multimedia
     */
    createThread = async (req, res, next) => {
        try {
            const { title, content, category, tags } = req.body;
            const author = req.user.id;

            req.logger.debug('Inicio creación de hilo', {
                userId: author,
                ip: req.ip
            });

            let mediaData;
            if (req.file) {
                const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

                const uploadOptions = {
                    folder: 'forum/threads',
                    originalName: req.file.originalname
                };

                if (req.file.mimetype.startsWith('image/')) {
                    uploadOptions.transformations = {
                        width: 1200,
                        height: 630,
                        crop: 'fill',
                        format: 'webp'
                    };
                    const result = await this.fileService.uploadImage(fileBase64, `thread-${Date.now()}`, uploadOptions);
                    mediaData = {
                        url: result.url,
                        publicId: result.publicId,
                        mediaType: 'image',
                        width: result.width,
                        height: result.height
                    };
                } else if (req.file.mimetype.startsWith('video/')) {
                    uploadOptions.resource_type = 'video';
                    uploadOptions.transformations = {
                        width: 1280,
                        height: 720,
                        format: 'mp4'
                    };
                    const result = await this.fileService.uploadVideo(fileBase64, `thread-${Date.now()}`, uploadOptions);
                    mediaData = {
                        url: result.url,
                        publicId: result.publicId,
                        mediaType: 'video',
                        width: result.width,
                        height: result.height,
                        duration: result.duration
                    };
                }
            }

            const thread = await ForumThread.create({
                title,
                content,
                category,
                tags: tags || [],
                author,
                media: mediaData
            });

            req.logger.info('Hilo creado exitosamente', {
                action: 'thread_create_success',
                userId: author,
                threadId: thread._id,
                ip: req.ip
            });

            res.status(201).json({
                success: true,
                data: thread
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * @method getThreads
     * @description Obtiene hilos con paginación y filtros
     */
    getThreads = async (req, res, next) => {
        try {
            const { page = 1, limit = 10, category, sort = 'newest', search } = req.query;
            const skip = (page - 1) * limit;

            const filter = {};
            if (category) filter.category = category;
            if (search) filter.$text = { $search: search };

            let sortOption;
            switch (sort) {
                case 'newest': sortOption = { createdAt: -1 }; break;
                case 'oldest': sortOption = { createdAt: 1 }; break;
                case 'top': sortOption = { likeCount: -1 }; break;
                default: sortOption = { createdAt: -1 };
            }

            const [threads, total] = await Promise.all([
                ForumThread.find(filter)
                    .sort(sortOption)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .populate('author', 'username profilePicture')
                    .populate({
                        path: 'comments',
                        options: { limit: 3 },
                        populate: { path: 'author', select: 'username profilePicture' }
                    }),
                ForumThread.countDocuments(filter)
            ]);

            res.json({
                success: true,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit),
                    limit: parseInt(limit)
                },
                data: threads
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * @method getThreadWithNestedComments
     * @description Obtiene un hilo específico con sus comentarios anidados correctamente estructurados
     */
    getThreadWithNestedComments = async (req, res, next) => {
        try {
            const { threadId } = req.params;

            // 1. Obtener el hilo principal con información básica del autor
            const thread = await ForumThread.findById(threadId)
                .populate({
                    path: 'author',
                    select: 'username profilePicture firstName lastName',
                    populate: {
                        path: 'profilePicture',
                        select: 'url publicId format dimensions'
                    }
                })
                .lean();

            if (!thread) {
                throw new AppError('Hilo no encontrado', 404, 'THREAD_NOT_FOUND');
            }

            // 2. Incrementar el contador de vistas
            await ForumThread.findByIdAndUpdate(threadId, { $inc: { viewCount: 1 } });

            // 3. Obtener TODOS los comentarios del hilo
            const comments = await ForumComment.find({ thread: threadId })
                .populate({
                    path: 'author',
                    select: 'username profilePicture firstName lastName',
                    populate: {
                        path: 'profilePicture',
                        select: 'url publicId format dimensions'
                    }
                })
                .exec();

            const allCommentsProcessed = comments.map(comment => comment.toObject());

            // 4. Función recursiva para construir la estructura de comentarios anidados
            const buildNestedComments = (commentsList, parentId = null) => {
                const children = commentsList.filter(comment => {
                    if (parentId === null) {
                        return !comment.parentComment;
                    } else {
                        return comment.parentComment && comment.parentComment.toString() === parentId;
                    }
                });

                return children.map(comment => ({
                    ...comment,
                    replies: buildNestedComments(commentsList, comment.id.toString())
                }));
            };

            // 5. Construir la estructura de comentarios anidados usando los comentarios procesados
            const nestedComments = buildNestedComments(allCommentsProcessed);

            // 6. Preparar la respuesta final
            const responseData = {
                ...thread,
                comments: nestedComments,
                commentCount: allCommentsProcessed.length,
            };

            res.json({
                success: true,
                data: responseData
            });

        } catch (error) {
            next(error);
        }
    };

    /**
     * @method addComment
     * @description Añade un nuevo comentario a un hilo específico
     */
    addComment = async (req, res, next) => {
        try {
            const { threadId } = req.params;
            const { content, parentCommentId } = req.body;
            const author = req.user.id;

            const thread = await ForumThread.findById(threadId);
            if (!thread) {
                throw new AppError('Hilo no encontrado', 404);
            }

            let mediaData;
            if (req.file) {
                const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

                const uploadOptions = {
                    folder: 'forum/comments',
                    originalName: req.file.originalname
                };

                if (req.file.mimetype.startsWith('image/')) {
                    uploadOptions.transformations = {
                        width: 800,
                        height: 800,
                        crop: 'fill',
                        format: 'webp'
                    };
                    const result = await this.fileService.uploadImage(fileBase64, `comment-${Date.now()}`, uploadOptions);
                    mediaData = {
                        url: result.url,
                        publicId: result.publicId,
                        mediaType: 'image',
                        width: result.width,
                        height: result.height
                    };
                } else if (req.file.mimetype.startsWith('video/')) {
                    uploadOptions.resource_type = 'video';
                    uploadOptions.transformations = {
                        width: 1280,
                        height: 720,
                        format: 'mp4'
                    };
                    const result = await this.fileService.uploadVideo(fileBase64, `comment-${Date.now()}`, uploadOptions);
                    mediaData = {
                        url: result.url,
                        publicId: result.publicId,
                        mediaType: 'video',
                        width: result.width,
                        height: result.height,
                        duration: result.duration
                    };
                }
            }

            const comment = await ForumComment.create({
                content,
                author,
                thread: threadId,
                parentComment: parentCommentId,
                media: mediaData
            });

            thread.commentCount = await ForumComment.countDocuments({ thread: threadId });
            await thread.save();

            res.status(201).json({
                success: true,
                data: comment
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * @method toggleLike
     * @description Da/quita like a un hilo o comentario
     */
    toggleLike = async (req, res, next) => {
        try {
            const { type, id } = req.params;
            const userId = req.user.id;

            let Model;
            if (type === 'thread') Model = ForumThread;
            else if (type === 'comment') Model = ForumComment;
            else throw new AppError('Tipo inválido', 400);

            const item = await Model.findById(id);
            if (!item) throw new AppError(`${type === 'thread' ? 'Hilo' : 'Comentario'} no encontrado`, 404);

            const likeIndex = item.likes.findIndex(likeId => likeId.equals(userId));
            let action;

            if (likeIndex === -1) {
                item.likes.push(userId);
                action = 'liked';
            } else {
                item.likes.splice(likeIndex, 1);
                action = 'unliked';
            }

            await item.save();

            res.json({
                success: true,
                data: {
                    action,
                    likeCount: item.likes.length,
                    isLiked: action === 'liked'
                }
            });
        } catch (error) {
            next(error);
        }
    };
}