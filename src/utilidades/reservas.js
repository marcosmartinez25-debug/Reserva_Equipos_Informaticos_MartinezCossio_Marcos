export const TURNOS = ['manana', 'tarde'];

export function fechaDeHoy() {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

export function esFechaValida(texto) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return false;
  }
  const [anio, mes, dia] = texto.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
}

export function estaReservado(equipoId, fecha, turno, reservas) {
  return reservas.some(reserva =>
    reserva.equipoId === equipoId &&
    reserva.fecha === fecha &&
    reserva.turno === turno &&
    reserva.estado === 'activa'
  );
}

export function obtenerEquiposDisponibles(equipos, reservas, fecha, turno) {
  return equipos.filter(equipo =>
    equipo.estado === 'operativo' && !estaReservado(equipo.id, fecha, turno, reservas)
  );
}

export function validarFechaYTurno(fecha, turno, hoy = fechaDeHoy()) {
  const errores = {};
  if (!esFechaValida(fecha)) {
    errores.fecha = 'La fecha no es válida.';
  } else if (fecha < hoy) {
    errores.fecha = 'La fecha no puede ser anterior al día de hoy.';
  }
  if (!TURNOS.includes(turno)) {
    errores.turno = 'El turno debe ser mañana o tarde.';
  }
  return errores;
}

export function validarReserva(datos, hoy = fechaDeHoy()) {
  const errores = validarFechaYTurno(datos.fecha, datos.turno, hoy);
  if (typeof datos.equipoId !== 'string' || !/^[1-9]\d{0,8}$/.test(datos.equipoId)) {
    errores.equipoId = 'Selecciona un equipo válido.';
  }
  return errores;
}

export function sePuedeCancelar(reserva, hoy = fechaDeHoy()) {
  return reserva.estado === 'activa' && reserva.fecha >= hoy;
}
