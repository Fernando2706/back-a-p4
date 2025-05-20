import Elysia from "elysia";
import { z } from "zod";
import { Contact, contactValidationSchema, type ContactInput } from '../schema/contact';

// Tipos para respuestas de error
type ErrorResponse = {
    error: string;
    details?: Record<string, unknown> | string | string[];
};

// Función para formatear errores de validación de Zod
const formatZodError = (error: z.ZodError) => {
    return error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
    }));
};

const contactSchema = z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string().min(10).max(10)
})

export const contactRouter = new Elysia({ prefix: '/contacts' })
    // Crear un nuevo contacto
    .post('/', async ({ body, set }) => {
        try {
            // Validar los datos de entrada
            const contactData = contactValidationSchema.parse(body);

            // Verificar si el correo ya existe
            const existingContact = await Contact.findOne({ email: contactData.email });
            if (existingContact) {
                set.status = 409;
                return {
                    error: 'El correo electrónico ya está registrado',
                    details: { email: contactData.email }
                };
            }

            // Crear y guardar el nuevo contacto
            const newContact = new Contact(contactData);
            await newContact.save();

            set.status = 201;
            return {
                message: 'Contacto creado exitosamente',
                data: newContact.toObject()
            };
        } catch (error) {
            set.status = 400;

            if (error instanceof z.ZodError) {
                return {
                    error: 'Error de validación',
                    details: formatZodError(error)
                };
            }

            return {
                error: 'Error al crear el contacto',
                details: error instanceof Error ? error.message : 'Error desconocido'
            };
        }
    }, {
        detail: {
            tags: ['Contactos'],
            summary: 'Crear un nuevo contacto',
            description: 'Crea un nuevo contacto en la base de datos',
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                name: { type: 'string', example: 'Juan Pérez' },
                                email: { type: 'string', format: 'email', example: 'juan@example.com' },
                                phone: { type: 'string', example: '1234567890' }
                            },
                            required: ['name', 'email', 'phone']
                        }
                    }
                },
                required: true
            },
            responses: {
                201: {
                    description: 'Contacto creado exitosamente',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    message: { type: 'string' },
                                    data: {
                                        type: 'object',
                                        properties: {
                                            _id: { type: 'string' },
                                            name: { type: 'string' },
                                            email: { type: 'string' },
                                            phone: { type: 'string' },
                                            chatId: { type: 'string' },
                                            createdAt: { type: 'string', format: 'date-time' },
                                            updatedAt: { type: 'string', format: 'date-time' }
                                        }
                                    }
                                }
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
                                    error: { type: 'string' },
                                    details: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                409: {
                    description: 'El correo electrónico ya está registrado',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: { type: 'string' },
                                    details: {
                                        type: 'object',
                                        properties: {
                                            email: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    })

    // Obtener todos los contactos
    .get('/', async ({ set }) => {
        try {
            const contacts = await Contact.find().sort({ createdAt: -1 });
            return {
                count: contacts.length,
                data: contacts.map(contact => contact.toObject())
            };
        } catch (error) {
            set.status = 500;
            return {
                error: 'Error al obtener los contactos',
                details: error instanceof Error ? error.message : error
            };
        }
    }, {
        detail: {
            tags: ['Contactos'],
            summary: 'Obtener todos los contactos',
            description: 'Devuelve una lista de todos los contactos ordenados por fecha de creación',
            responses: {
                200: {
                    description: 'Lista de contactos',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    count: { type: 'number' },
                                    data: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                _id: { type: 'string' },
                                                name: { type: 'string' },
                                                email: { type: 'string' },
                                                phone: { type: 'string' },
                                                chatId: { type: 'string' },
                                                createdAt: { type: 'string', format: 'date-time' },
                                                updatedAt: { type: 'string', format: 'date-time' }
                                            }
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
                                type: 'object',
                                properties: {
                                    error: { type: 'string' },
                                    details: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    })

    // Obtener un contacto por ID
    .get('/:id', async ({ params }) => {
        const contact = await Contact.findById(params.id)
        return contact
    }, {
        detail: {
            tags: ['Contactos'],
            summary: 'Obtener un contacto por ID',
            description: 'Devuelve un contacto por su ID',
            responses: {
                200: {
                    description: 'Contacto encontrado',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    _id: { type: 'string' },
                                    name: { type: 'string' },
                                    email: { type: 'string' },
                                    phone: { type: 'string' },
                                    chatId: { type: 'string' },
                                    createdAt: { type: 'string', format: 'date-time' },
                                    updatedAt: { type: 'string', format: 'date-time' }
                                }
                            }
                        }
                    }
                },
                404: {
                    description: 'Contacto no encontrado',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: { type: 'string' },
                                    details: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    })

    // Actualizar un contacto por ID
    .put('/:id', async ({ params, body }) => {
        const bodyData = contactValidationSchema.parse(body)

        const contact = await Contact.findById(params.id)
        if (!contact) {
            return {
                error: 'Contacto no encontrado',
                details: { id: params.id }
            }
        }

        contact.name = bodyData.name
        contact.email = bodyData.email
        contact.phone = bodyData.phone
        await contact.save()
        return contact
    }, {
        detail: {
            tags: ['Contactos'],
            summary: 'Actualizar un contacto por ID',
            description: 'Actualiza un contacto por su ID',
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                name: { type: 'string', example: 'Juan Pérez' },
                                email: { type: 'string', format: 'email', example: 'juan@example.com' },
                                phone: { type: 'string', example: '1234567890' }
                            },
                            required: ['name', 'email', 'phone']
                        }
                    }
                },
                required: true
            },
            responses: {
                200: {
                    description: 'Contacto actualizado exitosamente',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    _id: { type: 'string' },
                                    name: { type: 'string' },
                                    email: { type: 'string' },
                                    phone: { type: 'string' },
                                    chatId: { type: 'string' },
                                    createdAt: { type: 'string', format: 'date-time' },
                                    updatedAt: { type: 'string', format: 'date-time' }
                                }
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
                                    error: { type: 'string' },
                                    details: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                field: { type: 'string' },
                                                message: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                404: {
                    description: 'Contacto no encontrado',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: { type: 'string' },
                                    details: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                409: {
                    description: 'El correo electrónico ya está registrado',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: { type: 'string' },
                                    details: {
                                        type: 'object',
                                        properties: {
                                            email: { type: 'string' }
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
                                type: 'object',
                                properties: {
                                    error: { type: 'string' },
                                    details: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    })

    // Eliminar un contacto por ID
    .delete('/:id', async ({ params }) => {
        const contact = await Contact.findByIdAndDelete(params.id)
        if (!contact) {
            return {
                error: 'Contacto no encontrado',
                details: { id: params.id }
            }
        }
        return contact
    }, {
        detail: {
            tags: ['Contactos'],
            summary: 'Eliminar un contacto por ID',
            description: 'Elimina un contacto por su ID',
            responses: {
                200: {
                    description: 'Contacto eliminado exitosamente',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    _id: { type: 'string' },
                                    name: { type: 'string' },
                                    email: { type: 'string' },
                                    phone: { type: 'string' },
                                    chatId: { type: 'string' },
                                    createdAt: { type: 'string', format: 'date-time' },
                                    updatedAt: { type: 'string', format: 'date-time' }
                                }
                            }
                        }
                    }
                },
                404: {
                    description: 'Contacto no encontrado',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: { type: 'string' },
                                    details: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    })    