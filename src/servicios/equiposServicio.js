import { ErrorDominio } from '../errores/ErrorDominio.js';
import { ESTADOS_EQUIPO } from '../utilidades/validaciones.js';
import { fechaDeHoy } from '../utilidades/reservas.js';

export function crearServicioEquipos(repoEquipos, repoReservas) {
  return {
    async listar(filtros) {
      const equipos = await repoEquipos.listar();
      return equipos.filter(equipo => {
        const cumpleTipo = filtros.tipo === 'todos' || equipo.tipo === filtros.tipo;
        const cumpleEstado = !filtros.soloOperativos || equipo.estado === 'operativo';
        return cumpleTipo && cumpleEstado;
      });
    },

    async obtenerFicha(id) {
      const equipo = await repoEquipos.buscarPorId(id);
      if (!equipo) {
        throw new ErrorDominio('NO_ENCONTRADO', 'El equipo solicitado no existe.');
      }
      const hoy = fechaDeHoy();
      const reservas = await repoReservas.listar();
      const proximasReservas = reservas
        .filter(r => r.equipoId === id && r.estado === 'activa' && r.fecha >= hoy)
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.turno.localeCompare(b.turno));
      return { equipo, proximasReservas };
    },

    async crear(datos) {
      const existente = await repoEquipos.buscarPorCodigo(datos.codigo);
      if (existente) {
        throw new ErrorDominio('CODIGO_DUPLICADO', 'Ya existe un equipo con ese código.', {
          codigo: 'Ya existe un equipo con ese código.'
        });
      }
      return repoEquipos.crear({
        codigo: datos.codigo,
        nombre: datos.nombre,
        tipo: datos.tipo,
        estado: 'operativo'
      });
    },

    async cambiarEstado(id, estado) {
      if (!ESTADOS_EQUIPO.includes(estado)) {
        throw new ErrorDominio('DATOS_INVALIDOS', 'El estado debe ser operativo o fuera de servicio.');
      }
      const equipo = await repoEquipos.buscarPorId(id);
      if (!equipo) {
        throw new ErrorDominio('NO_ENCONTRADO', 'El equipo solicitado no existe.');
      }
      equipo.estado = estado;
      await repoEquipos.guardar(equipo);
      return equipo;
    }
  };
}
