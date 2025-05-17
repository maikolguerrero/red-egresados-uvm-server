/**
 * @fileoverview Controlador para operaciones de egresados
 * @module controllers/alumni.controller
 * @requires ../models/Alumni
 * @requires ../models/User
 * @requires AppError
 */

import Alumni from '../models/Alumni.js';
import User from '../models/User.js';
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
     * @description Obtiene el perfil público de un egresado
     * @param {Object} req - Objeto de petición Express
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON con el perfil
     */
    getAlumniProfileByUsername = async (req, res, next) => {
        try {
            const { username } = req.params;

            const user = await User.findOne({
                username: username.toLowerCase(),
                role: 'egresado'
            })
                .populate({
                    path: 'alumni',
                    options: {
                        select: '-__v -studentId -idNumber -isRegistered -registrationDate -createdAt -updatedAt', // Excluye campos
                    }
                })

            if (!user?.alumni) {
                throw new AppError('Perfil no encontrado', 404, 'PROFILE_NOT_FOUND');
            }

            // Convertir a objeto aplicando transformaciones automáticas
            const alumniData = user.alumni.toObject(); // Respeta toJSON/toObject
            const userData = user.toObject();

            // Estructurar respuesta
            const response = {
                ...alumniData,
                user: {
                    username: userData.username,
                    memberSince: userData.createdAt,
                    lastLogin: userData.lastLogin
                }
            };

            res.json({
                success: true,
                data: response
            });
        } catch (error) {
            next(error);
        }
    }
}