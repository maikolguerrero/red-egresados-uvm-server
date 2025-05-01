import express from 'express';
import AuthController from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate, validateQuery } from '../middlewares/validate.middleware.js';
import {
    loginSchema,
    alumniRegistrationSchema,
    adminRegisterSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    emailVerificationSchema,
    resendVerificationSchema
} from '../schemas/auth.schemas.js';

export default function authRoutes(emailService) {
    const router = express.Router();
    const authController = new AuthController(emailService);

    // Login
    router.post('/login',
        validate(loginSchema),
        authController.login
    );

    // Logout
    router.post('/logout',
        authenticate,
        authController.logout
    );

    // Refrescar tokens
    router.post('/refresh-token', authController.refreshToken);

    // Registro público para egresados
    router.post('/register/alumni',
        validate(alumniRegistrationSchema),
        authController.registerAlumni
    );

    // Registro protegido para administradores
    router.post('/register/admin',
        authenticate,
        authorize('admin'),
        validate(adminRegisterSchema),
        authController.registerAdmin
    );

    // Verificación de email (validación de query params)
    router.get('/verify-email',
        validateQuery(emailVerificationSchema),
        authController.verifyEmail
    );

    // Reenvío de correo de verificación
    router.post('/resend-verification',
        validate(resendVerificationSchema),
        authController.resendVerificationEmail
    );

    // Pedido de restablecimiento de contraseña
    router.post('/forgot-password',
        validate(forgotPasswordSchema),
        authController.forgotPassword
    );

    // Restablecimiento de contraseña
    router.post('/reset-password',
        validate(resetPasswordSchema),
        authController.resetPassword
    );

    return router;
}