export function crearRepositorioEquipos(iniciales = []) {
  const datos = new Map(iniciales.map(equipo => [equipo.id, { ...equipo }]));

  function siguienteId() {
    return Math.max(0, ...datos.keys()) + 1;
  }

  return {
    async listar() {
      return [...datos.values()].map(equipo => ({ ...equipo }));
    },

    async buscarPorId(id) {
      const equipo = datos.get(id);
      return equipo ? { ...equipo } : undefined;
    },

    async buscarPorCodigo(codigo) {
      const equipo = [...datos.values()].find(e => e.codigo === codigo);
      return equipo ? { ...equipo } : undefined;
    },

    async crear(nuevo) {
      const equipo = { id: siguienteId(), ...nuevo };
      datos.set(equipo.id, equipo);
      return { ...equipo };
    },

    async guardar(equipo) {
      if (!datos.has(equipo.id)) {
        throw new Error('No existe el equipo que se quiere actualizar');
      }
      datos.set(equipo.id, { ...equipo });
    }
  };
}
