export function crearRepositorioReservas(iniciales = []) {
  const datos = new Map(iniciales.map(reserva => [reserva.id, { ...reserva }]));

  function siguienteId() {
    return Math.max(0, ...datos.keys()) + 1;
  }

  return {
    async listar() {
      return [...datos.values()].map(reserva => ({ ...reserva }));
    },

    async listarPorUsuario(usuarioId) {
      return [...datos.values()]
        .filter(reserva => reserva.usuarioId === usuarioId)
        .map(reserva => ({ ...reserva }));
    },

    async buscarPorId(id) {
      const reserva = datos.get(id);
      return reserva ? { ...reserva } : undefined;
    },

    async crear(nueva) {
      const reserva = { id: siguienteId(), ...nueva };
      datos.set(reserva.id, reserva);
      return { ...reserva };
    },

    async guardar(reserva) {
      if (!datos.has(reserva.id)) {
        throw new Error('No existe la reserva que se quiere actualizar');
      }
      datos.set(reserva.id, { ...reserva });
    }
  };
}
