import { Router } from 'express';
import { exigirAutenticacion } from '../middleware/autenticacion.js';
import { comprobarCsrf } from '../middleware/csrf.js';

export function crearRutasAuth(controlador, limitadorLogin) {
  const router = Router();
  router.get('/registro', controlador.mostrarRegistro);
  router.post('/registro', controlador.registrar);
  router.get('/login', controlador.mostrarLogin);
  router.post('/login', limitadorLogin, controlador.login);
  router.post('/logout', exigirAutenticacion, comprobarCsrf, controlador.logout);
  router.get('/perfil', exigirAutenticacion, controlador.perfil);
  return router;
}
