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
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
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
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
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

    /**
     * @method sendAccountSuspensionEmail
     * @async
     * @description Envía email notificando suspensión/banneo de cuenta
     * @param {string} email - Dirección de email del destinatario
     * @param {Object} options - Opciones de la suspensión
     * @param {string} options.reason - Razón de la suspensión
     * @param {Date} options.until - Fecha hasta cuando está suspendido (opcional para baneos permanentes)
     * @param {string} options.adminNote - Nota adicional del administrador
     * @param {string} options.contentType - Tipo de contenido que causó la sanción ('thread', 'comment', etc)
     * @param {string} options.contentPreview - Vista previa del contenido ofensivo
     * @returns {Promise<Object>} Resultado de la operación
     */
    async sendAccountSuspensionEmail(email, { reason, until, adminNote, contentType, contentPreview }) {
        const isPermanent = !until;
        const subject = isPermanent
            ? 'Tu cuenta ha sido suspendida permanentemente - Red de Egresados UVM'
            : `Tu cuenta ha sido suspendida hasta el ${until.toLocaleDateString()}`;

        this.logger.info('Enviando email de suspensión', { email, action: 'sendAccountSuspension' });

        try {
            const info = await this.transporter.sendMail({
                from: `"Equipo de Moderación UVM" <moderacion@uvm.edu.ve>`,
                to: email,
                subject: subject,
                html: this.generateSuspensionEmailHtml({ reason, until, adminNote, contentType, contentPreview })
            });

            this.logger.info('Email de suspensión enviado', {
                email,
                messageId: info.messageId,
                action: 'sendAccountSuspension'
            });
            return { success: true, messageId: info.messageId };
        } catch (error) {
            this.logger.error('Error al enviar email de suspensión', {
                email,
                error: error.message,
                stack: !isProduction ? error.stack : undefined,
                action: 'sendAccountSuspension'
            });
            return { success: false, error: error.message };
        }
    }

    /**
     * @method generateSuspensionEmailHtml
     * @description Genera el HTML para el email de suspensión
     * @private
     * @param {Object} options 
     * @returns {string} HTML formateado
     */
    generateSuspensionEmailHtml({ reason, until, adminNote, contentType, contentPreview }) {
        const isPermanent = !until;
        const formattedDate = until ? until.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : '';

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #d32f2f; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { padding: 20px; background-color: #f9f9f9; border-left: 1px solid #ddd; border-right: 1px solid #ddd; }
                    .footer { padding: 20px; text-align: center; font-size: 12px; color: #777; background-color: #f0f0f0; border-radius: 0 0 5px 5px; border-left: 1px solid #ddd; border-right: 1px solid #ddd; border-bottom: 1px solid #ddd; }
                    .reason-box { background-color: #fff; border: 1px solid #e0e0e0; border-radius: 5px; padding: 15px; margin: 15px 0; }
                    .content-preview { background-color: #f5f5f5; border-left: 3px solid #d32f2f; padding: 10px; margin: 10px 0; font-style: italic; }
                    .button { display: inline-block; padding: 10px 20px; background-color: #d32f2f; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${isPermanent ? 'Cuenta Suspendida Permanentemente' : 'Cuenta Suspendida Temporalmente'}</h1>
                </div>
    
                <div class="content">
                    <p>Hemos determinado que tu cuenta ha violado nuestros <a href="${process.env.FRONTEND_URL}/code-of-conduct" style="color: #d32f2f;">Términos de Servicio</a>.</p>
        
                    <div class="reason-box">
                        <h3>Razón de la suspensión:</h3>
                        <p><strong>${this.getReasonText(reason)}</strong></p>
                        ${!isPermanent ? `<p><strong>Fecha de reactivación:</strong> ${formattedDate}</p>` : ''}
                    </div>

                    ${contentType && contentPreview ? `
                        <h3>Contenido reportado (${contentType === 'thread' ? 'Hilo' : 'Comentario'}):</h3>
                        <div class="content-preview">
                            ${contentPreview}
                        </div>
                    ` : ''}

                    ${adminNote ? `
                        <h3>Nota del moderador:</h3>
                        <p>${adminNote}</p>
                    ` : ''}

                    <p>Durante este periodo no podrás acceder a tu cuenta ni interactuar en la plataforma.</p>
        
                    ${!isPermanent ? `
                        <p>Una vez finalice el periodo de suspensión, tu acceso será restablecido automáticamente.</p>
                    ` : `
                        <p>Esta suspensión es permanente. Si crees que se ha cometido un error, puedes apelar esta decisión contactando al personal de la UVM.</p>
                    `}
                </div>
    
                <div class="footer">
                    <p>© ${new Date().getFullYear()} Red de Egresados UVM. Todos los derechos reservados.</p>
                    <p><a href="${process.env.FRONTEND_URL}/contact" style="color: #d32f2f;">Contactar al equipo de moderación</a></p>
                </div>
            </body>
            </html>
        `;
    }

    /**
     * @method getReasonText
     * @description Devuelve el texto descriptivo para cada razón de suspensión
     * @private
     * @param {string} reason 
     * @returns {string}
     */
    getReasonText(reason) {
        const reasons = {
            'spam': 'Publicación de contenido no deseado o spam',
            'inappropriate': 'Contenido inapropiado o ofensivo',
            'harassment': 'Acoso o comportamiento abusivo hacia otros usuarios',
            'other': 'Violación de los términos de servicio'
        };
        return reasons[reason] || reason;
    }
}