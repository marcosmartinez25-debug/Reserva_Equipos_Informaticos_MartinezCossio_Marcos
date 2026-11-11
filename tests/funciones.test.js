import { describe, expect, it } from 'vitest';
import {
  esFechaValida,
  estaReservado,
  obtenerEquiposDisponibles,
  validarReserva
} from '../src/utilidades/reservas.js';
import { cargarConfig } from '../src/config.js';

const equipos = [
  { id: 1, codigo: 'PC-001', tipo: 'sobremesa', estado: 'operativo' },
  { id: 2, codigo: 'PORT-001', tipo: 'portatil', estado: 'operativo' },
  { id: 3, codigo: 'PC-002', tipo: 'sobremesa', estado: 'fuera_de_servicio' }
];

const reservas = [
  { id: 1, equipoId: 1, usuarioId: 2, fecha: '2027-01-15', turno: 'manana', estado: 'activa' },
  { id: 2, equipoId: 2, usuarioId: 3, fecha: '2027-01-15', turno: 'manana', estado: 'cancelada' }
];

describe('Funciones de reservas', () => {
  it('estaReservado solo tiene en cuenta las reservas activas', () => {
    expect(estaReservado(1, '2027-01-15', 'manana', reservas)).toBe(true);
    expect(estaReservado(1, '2027-01-15', 'tarde', reservas)).toBe(false);
    expect(estaReservado(2, '2027-01-15', 'manana', reservas)).toBe(false);
  });

  it('obtenerEquiposDisponibles quita los reservados y los fuera de servicio', () => {
    const manana = obtenerEquiposDisponibles(equipos, reservas, '2027-01-15', 'manana');
    expect(manana.map(e => e.codigo)).toEqual(['PORT-001']);
    const tarde = obtenerEquiposDisponibles(equipos, reservas, '2027-01-15', 'tarde');
    expect(tarde.map(e => e.codigo)).toEqual(['PC-001', 'PORT-001']);
  });

  it('validarReserva detecta los campos incorrectos', () => {
    expect(validarReserva({ equipoId: '1', fecha: '2027-01-15', turno: 'manana' }, '2026-11-07')).toEqual({});
    const errores = validarReserva({ equipoId: '-1', fecha: '2026-02-30', turno: 'noche' }, '2026-11-07');
    expect(Object.keys(errores)).toEqual(['fecha', 'turno', 'equipoId']);
    expect(validarReserva({ equipoId: '1', fecha: '2026-11-06', turno: 'tarde' }, '2026-11-07').fecha).toBeDefined();
  });

  it('esFechaValida rechaza fechas que no existen', () => {
    expect(esFechaValida('2028-02-29')).toBe(true);
    expect(esFechaValida('2027-02-29')).toBe(false);
    expect(esFechaValida('15/01/2027')).toBe(false);
  });
});

describe('Configuración', () => {
  const secreto = 'a'.repeat(32);

  it('acepta una configuración correcta', () => {
    const config = cargarConfig({ PORT: '4000', NODE_ENV: 'production', SESSION_SECRET: secreto });
    expect(config.puerto).toBe(4000);
    expect(config.produccion).toBe(true);
  });

  it('rechaza valores incorrectos al arrancar', () => {
    expect(() => cargarConfig({ PORT: 'abc', SESSION_SECRET: secreto })).toThrow('PORT');
    expect(() => cargarConfig({ PORT: '70000', SESSION_SECRET: secreto })).toThrow('PORT');
    expect(() => cargarConfig({ NODE_ENV: 'pruebas', SESSION_SECRET: secreto })).toThrow('NODE_ENV');
    expect(() => cargarConfig({ SESSION_SECRET: 'corto' })).toThrow('SESSION_SECRET');
    expect(() => cargarConfig({})).toThrow('SESSION_SECRET');
  });
});
