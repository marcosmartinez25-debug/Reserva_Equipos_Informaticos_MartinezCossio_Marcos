import type { NuevaReserva, Reserva } from './modelos.js';

export interface RepositorioReservas {
  listar(): Promise<Reserva[]>;
  listarPorUsuario(usuarioId: number): Promise<Reserva[]>;
  buscarPorId(id: number): Promise<Reserva | undefined>;
  crear(nueva: NuevaReserva): Promise<Reserva>;
  guardar(reserva: Reserva): Promise<void>;
}
