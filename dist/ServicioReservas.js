import { ErrorDominio } from './ErrorDominio.js';
export const TURNOS = ['manana', 'tarde'];
export function esTurno(valor) {
    return typeof valor === 'string' && TURNOS.includes(valor);
}
export function fechaDeHoy() {
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${hoy.getFullYear()}-${mes}-${dia}`;
}
export function esFechaValida(texto) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        return false;
    }
    const [anio, mes, dia] = texto.split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
}
export function estaReservado(equipoId, fecha, turno, reservas) {
    return reservas.some(reserva => reserva.equipoId === equipoId &&
        reserva.fecha === fecha &&
        reserva.turno === turno &&
        reserva.estado === 'activa');
}
export function obtenerEquiposDisponibles(equipos, reservas, fecha, turno) {
    return equipos.filter(equipo => equipo.estado === 'operativo' && !estaReservado(equipo.id, fecha, turno, reservas));
}
export class ServicioReservas {
    repo;
    equipos;
    constructor(repo, equipos) {
        this.repo = repo;
        this.equipos = equipos;
    }
    async equiposDisponibles(fecha, turno) {
        const reservas = await this.repo.listar();
        return obtenerEquiposDisponibles(this.equipos, reservas, fecha, turno);
    }
    async crearReserva(equipoId, usuario, fecha, turno) {
        if (!Number.isSafeInteger(equipoId) || equipoId <= 0) {
            throw new ErrorDominio('DATOS_INVALIDOS', 'El identificador del equipo no es válido.');
        }
        if (!esFechaValida(fecha) || fecha < fechaDeHoy()) {
            throw new ErrorDominio('DATOS_INVALIDOS', 'La fecha no es válida o ya ha pasado.');
        }
        if (!esTurno(turno)) {
            throw new ErrorDominio('DATOS_INVALIDOS', 'El turno debe ser mañana o tarde.');
        }
        const equipo = this.equipos.find(e => e.id === equipoId);
        if (!equipo) {
            throw new ErrorDominio('NO_ENCONTRADO', 'El equipo no existe.');
        }
        if (equipo.estado !== 'operativo') {
            throw new ErrorDominio('NO_OPERATIVO', 'El equipo está fuera de servicio.');
        }
        const reservas = await this.repo.listar();
        if (estaReservado(equipoId, fecha, turno, reservas)) {
            throw new ErrorDominio('YA_RESERVADO', 'El equipo ya está reservado para esa fecha y turno.');
        }
        return this.repo.crear({ equipoId, usuarioId: usuario.id, fecha, turno, estado: 'activa' });
    }
    async reservasDeUsuario(usuarioId) {
        return this.repo.listarPorUsuario(usuarioId);
    }
    async cancelarReserva(id, usuario) {
        const reserva = await this.repo.buscarPorId(id);
        if (!reserva) {
            throw new ErrorDominio('NO_ENCONTRADO', 'La reserva no existe.');
        }
        if (usuario.rol !== 'admin' && reserva.usuarioId !== usuario.id) {
            throw new ErrorDominio('SIN_PERMISO', 'No puedes cancelar una reserva de otro usuario.');
        }
        if (reserva.estado === 'cancelada') {
            throw new ErrorDominio('YA_CANCELADA', 'La reserva ya estaba cancelada.');
        }
        if (reserva.fecha < fechaDeHoy()) {
            throw new ErrorDominio('FECHA_PASADA', 'No se puede cancelar una reserva pasada.');
        }
        const cancelada = { ...reserva, estado: 'cancelada' };
        await this.repo.guardar(cancelada);
        return cancelada;
    }
}
