import mongoose from 'mongoose';
import { z } from 'zod';
import Chat from './chat';

// Esquema de validación con Zod
export const contactValidationSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Correo electrónico no válido'),
  phone: z.string().regex(/^\d{9}$/, 'El teléfono debe tener 9 dígitos'),
  chatId: z.string().optional(),
});

export type ContactInput = z.infer<typeof contactValidationSchema>;

// Esquema de Mongoose
const contactSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'El nombre es requerido'],
    trim: true
  },
  email: { 
    type: String, 
    required: [true, 'El correo electrónico es requerido'],
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: { 
    type: String, 
    required: [true, 'El teléfono es requerido'],
    trim: true
  },
  chatId: { 
    type: String, 
    required: false,
    trim: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    immutable: true
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Middleware para actualizar la fecha de actualización
contactSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Middleware para crear un chat al crear un contacto
contactSchema.post('save', async function(doc: any) { // Made async and temporarily typed doc as any
  if (!doc.chatId) {
    const chat = new Chat({
      contactId: doc._id,
      messageIds: [],
      lastMessage: null,
      unreadCount: 0,
      isArchived: false
      // createdAt and updatedAt are handled by timestamps:true in chatSchema
    });
    await chat.save(); // Await save operation
    doc.chatId = chat._id.toString();
    await doc.save(); // Await save operation
  }
});

// Modelo de Mongoose
export const Contact = mongoose.model('Contact', contactSchema);

export default Contact;
