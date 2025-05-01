import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();
const isProduction = process.env.NODE_ENV === 'production';

export default class EmailService {
    constructor(transporter, logger) {
        this.transporter = transporter;
        this.logger = logger.child({ service: 'EmailService' });
    }

    generateVerificationToken() {
        const token = crypto.randomBytes(20).toString('hex');
        this.logger.debug('Token de verificación generado', { action: 'generateToken' });
        return token;
    }

    // Envía email de verificación
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

    // Envía email para recuperación de contraseña
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

    // Envía email para notificar cambio de contraseña
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