import { ErrorDominio } from '../errores/ErrorDominio.js';
import { redirigirConAviso } from '../middleware/avisos.js';
import { estadoHttp } from '../middleware/errores.js';
import {
  TIPOS_EQUIPO,
  normalizarLogin,
  normalizarRegistro,
  validarLogin,
  validarRegistro
} from '../utilidades/validaciones.js';

export function crearControladorAuth(servicioUsuarios, servicioReservas, nombreCookie, produccion) {
  function pintarRegistro(res, estado, valores, errores) {
    res.status(estado).render('auth/registro', {
      titulo: 'Crear cuenta',
      valores: { nombre: valores.nombre, email: valores.email },
      errores
    });
  }

  function pintarLogin(res, estado, email, error) {
    res.status(estado).render('auth/login', {
      titulo: 'Iniciar sesión',
      valores: { email },
      error
    });
  }

  return {
    mostrarRegistro(req, res) {
      pintarRegistro(res, 200, { nombre: '', email: '' }, {});
    },

    async registrar(req, res, next) {
      const valores = normalizarRegistro(req.body);
      const errores = validarRegistro(valores);
      if (Object.keys(errores).length > 0) {
        return pintarRegistro(res, 400, valores, errores);
      }
      try {
        await servicioUsuarios.registrar(valores);
      } catch (error) {
        if (error instanceof ErrorDominio) {
          return pintarRegistro(res, estadoHttp(error.codigo), valores, error.errores);
        }
        throw error;
      }
      redirigirConAviso(req, res, next, '/login', 'Cuenta creada correctamente. Ya puedes iniciar sesión.');
    },

    mostrarLogin(req, res) {
      if (req.usuario) {
        return res.redirect(303, '/perfil');
      }
      pintarLogin(res, 200, '', null);
    },

    async login(req, res, next) {
      const { email, password } = normalizarLogin(req.body);
      const errorFormato = validarLogin({ email, password });
      if (errorFormato) {
        return pintarLogin(res, 400, email, errorFormato);
      }

      const usuario = await servicioUsuarios.comprobarCredenciales(email, password);
      if (!usuario) {
        return pintarLogin(res, 401, email, 'Correo o contraseña incorrectos.');
      }

      req.session.regenerate(error => {
        if (error) {
          return next(error);
        }
        req.session.usuarioId = usuario.id;
        redirigirConAviso(req, res, next, '/perfil', `Bienvenido/a, ${usuario.nombre}.`);
      });
    },

    logout(req, res, next) {
      req.session.destroy(error => {
        if (error) {
          return next(error);
        }
        res.clearCookie(nombreCookie, { httpOnly: true, sameSite: 'lax', secure: produccion });
        res.redirect(303, '/login');
      });
    },

    async perfil(req, res) {
      const reservasActivas = await servicioReservas.contarActivas(req.usuario.id);
      const tipoPreferido = TIPOS_EQUIPO.includes(req.cookies.tipoPreferido) ? req.cookies.tipoPreferido : null;
      res.render('auth/perfil', {
        titulo: 'Mi perfil',
        usuario: req.usuario,
        reservasActivas,
        tipoPreferido
      });
    }
  };
}
