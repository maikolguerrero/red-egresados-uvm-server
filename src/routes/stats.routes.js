import express from 'express';
import StatsController from '../controllers/stats.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export default function statsRoutes(logger) {
    const router = express.Router();
    const statsController = new StatsController();

    /**
     * @swagger
     * /api/stats/graduates:
     *   get:
     *     summary: Obtiene el conteo de egresados (pregrado + postgrado)
     *     tags: [Estadísticas]
     *     responses:
     *       200:
     *         description: Conteo de egresados
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 data:
     *                   type: integer
     *                   description: Número de egresados
     */
    router.get('/graduates', statsController.getGraduatesCount);

    /**
     * @swagger
     * /api/stats/registered:
     *   get:
     *     summary: Obtiene el conteo de egresados registrados en la plataforma
     *     tags: [Estadísticas]
     *     responses:
     *       200:
     *         description: Conteo de egresados registrados
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 data:
     *                   type: integer
     *                   description: Número de egresados registrados
     */
    router.get('/registered', statsController.getRegisteredGraduates);

    /**
     * @swagger
     * /api/stats/online:
     *   get:
     *     summary: Obtiene el conteo de usuarios en línea
     *     tags: [Estadísticas]
     *     responses:
     *       200:
     *         description: Conteo de usuarios en línea
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 data:
     *                   type: integer
     *                   description: Número de usuarios en línea
     */
    router.get('/online', authenticate, statsController.getOnlineUsers);

    /**
     * @swagger
     * /api/stats/all:
     *   get:
     *     summary: Obtiene todas las estadísticas en una sola llamada
     *     tags: [Estadísticas]
     *     responses:
     *       200:
     *         description: Todas las estadísticas
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 data:
     *                   type: object
     *                   properties:
     *                     graduatesCount:
     *                       type: integer
     *                     registeredGraduates:
     *                       type: integer
     *                     onlineUsers:
     *                       type: integer
     */
    router.get('/all', statsController.getAllStats);

    return router;
}