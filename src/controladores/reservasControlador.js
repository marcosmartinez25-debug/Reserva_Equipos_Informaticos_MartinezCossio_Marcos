import { ErrorDominio } from '../errores/ErrorDominio.js';
import { redirigirConAviso } from '../middleware/avisos.js';
import { estadoHttp } from '../middleware/errores.js';
import { crearFormularioReservaVM } from '../presentacion/formularioReservaVM.js';
import { fechaDeHoy, validarFechaYTurno } from '../utilidades/reservas.js';
import { convertirId, texto } from '../utilidades/validaciones.js';

export function crearControladorReservas(servicioReservas) {
  async function pintarFormulario(req, res, estado, valores, errores) {
    const erroresConsulta = validarFechaYTurno(valores.fecha, valores.turno);
    const consultaValida = Object.keys(erroresConsulta).length === 0;
    const equipos = consultaValida ? await servicioReservas.equiposDisponibles(valores.fecha, valores.turno) : [];
    const todosLosErrores = { ...erroresConsulta, ...errores };
    const estadoFinal = estado === 200 && !consultaValida ? 400 : estado;

    const vm = crearFormularioReservaVM({
      equipos,
      valores,
      errores: todosLosErrores,
      consultaValida,
      csrfToken: res.locals.csrfToken
    });
    res.status(estadoFinal).render('reservas/nueva', { titulo: vm.titulo, vm });
  }

  return {
    async mostrarFormulario(req, res) {
      const valores = {
        fecha: req.query.fecha === undefined ? fechaDeHoy() : texto(req.query.fecha),
        turno: req.query.turno === undefined ? 'manana' : texto(req.query.turno),
        equipoId: texto(req.query.equipoId)
      };
      await pintarFormulario(req, res, 200, valores, {});
    },

    async crear(req, res, next) {
      const datos = {
        equipoId: texto(req.body.equipoId),
        fecha: texto(req.body.fecha),
        turno: texto(req.body.turno)
      };

      try {
        await servicioReservas.crearReserva(datos, req.usuario);
      } catch (error) {
        if (!(error instanceof ErrorDominio)) {
          throw error;
        }
        const valores = {
          fecha: error.errores.fecha ? '' : datos.fecha,
          turno: error.errores.turno ? '' : datos.turno,
          equipoId: error.errores.equipoId ? '' : datos.equipoId
        };
        return pintarFormulario(req, res, estadoHttp(error.codigo), valores, error.errores);
      }

      redirigirConAviso(req, res, next, '/mis-reservas', 'Reserva creada correctamente.');
    },

    async misReservas(req, res) {
      const reservas = await servicioReservas.reservasDeUsuario(req.usuario.id);
      res.render('reservas/mis-reservas', { titulo: 'Mis reservas', reservas });
    },

    async cancelar(req, res, next) {
      const id = convertirId(req.params.id);
      await servicioReservas.cancelarReserva(id, req.usuario);
      redirigirConAviso(req, res, next, '/mis-reservas', 'Reserva cancelada correctamente.');
    }
  };
}
