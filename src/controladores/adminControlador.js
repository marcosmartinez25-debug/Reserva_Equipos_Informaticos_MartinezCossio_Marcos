import { ErrorDominio } from '../errores/ErrorDominio.js';
import { redirigirConAviso } from '../middleware/avisos.js';
import { estadoHttp } from '../middleware/errores.js';
import { convertirId, normalizarEquipo, texto, validarEquipo } from '../utilidades/validaciones.js';

export function crearControladorAdmin(servicioEquipos, servicioReservas) {
  async function pintarEquipos(res, estado, valores, errores) {
    const equipos = await servicioEquipos.listar({ tipo: 'todos', soloOperativos: false });
    res.status(estado).render('admin/equipos', {
      titulo: 'Administración de equipos',
      equipos,
      valores,
      errores: Object.values(errores)
    });
  }

  return {
    async equipos(req, res) {
      await pintarEquipos(res, 200, { codigo: '', nombre: '', tipo: 'sobremesa' }, {});
    },

    async crearEquipo(req, res, next) {
      const valores = normalizarEquipo(req.body);
      const errores = validarEquipo(valores);
      if (Object.keys(errores).length > 0) {
        return pintarEquipos(res, 400, valores, errores);
      }
      try {
        await servicioEquipos.crear(valores);
      } catch (error) {
        if (error instanceof ErrorDominio) {
          return pintarEquipos(res, estadoHttp(error.codigo), valores, error.errores);
        }
        throw error;
      }
      redirigirConAviso(req, res, next, '/admin/equipos', `Equipo ${valores.codigo} añadido correctamente.`);
    },

    async cambiarEstado(req, res, next) {
      const id = convertirId(req.params.id);
      const equipo = await servicioEquipos.cambiarEstado(id, texto(req.body.estado));
      redirigirConAviso(req, res, next, '/admin/equipos', `Estado del equipo ${equipo.codigo} actualizado.`);
    },

    async reservas(req, res) {
      const reservas = await servicioReservas.todasLasReservas();
      res.render('admin/reservas', { titulo: 'Administración de reservas', reservas });
    },

    async cancelarReserva(req, res, next) {
      const id = convertirId(req.params.id);
      await servicioReservas.cancelarComoAdmin(id);
      redirigirConAviso(req, res, next, '/admin/reservas', `Reserva ${id} cancelada correctamente.`);
    }
  };
}
