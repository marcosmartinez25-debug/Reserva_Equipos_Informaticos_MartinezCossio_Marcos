export type Rol = 'usuario' | 'admin';
export type Turno = 'manana' | 'tarde';
export type EstadoReserva = 'activa' | 'cancelada';
export type EstadoEquipo = 'operativo' | 'fuera_de_servicio';
export type TipoEquipo = 'sobremesa' | 'portatil';

export interface Equipo {
  readonly id: number;
  codigo: string;
  nombre: string;
  tipo: TipoEquipo;
  estado: EstadoEquipo;
}

export interface Reserva {
  readonly id: number;
  equipoId: number;
  usuarioId: number;
  fecha: string;
  turno: Turno;
  estado: EstadoReserva;
}

export interface Usuario {
  readonly id: number;
  nombre: string;
  email: string;
  passwordHash: string;
  rol: Rol;
}

export type NuevaReserva = Omit<Reserva, 'id'>;
