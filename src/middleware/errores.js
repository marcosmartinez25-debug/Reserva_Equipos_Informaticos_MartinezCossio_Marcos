import { ErrorDominio } from '../errores/ErrorDominio.js';

const estados = {
  DATOS_INVALIDOS: 400,
  EMAIL_DUPLICADO: 400,
  SIN_PERMISO: 403,
  NO_ENCONTRADO: 404,
  YA_RESERVADO: 409,
  NO_OPERATIVO: 409,
  YA_CANCELADA: 409,
  FECHA_PASADA: 409,
  CODIGO_DUPLICADO: 409
};

export function estadoHttp(codigo) {
  return estados[codigo] ?? 500;
}

export function paginaNoEncontrada(req, res) {
  res.status(404).render('error', {
    titulo: 'Página no encontrada',
    mensaje: 'La página que buscas no existe.'
  });
}

export function crearTratarError(mostrarLog) {
  return function tratarError(error, req, res, next) {
    if (res.headersSent) {
      return next(error);
    }
    if (error instanceof ErrorDominio && estados[error.codigo]) {
      return res.status(estados[error.codigo]).render('error', {
        titulo: 'No se pudo completar la operación',
        mensaje: error.message
      });
    }
    if (error.type === 'entity.too.large') {
      return res.status(400).render('error', {
        titulo: 'Datos incorrectos',
        mensaje: 'Los datos enviados son demasiado grandes.'
      });
    }
    if (mostrarLog) {
      console.error('Error interno:', error.message);
    }
    res.status(500).render('error', {
      titulo: 'Error del servidor',
      mensaje: 'Se ha producido un error interno. Inténtalo más tarde.'
    });
  };
}
