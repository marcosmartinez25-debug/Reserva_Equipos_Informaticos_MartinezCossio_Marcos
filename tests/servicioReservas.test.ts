import { describe, expect, it } from 'vitest';
import { RepositorioReservasMemoria } from '../src-ts/RepositorioReservasMemoria.js';
import { ServicioReservas } from '../src-ts/ServicioReservas.js';
import type { Equipo, Usuario } from '../src-ts/modelos.js';

const equipos: Equipo[] = [
  { id: 1, codigo: 'PC-001', nombre: 'Ordenador aula 1', tipo: 'sobremesa', estado: 'operativo' },
  { id: 2, codigo: 'PC-002', nombre: 'Ordenador aula 2', tipo: 'sobremesa', estado: 'fuera_de_servicio' }
];
const ana: Usuario = { id: 2, nombre: 'Ana', email: 'ana@example.com', passwordHash: '-', rol: 'usuario' };
const luis: Usuario = { id: 3, nombre: 'Luis', email: 'luis@example.com', passwordHash: '-', rol: 'usuario' };

function crearServicio(): ServicioReservas {
  return new ServicioReservas(new RepositorioReservasMemoria(), equipos);
}

describe('ServicioReservas en TypeScript', () => {
  it('crea una reserva y rechaza la duplicada', async () => {
    const servicio = crearServicio();
    const reserva = await servicio.crearReserva(1, ana, '2027-04-01', 'manana');
    expect(reserva.estado).toBe('activa');
    await expect(servicio.crearReserva(1, luis, '2027-04-01', 'manana')).rejects.toMatchObject({ codigo: 'YA_RESERVADO' });
  });

  it('rechaza equipos fuera de servicio y turnos inválidos', async () => {
    const servicio = crearServicio();
    await expect(servicio.crearReserva(2, ana, '2027-04-01', 'tarde')).rejects.toMatchObject({ codigo: 'NO_OPERATIVO' });
    await expect(servicio.crearReserva(1, ana, '2027-04-01', 'noche')).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('solo permite cancelar las reservas propias y libera el turno', async () => {
    const servicio = crearServicio();
    const reserva = await servicio.crearReserva(1, ana, '2027-04-01', 'tarde');
    await expect(servicio.cancelarReserva(reserva.id, luis)).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
    const cancelada = await servicio.cancelarReserva(reserva.id, ana);
    expect(cancelada.estado).toBe('cancelada');
    const disponibles = await servicio.equiposDisponibles('2027-04-01', 'tarde');
    expect(disponibles.map(e => e.codigo)).toEqual(['PC-001']);
  });
});
