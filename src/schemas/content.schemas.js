import * as yup from 'yup';

// Esquema para actualización de contenido
export const contentUpdateSchema = yup.object().shape({
    welcomeSections: yup.array().of(
        yup.object().shape({
            title: yup.string().required().max(100),
            description: yup.string().required().max(1000),
            order: yup.number().required().min(0)
        })
    ).optional(),

    faqs: yup.array().of(
        yup.object().shape({
            question: yup.string().required().max(200),
            answer: yup.string().required().max(1000),
            order: yup.number().required().min(0)
        })
    ).optional(),

    footerText: yup.string().max(500).optional(),

    featuredSections: yup.array().of(
        yup.object().shape({
            mainTitle: yup.string().optional().max(100),
            subsections: yup.array().of(yup.object().shape({
                subtitle: yup.string().optional().max(100),
                image: yup.object().shape({
                    url: yup.string().optional(),
                    publicId: yup.string().optional(),
                    format: yup.string().optional(),
                    dimensions: yup.object().shape({
                        width: yup.number().optional(),
                        height: yup.number().optional()
                    }).optional()
                }).optional(),
                order: yup.number().min(0).optional(),
            })).optional(),
            order: yup.number().min(0).optional()
        })
    ).optional()
});

// Esquema para actualización de solicitudes académicas
export const academicRequestsUpdateSchema = yup.object().shape({
    academicRequests: yup.object().shape({
        text: yup.string().max(500).optional(),
        email: yup.string().email().required()
    }).optional()
});