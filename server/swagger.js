import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'DIMS Internship Programme - Internal API',
            version: '2.0.0',
            description: 'Full OpenAPI specification for the departmental internship management system (DIMS) at CUI. This includes student registration, placement tracking, faculty evaluations, and cycle archival.',
            contact: {
                name: 'Technical Support',
                email: 'support@dims.cuiatd.edu.pk'
            }
        },
        servers: [
            {
                url: 'http://localhost:5000/api',
                description: 'Local development server'
            },
            {
                url: 'https://internship-professional-ie1e.vercel.app/api',
                description: 'Production API Gateway'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    },
    apis: ['./routes/*.js', './models/*.js']
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app) => {
    // Standard Swagger UI
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'DIMS API Specification'
    }));
    
    // JSON spec endpoint for developers
    app.get('/docs-json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
};
