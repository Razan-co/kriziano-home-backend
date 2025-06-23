const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');


const authDocs = YAML.load(path.join(__dirname, '../docs/auth.yaml'))
const orderDocs = YAML.load(path.join(__dirname, '../docs/order.yaml'))
const prodDocs = YAML.load(path.join(__dirname, '../docs/product.yaml'))



const specs = {
  openapi: '3.0.0',
  info: {
    title: 'Kriziano Home API',
    version: '1.0.0',
    description: 'Auto-generated Swagger docs',
  },
  servers: [{ url: 'http://localhost:4747/api/v1' }],
  paths: {
    ...authDocs.paths,
    ...orderDocs.paths,
    ...prodDocs.paths,
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [{ bearerAuth: [] }]
};

module.exports = {
  swaggerUi,
  specs
};
