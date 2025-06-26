/**
 * @swagger
 * components:
 *   schemas:
 *     Content:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: mongo-id
 *         welcomeSections:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/WelcomeSection'
 *         faqs:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FAQ'
 *         footerText:
 *           type: string
 *         carouselItems:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CarouselMedia'
 *         featuredSections:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FeaturedSection'
 *         lastUpdatedBy:
 *           type: string
 *           format: mongo-id
 *           nullable: true
 * 
 *     WelcomeSection:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         order:
 *           type: number
 * 
 *     FAQ:
 *       type: object
 *       properties:
 *         question:
 *           type: string
 *         answer:
 *           type: string
 *         order:
 *           type: number
 * 
 *     CarouselMedia:
 *       type: object
 *       properties:
 *         mediaType:
 *           type: string
 *           enum: [image, video]
 *         url:
 *           type: string
 *           format: uri
 *         publicId:
 *           type: string
 *         format:
 *           type: string
 *         dimensions:
 *           type: object
 *           properties:
 *             width:
 *               type: number
 *             height:
 *               type: number
 *         duration:
 *           type: number
 *           description: Solo para videos
 * 
 *     FeaturedSection:
 *       type: object
 *       properties:
 *         mainTitle:
 *           type: string
 *         subsections:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Subsection'
 *         order:
 *           type: number
 * 
 *     Subsection:
 *       type: object
 *       properties:
 *         subtitle:
 *           type: string
 *         image:
 *           $ref: '#/components/schemas/SubsectionImage'
 *         order:
 *           type: number
 * 
 *     SubsectionImage:
 *       type: object
 *       properties:
 *         url:
 *           type: string
 *           format: uri
 *         publicId:
 *           type: string
 *         format:
 *           type: string
 *         dimensions:
 *           type: object
 *           properties:
 *             width:
 *               type: number
 *             height:
 *               type: number
 * 
 *     ContentUpdate:
 *       type: object
 *       properties:
 *         welcomeSections:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/WelcomeSection'
 *         faqs:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FAQ'
 *         footerText:
 *           type: string
 *         carouselItems:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CarouselMedia'
 *         featuredSections:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FeaturedSection'
 * 
 *   responses:
 *     ContentResponse:
 *       description: Respuesta de contenido
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *               data:
 *                 $ref: '#/components/schemas/Content'
 * 
 *     ContentUpdated:
 *       description: Contenido actualizado exitosamente
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *               message:
 *                 type: string
 *               data:
 *                 $ref: '#/components/schemas/Content'
 * 
 *     CarouselMediaResponse:
 *       description: Respuesta de medio del carrusel
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *               data:
 *                 $ref: '#/components/schemas/CarouselMedia'
 * 
 *     SubsectionImageResponse:
 *       description: Respuesta de imagen de subsección
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *               data:
 *                 $ref: '#/components/schemas/SubsectionImage'
 *               message:
 *                 type: string
 * 
 *     CarouselItemDeleted:
 *       description: Ítem del carrusel eliminado
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *               message:
 *                 type: string
 *               data:
 *                 type: object
 *                 properties:
 *                   deletedItemIndex:
 *                     type: integer
 *                   remainingItems:
 *                     type: integer
 * 
 *     SubsectionImageDeleted:
 *       description: Imagen de subsección eliminada
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *               message:
 *                 type: string
 *               data:
 *                 type: object
 *                 properties:
 *                   sectionIndex:
 *                     type: integer
 *                   subsectionIndex:
 *                     type: integer
 *                   subsection:
 *                     $ref: '#/components/schemas/Subsection'
 * 
 *     ContentNotFound:
 *       description: Contenido no encontrado
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             error:
 *               code: "CONTENT_NOT_FOUND"
 *               message: "Contenido no encontrado"
 * 
 *     CarouselItemNotFound:
 *       description: Ítem del carrusel no encontrado
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             error:
 *               code: "CAROUSEL_ITEM_NOT_FOUND"
 *               message: "Ítem del carrusel no encontrado"
 * 
 *     SectionNotFound:
 *       description: Sección no encontrada
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             error:
 *               code: "SECTION_NOT_FOUND"
 *               message: "Sección no encontrada"
 * 
 *     SubsectionNotFound:
 *       description: Subsección no encontrada
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             error:
 *               code: "SUBSECTION_NOT_FOUND"
 *               message: "Subsección no encontrada"
 * 
 *     ImageNotFound:
 *       description: Imagen no encontrada
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             error:
 *               code: "IMAGE_NOT_FOUND"
 *               message: "Imagen no encontrada en la subsección"
 * 
 *     MediaDeleteFailed:
 *       description: Error al eliminar medio
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *           example:
 *             success: false
 *             error:
 *               code: "MEDIA_DELETE_FAILED"
 *               message: "Error al eliminar el medio"
 *               details:
 *                 publicId: "public_id_del_medio"
 *                 error: "Mensaje de error detallado"
 */