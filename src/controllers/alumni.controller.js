/**
 * @fileoverview Controlador para operaciones de egresados
 * @module controllers/alumni.controller
 * @requires ../models/Alumni
 * @requires ../models/User
 * @requires ../models/UserProfile
 * @requires AppError
 */

import Alumni from '../models/Alumni.js';
import User from '../models/User.js';
import UserProfile from '../models/UserProfile.js';
import AppError from '../middlewares/AppError.js';

/**
 * @classdesc Controlador para operaciones relacionadas con egresados
 * @class AlumniController
 * 
 * @description
 * Maneja todas las operaciones relacionadas con:
 * - Búsqueda y filtrado de egresados
 * - Obtención de perfiles públicos
 * 
 * @example
 * // Uso típico en rutas:
 * const alumniController = new AlumniController();
 * router.get('/search', alumniController.searchAlumni);
 */
export default class AlumniController {
    /**
    * @description Crea una instancia del controlador de autenticación
    * @param {FileService} fileService - Servicio de envío de archivos
    * @example
    * const fileService = new FileService();
    * const alumniController = new AlumniController(fileService);
    */
    constructor(fileService) {
        this.fileService = fileService;
    }
    /**
     * @method searchAlumni
     * @async
     * @description Busca egresados según criterios especificados
     * @param {Object} req - Objeto de petición Express
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON con resultados
     */
    searchAlumni = async (req, res, next) => {
        try {
            const { query, degree, graduationYear, location, username } = req.query;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            req.logger.debug('Inicio búsqueda de egresados', {
                ip: req.ip
            });

            // Construir filtro para Alumni
            const alumniFilter = {
                isRegistered: true,
                ...(degree && { degree }),
                ...(graduationYear && {
                    graduationDate: {
                        $gte: new Date(`${graduationYear}-01-01`),
                        $lte: new Date(`${graduationYear}-12-31`)
                    }
                }),
                ...(location && { location: { $regex: location, $options: 'i' } })
            };

            // Filtro adicional si se busca por username
            if (username) {
                const users = await User.find({
                    username: { $regex: username, $options: 'i' },
                    role: 'egresado'
                }).select('_id');

                alumniFilter.user = { $in: users.map(u => u._id) };
            }

            // Filtro para texto general (nombre, email)
            if (query) {
                alumniFilter.$or = [
                    { firstName: { $regex: query, $options: 'i' } },
                    { lastName: { $regex: query, $options: 'i' } },
                    { email: { $regex: query, $options: 'i' } }
                ];
            }

            // Consulta final con paginación
            const [total, results] = await Promise.all([
                Alumni.countDocuments(alumniFilter),
                Alumni.find(alumniFilter)
                    .populate({
                        path: 'user',
                        select: 'username isActive lastLogin createdAt'
                    })
                    .select('-isRegistered -registrationDate -__v')
                    .skip(skip)
                    .limit(limit)
                    .sort({ lastName: 1, firstName: 1 })
            ]);

            req.logger.info('Búsqueda de egresados exitosa', {
                ip: req.ip
            });

            res.json({
                success: true,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit),
                    limit
                },
                data: results.map(item => ({
                    ...item.toObject(),
                    user: item.user ? {
                        username: item.user.username,
                        isActive: item.user.isActive,
                        lastLogin: item.user.lastLogin,
                        memberSince: item.user.createdAt
                    } : null
                }))
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * @method getAlumniProfileByUsername
     * @async
     * @description Obtiene el perfil público de un egresado incluyendo información de UserProfile
     * @param {Object} req - Objeto de petición Express
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON con el perfil completo
     */
    getAlumniProfileByUsername = async (req, res, next) => {
        try {
            const { username } = req.params;

            req.logger.debug('Buscando perfil público de egresado', {
                action: 'get_public_profile',
                username,
                ip: req.ip
            });

            // Buscar usuario con todos los datos relacionados
            const user = await User.findOne({
                username: username.toLowerCase(),
                role: 'egresado'
            })
                .populate({
                    path: 'alumni',
                    select: '-__v -studentId -idNumber -isRegistered -registrationDate -createdAt -updatedAt'
                })
                .populate({
                    path: 'profile',
                    select: '-__v -user -createdAt -updatedAt'
                });

            if (!user) {
                throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND', {
                    action: 'get_public_profile',
                    username,
                    ip: req.ip
                });
            }

            if (!user?.alumni) {
                throw new AppError('Datos de egresado no encontrados', 404, 'ALUMNI_DATA_NOT_FOUND', {
                    action: 'get_public_profile',
                    username,
                    userId: user._id,
                    ip: req.ip
                });
            }

            // Convertir a objetos
            const alumniData = user.alumni.toObject();
            const userData = user.toObject();
            const profileData = user.profile?.toObject() || {};

            // Estructurar respuesta
            const response = {
                ...alumniData,
                user: {
                    username: userData.username,
                    memberSince: userData.createdAt,
                    lastLogin: userData.lastLogin
                },
                profile: profileData
            };

            req.logger.info('Perfil público obtenido exitosamente', {
                action: 'get_public_profile_success',
                username,
                userId: user._id,
                ip: req.ip
            });

            res.json({
                success: true,
                data: response
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * @method updateProfile
     * @async
     * @description Actualiza el perfil del usuario autenticado
     * @param {Object} req - Objeto de petición Express
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON
     * @throws {AppError} Con errores específicos:
     *  - 404 si no se encuentra el perfil
     *  - 500 si hay error al actualizar
     */
    updateProfile = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const updateData = req.body;

            req.logger.debug('Inicio de actualización de perfil', {
                action: 'profile_update',
                userId,
                ip: req.ip,
                updateFields: Object.keys(updateData)
            });

            // Buscar el perfil del usuario
            const userProfile = await UserProfile.findOne({ user: userId });

            if (!userProfile) {
                throw new AppError(
                    'Perfil no encontrado',
                    404,
                    'PROFILE_NOT_FOUND',
                    {
                        action: 'profile_update',
                        userId,
                        ip: req.ip
                    }
                );
            }

            // Función para actualizar arrays manteniendo los IDs cuando corresponda
            const updateArrayField = (fieldName, idField = '_id') => {
                if (updateData[fieldName]) {
                    userProfile[fieldName] = updateData[fieldName].map(item => {
                        // Si el item tiene ID, buscarlo en el array existente para mantenerlo
                        if (item[idField]) {
                            const existingItem = userProfile[fieldName].find(
                                existing => existing[idField].toString() === item[idField].toString()
                            );
                            if (existingItem) {
                                return { ...existingItem.toObject(), ...item };
                            }
                        }
                        return item;
                    });
                }
            };

            // Actualizar campos según lo recibido
            if (updateData.contact) {
                userProfile.contact = {
                    ...userProfile.contact,
                    ...updateData.contact
                };
            }

            if (updateData.socialMedia) {
                userProfile.socialMedia = {
                    ...userProfile.socialMedia,
                    ...updateData.socialMedia
                };
            }

            if (updateData.professional) {
                userProfile.professional = {
                    ...userProfile.professional,
                    ...updateData.professional
                };

                // Manejar arrays de skills e interests por separado para evitar sobrescribir
                if (updateData.professional.skills) {
                    userProfile.professional.skills = [...new Set([
                        ...(userProfile.professional.skills || []),
                        ...(updateData.professional.skills || [])
                    ])];
                }

                if (updateData.professional.interests) {
                    userProfile.professional.interests = [...new Set([
                        ...(userProfile.professional.interests || []),
                        ...(updateData.professional.interests || [])
                    ])];
                }
            }

            // Manejar experiencia laboral (array de objetos)
            if (updateData.experience) {
                updateArrayField('experience');

                // Validar que cada experiencia tenga los campos requeridos
                userProfile.experience.forEach(exp => {
                    if (!exp.position || !exp.company || !exp.startDate) {
                        throw new AppError(
                            'Experiencia laboral incompleta. Se requieren puesto, empresa y fecha de inicio',
                            400,
                            'INVALID_EXPERIENCE_DATA',
                            {
                                action: 'profile_update',
                                userId,
                                ip: req.ip
                            }
                        );
                    }
                });
            }

            // Manejar educación (array de objetos)
            if (updateData.education) {
                updateArrayField('education');

                // Validar campos requeridos
                userProfile.education.forEach(edu => {
                    if (!edu.institution) {
                        throw new AppError(
                            'Educación incompleta. Se requiere institución',
                            400,
                            'INVALID_EDUCATION_DATA',
                            {
                                action: 'profile_update',
                                userId,
                                ip: req.ip
                            }
                        );
                    }
                });
            }

            // Manejar certificaciones (array de objetos)
            if (updateData.certifications) {
                updateArrayField('certifications');

                // Validar campos requeridos
                userProfile.certifications.forEach(cert => {
                    if (!cert.name || !cert.issuingOrganization) {
                        throw new AppError(
                            'Certificación incompleta. Se requiere nombre y organización emisora',
                            400,
                            'INVALID_CERTIFICATION_DATA',
                            {
                                action: 'profile_update',
                                userId,
                                ip: req.ip
                            }
                        );
                    }
                });
            }

            // Guardar cambios
            const updatedProfile = await userProfile.save();

            req.logger.info('Perfil actualizado exitosamente', {
                action: 'profile_update_success',
                userId,
                updatedFields: Object.keys(updateData),
                ip: req.ip
            });

            res.json({
                success: true,
                message: 'Perfil actualizado correctamente',
                data: updatedProfile
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * @method updateProfilePicture
     * @async
     * @description Actualiza la foto de perfil del usuario autenticado
     * @param {Object} req - Objeto de petición Express
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON
     * @throws {AppError} Con errores específicos:
     *  - 404 si no se encuentra el perfil
     *  - 500 si hay error al actualizar
     */
    updateProfilePicture = async (req, res, next) => {
        try {
            const { file } = req;
            const userId = req.user.id;

            req.logger.debug('Inicio actualización de foto de perfil', {
                userId,
                ip: req.ip
            });

            // 1. Validación ya realizada por el middleware
            const user = await User.findById(userId);
            if (!user) {
                throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
            }

            // 2. Convertir buffer a base64
            const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

            // 3. Eliminar imagen anterior si existe
            if (user.profilePicture.publicId) {
                await this.fileService.deleteFile(user.profilePicture.publicId);
                req.logger.info('Imagen anterior eliminada', {
                    action: 'updateProfilePicture',
                    userId,
                    publicId: user.profilePicture.publicId
                });
            }

            // 4. Subir nueva imagen
            const uploadResult = await this.fileService.uploadImage(
                fileBase64,
                userId,
                {
                    width: 300,
                    height: 300,
                    crop: 'fill',
                    gravity: 'face',
                    quality: 'auto:best',
                    format: 'webp',
                    folder: 'users/profile-pictures',
                    originalName: file.originalname
                }
            );

            if (!uploadResult.success) {
                throw new AppError('Error al procesar la imagen', 500, 'UPLOAD_FAILED', {
                    userId,
                    errorDetails: uploadResult.error
                });
            }

            const newProfilePicture = {
                url: uploadResult.url,
                publicId: uploadResult.publicId,
                format: uploadResult.format,
                dimensions: {
                    width: uploadResult.width,
                    height: uploadResult.height
                }
            };

            // 5. Actualizar usuario
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                {
                    profilePicture: newProfilePicture
                },
                { new: true, runValidators: true }
            ).select('-__v -password -verificationToken -resetPasswordToken');

            req.logger.info('Foto de perfil actualizada', {
                action: 'updateProfilePicture',
                userId,
                newPublicId: uploadResult.publicId
            });

            // 6. Respuesta mejorada
            res.status(200).json({
                success: true,
                data: {
                    profilePicture: newProfilePicture
                }
            });

        } catch (error) {
            next(error);
        }
    };
}