import { TURNOS, fechaDeHoy } from '../utilidades/reservas.js';
import { etiquetaTipo, etiquetaTurno, formatearFecha } from './helpers.js';

export function crearFormularioReservaVM({ equipos, valores, errores = {}, consultaValida, csrfToken }) {
  return {
    titulo: 'Nueva reserva',
    fecha: valores.fecha,
    fechaMinima: fechaDeHoy(),
    turno: valores.turno,
    resumen: consultaValida ? `${formatearFecha(valores.fecha)} · turno de ${etiquetaTurno(valores.turno).toLowerCase()}` : '',
    turnos: TURNOS.map(turno => ({
      valor: turno,
      texto: etiquetaTurno(turno),
      seleccionado: turno === valores.turno
    })),
    equipos: equipos.map(equipo => ({
      valor: String(equipo.id),
      texto: `${equipo.codigo} - ${equipo.nombre} (${etiquetaTipo(equipo.tipo)})`,
      seleccionado: String(equipo.id) === valores.equipoId
    })),
    consultaValida,
    puedeReservar: consultaValida && equipos.length > 0,
    errores: Object.values(errores),
    csrfToken
  };
}
