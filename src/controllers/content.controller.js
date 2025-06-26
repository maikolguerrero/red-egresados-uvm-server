import Content from '../models/Content.js';
import AppError from '../middlewares/AppError.js';

export default class ContentController {
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
     * @method getContent
     * @description Obtiene todo el contenido del sitio
     */
    getContent = async (req, res, next) => {
        try {
            // Solo hay un documento de contenido que actualizamos
            const content = await Content.findOne().sort({ createdAt: -1 });

            if (!content) {
                // Crear documento inicial si no existe
                const initialContent = new Content({
                    welcomeSections: [],
                    faqs: [],
                    footerText: '',
                    carouselItems: [],
                    featuredSections: [],
                    lastUpdatedBy: null
                });
                await initialContent.save();
                return res.json({ success: true, data: initialContent });
            }

            res.json({ success: true, data: content });
        } catch (error) {
            next(error);
        }
    };

    /**
     * @method updateContent
     * @description Actualiza el contenido del sitio y elimina imágenes no utilizadas
     */
    updateContent = async (req, res, next) => {
        try {
            const updateData = req.body;
            const userId = req.user.id;

            // Buscar el documento más reciente
            let content = await Content.findOne().sort({ createdAt: -1 });

            // Guardar el contenido antiguo para comparación
            const oldContent = content ? content.toObject() : null;

            if (!content) {
                // Si no existe, crear uno nuevo
                content = new Content({
                    ...updateData,
                    lastUpdatedBy: userId
                });
            } else {
                // Antes de actualizar, identificar imágenes que serán eliminadas
                if (updateData.featuredSections) {
                    await this.cleanupRemovedFeaturedImages(oldContent.featuredSections, updateData.featuredSections);
                }

                if (updateData.carouselItems) {
                    await this.cleanupRemovedCarouselItems(oldContent.carouselItems, updateData.carouselItems);
                }

                // Actualizar campos
                if (updateData.welcomeSections) content.welcomeSections = updateData.welcomeSections;
                if (updateData.faqs) content.faqs = updateData.faqs;
                if (updateData.footerText !== undefined) content.footerText = updateData.footerText;
                // if (updateData.carouselItems) content.carouselItems = updateData.carouselItems;
                if (updateData.featuredSections) content.featuredSections = updateData.featuredSections;

                content.lastUpdatedBy = userId;
            }

            await content.save();

            res.json({
                success: true,
                message: 'Contenido actualizado correctamente',
                data: content
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * @method cleanupRemovedFeaturedImages
     * @description Elimina imágenes de subsecciones que ya no están en el contenido actualizado
     */
    cleanupRemovedFeaturedImages = async (oldSections = [], newSections = []) => {
        try {
            const oldImages = [];
            const newImages = [];

            console.log(oldSections);
            console.log(newSections);

            // Recopilar imágenes antiguas
            oldSections.forEach(section => {
                if (section.subsections) {
                    section.subsections.forEach(subsection => {
                        if (subsection.image && subsection.image.publicId) {
                            oldImages.push(subsection.image.publicId);
                        }
                    });
                }
            });

            // Recopilar imágenes nuevas
            newSections.forEach(section => {
                if (section.subsections) {
                    section.subsections.forEach(subsection => {
                        if (subsection.image && subsection.image.publicId) {
                            newImages.push(subsection.image.publicId);
                        }
                    });
                }
            });

            // Encontrar imágenes que estaban pero ya no están
            const imagesToDelete = oldImages.filter(publicId => !newImages.includes(publicId));

            // Eliminar imágenes no utilizadas
            await Promise.all(imagesToDelete.map(async publicId => {
                try {
                    await this.fileService.deleteFile(publicId, 'image');
                } catch (error) {
                    req.logger.error(`Error al eliminar imagen ${publicId}:`, error.message);
                    // No lanzar error para no interrumpir el proceso completo
                }
            }));

        } catch (error) {
            req.logger.error('Error en cleanupRemovedFeaturedImages:', error);
            // No lanzar error para no interrumpir el proceso principal
        }
    };

    /**
     * @method cleanupRemovedCarouselItems
     * @description Elimina medios del carrusel que ya no están en el contenido actualizado
     */
    cleanupRemovedCarouselItems = async (oldItems = [], newItems = []) => {
        try {
            const oldMedia = oldItems.map(item => item.publicId).filter(Boolean);
            const newMedia = newItems.map(item => item.publicId).filter(Boolean);

            // Encontrar medios que estaban pero ya no están
            const mediaToDelete = oldMedia.filter(publicId => !newMedia.includes(publicId));

            // Eliminar medios no utilizados
            await Promise.all(mediaToDelete.map(async publicId => {
                try {
                    const oldItem = oldItems.find(item => item.publicId === publicId);
                    const resourceType = oldItem?.mediaType === 'video' ? 'video' : 'image';
                    await this.fileService.deleteFile(publicId, resourceType);
                } catch (error) {
                    req.logger.error(`Error al eliminar medio ${publicId}:`, error.message);
                    // No lanzar error para no interrumpir el proceso completo
                }
            }));

        } catch (error) {
            req.logger.error('Error en cleanupRemovedCarouselItems:', error);
            // No lanzar error para no interrumpir el proceso principal
        }
    };

    /**
     * @method uploadCarouselMedia
     * @description Sube medios para el carrusel
     */
    uploadCarouselMedia = async (req, res, next) => {
        try {
            const { file } = req;

            if (!file) {
                throw new AppError('No se proporcionó archivo', 400, 'NO_FILE_PROVIDED');
            }

            // Convertir buffer a formato que Cloudinary pueda procesar
            const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

            // Determinar si es imagen o video
            const isVideo = file.mimetype.startsWith('video/');
            const uploadOptions = {
                folder: 'landing/carousel',
                originalName: file.originalname
            };

            let uploadResult;
            if (isVideo) {
                uploadResult = await this.fileService.uploadVideo(fileBase64, `carousel-${Date.now()}`, uploadOptions);
            } else {
                uploadResult = await this.fileService.uploadImage(fileBase64, `carousel-${Date.now()}`, uploadOptions);
            }

            if (!uploadResult.success) {
                throw new AppError('Error al subir el medio', 500, 'MEDIA_UPLOAD_FAILED');
            }

            const newMedia = {
                // order: 0, // Orden por defecto, puede ser actualizado después
                mediaType: isVideo ? 'video' : 'image',
                url: uploadResult.url,
                publicId: uploadResult.publicId,
                format: uploadResult.format
            };

            if (isVideo) {
                newMedia.duration = uploadResult.duration;
            } else {
                newMedia.dimensions = {
                    width: uploadResult.width,
                    height: uploadResult.height
                };
            }

            // guardar en el modelo
            const content = await Content.findOne().sort({ createdAt: -1 });
            content.carouselItems.push(newMedia);
            await content.save();

            res.json({
                success: true,
                data: newMedia
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * @method uploadSubsectionImage
     * @description Sube imagen para una subsección
     */
    uploadSubsectionImage = async (req, res, next) => {
        try {
            const { file } = req;
            const { sectionIndex, subsectionIndex } = req.params;

            if (!file) {
                throw new AppError('No se proporcionó archivo', 400, 'NO_FILE_PROVIDED');
            }

            // 1. Subir la imagen primero
            const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

            const uploadResult = await this.fileService.uploadImage(
                fileBase64,
                `subsection-${Date.now()}`,
                {
                    folder: 'landing/subsections',
                    originalName: file.originalname
                }
            );

            if (!uploadResult.success) {
                throw new AppError('Error al subir la imagen', 500, 'IMAGE_UPLOAD_FAILED');
            }

            // 2. Obtener o crear el documento de contenido
            let content = await Content.findOne().sort({ createdAt: -1 });

            if (!content) {
                content = new Content({
                    featuredSections: []
                });
            }

            // 3.Si content.featuredSections[featuredSectionsIndex] no existe, crearlo
            if (!content.featuredSections[sectionIndex]) {
                content.featuredSections[sectionIndex] = {
                    mainTitle: 'Título principal por defecto',
                };
            }

            // 4.Si subsectionsIndex no existe, crearlo
            if (!content.featuredSections[sectionIndex].subsections[subsectionIndex]) {
                content.featuredSections[sectionIndex].subsections[subsectionIndex] = {
                    subtitle: 'Título por defecto',
                };
            }

            // 5. Agregar la imagen a la subsección
            content.featuredSections[sectionIndex].subsections[subsectionIndex].image = {
                url: uploadResult.url,
                publicId: uploadResult.publicId,
                format: uploadResult.format,
                dimensions: {
                    width: uploadResult.width,
                    height: uploadResult.height
                },
            };

            // 6. Guardar los cambios
            const savedContent = await content.save();

            const savedContentObject = savedContent.toObject();

            if (!savedContent) {
                throw new AppError('Error al guardar el contenido', 500, 'CONTENT_SAVE_ERROR');
            }

            res.json({
                success: true,
                data: savedContentObject.featuredSections[sectionIndex].subsections[subsectionIndex],
                message: 'Imagen y subsección guardadas correctamente'
            });

        } catch (error) {
            next(error);
        }
    };


    /**
     * @method deleteCarouselItem
     * @description Elimina un item del carrusel (imagen o video)
     */
    deleteCarouselItem = async (req, res, next) => {
        try {
            const { index } = req.params;
            const userId = req.user.id;

            // 1. Obtener el contenido
            const content = await Content.findOne().sort({ createdAt: -1 });
            if (!content) {
                throw new AppError('Contenido no encontrado', 404, 'CONTENT_NOT_FOUND');
            }

            // 2. Verificar que el índice existe
            if (!content.carouselItems[index]) {
                throw new AppError('Ítem del carrusel no encontrado', 404, 'CAROUSEL_ITEM_NOT_FOUND');
            }

            const itemToDelete = content.carouselItems[index];

            // 3. Eliminar de Cloudinary
            const deleteResult = await this.fileService.deleteFile(
                itemToDelete.publicId,
                itemToDelete.mediaType === 'video' ? 'video' : 'image'
            );

            if (!deleteResult.success) {
                throw new AppError('Error al eliminar el medio', 500, 'MEDIA_DELETE_FAILED', {
                    publicId: itemToDelete.publicId,
                    error: deleteResult.error
                });
            }

            // 4. Eliminar de la base de datos
            content.carouselItems.splice(index, 1);
            content.lastUpdatedBy = userId;
            await content.save();

            res.json({
                success: true,
                message: 'Ítem del carrusel eliminado correctamente',
                data: {
                    deletedItemIndex: index,
                    remainingItems: content.carouselItems.length
                }
            });

        } catch (error) {
            next(error);
        }
    };

    /**
     * @method deleteSubsectionImage
     * @description Elimina una imagen de una subsección
     */
    deleteSubsectionImage = async (req, res, next) => {
        try {
            const { sectionIndex, subsectionIndex } = req.params;
            const userId = req.user.id;

            // 1. Obtener el contenido
            const content = await Content.findOne().sort({ createdAt: -1 });
            if (!content) {
                throw new AppError('Contenido no encontrado', 404, 'CONTENT_NOT_FOUND');
            }

            // 2. Verificar índices
            if (!content.featuredSections[sectionIndex]) {
                throw new AppError('Sección no encontrada', 404, 'SECTION_NOT_FOUND');
            }

            const section = content.featuredSections[sectionIndex];

            if (!section.subsections || !section.subsections[subsectionIndex]) {
                throw new AppError('Subsección no encontrada', 404, 'SUBSECTION_NOT_FOUND');
            }

            const subsection = section.subsections[subsectionIndex];

            if (!subsection.image || !subsection.image.publicId) {
                throw new AppError('Imagen no encontrada en la subsección', 404, 'IMAGE_NOT_FOUND');
            }

            // 3. Eliminar de Cloudinary
            const deleteResult = await this.fileService.deleteFile(
                subsection.image.publicId,
                'image'
            );

            if (!deleteResult.success) {
                throw new AppError('Error al eliminar la imagen', 500, 'IMAGE_DELETE_FAILED', {
                    publicId: subsection.image.publicId,
                    error: deleteResult.error
                });
            }

            // 4. Eliminar la imagen de la subsección (pero mantener la subsección)
            subsection.image = null;
            content.lastUpdatedBy = userId;
            await content.save();

            res.json({
                success: true,
                message: 'Imagen de subsección eliminada correctamente',
                data: {
                    sectionIndex,
                    subsectionIndex,
                    subsection: subsection
                }
            });

        } catch (error) {
            next(error);
        }
    };
}