export function mostrarAvisos(req, res, next) {
  res.locals.aviso = null;
  if (req.method === 'GET' && req.session.aviso) {
    res.locals.aviso = req.session.aviso;
    delete req.session.aviso;
  }
  next();
}

export function redirigirConAviso(req, res, next, url, texto) {
  req.session.aviso = texto;
  req.session.save(error => {
    if (error) {
      return next(error);
    }
    res.redirect(303, url);
  });
}
