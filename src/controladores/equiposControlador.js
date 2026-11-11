import { ErrorDominio } from '../errores/ErrorDominio.js';
import { TIPOS_EQUIPO, convertirId, texto } from '../utilidades/validaciones.js';

const opcionesCookie = {
  maxAge: 30 * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax'
};

export function crearControladorEquipos(servicioEquipos, produccion) {
  return {
    async listar(req, res) {
      const tipoPreferido = TIPOS_EQUIPO.includes(req.cookies.tipoPreferido) ? req.cookies.tipoPreferido : null;
      const tipo = req.query.tipo ?? tipoPreferido ?? 'todos';
      const operativos = req.query.operativos ?? 'false';

      if (typeof tipo !== 'string' || ![...TIPOS_EQUIPO, 'todos'].includes(tipo)) {
        throw new ErrorDominio('DATOS_INVALIDOS', 'El tipo de equipo indicado no es válido.');
      }
      if (!['true', 'false'].includes(operativos)) {
        throw new ErrorDominio('DATOS_INVALIDOS', 'El filtro de operativos debe ser true o false.');
      }

      const equipos = await servicioEquipos.listar({ tipo, soloOperativos: operativos === 'true' });
      res.render('equipos/lista', {
        titulo: 'Catálogo de equipos',
        equipos,
        filtros: { tipo, operativos: operativos === 'true' },
        tipoPreferido
      });
    },

    async ficha(req, res) {
      const id = convertirId(req.params.id);
      const { equipo, proximasReservas } = await servicioEquipos.obtenerFicha(id);
      res.render('equipos/ficha', { titulo: equipo.codigo, equipo, proximasReservas });
    },

    guardarPreferencia(req, res) {
      const tipo = texto(req.body.tipo);
      if (tipo === 'ninguno') {
        res.clearCookie('tipoPreferido', { ...opcionesCookie, maxAge: undefined, secure: produccion });
        return res.redirect(303, '/equipos?tipo=todos');
      }
      if (!TIPOS_EQUIPO.includes(tipo)) {
        throw new ErrorDominio('DATOS_INVALIDOS', 'El tipo preferido debe ser portátil o sobremesa.');
      }
      res.cookie('tipoPreferido', tipo, { ...opcionesCookie, secure: produccion });
      res.redirect(303, '/equipos');
    }
  };
}
