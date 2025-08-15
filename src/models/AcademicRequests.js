import mongoose from 'mongoose';

const AcademicRequestsSchema = new mongoose.Schema({
    academicRequests: {
        text: {
            type: String,
            maxlength: 500
        },
        email: {
            type: String,
            lowercase: true,
            trim: true,
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
        }
    },

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

export default mongoose.model('AcademicRequests', AcademicRequestsSchema);