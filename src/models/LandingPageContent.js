import mongoose from 'mongoose';

const LandingPageContentSchema = new mongoose.Schema({
    // Sección de bienvenida
    welcomeSections: [{
        title: {
            type: String,
            required: true,
            maxlength: 100
        },
        description: {
            type: String,
            required: true,
            maxlength: 1000
        },
        order: Number
    }],

    // Preguntas frecuentes
    faqs: [{
        question: {
            type: String,
            required: true,
            maxlength: 200
        },
        answer: {
            type: String,
            required: true,
            maxlength: 1000
        },
        order: Number
    }],

    // Texto del footer
    footerText: {
        type: String,
        maxlength: 500
    },

    // Carrusel de imágenes/videos
    carouselItems: [{
        mediaType: {
            type: String,
            enum: ['image', 'video'],
            required: true
        },
        url: {
            type: String,
            required: true
        },
        publicId: String,
        duration: Number, // en segundos
        format: String,
        dimensions: {
            width: Number,
            height: Number
        },
        order: Number
    }],

    // Secciones con subtítulos e imágenes
    featuredSections: [{
        mainTitle: {
            type: String,
            maxlength: 100
        },
        subsections: [{
            subtitle: {
                type: String,
                maxlength: 100,
                default: ''
            },
            image: {
                url: String,
                publicId: String,
                format: String,
                dimensions: {
                    width: Number,
                    height: Number
                },
            },
            order: Number
        }],
        order: Number,
    }],

    // Metadata
    lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (doc, ret) => {
            // Transformación del _id principal del documento
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;

            // Función auxiliar para transformar subdocumentos
            const transformSubdocument = (item) => {
                // Asegúrarse de que el item no sea null/undefined antes de intentar desestructurar
                if (!item) return item;

                // Desestructuramos _id si existe, si no, _id será undefined y no causará error
                const { _id, ...rest } = item;
                // Si _id existe, lo asignamos a id; de lo contrario, id también será undefined (o null si lo prefieres)
                return { id: _id ? _id.toString() : undefined, ...rest };
            };

            if (ret.welcomeSections) {
                ret.welcomeSections = ret.welcomeSections.map(transformSubdocument);
            }

            if (ret.faqs) {
                ret.faqs = ret.faqs.map(transformSubdocument);
            }

            if (ret.carouselItems) {
                ret.carouselItems = ret.carouselItems.map(transformSubdocument);
            }

            if (ret.featuredSections) {
                ret.featuredSections = ret.featuredSections.map(featuredSection => {
                    const transformedSection = transformSubdocument(featuredSection); // Transforma la sección principal
                    if (transformedSection && transformedSection.subsections) { // Asegura que subsections exista
                        transformedSection.subsections = transformedSection.subsections.map(transformSubdocument);
                    }
                    return transformedSection;
                });
            }

            return ret;
        }
    },
    toJSON: {
        virtuals: true,
        transform: (doc, ret) => {
            // Transformación del _id principal del documento
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;

            // Función auxiliar para transformar subdocumentos
            const transformSubdocument = (item) => {
                // Asegúrate de que el item no es null/undefined antes de intentar desestructurar
                if (!item) return item;

                // Desestructuramos _id si existe, si no, _id será undefined y no causará error
                const { _id, ...rest } = item;
                // Si _id existe, lo asignamos a id; de lo contrario, id también será undefined (o null si lo prefieres)
                return { id: _id ? _id.toString() : undefined, ...rest };
            };

            if (ret.welcomeSections) {
                ret.welcomeSections = ret.welcomeSections.map(transformSubdocument);
            }

            if (ret.faqs) {
                ret.faqs = ret.faqs.map(transformSubdocument);
            }

            if (ret.carouselItems) {
                ret.carouselItems = ret.carouselItems.map(transformSubdocument);
            }

            if (ret.featuredSections) {
                ret.featuredSections = ret.featuredSections.map(featuredSection => {
                    const transformedSection = transformSubdocument(featuredSection); // Transforma la sección principal
                    if (transformedSection && transformedSection.subsections) { // Asegura que subsections exista
                        transformedSection.subsections = transformedSection.subsections.map(transformSubdocument);
                    }
                    return transformedSection;
                });
            }

            return ret;
        }
    },
    toObject: {
        virtuals: true,
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;

            const transformSubdocument = (item) => {
                if (!item) return item;
                const { _id, ...rest } = item;
                return { id: _id ? _id.toString() : undefined, ...rest };
            };

            if (ret.welcomeSections) {
                ret.welcomeSections = ret.welcomeSections.map(transformSubdocument);
            }

            if (ret.faqs) {
                ret.faqs = ret.faqs.map(transformSubdocument);
            }

            if (ret.carouselItems) {
                ret.carouselItems = ret.carouselItems.map(transformSubdocument);
            }

            if (ret.featuredSections) {
                ret.featuredSections = ret.featuredSections.map(featuredSection => {
                    const transformedSection = transformSubdocument(featuredSection);
                    if (transformedSection && transformedSection.subsections) {
                        transformedSection.subsections = transformedSection.subsections.map(transformSubdocument);
                    }
                    return transformedSection;
                });
            }

            return ret;
        }
    }
});

export default mongoose.model('LandingPageContent', LandingPageContentSchema);