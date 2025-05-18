import Elysia from 'elysia';
import { Chat } from '../schema/chat';
import { Message, messageValidationSchema } from '../schema/message';

// Tipos para respuestas de error
type ErrorResponse = {
  error: string;
  details?: Record<string, unknown> | string | Array<{ field: string; message: string }>;
};

export const messageRouter = new Elysia({ prefix: '/messages' })
  // Enviar un nuevo mensaje a un chat
  .post('/', async ({ body, set }) => {
    try {
      // Validar los datos de entrada
      const messageData = messageValidationSchema.parse(body);

      // Verificar si el chat existe
      const chat = await Chat.findById(messageData.chatId);
      if (!chat) {
        set.status = 404;
        return {
          error: 'Chat no encontrado',
          details: { chatId: messageData.chatId }
        };
      }

      // Crear y guardar el nuevo mensaje
      const newMessage = new Message({
        ...messageData,
        timestamp: messageData.timestamp || new Date()
      });
      
      const savedMessage = await newMessage.save();

      // Actualizar el chat con el nuevo mensaje
      chat.messageIds.push(savedMessage._id);
      chat.lastMessage = savedMessage._id;
      chat.unreadCount += 1;
      await chat.save();

      // No es necesario poblar ya que no hay referencias a otros modelos

      set.status = 201;
      return {
        message: 'Mensaje enviado exitosamente',
        data: savedMessage.toObject()
      };
    } catch (error) {
      set.status = 400;
      return {
        error: 'Error al enviar el mensaje',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }, {
    detail: {
      tags: ['Mensajes'],
      summary: 'Enviar un mensaje',
      description: 'Envía un nuevo mensaje a un chat existente',
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                chatId: { 
                  type: 'string',
                  description: 'ID del chat al que pertenece el mensaje',
                  example: '507f1f77bcf86cd799439011'
                },
                isContactMessage: { 
                  type: 'boolean',
                  description: 'Indica si el mensaje es del contacto (true) o del usuario (false)',
                  example: true
                },
                content: {
                  type: 'string',
                  description: 'Contenido del mensaje',
                  example: '¡Hola! ¿Cómo estás?'
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Fecha y hora del mensaje (opcional, por defecto es ahora)',
                  example: '2025-05-18T10:30:00.000Z'
                }
              },
              required: ['chatId', 'content']
            }
          }
        },
        required: true
      },
      responses: {
        201: {
          description: 'Mensaje enviado exitosamente',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { 
                    type: 'string',
                    example: 'Mensaje enviado exitosamente'
                  },
                  data: {
                    type: 'object',
                    properties: {
                      _id: { 
                        type: 'string',
                        example: '507f1f77bcf86cd799439013'
                      },
                      chatId: { 
                        type: 'string',
                        example: '507f1f77bcf86cd799439011'
                      },
                      isContactMessage: { 
                        type: 'boolean',
                        example: true
                      },
                      content: {
                        type: 'string',
                        example: '¡Hola! ¿Cómo estás?'
                      },
                      timestamp: {
                        type: 'string',
                        format: 'date-time',
                        example: '2025-05-18T10:30:00.000Z'
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
          description: 'Chat no encontrado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { 
                    type: 'string',
                    example: 'Chat no encontrado'
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

  // Obtener todos los mensajes de un chat
  .get('/chat/:chatId', async ({ params, set }) => {
    try {
      const { chatId } = params;
      
      // Verificar si el chat existe
      const chat = await Chat.findById(chatId);
      if (!chat) {
        set.status = 404;
        return {
          error: 'Chat no encontrado',
          details: { chatId }
        };
      }

      // Obtener todos los mensajes del chat ordenados por fecha de creación
      const messages = await Message.find({ chatId })
        .sort({ createdAt: 1 }); // Orden ascendente por fecha de creación

      // Actualizar contador de mensajes no leídos
      if (chat.unreadCount > 0) {
        chat.unreadCount = 0;
        await chat.save();
      }

      return {
        count: messages.length,
        chatId,
        data: messages.map(msg => msg.toObject())
      };
    } catch (error) {
      set.status = 500;
      return {
        error: 'Error al obtener los mensajes',
        details: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }, {
    detail: {
      tags: ['Mensajes'],
      summary: 'Obtener mensajes de un chat',
      description: 'Obtiene todos los mensajes de un chat específico',
      parameters: [
        {
          name: 'chatId',
          in: 'path',
          required: true,
          description: 'ID del chat del que se desean obtener los mensajes',
          schema: { 
            type: 'string',
            example: '507f1f77bcf86cd799439011'
          }
        }
      ],
      responses: {
        200: {
          description: 'Lista de mensajes del chat',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  count: { 
                    type: 'integer',
                    example: 1
                  },
                  chatId: { 
                    type: 'string',
                    example: '507f1f77bcf86cd799439011'
                  },
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        _id: { 
                          type: 'string',
                          example: '507f1f77bcf86cd799439013'
                        },
                        chatId: { 
                          type: 'string',
                          example: '507f1f77bcf86cd799439011'
                        },
                        isContactMessage: {
                          type: 'boolean',
                          example: true
                        },
                        content: {
                          type: 'string',
                          example: '¡Hola! ¿Cómo estás?'
                        },
                        timestamp: {
                          type: 'string',
                          format: 'date-time',
                          example: '2025-05-18T10:30:00.000Z'
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
                  }
                },
                required: ['count', 'chatId', 'data']
              }
            }
          }
        },
        404: {
          description: 'Chat no encontrado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { 
                    type: 'string',
                    example: 'Chat no encontrado'
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
        },
        500: {
          description: 'Error del servidor',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { 
                    type: 'string',
                    example: 'Error al obtener los mensajes'
                  },
                  details: {
                    type: 'string',
                    example: 'Mensaje de error detallado'
                  }
                },
                required: ['error', 'details']
              }
            }
          }
        }
      }
    }
  });
