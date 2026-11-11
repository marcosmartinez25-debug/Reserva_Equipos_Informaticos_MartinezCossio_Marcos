export function crearRepositorioUsuarios(iniciales = []) {
  const datos = new Map(iniciales.map(usuario => [usuario.id, { ...usuario }]));

  function siguienteId() {
    return Math.max(0, ...datos.keys()) + 1;
  }

  return {
    async listar() {
      return [...datos.values()].map(usuario => ({ ...usuario }));
    },

    async buscarPorId(id) {
      const usuario = datos.get(id);
      return usuario ? { ...usuario } : undefined;
    },

    async buscarPorEmail(email) {
      const usuario = [...datos.values()].find(u => u.email === email);
      return usuario ? { ...usuario } : undefined;
    },

    async crear(nuevo) {
      const usuario = { id: siguienteId(), ...nuevo };
      datos.set(usuario.id, usuario);
      return { ...usuario };
    }
  };
}
