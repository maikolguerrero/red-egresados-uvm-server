/**
 * @fileoverview Configuración de Swagger/OpenAPI para documentación interactiva
 * @module config/swagger
 * @requires swagger-jsdoc - Generador de especificación OpenAPI
 * @requires swagger-ui-express - Interfaz visual de documentación
 * 
 * @description  
 * Configuración completa para:
 * - Generar especificación OpenAPI 3.0 desde comentarios JSDoc  
 * - Servir UI interactiva en `/api-docs`  
 * - Proveer endpoint JSON en `/api-docs.json`  
 * - Soporte para autenticación JWT  
 * - Entornos múltiples (dev/prod)
 */

import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

/**
 * Opciones principales de configuración para Swagger
 * @typedef {Object} SwaggerConfig
 * @property {Object} definition - Configuración OpenAPI
 * @property {string[]} apis - Rutas de archivos a analizar
 */

/**
 * Configuración Swagger con valores por defecto y variables de entorno
 * @type {SwaggerConfig}
 * @constant
 * @example
 * // Estructura completa:
 * {
 *   openapi: '3.0.0',
 *   info: { title, version, description },
 *   servers: [{ url, description }],
 *   tags: [{ name, description }],
 *   components: { securitySchemes }
 * }
 */
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: process.env.SWAGGER_TITLE || 'API Red de Egresados UVM',
            version: process.env.SWAGGER_VERSION || '1.0.0',
            description: process.env.SWAGGER_DESCRIPTION || 'Documentación de la API para el sistema de Red de Egresados de la Universidad Valle del Momboy',
            contact: {
                name: 'Equipo de Desarrollo',
                email: 'desarrollo@uvm.edu.ve', // Correo de contacto de ejemplo
                url: "https://www.uvm.edu.ve"
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: process.env.API_BASE_URL || "http://localhost:3000",
                description: process.env.NODE_ENV === 'production'
                    ? 'Servidor de producción'
                    : 'Servidor de desarrollo'
            }
        ],
        tags: [
            {
                name: 'Autenticación',
                description: 'Endpoints para registro, login y manejo de tokens'
            },
            {
                name: 'Egresados',
                description: 'Gestión de perfiles de egresados'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },
        security: [{
            bearerAuth: []
        }]
    },
    apis: ['./src/routes/*.js',
        './src/docs/swagger/components/*.js'
    ]
};

/**
 * Especificación OpenAPI generada
 * @type {Object}
 * @constant
 * @property {string} openapi - Versión de OpenAPI
 * @property {Object} info - Metadatos de la API
 * @property {Array} servers - URLs de servidores
 */
const swaggerSpec = swaggerJSDoc(swaggerOptions);

/**
 * Configura las rutas de documentación Swagger en la aplicación Express
 * @function setupSwagger
 * @param {Object} app - Instancia de Express
 * @returns {void}
 * 
 * @example
 * // En tu archivo principal:
 * import swaggerDocs from './config/swagger';
 * swaggerDocs(app);
 */
const swaggerDocs = (app) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        swaggerOptions: {
            filter: true,
            persistAuthorization: true
        }
    }));

    // Docs en JSON format
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
};

export default swaggerDocs;