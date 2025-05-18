import mongoose from 'mongoose';
import { z } from 'zod';

// Esquema de validación con Zod
export const messageValidationSchema = z.object({
  chatId: z.string().min(1, 'El ID del chat es obligatorio'),
  content: z.string().min(1, 'El contenido del mensaje no puede estar vacío'),
  isContactMessage: z.boolean().default(() => Math.random() > 0.5),
  timestamp: z.union([z.string().datetime(), z.date()])
    .transform(val => typeof val === 'string' ? new Date(val) : val)
    .optional(),
  // No incluimos _id aquí ya que es generado por MongoDB
});

export type MessageInput = z.infer<typeof messageValidationSchema>;

// Esquema de Mongoose
const messageSchema = new mongoose.Schema({
  chatId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: [true, 'El ID del chat es obligatorio']
  },
  isContactMessage: {
    type: Boolean,
    required: true,
    default: () => Math.random() > 0.5
  },
  content: { 
    type: String, 
    required: [true, 'El contenido del mensaje es obligatorio'],
    trim: true
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    immutable: true
  },
  // MongoDB automáticamente añade _id como ObjectId
}, {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
});

// Índice para búsquedas por chat
messageSchema.index({ chatId: 1, timestamp: 1 });

// Middleware para formatear la salida
messageSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Modelo de Mongoose
export const Message = mongoose.model('Message', messageSchema);

export default Message;