import ForumThread from '../models/ForumThread.js';
import ForumComment from '../models/ForumComment.js';
import ForumReport from '../models/ForumReport.js';
import User from '../models/User.js';
import AppError from '../middlewares/AppError.js';

export default class ForumController {
    /**
     * @description Crea una instancia del controlador de autenticación
     * @param {FileService} fileService - Servicio de envío de emails
     * @example
     * const fileService = new FileService();
     * const eventController = new EventController(fileService);
     */
    constructor(fileService, notificationService, emailService) {
        this.fileService = fileService;
        this.notificationService = notificationService;
        this.emailService = emailService;
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

            const thread = await ForumThread.create({
                title,
                content,
                category,
                tags: tags || [],
                author
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
     * @method addThreadImage
     * @description Añade una imagen al hilo
     */
    addThreadImage = async (req, res, next) => {
        try {
            const { threadId } = req.params;
            const { file } = req;
            const { id: userId } = req.user;

            // Verificar existencia del hilo
            const thread = await ForumThread.findOne({
                _id: threadId,
                author: userId
            });
            if (!thread) {
                throw new AppError('Hilo no encontrado', 404, 'THREAD_NOT_FOUND');
            }

            // Convertir buffer a base64
            const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

            // Subir imagen
            const uploadResult = await this.fileService.uploadImage(
                fileBase64,
                `thread-${threadId}`,
                {
                    // width: 1200,
                    // height: 630,
                    // crop: 'fill',
                    format: 'webp',
                    folder: 'forum/images',
                    originalName: file.originalname
                }
            );

            const newImage = {
                mediaType: 'image',
                url: uploadResult.url,
                publicId: uploadResult.publicId,
                format: uploadResult.format,
                dimensions: {
                    width: uploadResult.width,
                    height: uploadResult.height
                }
            };

            thread.media.push(newImage);
            await thread.save();

            res.json({
                success: true,
                data: {
                    image: newImage,
                    threadId
                }
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * @method addThreadVideo
     * @description Añade un video a un hilo existente
     */
    addThreadVideo = async (req, res, next) => {
        try {
            const { threadId } = req.params;
            const { file } = req;
            const { id: userId } = req.user;

            // Verificar existencia del hilo
            const thread = await ForumThread.findOne({
                _id: threadId,
                author: userId
            });
            if (!thread) {
                throw new AppError('Hilo no encontrado', 404, 'THREAD_NOT_FOUND', {
                    threadId,
                    userId
                });
            }

            // Validar archivo
            if (!file) {
                throw new AppError('No se proporcionó archivo de video', 400, 'NO_FILE_PROVIDED');
            }

            // Convertir a base64 para Cloudinary
            const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

            // Subir video
            const uploadResult = await this.fileService.uploadVideo(
                fileBase64,
                `thread-video-${threadId}-${Date.now()}`,
                {
                    // width: 1280,
                    // height: 720,
                    format: 'mp4',
                    folder: 'forum/videos',
                    originalName: file.originalname,
                    resource_type: 'video'
                }
            );

            if (!uploadResult.success) {
                throw new AppError('Error al subir el video', 500, 'VIDEO_UPLOAD_FAILED', {
                    threadId,
                    userId
                });
            }

            // Crear objeto de video
            const newVideo = {
                mediaType: 'video',
                url: uploadResult.url,
                publicId: uploadResult.publicId,
                duration: uploadResult.duration,
                format: uploadResult.format,
                dimensions: {
                    width: uploadResult.width,
                    height: uploadResult.height
                }
            };

            // Añadir al hilo
            thread.media.push(newVideo);
            await thread.save();

            // Log y respuesta
            req.logger.info('Video añadido al hilo exitosamente', {
                action: 'thread_video_add',
                threadId,
                userId,
                videoId: newVideo.publicId
            });

            res.status(201).json({
                success: true,
                data: {
                    video: newVideo,
                    threadId
                }
            });

        } catch (error) {
            next(error);
        }
    };

    /**
     * @method removeThreadImage
     * @description Elimina una imagen específica de un hilo
     */
    removeThreadImage = async (req, res, next) => {
        try {
            const { threadId, imageId } = req.params;
            const { id: userId } = req.user;

            // Buscar el hilo
            const thread = await ForumThread.findOne({
                _id: threadId,
                author: userId
            });
            if (!thread) {
                throw new AppError('Hilo no encontrado', 404, 'THREAD_NOT_FOUND');
            }

            // Verificar permisos (solo autor o admin puede eliminar)
            if (thread.author.toString() !== userId && req.user.role !== 'admin') {
                throw new AppError('No autorizado para eliminar esta imagen', 403, 'FORBIDDEN');
            }

            // Buscar la imagen
            const imageIndex = thread.media.findIndex(
                media => media._id.toString() === imageId && media.mediaType === 'image'
            );

            if (imageIndex === -1) {
                throw new AppError('Imagen no encontrada en el hilo', 404, 'IMAGE_NOT_FOUND');
            }

            const imageToDelete = thread.media[imageIndex];

            // Eliminar de Cloudinary
            const deleteResult = await this.fileService.deleteFile(imageToDelete.publicId);
            if (!deleteResult.success) {
                throw new AppError('Error al eliminar la imagen', 500, 'IMAGE_DELETE_FAILED');
            }

            // Eliminar del array
            thread.media.splice(imageIndex, 1);
            await thread.save();

            // Log y respuesta
            req.logger.info('Imagen eliminada del hilo exitosamente', {
                action: 'thread_image_remove',
                threadId,
                userId,
                imageId
            });

            res.json({
                success: true,
                message: 'Imagen eliminada correctamente',
                data: {
                    deletedImageId: imageId,
                    remainingMedia: thread.media.length
                }
            });

        } catch (error) {
            next(error);
        }
    };

    /**
     * @method removeThreadVideo
     * @description Elimina un video específico de un hilo
     */
    removeThreadVideo = async (req, res, next) => {
        try {
            const { threadId, videoId } = req.params;
            const { id: userId } = req.user;

            // Buscar el hilo
            const thread = await ForumThread.findOne({
                _id: threadId,
                author: userId
            });
            if (!thread) {
                throw new AppError('Hilo no encontrado', 404, 'THREAD_NOT_FOUND');
            }

            // Buscar el video
            const videoIndex = thread.media.findIndex(
                media => media._id.toString() === videoId && media.mediaType === 'video'
            );

            if (videoIndex === -1) {
                throw new AppError('Video no encontrado en el hilo', 404, 'VIDEO_NOT_FOUND');
            }

            const videoToDelete = thread.media[videoIndex];

            // Eliminar de Cloudinary (especificar que es video)
            await this.fileService.deleteFile(videoToDelete.publicId, 'video');

            // Eliminar del array
            thread.media.splice(videoIndex, 1);
            await thread.save();

            // Log y respuesta
            req.logger.info('Video eliminado del hilo exitosamente', {
                action: 'thread_video_remove',
                threadId,
                userId,
                videoId
            });

            res.json({
                success: true,
                message: 'Video eliminado correctamente',
                data: {
                    deletedVideoId: videoId,
                    remainingMedia: thread.media.length
                }
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
            const {
                page = 1,
                limit = 10,
                category,
                tags,
                tagMatch = 'any',
                sort = 'newest',
                search,
                sortDirection = 'desc'
            } = req.query;
            const skip = (page - 1) * limit;
            const userId = req.user.id;

            let tagsArray = tags;
            // Convertir tags a array si viene como string
            if (tags && typeof tags === 'string') {
                tagsArray = tags.split(',').map(tag => tag.trim().toLowerCase());
            } else if (!tags) {
                tagsArray = [];
            }

            const filter = {};
            // Filtro por categoría
            if (category) filter.category = category;

            // Filtro por likes si se especifica
            if (sort === 'likes') {
                filter.likes = { $exists: true, $not: { $size: 0 } };
            }

            // Filtro por tags
            if (tagsArray.length > 0) {
                if (tagMatch === 'all') {
                    // Para coincidencia con TODOS los tags
                    filter.tags = { $all: tagsArray.map(tag => new RegExp(tag, 'i')) };
                } else {
                    // Para coincidencia con ALGUNO de los tags
                    filter.tags = { $in: tagsArray.map(tag => new RegExp(tag, 'i')) };
                }
            }

            if (search) filter.$text = { $search: search };

            let sortOption;
            switch (sort) {
                case 'newest': sortOption = { createdAt: sortDirection === 'desc' ? -1 : 1 }; break;
                case 'oldest': sortOption = { createdAt: sortDirection === 'desc' ? 1 : -1 }; break;
                case 'likes': sortOption = { likeCount: sortDirection === 'desc' ? -1 : 1 }; break;
                default: sortOption = { createdAt: sortDirection === 'desc' ? -1 : 1 };
            }

            // Si se piden los más likes, sobreescribir el orden
            if (sort === 'likes') {
                sortOption = { likeCount: sortDirection === 'desc' ? -1 : 1 };
            }

            // Obtener los hilos
            const [threads, total] = await Promise.all([
                ForumThread.find(filter)
                    .sort(sortOption)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .populate('author', 'username profilePicture'),
                ForumThread.countDocuments(filter)
            ]);

            // Obtener el conteo de comentarios y likes para cada hilo
            const threadsWithStats = await Promise.all(
                threads.map(async thread => {
                    const commentCount = await ForumComment.countDocuments({ thread: thread._id });
                    const threadObj = thread.toObject();
                    threadObj.commentCount = commentCount;
                    threadObj.isLiked = thread.likes.some(likeId => likeId.toString() === userId);
                    threadObj.likeCount = thread.likes.length;
                    return threadObj;
                })
            );

            // Si se piden los más likes, ordenar nuevamente por likeCount
            if (sort === 'likes') {
                threadsWithStats.sort((a, b) => b.likeCount - a.likeCount);
            }

            res.json({
                success: true,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit),
                    limit: parseInt(limit)
                },
                data: threadsWithStats
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * @method getThreadWithComments
     * @description Obtiene un hilo específico con sus comentarios
     */
    getThreadWithComments = async (req, res, next) => {
        try {
            const { threadId } = req.params;
            const userId = req.user.id;

            // 1. Obtener el hilo principal
            const thread = await ForumThread.findById(threadId)
                .populate({
                    path: 'author',
                    select: 'username profilePicture firstName lastName'
                })
                .exec();

            if (!thread) {
                throw new AppError('Hilo no encontrado', 404, 'THREAD_NOT_FOUND');
            }

            // 2. Incrementar contador de vistas
            await ForumThread.findByIdAndUpdate(threadId, { $inc: { viewCount: 1 } });

            // 3. Obtener comentarios principales (sin parent) y sus respuestas directas
            const [mainComments, replies] = await Promise.all([
                ForumComment.find({ thread: threadId, parentComment: null })
                    .populate('author', 'username profilePicture firstName lastName')
                    .populate('mentions', 'username')
                    .sort({ createdAt: -1 }),
                ForumComment.find({ thread: threadId, parentComment: { $ne: null } })
                    .populate('author', 'username profilePicture firstName lastName')
                    .populate('mentions', 'username')
                    .populate('parentComment', 'author content')
                    .sort({ createdAt: 1 })
            ]);

            // 4. Estructurar los comentarios con información de likes
            const structuredComments = mainComments.map(comment => {
                const commentObj = comment.toObject();
                commentObj.isLiked = comment.likes.some(likeId => likeId.toString() === userId);
                commentObj.likeCount = comment.likes.length;

                const commentReplies = replies.filter(reply =>
                    reply.parentComment._id.toString() === comment._id.toString()
                ).map(reply => {
                    const replyObj = reply.toObject();
                    replyObj.isLiked = reply.likes.some(likeId => likeId.toString() === userId);
                    replyObj.likeCount = reply.likes.length;
                    return replyObj;
                });

                return {
                    ...commentObj,
                    replies: commentReplies
                };
            });

            // 5. Preparar respuesta
            res.json({
                success: true,
                data: {
                    ...thread.toObject(),
                    isLiked: thread.likes.some(likeId => likeId.toString() === userId),
                    likeCount: thread.likes.length,
                    comments: structuredComments,
                    commentCount: mainComments.length + replies.length
                }
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
            const file = req.file;
            const authorId = req.user.id;
            const authorUsername = req.user.username;

            // Validar hilo
            const thread = await ForumThread.findById(threadId);
            if (!thread) {
                throw new AppError('Hilo no encontrado', 404, 'THREAD_NOT_FOUND');
            }

            // Validar comentario padre si existe
            let parentComment = null;
            if (parentCommentId) {
                // 1. Buscar el comentario y verificar autoría
                parentComment = await ForumComment.findOne({
                    _id: parentCommentId,
                    thread: threadId
                });
                if (!parentComment) {
                    throw new AppError('Comentario padre no encontrado', 404, 'PARENT_COMMENT_NOT_FOUND');
                }
                if (parentComment.parentComment) {
                    throw new AppError('No se permiten respuestas anidadas más allá del primer nivel', 400, 'NESTED_REPLIES_NOT_ALLOWED');
                }
            }

            // Procesar multimedia
            let mediaData;
            if (file) {
                const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
                const uploadOptions = {
                    folder: 'forum/comments',
                    originalName: file.originalname
                };

                if (file.mimetype.startsWith('image/')) {
                    uploadOptions.transformations = {
                        // width: 800,
                        // height: 800,
                        // crop: 'fill',
                        format: 'webp'
                    };
                    const result = await this.fileService.uploadImage(fileBase64, `comment-${Date.now()}`, uploadOptions);
                    mediaData = {
                        mediaType: 'image',
                        url: result.url,
                        publicId: result.publicId,
                        dimensions: result.dimensions
                    };
                } else if (file.mimetype.startsWith('video/')) {
                    uploadOptions.resource_type = 'video';
                    uploadOptions.transformations = {
                        // width: 1280,
                        // height: 720,
                        format: 'mp4'
                    };
                    const result = await this.fileService.uploadVideo(fileBase64, `comment-${Date.now()}`, uploadOptions);
                    mediaData = {
                        mediaType: 'video',
                        url: result.url,
                        publicId: result.publicId,
                        dimensions: result.dimensions,
                        duration: result.duration
                    };
                }
            }

            // Crear el comentario
            const comment = await ForumComment.create({
                content,
                author: authorId,
                thread: threadId,
                parentComment: parentCommentId,
                media: mediaData
            });

            // Actualizar contador en el hilo
            await ForumThread.findByIdAndUpdate(threadId, { $inc: { commentCount: 1 } });

            // Poblar datos para la respuesta
            const populatedComment = await ForumComment.findById(comment._id)
                .populate('author', 'username profilePicture firstName lastName')
                .populate('mentions', 'username');

            // Obtener autor del hilo
            const threadAuthorId = thread.author;

            // Detectar menciones primero
            const mentionRegex = /@([a-zA-Z0-9_]{4,20})/g;
            const mentionedUsernames = new Set([...content.matchAll(mentionRegex)].map(m => m[1]));

            // Verificar si el autor del hilo fue mencionado
            const threadAuthor = await User.findById(threadAuthorId).select('username').lean();
            const isThreadAuthorMentioned = mentionedUsernames.has(threadAuthor.username);

            // Verificar si el autor del comentario es el autor del hilo
            const isAuthorTheThreadAuthor = authorId.toString() === threadAuthorId.toString();

            // Solo notificar comentario si NO mencionaron al autor Y no es el propio autor
            if (!isThreadAuthorMentioned && !isAuthorTheThreadAuthor) {
                if (parentCommentId) {
                    // Obtener información completa
                    const parentComment = await ForumComment.findById(parentCommentId)
                        .select('author content thread')
                        .populate('author', 'username')
                        .populate('thread', 'title author')
                        .lean();

                    // Lógica para respuestas a comentarios (existente)
                    await this.notificationService.sendCommentReplyNotification({
                        parentComment,
                        reply: comment,
                        replierId: authorId,
                        replierUsername: authorUsername
                    });
                } else {
                    await this.notificationService.sendThreadCommentNotification({
                        thread,
                        comment,
                        commenterId: authorId,
                        commenterUsername: authorUsername
                    });
                }
            }

            // Notificar menciones (incluye al autor del hilo si fue mencionado)
            if (mentionedUsernames.size > 0) {
                const mentionedUsers = await User.find({
                    username: { $in: Array.from(mentionedUsernames) }
                });

                await Promise.all(mentionedUsers.map(async user => {
                    // No notificar si el usuario se menciona a sí mismo
                    if (!user._id.equals(authorId)) {
                        await this.notificationService.sendMentionNotification({
                            mentionedUserId: user._id,
                            comment,
                            thread,
                            commenterId: authorId,
                            commenterUsername: authorUsername
                        });
                    }
                }));
            }

            res.status(201).json({
                success: true,
                data: populatedComment
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
            const username = req.user.username;

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

            // Notificar al autor del hilo/comentario (excepto si es el mismo usuario)
            if (action === 'liked' && !item.author.equals(userId)) {
                await this.notificationService.sendLikeNotification({
                    targetUserId: item.author,
                    item,
                    likerId: userId,
                    likerUsername: username,
                    targetType: type,
                    targetId: item._id
                });
            }

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

    /**
     * @method updateThread
     * @description Actualiza un hilo
     */
    updateThread = async (req, res, next) => {
        try {
            const { threadId } = req.params;
            const updates = req.body;
            const { id: userId } = req.user;

            // 1. Buscar el hilo y verificar permisos
            const thread = await ForumThread.findOne({
                _id: threadId,
                author: userId
            });

            if (!thread) {
                throw new AppError('Hilo no encontrado', 404, 'THREAD_NOT_FOUND');
            }

            // 2. Campos permitidos para actualización
            const allowedUpdates = ['title', 'content', 'category', 'tags'];
            const filteredUpdates = Object.keys(updates)
                .filter(key => allowedUpdates.includes(key))
                .reduce((obj, key) => {
                    obj[key] = updates[key];
                    return obj;
                }, {});

            // 3. Aplicar actualizaciones
            Object.assign(thread, filteredUpdates);
            await thread.save();

            // 4. Obtener el hilo actualizado con datos poblados
            const updatedThread = await ForumThread.findById(threadId)
                .populate('author', 'username profilePicture firstName lastName')

            req.logger.info('Hilo actualizado (PATCH)', {
                action: 'thread_patch_update',
                threadId,
                userId,
                updatedFields: Object.keys(filteredUpdates)
            });

            res.json({
                success: true,
                data: updatedThread
            });

        } catch (error) {
            next(error);
        }
    };

    /**
     * @method deleteThread
     * @description Elimina un hilo, sus comentarios y todos sus recursos multimedia (creador o admin)
     */
    deleteThread = async (req, res, next) => {
        try {
            const { threadId } = req.params;
            const { id: userId, role } = req.user;

            // 1. Buscar el hilo con sus comentarios poblados
            const thread = await ForumThread.findById(threadId)
                .populate({
                    path: 'comments',
                    select: 'media'
                });

            if (!thread) {
                throw new AppError('Hilo no encontrado', 404, 'THREAD_NOT_FOUND');
            }

            // 2. Verificar permisos (autor o admin)
            if (!thread.author.equals(userId) && role !== 'admin') {
                throw new AppError('No autorizado para eliminar este hilo', 403, 'FORBIDDEN');
            }

            // 3. Eliminar todos los medios del hilo principal
            const threadMediaDeletions = thread.media.map(media =>
                this.deleteMediaWithLogging(media, threadId, req.logger)
            );

            // 4. Eliminar medio del comentario (si existe)
            const commentMediaDeletions = thread.comments
                .filter(comment => comment.media) // Solo comentarios con media
                .map(comment =>
                    this.deleteMediaWithLogging(comment.media, threadId, req.logger, comment._id)
                );

            // 5. Ejecutar todas las eliminaciones en paralelo
            const [threadMediaResults, commentMediaResults] = await Promise.all([
                Promise.all(threadMediaDeletions),
                Promise.all(commentMediaDeletions)
            ]);

            // 6. Eliminar todos los comentarios del hilo
            const deleteCommentsResult = await ForumComment.deleteMany({ thread: threadId });

            // 7. Finalmente eliminar el hilo
            await thread.deleteOne();

            // 8. Preparar estadísticas de eliminación
            const deletionStats = {
                threadMedia: {
                    attempted: thread.media.length,
                    succeeded: threadMediaResults.filter(r => r.success).length
                },
                commentMedia: {
                    attempted: commentMediaDeletions.length,
                    succeeded: commentMediaResults.filter(r => r.success).length
                },
                comments: deleteCommentsResult.deletedCount
            };

            // 9. Registrar resultados
            req.logger.info('Hilo eliminado con estadísticas', {
                action: 'thread_delete_complete',
                threadId,
                userId,
                deletedBy: role === 'admin' ? 'admin' : 'author',
                stats: deletionStats
            });

            // 10. Responder con detalles
            res.json({
                success: true,
                message: 'Hilo y recursos asociados eliminados',
                data: {
                    threadId,
                    deletions: deletionStats
                },
                warnings: {
                    ...this.collectDeletionWarnings(threadMediaResults, 'Hilo'),
                    ...this.collectDeletionWarnings(commentMediaResults, 'Comentarios')
                }
            });

        } catch (error) {
            next(error);
        }
    };

    /**
     * @method updateComment
     * @description Actualiza contenido y/o media del comentario (solo autor)
     */
    updateComment = async (req, res, next) => {
        try {
            const { commentId } = req.params;
            const { id: userId } = req.user;
            const { file } = req;
            const content = req.body.content || (req.body.body && req.body.body.content);

            // 1. Buscar el comentario y verificar autoría
            const comment = await ForumComment.findOne({
                _id: commentId,
                author: userId
            });

            if (!comment) {
                throw new AppError('Comentario no encontrado o no autorizado', 404, 'COMMENT_UPDATE_UNAUTHORIZED');
            }

            // 2. Actualizar contenido si se proporcionó
            if (content !== undefined) {
                comment.content = content;
            }

            // 3. Manejar actualización de media si se proporcionó archivo
            if (file) {
                // Eliminar media anterior si existe
                if (comment.media) {
                    await this.fileService.deleteFile(
                        comment.media.publicId,
                        comment.media.mediaType
                    );
                    req.logger.info('Media anterior eliminado', {
                        action: 'comment_media_delete_old',
                        commentId,
                        publicId: comment.media.publicId
                    });
                }

                // Subir nuevo archivo
                const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

                if (file.mimetype.startsWith('image/')) {
                    const uploadResult = await this.fileService.uploadImage(
                        fileBase64,
                        `comment-${commentId}-${Date.now()}`,
                        {
                            // width: 800,
                            // height: 800,
                            // crop: 'fill',
                            format: 'webp',
                            folder: 'forum/comments'
                        }
                    );

                    comment.media = {
                        mediaType: 'image',
                        url: uploadResult.url,
                        publicId: uploadResult.publicId,
                        format: uploadResult.format,
                        dimensions: uploadResult.dimensions
                    };
                } else if (file.mimetype.startsWith('video/')) {
                    const uploadResult = await this.fileService.uploadVideo(
                        fileBase64,
                        `comment-${commentId}-${Date.now()}`,
                        {
                            // width: 1280,
                            // height: 720,
                            format: 'mp4',
                            folder: 'forum/comments'
                        }
                    );

                    comment.media = {
                        mediaType: 'video',
                        url: uploadResult.url,
                        publicId: uploadResult.publicId,
                        format: uploadResult.format,
                        dimensions: uploadResult.dimensions,
                        duration: uploadResult.duration
                    };
                }
            }

            // 4. Guardar cambios
            await comment.save();

            // 5. Log y respuesta
            req.logger.info('Comentario actualizado', {
                action: 'comment_update',
                commentId,
                userId,
                updatedFields: [
                    ...(content !== undefined ? ['content'] : []),
                    ...(file ? ['media'] : [])
                ]
            });

            res.json({
                success: true,
                data: comment
            });

        } catch (error) {
            next(error);
        }
    };

    /**
     * @method deleteComment
     * @description Elimina un comentario y su media (si existe)
     */
    deleteComment = async (req, res, next) => {
        try {
            const { commentId } = req.params;
            const { id: userId, role } = req.user;

            const comment = await ForumComment.findById(commentId);
            if (!comment) {
                throw new AppError('Comentario no encontrado', 404, 'COMMENT_NOT_FOUND');
            }

            // Verificar permisos (autor o admin)
            if (!comment.author.equals(userId) && role !== 'admin') {
                throw new AppError('No autorizado para eliminar este comentario', 403, 'FORBIDDEN');
            }

            // Eliminar media asociado (si existe)
            let mediaDeletion = { success: true };
            if (comment.media) {
                mediaDeletion = await this.fileService.deleteFile(
                    comment.media.publicId,
                    comment.media.mediaType
                );
            }

            await comment.deleteOne();

            req.logger.info('Comentario eliminado', {
                action: 'comment_delete',
                commentId,
                userId,
                threadId: comment.thread,
                mediaDeleted: !!comment.media,
                mediaDeleteSuccess: mediaDeletion.success
            });

            res.json({
                success: true,
                message: 'Comentario eliminado exitosamente',
                data: {
                    commentId,
                    mediaDeleted: !!comment.media
                },
                ...(!mediaDeletion.success && {
                    warning: `El comentario fue eliminado pero el archivo multimedia no pudo ser borrado: ${mediaDeletion.error}`
                })
            });

        } catch (error) {
            next(error);
        }
    };

    /**
     * @method deleteMediaWithLogging
     * @description Elimina un medio con registro de logs
     */
    async deleteMediaWithLogging(media, threadId, logger, commentId = null) {
        const context = {
            threadId,
            mediaType: media.mediaType,
            publicId: media.publicId,
            ...(commentId && { commentId })
        };

        try {
            const result = await this.fileService.deleteFile(
                media.publicId,
                media.mediaType
            );

            if (!result.success) {
                logger.warn('Eliminación de medio fallida', {
                    ...context,
                    error: result.error
                });
            }
            return result;
        } catch (error) {
            logger.error('Error al eliminar medio', {
                ...context,
                error: error.message
            });
            return { success: false, error: error.message };
        }
    }

    /**
     * @method collectDeletionWarnings
     * @description Recopila advertencias de eliminación
     */
    collectDeletionWarnings(results, type) {
        const failures = results.filter(r => !r.success);
        if (failures.length === 0) return {};

        return {
            [`${type.toLowerCase()}MediaFailures`]: failures.map(f => ({
                publicId: f.publicId,
                error: f.error
            }))
        };
    }

    /**
     * @method createReport
     * @description Crea un reporte
     */
    createReport = async (req, res, next) => {
        try {
            const { threadId, commentId, reason, description } = req.body;
            const reporterId = req.user.id;

            // Verificar que el contenido exista
            // let content;

            const thread = await ForumThread.findById(threadId);
            if (threadId) {
                if (!thread) throw new AppError('Hilo no encontrado', 404, 'THREAD_NOT_FOUND');
            }

            const comment = commentId ? await ForumComment.findById(commentId) : null;
            if (commentId) {
                if (!comment) throw new AppError('Comentario no encontrado', 404, 'COMMENT_NOT_FOUND');
            }

            // Crear el reporte
            const report = await ForumReport.create({
                reporter: reporterId,
                thread: threadId,
                comment: commentId,
                reason,
                description
            });

            // Notificar a los admins
            await this.notificationService.notifyAdminsAboutReport(report.toObject(), req.user.username, thread, comment);

            res.status(201).json({
                success: true,
                data: report
            });

        } catch (error) {
            next(error);
        }
    };

    /**
     * @method getReports
     * @description Obtiene los reportes
     */
    getReports = async (req, res, next) => {
        try {
            const { status, page = 1, limit = 10 } = req.query;
            const skip = (page - 1) * limit;

            const filter = {};
            if (status) filter.status = status;

            const [reports, total] = await Promise.all([
                ForumReport.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(parseInt(limit))
                    .populate('reporter', 'username profilePicture')
                    .populate('thread', 'title')
                    .populate('comment', 'content'),
                ForumReport.countDocuments(filter)
            ]);

            res.json({
                success: true,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit),
                    limit: parseInt(limit)
                },
                data: reports
            });

        } catch (error) {
            next(error);
        }
    };

    /**
     * @method getReportById
     * @description Obtiene un reporte por ID
     */
    getReportById = async (req, res, next) => {
        try {
            const { reportId } = req.params;

            const report = await ForumReport.findById(reportId)
                .populate('reporter', 'username profilePicture')
                .populate('thread', 'title content author')
                .populate('comment', 'content author')
                .populate('resolvedBy', 'username');

            if (!report) {
                throw new AppError('Reporte no encontrado', 404, 'REPORT_NOT_FOUND');
            }

            res.json({
                success: true,
                data: report
            });

        } catch (error) {
            next(error);
        }
    };

    /**
     * @method resolveReport
     * @description Resuelve un reporte
     */
    resolveReport = async (req, res, next) => {
        try {
            const { reportId } = req.params;
            const { action, message, severity = 'medium', suspensionDuration } = req.body;
            const adminId = req.user.id;

            const report = await ForumReport.findById(reportId)
                .populate('reporter', 'username')
                .populate('thread', 'title')
                .populate('comment', 'content');

            if (!report) {
                throw new AppError('Reporte no encontrado', 404, 'REPORT_NOT_FOUND');
            }

            if (report.status !== 'pending') {
                throw new AppError('Este reporte ya fue procesado', 400, 'REPORT_ALREADY_PROCESSED');
            }

            // Realizar acción según lo decidido por el admin
            let contentDeleted = false;
            if (action === 'deleted' || action === 'warning') {
                const contentAuthorId = report.comment
                    ? (await ForumComment.findById(report.comment).select('author')).author
                    : (await ForumThread.findById(report.thread).select('author')).author;

                if (action === 'deleted') {
                    if (report.comment) {
                        await ForumComment.findByIdAndDelete(report.comment._id);
                        contentDeleted = true;
                    } else if (report.thread) {
                        await ForumThread.findByIdAndDelete(report.thread._id);
                        contentDeleted = true;
                    }
                }

                const messageNotification = action === 'deleted' ? 'sido eliminado' : 'recibido una advertencia';

                await this.notificationService.sendWarningNotification({
                    targetUserId: contentAuthorId,
                    senderId: adminId,
                    senderUsername: req.user.username,
                    message: `Tu ${report.comment ? 'comentario' : 'hilo'} "${report.comment ? report.comment.content : report.thread.title}" ha ${messageNotification} por incumplir nuestras normas. ${message ? `Nota del administrador: ${message}` : ''}`,
                    context: {
                        threadId: report.thread?.id,
                        commentId: report.comment?.id,
                        reportId: report.id
                    },
                    warningType: 'content_warning',
                    severity
                });

                // Registrar la advertencia en la base de datos
                await User.findByIdAndUpdate(contentAuthorId, {
                    $push: {
                        warnings: {
                            type: 'content',
                            reason: report.reason,
                            content: report.comment ? 'comment' : 'thread',
                            contentId: report.comment ? report.comment?.id : report.thread?.id,
                            adminId: adminId,
                            message: message,
                            date: new Date()
                        }
                    }
                });
            }
            else if (action === 'banned_user') {
                const contentAuthorId = report.comment
                    ? (await ForumComment.findById(report.comment).select('author')).author
                    : (await ForumThread.findById(report.thread).select('author')).author;

                // Obtener el usuario para su email
                const user = await User.findById(contentAuthorId).select('email');

                // Obtener preview del contenido ofensivo
                let contentPreview = '';
                let contentType = '';

                if (report.comment) {
                    const comment = await ForumComment.findById(report.comment).select('content');
                    contentPreview = comment.content.substring(0, 200) + (comment.content.length > 200 ? '...' : '');
                    contentType = 'comment';

                    // Borrar el comentario
                    await ForumComment.findByIdAndDelete(report.comment._id);
                    contentDeleted = true;

                } else {
                    const thread = await ForumThread.findById(report.thread).select('title content');
                    contentPreview = thread.title + '\n\n' + thread.content.substring(0, 200) + (thread.content.length > 200 ? '...' : '');
                    contentType = 'thread';

                    // Borrar el hilo
                    await ForumThread.findByIdAndDelete(report.thread._id);
                    contentDeleted = true;
                }

                // Calcular la fecha de suspensión
                const suspensionEnd = suspensionDuration ? new Date(Date.now() + suspensionDuration) : null;

                // Suspender al usuario
                await User.findByIdAndUpdate(contentAuthorId, {
                    isActive: false,
                    $push: {
                        suspensions: {
                            type: 'ban',
                            reason: report.reason,
                            contentId: report.comment?.id || report.thread?.id,
                            adminId: adminId,
                            message: message,
                            date: new Date(),
                            until: suspensionEnd // null = permanente
                        }
                    }
                });

                // Enviar email de notificación
                await this.emailService.sendAccountSuspensionEmail(user.email, {
                    reason: report.reason,
                    until: suspensionEnd, // null para baneo permanente
                    adminNote: message,
                    contentType,
                    contentPreview
                });
            }

            // Actualizar el reporte
            report.status = 'resolved';
            report.adminAction = action;
            report.resolvedBy = adminId;
            await report.save();

            // Notificar al usuario que reportó
            await this.notificationService.notifyUserAboutReportResolution(report, contentDeleted);

            res.json({
                success: true,
                data: report,
                message: 'Reporte resuelto exitosamente'
            });

        } catch (error) {
            next(error);
        }
    };

    /**
     * @method deleteReport
     * @description Elimina un reporte que no esté en estado 'pending'
     */
    deleteReport = async (req, res, next) => {
        try {
            const { reportId } = req.params;

            const report = await ForumReport.findById(reportId);

            if (!report) {
                throw new AppError('Reporte no encontrado', 404, 'REPORT_NOT_FOUND');
            }

            if (report.status === 'pending') {
                throw new AppError('No se puede eliminar un reporte pendiente', 400, 'CANNOT_DELETE_PENDING_REPORT');
            }

            const deletedReport = await ForumReport.findByIdAndDelete(reportId);

            res.json({
                success: true,
                message: 'Reporte eliminado exitosamente',
                data: deletedReport
            });

        } catch (error) {
            next(error);
        }
    };

    /**
     * @method deleteNonPendingReports
     * @description Elimina todos los reportes que no estén en estado 'pending' (Admin)
     */
    deleteNonPendingReports = async (req, res, next) => {
        try {
            const result = await ForumReport.deleteMany({
                status: { $ne: 'pending' }
            });

            res.json({
                success: true,
                data: {
                    deletedCount: result.deletedCount
                },
                message: `Se eliminaron ${result.deletedCount} reportes que no estaban en estado 'pending'`
            });

        } catch (error) {
            next(error);
        }
    };
}