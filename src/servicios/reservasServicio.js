import { ErrorDominio } from '../errores/ErrorDominio.js';
import {
  estaReservado,
  fechaDeHoy,
  obtenerEquiposDisponibles,
  sePuedeCancelar,
  validarReserva
} from '../utilidades/reservas.js';

function ordenarPorFecha(reservas) {
  return reservas.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.turno.localeCompare(b.turno));
}

export function crearServicioReservas(repoReservas, repoEquipos, repoUsuarios) {
  async function completarReservas(reservas) {
    const equipos = await repoEquipos.listar();
    const usuarios = await repoUsuarios.listar();
    const hoy = fechaDeHoy();
    return reservas.map(reserva => {
      const equipo = equipos.find(e => e.id === reserva.equipoId);
      const usuario = usuarios.find(u => u.id === reserva.usuarioId);
      return {
        ...reserva,
        codigoEquipo: equipo ? equipo.codigo : 'Desconocido',
        nombreEquipo: equipo ? equipo.nombre : 'Equipo eliminado',
        nombreUsuario: usuario ? usuario.nombre : 'Desconocido',
        puedeCancelar: sePuedeCancelar(reserva, hoy)
      };
    });
  }

  async function cancelar(reserva) {
    if (reserva.estado !== 'activa') {
      throw new ErrorDominio('YA_CANCELADA', 'La reserva ya estaba cancelada.');
    }
    if (!sePuedeCancelar(reserva)) {
      throw new ErrorDominio('FECHA_PASADA', 'No se puede cancelar una reserva cuya fecha ya ha pasado.');
    }
    reserva.estado = 'cancelada';
    await repoReservas.guardar(reserva);
    return reserva;
  }

  return {
    async equiposDisponibles(fecha, turno) {
      const equipos = await repoEquipos.listar();
      const reservas = await repoReservas.listar();
      return obtenerEquiposDisponibles(equipos, reservas, fecha, turno);
    },

    async crearReserva(datos, usuario) {
      const errores = validarReserva(datos);
      if (Object.keys(errores).length > 0) {
        throw new ErrorDominio('DATOS_INVALIDOS', 'Revisa los datos de la reserva.', errores);
      }

      const equipoId = Number(datos.equipoId);
      const equipo = await repoEquipos.buscarPorId(equipoId);
      if (!equipo) {
        throw new ErrorDominio('NO_ENCONTRADO', 'El equipo seleccionado no existe.', {
          equipoId: 'El equipo seleccionado no existe.'
        });
      }
      if (equipo.estado !== 'operativo') {
        throw new ErrorDominio('NO_OPERATIVO', 'El equipo está fuera de servicio.', {
          equipoId: 'El equipo está fuera de servicio.'
        });
      }

      const reservas = await repoReservas.listar();
      if (estaReservado(equipoId, datos.fecha, datos.turno, reservas)) {
        throw new ErrorDominio('YA_RESERVADO', 'El equipo ya está reservado para esa fecha y turno.', {
          equipoId: 'El equipo ya está reservado para esa fecha y turno.'
        });
      }

      return repoReservas.crear({
        equipoId,
        usuarioId: usuario.id,
        fecha: datos.fecha,
        turno: datos.turno,
        estado: 'activa'
      });
    },

    async reservasDeUsuario(usuarioId) {
      const reservas = await repoReservas.listarPorUsuario(usuarioId);
      return ordenarPorFecha(await completarReservas(reservas));
    },

    async todasLasReservas() {
      const reservas = await repoReservas.listar();
      return ordenarPorFecha(await completarReservas(reservas));
    },

    async contarActivas(usuarioId) {
      const reservas = await repoReservas.listarPorUsuario(usuarioId);
      return reservas.filter(r => r.estado === 'activa').length;
    },

    async cancelarReserva(id, usuario) {
      const reserva = await repoReservas.buscarPorId(id);
      if (!reserva) {
        throw new ErrorDominio('NO_ENCONTRADO', 'La reserva no existe.');
      }
      if (reserva.usuarioId !== usuario.id) {
        throw new ErrorDominio('SIN_PERMISO', 'No puedes cancelar una reserva de otro usuario.');
      }
      return cancelar(reserva);
    },

    async cancelarComoAdmin(id) {
      const reserva = await repoReservas.buscarPorId(id);
      if (!reserva) {
        throw new ErrorDominio('NO_ENCONTRADO', 'La reserva no existe.');
      }
      return cancelar(reserva);
    }
  };
}
