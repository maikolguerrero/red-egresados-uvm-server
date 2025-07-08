import User from '../models/User.js';
import EgresadoPregrado from '../models/EgresadoPregrado.js';
import EgresadoPostgrado from '../models/EgresadoPostgrado.js';

export default class StatsController {
    /**
    * @method getGraduatesCount
    * @description Obtiene el conteo total de egresados únicos (combinando pregrado y postgrado sin duplicados)
    */
    getGraduatesCount = async (req, res, next) => {
        try {
            const count = await this._getGraduatesCountInternal();
            res.json({
                success: true,
                data: count
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * @method getRegisteredGraduates
     * @description Obtiene el conteo de egresados registrados en la plataforma
     */
    getRegisteredGraduates = async (req, res, next) => {
        try {
            const count = await this._getRegisteredGraduatesInternal();

            res.json({
                success: true,
                data: count
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * @method getOnlineUsers
     * @description Obtiene el conteo de usuarios en línea
     */
    getOnlineUsers = async (req, res, next) => {
        try {
            const count = await this._getOnlineUsersInternal();

            res.json({
                success: true,
                data: count
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * @method getAllStats
     * @description Obtiene todas las estadísticas en una sola llamada
     */
    getAllStats = async (req, res, next) => {
        try {
            const [
                graduatesCount,
                registeredGraduates,
                onlineUsers
            ] = await Promise.all([
                this._getGraduatesCountInternal(),
                this._getRegisteredGraduatesInternal(),
                this._getOnlineUsersInternal()
            ]);

            res.json({
                success: true,
                data: {
                    graduatesCount,
                    registeredGraduates,
                    onlineUsers
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // Métodos internos para reutilización
    _getGraduatesCountInternal = async () => {
        const [pregradoCedulas, postgradoCedulas] = await Promise.all([
            EgresadoPregrado.distinct('cedula'),
            EgresadoPostgrado.distinct('cedula')
        ]);

        const allCedulas = [...new Set([...pregradoCedulas, ...postgradoCedulas])];

        return allCedulas.length;
    }

    _getRegisteredGraduatesInternal = async () => {
        return await User.countDocuments({
            role: 'egresado',
            isVerified: true,
            isActive: true
        });
    }

    _getOnlineUsersInternal = async () => {
        return await User.countDocuments({
            isOnline: true,
            isActive: true
        });
    }
}