import crypto from 'node:crypto';

export function prepararCsrf(req, res, next) {
  res.locals.csrfToken = null;
  if (req.session.usuarioId) {
    req.session.csrfToken ??= crypto.randomBytes(32).toString('hex');
    res.locals.csrfToken = req.session.csrfToken;
  }
  next();
}

export function comprobarCsrf(req, res, next) {
  const esperado = Buffer.from(String(req.session.csrfToken ?? ''));
  const recibido = Buffer.from(String(req.body?._csrf ?? ''));

  if (esperado.length === 0 || esperado.length !== recibido.length || !crypto.timingSafeEqual(esperado, recibido)) {
    return res.status(403).render('error', {
      titulo: 'Petición no permitida',
      mensaje: 'El formulario ha caducado o no es válido. Vuelve a cargar la página e inténtalo de nuevo.'
    });
  }
  next();
}
