import mongoose, { Document } from 'mongoose';
import { z } from 'zod';

// Interfaz para el documento Chat
interface IChat extends Document {
  _id: mongoose.Types.ObjectId; // Explicitly define _id for better typing
  contactId: mongoose.Types.ObjectId;
  messageIds: mongoose.Types.ObjectId[];
  lastMessage: mongoose.Types.ObjectId | null;
  unreadCount: number;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Agregamos el método toJSON
  toJSON(): any;
}

// Esquema de validación con Zod
export const chatValidationSchema = z.object({
  contactId: z.string({
    required_error: 'El ID del contacto es obligatorio',
    invalid_type_error: 'El ID del contacto debe ser una cadena de texto',
  }).min(1, 'El ID del contacto no puede estar vacío'),
  messageIds: z.array(z.string()).default([]).optional(),
  timestamp: z.union([z.string().datetime(), z.date()])
    .transform(val => typeof val === 'string' ? new Date(val) : val)
    .optional(),
});

export type ChatInput = z.infer<typeof chatValidationSchema>;

// Esquema de Mongoose
const chatSchema = new mongoose.Schema<IChat>({
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: [true, 'El ID del contacto es obligatorio'],
    index: true
  },
  messageIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: []
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  unreadCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
});

// Índice compuesto para búsquedas frecuentes
chatSchema.index({ contactId: 1, updatedAt: -1 });

// Middleware para formatear la salida JSON
chatSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Middleware para actualizar automáticamente la última actualización
chatSchema.pre<IChat>('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Modelo de Mongoose
export const Chat = mongoose.model<IChat>('Chat', chatSchema);

export default Chat;
