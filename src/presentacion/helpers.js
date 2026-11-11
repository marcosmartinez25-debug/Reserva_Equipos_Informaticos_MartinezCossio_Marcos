const nombresTurno = { manana: 'Mañana', tarde: 'Tarde' };
const nombresTipo = { sobremesa: 'Sobremesa', portatil: 'Portátil' };
const nombresEstado = {
  operativo: 'Operativo',
  fuera_de_servicio: 'Fuera de servicio',
  activa: 'Activa',
  cancelada: 'Cancelada'
};

export function etiquetaTurno(turno) {
  return nombresTurno[turno] ?? turno;
}

export function etiquetaTipo(tipo) {
  return nombresTipo[tipo] ?? tipo;
}

export function etiquetaEstado(estado) {
  return nombresEstado[estado] ?? estado;
}

export function formatearFecha(fecha) {
  const partes = String(fecha).split('-');
  if (partes.length !== 3) {
    return fecha;
  }
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}
