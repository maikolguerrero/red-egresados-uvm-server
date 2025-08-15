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
import LandingPageContent from '../models/LandingPageContent.js';

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
     * @method generateBaseEmailTemplate
     * @description Genera la estructura base HTML para todos los emails
     * @private
     * @param {Object} options - Opciones del email
     * @param {string} options.title - Título principal del email
     * @param {string} options.content - Contenido HTML del email
     * @param {string} [options.buttonText] - Texto del botón principal (opcional)
     * @param {string} [options.buttonUrl] - URL del botón principal (opcional)
     * @returns {string} HTML completo del email
     */
    async generateBaseEmailTemplate({ title, content, buttonText, buttonUrl }) {
        try {
            const landingPageContent = await LandingPageContent.findOne().sort({ createdAt: -1 }).select('footerText').lean();
            return `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${title}</title>
              <style>
                body { 
                  font-family: 'Barlow', sans-serif; 
                  line-height: 1.6; 
                  color: #003C44; 
                  background-color: #f3f4f6; 
                  margin: 0; 
                  padding: 0; 
                }
                .container { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  padding: 20px; 
                }
                .header { 
                  background-color: #003C44; 
                  padding: 30px 20px; 
                  text-align: center; 
                  border-radius: 8px 8px 0 0; 
                }
                .logo { 
                  color: #FFFFFF; 
                  font-family: 'Barlow Condensed', sans-serif; 
                  font-size: 28px; 
                  font-weight: 700; 
                  margin: 0; 
                }
                .content { 
                  background-color: #FFFFFF; 
                  padding: 30px; 
                  border-left: 1px solid #EAEAEA; 
                  border-right: 1px solid #EAEAEA; 
                }
                .footer { 
                  background-color: #003C44; 
                  color: #FFFFFF; 
                  padding: 20px; 
                  text-align: center; 
                  font-size: 14px; 
                  border-radius: 0 0 8px 8px; 
                }
                .button { 
                  display: inline-block; 
                  padding: 12px 24px; 
                  background-color: #13953E; 
                  color: #FFFFFF !important; 
                  text-decoration: none; 
                  border-radius: 6px; 
                  font-weight: 600; 
                  margin: 20px 0; 
                }
                .button:hover { 
                  background-color: #1D555B; 
                }
                .text-verdeB { color: #13953E; }
                .text-verdeD { color: #003C44; }
                .text-rojoA { color: #E02B20; }
                .divider { 
                  height: 1px; 
                  background-color: #EAEAEA; 
                  margin: 20px 0; 
                }
                .footer-link { 
                  color: #88BD2D !important; 
                  text-decoration: none; 
                }
                .footer-link:hover { 
                  text-decoration: underline; 
                }
                @media only screen and (max-width: 600px) {
                  .container { width: 100%; }
                  .content { padding: 20px; }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 class="logo">Red de Egresados UVM</h1>
                </div>
                
                <div class="content">
                  <h2 style="font-family: 'Barlow Condensed', sans-serif; font-size: 24px; margin-top: 0; color: #003C44;">
                    ${title}
                  </h2>
                  
                  ${content}
                  
                  ${buttonText && buttonUrl ? `
                    <div style="text-align: center; margin: 25px 0;">
                      <a href="${buttonUrl}" class="button">${buttonText}</a>
                    </div>
                  ` : ''}    
                </div>
                
                <div class="footer">
                  <p>${landingPageContent?.footerText || (`© TODOS LOS DERECHOS RESERVADOS – RED DE EGRESADOS UNIVERSIDAD VALLE DEL MOMBOY | 1997 – ${new Date().getFullYear()}`)}</p>
                </div>
              </div>
            </body>
            </html>
          `;
        } catch (error) {
            this.logger.error('Error al obtener el contenido', { error });
            return '';
        }
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
            const emailHtml = await this.generateBaseEmailTemplate({
                title: 'Verifica tu cuenta',
                content: `
                    <p>¡Bienvenido a la Red de Egresados UVM!</p>
                    <p>Para completar tu registro y comenzar a disfrutar de todos los beneficios, por favor verifica tu dirección de email haciendo clic en el botón a continuación.</p>
                    <p>Este enlace expirará en 24 horas.</p>
                `,
                buttonText: 'Verificar mi cuenta',
                buttonUrl: verificationUrl,
                footerNote: 'Si no solicitaste crear una cuenta, por favor ignora este mensaje.'
            });

            const info = await this.transporter.sendMail({
                from: `"${process.env.EMAIL_FROM_NAME}" <no-reply@uvm.edu.ve>`,
                to: email,
                subject: 'Verifica tu cuenta - Red de Egresados UVM',
                html: emailHtml
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
            const emailHtml = await this.generateBaseEmailTemplate({
                title: 'Restablece tu contraseña',
                content: `
                    <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
                    <p>Para crear una nueva contraseña, haz clic en el botón a continuación. Este enlace expirará en 1 hora.</p>
                    <p style="color: #E02B20; font-weight: 600;">Si no solicitaste este cambio, por favor ignora este mensaje y considera cambiar tu contraseña por seguridad.</p>
                `,
                buttonText: 'Restablecer contraseña',
                buttonUrl: resetUrl
            });

            const info = await this.transporter.sendMail({
                from: `"${process.env.EMAIL_FROM_NAME}" <no-reply@uvm.edu.ve>`,
                to: email,
                subject: 'Restablece tu contraseña - Red de Egresados UVM',
                html: emailHtml
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
            const emailHtml = await this.generateBaseEmailTemplate({
                title: 'Contraseña actualizada',
                content: `
                    <p>Recientemente se cambió la contraseña de tu cuenta en la Red de Egresados UVM.</p>
                    <p style="color: #E02B20; font-weight: 600;">Si no realizaste este cambio, por favor contacta inmediatamente al soporte técnico.</p>
                    <p>Puedes contactarnos respondiendo a este correo o visitando nuestro centro de ayuda.</p>
                `,
                footerNote: 'Este es un mensaje automático. Por favor no respondas a este correo.'
            });

            const info = await this.transporter.sendMail({
                from: `"${process.env.EMAIL_FROM_NAME}" <no-reply@uvm.edu.ve>`,
                to: email,
                subject: 'Contraseña actualizada - Red de Egresados UVM',
                html: emailHtml
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
     * @method sendEmailChangeVerification
     * @async
     * @description Envía email con enlace para verificar cambio de email
     * @param {string} newEmail - Nuevo email a verificar
     * @param {string} token - Token de verificación generado
     * @returns {Promise<Object>} Resultado de la operación
     */
    async sendEmailChangeVerification(newEmail, token) {
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email-change?token=${token}`;
        this.logger.info('Enviando email de verificación de cambio', {
            newEmail,
            action: 'sendEmailChangeVerification'
        });

        try {
            const emailHtml = await this.generateBaseEmailTemplate({
                title: 'Confirma tu nuevo email',
                content: `
                    <p>Hemos recibido una solicitud para cambiar el email asociado a tu cuenta.</p>
                    <p>Para confirmar este cambio, haz clic en el botón a continuación. Este enlace expirará en 24 horas.</p>
                    <p style="color: #E02B20; font-weight: 600;">Si no solicitaste este cambio, por favor ignora este mensaje o contacta al soporte técnico para resolver cualquier problema.</p>
                `,
                buttonText: 'Confirmar cambio de email',
                buttonUrl: verificationUrl
            });

            const info = await this.transporter.sendMail({
                from: `"${process.env.EMAIL_FROM_NAME}" <no-reply@uvm.edu.ve>`,
                to: newEmail,
                subject: 'Verifica tu nuevo email - Red de Egresados UVM',
                html: emailHtml
            });

            this.logger.info('Email de verificación de cambio enviado', {
                newEmail,
                messageId: info.messageId,
                action: 'sendEmailChangeVerification'
            });
            return { success: true, messageId: info.messageId };
        } catch (error) {
            this.logger.error('Error al enviar email de verificación de cambio', {
                newEmail,
                error: error.message,
                stack: !isProduction ? error.stack : undefined,
                action: 'sendEmailChangeVerification'
            });
            return { success: false, error: error.message };
        }
    }

    /**
     * @method sendEmailChangeNotification
     * @async
     * @description Envía notificación al email antiguo informando del cambio
     * @param {string} oldEmail - Email anterior del usuario
     * @returns {Promise<Object>} Resultado de la operación
     */
    async sendEmailChangeNotification(oldEmail) {
        this.logger.info('Enviando notificación de cambio de email', {
            oldEmail,
            action: 'sendEmailChangeNotification'
        });

        try {
            const emailHtml = await this.generateBaseEmailTemplate({
                title: 'Tu email ha sido actualizado',
                content: `
                    <p>Recientemente se cambió el email asociado a tu cuenta en la Red de Egresados UVM.</p>
                    <p style="color: #E02B20; font-weight: 600;">Si no realizaste este cambio, por favor contacta inmediatamente al soporte técnico.</p>
                    <p>Puedes contactarnos respondiendo a este correo o visitando nuestro centro de ayuda.</p>
                `,
                footerNote: 'Este es un mensaje automático. Por favor no respondas a este correo.'
            });

            const info = await this.transporter.sendMail({
                from: `"${process.env.EMAIL_FROM_NAME}" <no-reply@uvm.edu.ve>`,
                to: oldEmail,
                subject: 'Cambio de email realizado - Red de Egresados UVM',
                html: emailHtml
            });

            this.logger.info('Notificación de cambio de email enviada', {
                oldEmail,
                messageId: info.messageId,
                action: 'sendEmailChangeNotification'
            });
            return { success: true, messageId: info.messageId };
        } catch (error) {
            this.logger.error('Error al enviar notificación de cambio de email', {
                oldEmail,
                error: error.message,
                stack: !isProduction ? error.stack : undefined,
                action: 'sendEmailChangeNotification'
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
            const formattedDate = until ? until.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : '';

            const emailHtml = await this.generateBaseEmailTemplate({
                title: isPermanent ? 'Cuenta suspendida permanentemente' : 'Cuenta suspendida temporalmente',
                content: `
                    <p>Hemos determinado que tu cuenta ha violado nuestros Términos de Servicio.</p>
                    
                    <div style="background-color: #f8f8f8; border-left: 4px solid #E02B20; padding: 15px; margin: 20px 0;">
                        <h3 style="font-family: 'Barlow Condensed', sans-serif; color: #003C44; margin-top: 0;">Razón de la suspensión:</h3>
                        <p><strong>${this.getReasonText(reason)}</strong></p>
                        ${!isPermanent ? `<p><strong>Fecha de reactivación:</strong> ${formattedDate}</p>` : ''}
                    </div>
    
                    ${contentType && contentPreview ? `
                        <h3 style="font-family: 'Barlow Condensed', sans-serif; color: #003C44;">Contenido reportado (${contentType === 'thread' ? 'Hilo' : 'Comentario'}):</h3>
                        <div style="background-color: #f5f5f5; border-left: 3px solid #E02B20; padding: 10px; margin: 10px 0; font-style: italic;">
                            ${contentPreview}
                        </div>
                    ` : ''}
    
                    ${adminNote ? `
                        <h3 style="font-family: 'Barlow Condensed', sans-serif; color: #003C44;">Nota del moderador:</h3>
                        <div style="background-color: #f8f8f8; border-left: 4px solid #E02B20; padding: 10px; margin: 10px 0; font-style: italic">
                            <p>${adminNote}</p>
                        </div>
                    ` : ''}
    
                    <p>Durante este periodo no podrás acceder a tu cuenta ni interactuar en la plataforma.</p>
                    
                    ${!isPermanent ? `
                        <p>Una vez finalice el periodo de suspensión, tu acceso será restablecido automáticamente.</p>
                    ` : `
                        <p>Esta suspensión es permanente. Si crees que se ha cometido un error, puedes apelar esta decisión contactando al personal de la UVM.</p>
                    `}
                `,
                footerNote: 'Para apelar esta decisión, contacta al equipo de moderación.'
            });

            const info = await this.transporter.sendMail({
                from: `"${process.env.EMAIL_FROM_NAME}" <no-reply@uvm.edu.ve>`,
                to: email,
                subject: subject,
                html: emailHtml
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