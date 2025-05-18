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
  // Crear un nuevo chat
  .post('/', async ({ body, set }) => {
    try {
      // Validar los datos de entrada
      let chatData;
      try {
        chatData = chatValidationSchema.parse(body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          set.status = 400;
          return {
            error: 'Error de validación',
            details: (error as z.ZodError).errors.map((err: z.ZodIssue) => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            }))
          };
        }
        throw error;
      }

      // Verificar si el contacto existe
      const contact = await Contact.findById(chatData.contactId);
      if (!contact) {
        set.status = 404;
        return {
          error: 'El contacto no existe',
          details: { contactId: chatData.contactId }
        };
      }

      // Verificar si ya existe un chat con este contacto
      const existingChat = await Chat.findOne({ contactId: chatData.contactId });
      if (existingChat) {
        set.status = 409;
        return {
          error: 'Ya existe un chat con este contacto',
          details: { chatId: existingChat._id }
        };
      }

      // Crear y guardar el nuevo chat
      const newChat = new Chat({
        ...chatData,
        messageIds: [],
        unreadCount: 0,
        isArchived: false
      });
      await newChat.save();

      // Poblar los datos del contacto
      await newChat.populate('contactId');

      set.status = 201;
      return {
        message: 'Chat creado exitosamente',
        data: newChat.toObject()
      };
    } catch (error) {
      set.status = 400;
      return {
        error: 'Error al crear el chat',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }, {
    detail: {
      tags: ['Chats'],
      summary: 'Crear un nuevo chat',
      description: 'Crea un nuevo chat con un contacto existente',
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                contactId: { 
                  type: 'string',
                  description: 'ID del contacto con quien se inicia el chat',
                  example: '507f1f77bcf86cd799439011'
                }
              },
              required: ['contactId']
            }
          }
        },
        required: true
      },
      responses: {
        201: {
          description: 'Chat creado exitosamente',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { 
                    type: 'string',
                    example: 'Chat creado exitosamente'
                  },
                  data: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                      contactId: { type: 'string', example: '507f1f77bcf86cd799439012' },
                      messageIds: {
                        type: 'array',
                        items: { type: 'string' },
                        example: []
                      },
                      lastMessage: { 
                        type: 'string',
                        nullable: true,
                        example: null
                      },
                      unreadCount: { 
                        type: 'number',
                        example: 0
                      },
                      isArchived: {
                        type: 'boolean',
                        example: false
                      },
                      createdAt: { 
                        type: 'string',
                        format: 'date-time',
                        example: '2025-05-18T10:30:00.000Z'
                      },
                      updatedAt: {
                        type: 'string',
                        format: 'date-time',
                        example: '2025-05-18T10:30:00.000Z'
                      }
                    }
                  }
                },
                required: ['message', 'data']
              }
            }
          }
        },
        400: {
          description: 'Datos de entrada inválidos',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { 
                    type: 'string',
                    example: 'Error de validación'
                  },
                  details: {
                    oneOf: [
                      { type: 'string' },
                      {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            field: { type: 'string' },
                            message: { type: 'string' }
                          }
                        }
                      },
                      { 
                        type: 'object',
                        additionalProperties: true
                      }
                    ]
                  }
                },
                required: ['error']
              }
            }
          }
        },
        404: {
          description: 'El contacto no existe',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { 
                    type: 'string',
                    example: 'Contacto no encontrado'
                  },
                  details: {
                    type: 'object',
                    properties: {
                      contactId: { 
                        type: 'string',
                        example: '507f1f77bcf86cd799439012'
                      }
                    }
                  }
                },
                required: ['error', 'details']
              }
            }
          }
        },
        409: {
          description: 'Ya existe un chat con este contacto',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { 
                    type: 'string',
                    example: 'Ya existe un chat con este contacto'
                  },
                  details: {
                    type: 'object',
                    properties: {
                      chatId: { 
                        type: 'string',
                        example: '507f1f77bcf86cd799439011'
                      }
                    }
                  }
                },
                required: ['error', 'details']
              }
            }
          }
        }
      }
    }
  })

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
