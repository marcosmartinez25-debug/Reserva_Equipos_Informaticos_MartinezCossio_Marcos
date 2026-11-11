import { RepositorioReservasMemoria } from './RepositorioReservasMemoria.js';
import { ServicioReservas } from './ServicioReservas.js';
import { ErrorDominio } from './ErrorDominio.js';
const equipos = [
    { id: 1, codigo: 'PC-001', nombre: 'Ordenador aula 1', tipo: 'sobremesa', estado: 'operativo' },
    { id: 2, codigo: 'PORT-001', nombre: 'Portátil Lenovo', tipo: 'portatil', estado: 'operativo' },
    { id: 3, codigo: 'PC-002', nombre: 'Ordenador aula 2', tipo: 'sobremesa', estado: 'fuera_de_servicio' }
];
const ana = { id: 2, nombre: 'Ana García', email: 'ana@example.com', passwordHash: '-', rol: 'usuario' };
const luis = { id: 3, nombre: 'Luis Pérez', email: 'luis@example.com', passwordHash: '-', rol: 'usuario' };
const repo = new RepositorioReservasMemoria([
    { id: 1, equipoId: 1, usuarioId: 2, fecha: '2027-01-15', turno: 'manana', estado: 'activa' }
]);
const servicio = new ServicioReservas(repo, equipos);
async function probar(descripcion, operacion) {
    try {
        await operacion();
        console.log(`OK    ${descripcion}`);
    }
    catch (error) {
        if (error instanceof ErrorDominio) {
            console.log(`ERROR ${descripcion} -> ${error.codigo}: ${error.message}`);
        }
        else {
            throw error;
        }
    }
}
const disponibles = await servicio.equiposDisponibles('2027-01-15', 'manana');
console.log('Disponibles el 15/01/2027 por la mañana:', disponibles.map(e => e.codigo).join(', '));
await probar('Ana reserva PORT-001 el 15/01/2027 por la mañana', () => servicio.crearReserva(2, ana, '2027-01-15', 'manana'));
await probar('Luis intenta reservar PORT-001 en el mismo turno', () => servicio.crearReserva(2, luis, '2027-01-15', 'manana'));
await probar('Luis intenta reservar PC-002 (fuera de servicio)', () => servicio.crearReserva(3, luis, '2027-01-16', 'tarde'));
await probar('Luis intenta usar un turno inválido', () => servicio.crearReserva(1, luis, '2027-01-16', 'noche'));
await probar('Luis intenta cancelar la reserva 1 de Ana', () => servicio.cancelarReserva(1, luis));
await probar('Ana cancela su reserva 1', () => servicio.cancelarReserva(1, ana));
await probar('Luis reserva PC-001 tras la cancelación', () => servicio.crearReserva(1, luis, '2027-01-15', 'manana'));
const reservasAna = await servicio.reservasDeUsuario(ana.id);
console.log('Reservas de Ana:', reservasAna.map(r => `${r.id}:${r.estado}`).join(', '));
