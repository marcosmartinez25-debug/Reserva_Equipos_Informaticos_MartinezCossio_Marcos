export class RepositorioReservasMemoria {
    datos;
    constructor(iniciales = []) {
        this.datos = new Map(iniciales.map(reserva => [reserva.id, { ...reserva }]));
    }
    async listar() {
        return [...this.datos.values()].map(reserva => ({ ...reserva }));
    }
    async listarPorUsuario(usuarioId) {
        return [...this.datos.values()]
            .filter(reserva => reserva.usuarioId === usuarioId)
            .map(reserva => ({ ...reserva }));
    }
    async buscarPorId(id) {
        const reserva = this.datos.get(id);
        return reserva ? { ...reserva } : undefined;
    }
    async crear(nueva) {
        const reserva = { id: this.siguienteId(), ...nueva };
        this.datos.set(reserva.id, reserva);
        return { ...reserva };
    }
    async guardar(reserva) {
        if (!this.datos.has(reserva.id)) {
            throw new Error('No existe la reserva que se quiere actualizar');
        }
        this.datos.set(reserva.id, { ...reserva });
    }
    siguienteId() {
        return Math.max(0, ...this.datos.keys()) + 1;
    }
}
