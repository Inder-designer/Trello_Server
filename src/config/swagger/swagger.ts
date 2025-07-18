import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
// import swaggerDoc from './swaggerDoc';/


export function setupSwagger(app: Express) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup());
 
}
