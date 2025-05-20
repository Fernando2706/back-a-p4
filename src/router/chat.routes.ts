import Elysia from 'elysia';
import { z } from 'zod';
import { Chat, chatValidationSchema, type ChatInput } from '../schema/chat';
import { Contact } from '../schema/contact';

// Tipos para respuestas de error
type ErrorResponse = {
  error: string;
  details?: Record<string, unknown> | string | Array<{ field: string; message: string }>;
};

export const chatRouter = new Elysia({ prefix: '/chats' })


  // Obtener todos los chats
  .get('/', async ({ set }) => {
    try {
      const chats = await Chat.find()
        .sort({ updatedAt: -1 })
        .populate('contactId')
        .populate('lastMessage');

      return {
        count: chats.length,
        data: chats.map(chat => ({
          ...chat.toObject(),
          contact: chat.contactId,
          contactId: undefined
        }))
      };
    } catch (error) {
      set.status = 500;
      return {
        error: 'Error al obtener los chats',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }, {
    detail: {
      tags: ['Chats'],
      summary: 'Obtener todos los chats',
      description: 'Obtiene la lista de todos los chats ordenados por fecha de actualización',
      responses: {
        200: {
          description: 'Lista de chats',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  count: { type: 'number' },
                  data: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/Chat'
                    }
                  }
                }
              }
            }
          }
        },
        500: {
          description: 'Error del servidor',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    }
  })

  // Obtener un chat por ID
  .get('/:id', async ({ params, set }) => {
    try {
      const chat = await Chat.findById(params.id)
        .populate('contactId')
        .populate('lastMessage')
        .populate({
          path: 'messageIds',
          options: { sort: { createdAt: -1 }, limit: 50 }
        });

      if (!chat) {
        set.status = 404;
        return {
          error: 'Chat no encontrado',
          details: { id: params.id }
        };
      }

      // Resetear contador de mensajes no leídos
      if (chat.unreadCount > 0) {
        chat.unreadCount = 0;
        await chat.save();
      }

      return {
        ...chat.toObject(),
        contact: chat.contactId,
        contactId: undefined
      };
    } catch (error) {
      set.status = 500;
      return {
        error: 'Error al obtener el chat',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }, {
    detail: {
      tags: ['Chats'],
      summary: 'Obtener un chat por ID',
      description: 'Obtiene los detalles de un chat específico por su ID',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'ID del chat a obtener',
          schema: { type: 'string' }
        }
      ],
      responses: {
        200: {
          description: 'Detalles del chat',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Chat'
              }
            }
          }
        },
        404: {
          description: 'Chat no encontrado',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        500: {
          description: 'Error del servidor',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    }
  })

  // Eliminar un chat
  .delete('/:id', async ({ params, set }) => {
    try {
      const chat = await Chat.findByIdAndDelete(params.id);
      
      if (!chat) {
        set.status = 404;
        return {
          error: 'Chat no encontrado',
          details: { id: params.id }
        };
      }

      // Opcional: Aquí podrías también eliminar los mensajes asociados
      // await Message.deleteMany({ _id: { $in: chat.messageIds } });

      return {
        message: 'Chat eliminado exitosamente',
        data: chat.toObject()
      };
    } catch (error) {
      set.status = 500;
      return {
        error: 'Error al eliminar el chat',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }, {
    detail: {
      tags: ['Chats'],
      summary: 'Eliminar un chat',
      description: 'Elimina un chat y opcionalmente sus mensajes asociados',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'ID del chat a eliminar',
          schema: { type: 'string' }
        }
      ],
      responses: {
        200: {
          description: 'Chat eliminado exitosamente',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  data: {
                    $ref: '#/components/schemas/Chat'
                  }
                }
              }
            }
          }
        },
        404: {
          description: 'Chat no encontrado',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        500: {
          description: 'Error del servidor',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    }
  });
