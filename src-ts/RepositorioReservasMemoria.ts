import type { NuevaReserva, Reserva } from './modelos.js';
import type { RepositorioReservas } from './RepositorioReservas.js';

export class RepositorioReservasMemoria implements RepositorioReservas {
  private readonly datos: Map<number, Reserva>;

  constructor(iniciales: Reserva[] = []) {
    this.datos = new Map(iniciales.map(reserva => [reserva.id, { ...reserva }]));
  }

  async listar(): Promise<Reserva[]> {
    return [...this.datos.values()].map(reserva => ({ ...reserva }));
  }

  async listarPorUsuario(usuarioId: number): Promise<Reserva[]> {
    return [...this.datos.values()]
      .filter(reserva => reserva.usuarioId === usuarioId)
      .map(reserva => ({ ...reserva }));
  }

  async buscarPorId(id: number): Promise<Reserva | undefined> {
    const reserva = this.datos.get(id);
    return reserva ? { ...reserva } : undefined;
  }

  async crear(nueva: NuevaReserva): Promise<Reserva> {
    const reserva: Reserva = { id: this.siguienteId(), ...nueva };
    this.datos.set(reserva.id, reserva);
    return { ...reserva };
  }

  async guardar(reserva: Reserva): Promise<void> {
    if (!this.datos.has(reserva.id)) {
      throw new Error('No existe la reserva que se quiere actualizar');
    }
    this.datos.set(reserva.id, { ...reserva });
  }

  private siguienteId(): number {
    return Math.max(0, ...this.datos.keys()) + 1;
  }
}
