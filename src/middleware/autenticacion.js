export function crearCargarUsuario(servicioUsuarios) {
  return async function cargarUsuario(req, res, next) {
    const usuarioId = req.session.usuarioId;
    req.usuario = usuarioId ? await servicioUsuarios.buscarPorId(usuarioId) : null;
    res.locals.usuarioActual = req.usuario;
    next();
  };
}

export function exigirAutenticacion(req, res, next) {
  if (!req.usuario) {
    return res.redirect(303, '/login');
  }
  next();
}

export function exigirRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.redirect(303, '/login');
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).render('error', {
        titulo: 'Acceso denegado',
        mensaje: 'No tienes permiso para acceder a esta página.'
      });
    }
    next();
  };
}
