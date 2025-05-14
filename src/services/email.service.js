/**
 * @fileoverview Servicio para manejo de envío de emails del sistema
 * @module services/email.service
 * @requires crypto
 * @requires dotenv
 * 
 * @description
 * Este servicio proporciona funcionalidades para:
 * - Generación de tokens de verificación
 * - Envío de emails de verificación de cuenta
 * - Envío de emails para recuperación de contraseña
 * - Notificación de cambios de contraseña
 * 
 * Utiliza un transporter configurado (como nodemailer) para el envío real de emails
 * y registra todas las operaciones mediante un logger.
 */

import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

/**
 * @constant {boolean} isProduction
 * @description Indica si el entorno actual es de producción
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * @class EmailService
 * @description Servicio para manejo de envío de emails del sistema
 */
export default class EmailService {
    /**
     * @constructor
     * @param {Object} transporter - Transporter configurado para envío de emails (ej: nodemailer)
     * @param {Object} logger - Instancia de logger para registro de eventos
     */
    constructor(transporter, logger) {
        /**
        * @member {Object} transporter
        * @description Transporter para envío de emails
        */

        /**
        * @member {Object} transporter
        * @description Transporter para envío de emails
        */
        this.transporter = transporter;
        this.logger = logger.child({ service: 'EmailService' });
    }

    /**
    * @method generateVerificationToken
    * @description Genera un token criptográficamente seguro para verificación
    * @returns {string} Token hexadecimal de 40 caracteres
    * 
    * @example
    * const token = emailService.generateVerificationToken();
    * // token = '4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a'
    */
    generateVerificationToken() {
        const token = crypto.randomBytes(20).toString('hex');
        this.logger.debug('Token de verificación generado', { action: 'generateToken' });
        return token;
    }

    /**
     * @method sendVerificationEmail
     * @async
     * @description Envía email con enlace para verificación de cuenta
     * @param {string} email - Dirección de email del destinatario
     * @param {string} token - Token de verificación generado
     * @returns {Promise<Object>} Resultado de la operación
     * @returns {boolean} success - Indica si el envío fue exitoso
     * @returns {string} [messageId] - ID del mensaje (si fue exitoso)
     * @returns {string} [error] - Mensaje de error (si falló)
     * 
     * @example
     * const result = await emailService.sendVerificationEmail('user@uvm.edu.ve', 'abc123');
     * if (result.success) {
     *   console.log('Email enviado con ID:', result.messageId);
     * }
     */
    async sendVerificationEmail(email, token) {
        const verificationUrl = `${process.env.BASE_URL}/api/auth/verify-email?token=${token}`;
        this.logger.info('Enviando email de verificación', { email, action: 'sendVerification' });

        try {
            const info = await this.transporter.sendMail({
                from: `"${process.env.EMAIL_FROM_NAME}" <no-reply@uvm.edu.ve>`,
                to: email,
                subject: 'Verifica tu cuenta - Red de Egresados UVM',
                html: `
                    <h1>Gracias por registrarte</h1>
                    <a href="${verificationUrl}">Confirmar cuenta</a>
                `
            });
            this.logger.info('Email de verificación enviado', {
                email,
                messageId: info.messageId,
                action: 'sendVerification'
            });
            return { success: true, messageId: info.messageId };
        } catch (error) {
            this.logger.error('Error al enviar email de verificación', {
                email,
                error: error.message,
                stack: !isProduction ? error.stack : undefined,
                action: 'sendVerification'
            });
            return { success: false, error: error.message };
        }
    }

    /**
     * @method sendPasswordResetEmail
     * @async
     * @description Envía email con enlace para restablecer contraseña
     * @param {string} email - Dirección de email del destinatario
     * @param {string} token - Token de restablecimiento generado
     * @returns {Promise<Object>} Resultado de la operación
     * @returns {boolean} success - Indica si el envío fue exitoso
     * @returns {string} [messageId] - ID del mensaje (si fue exitoso)
     * @returns {string} [error] - Mensaje de error (si falló)
     * 
     * @example
     * const result = await emailService.sendPasswordResetEmail('user@uvm.edu.ve', 'xyz789');
     * if (!result.success) {
     *   console.error('Error:', result.error);
     * }
     */
    async sendPasswordResetEmail(email, token) {
        const resetUrl = `${process.env.BASE_URL}/api/auth/reset-password?token=${token}`;
        this.logger.info('Enviando email de recuperación', { email, action: 'sendPasswordReset' });

        try {
            const info = await this.transporter.sendMail({
                from: `"${process.env.EMAIL_FROM_NAME}" <no-reply@uvm.edu.ve>`,
                to: email,
                subject: 'Restablece tu contraseña - Red de Egresados UVM',
                html: `
                    <h1>Solicitud de restablecimiento de contraseña</h1>
                    <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
                    <p>Para crear una nueva contraseña, haz clic en el siguiente enlace:</p>
                    <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Restablecer contraseña</a>
                    <p>Este enlace expirará en 1 hora.</p>
                    <p>Si no solicitaste este cambio, ignora este mensaje.</p>
                    <p><small>Equipo de Red de Egresados UVM</small></p>
                `
            });

            this.logger.info('Email de recuperación enviado', {
                email,
                messageId: info.messageId,
                action: 'sendPasswordReset'
            });
            return { success: true, messageId: info.messageId };
        } catch (error) {
            this.logger.error('Error al enviar email de recuperación', {
                email,
                error: error.message,
                stack: !isProduction ? error.stack : undefined,
                action: 'sendPasswordReset'
            });
            return { success: false, error: error.message };
        }
    }

    /**
     * @method sendPasswordResetEmail
     * @async
     * @description Envía email con enlace para restablecer contraseña
     * @param {string} email - Dirección de email del destinatario
     * @param {string} token - Token de restablecimiento generado
     * @returns {Promise<Object>} Resultado de la operación
     * @returns {boolean} success - Indica si el envío fue exitoso
     * @returns {string} [messageId] - ID del mensaje (si fue exitoso)
     * @returns {string} [error] - Mensaje de error (si falló)
     * 
     * @example
     * const result = await emailService.sendPasswordResetEmail('user@uvm.edu.ve', 'xyz789');
     * if (!result.success) {
     *   console.error('Error:', result.error);
     * }
     */
    async sendPasswordChangedNotification(email) {
        this.logger.info('Enviando notificación de cambio de contraseña', {
            email,
            action: 'sendPasswordChangedNotification'
        });
        try {
            const info = await this.transporter.sendMail({
                from: `"${process.env.EMAIL_FROM_NAME}" <no-reply@uvm.edu.ve>`,
                to: email,
                subject: 'Contraseña actualizada - Red de Egresados UVM',
                html: `
                    <h1>Tu contraseña ha sido actualizada</h1>
                    <p>Recientemente se cambió la contraseña de tu cuenta en la Red de Egresados UVM.</p>
                    <p>Si no realizaste este cambio, por favor contacta inmediatamente al soporte técnico.</p>
                    <p><small>Equipo de Red de Egresados UVM</small></p>
                `
            });

            this.logger.info('Notificación de cambio enviada', {
                email,
                messageId: info.messageId,
                action: 'sendPasswordChangedNotification'
            });
            return { success: true, messageId: info.messageId };
        } catch (error) {
            this.logger.error('Error al enviar notificación de cambio', {
                email,
                error: error.message,
                stack: !isProduction ? error.stack : undefined,
                action: 'sendPasswordChangedNotification'
            });
            return { success: false, error: error.message };
        }
    }
}