import { config } from './config.js';
import { crearApp } from './app.js';

const app = crearApp();

app.listen(config.puerto, () => {
  console.log(`Servidor iniciado en http://localhost:${config.puerto} (modo ${config.entorno})`);
});
