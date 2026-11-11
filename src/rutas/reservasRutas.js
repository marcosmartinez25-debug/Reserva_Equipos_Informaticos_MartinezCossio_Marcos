import { Router } from 'express';
import { exigirAutenticacion } from '../middleware/autenticacion.js';
import { comprobarCsrf } from '../middleware/csrf.js';

export function crearRutasReservas(controlador) {
  const router = Router();
  router.get('/reservas/nueva', exigirAutenticacion, controlador.mostrarFormulario);
  router.post('/reservas', exigirAutenticacion, comprobarCsrf, controlador.crear);
  router.get('/mis-reservas', exigirAutenticacion, controlador.misReservas);
  router.post('/reservas/:id/cancelar', exigirAutenticacion, comprobarCsrf, controlador.cancelar);
  return router;
}
