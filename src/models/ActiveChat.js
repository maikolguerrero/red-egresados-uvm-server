import mongoose from 'mongoose';

const ActiveChatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  socketId: {
    type: String,
    required: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  expires: 86400 // Expira después de 24 horas (opcional)
});

ActiveChatSchema.index({ userId: 1 });
ActiveChatSchema.index({ contactId: 1 });
ActiveChatSchema.index({ lastActive: 1 });

export default mongoose.model('ActiveChat', ActiveChatSchema);