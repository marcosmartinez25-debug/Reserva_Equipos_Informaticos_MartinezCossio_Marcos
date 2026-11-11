import { Router } from 'express';
import { exigirRol } from '../middleware/autenticacion.js';
import { comprobarCsrf } from '../middleware/csrf.js';

export function crearRutasAdmin(controlador) {
  const router = Router();
  const soloAdmin = exigirRol('admin');
  router.get('/admin/equipos', soloAdmin, controlador.equipos);
  router.post('/admin/equipos', soloAdmin, comprobarCsrf, controlador.crearEquipo);
  router.post('/admin/equipos/:id/estado', soloAdmin, comprobarCsrf, controlador.cambiarEstado);
  router.get('/admin/reservas', soloAdmin, controlador.reservas);
  router.post('/admin/reservas/:id/cancelar', soloAdmin, comprobarCsrf, controlador.cancelarReserva);
  return router;
}
