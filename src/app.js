import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { crearDatosIniciales } from './datos/datosIniciales.js';
import { crearRepositorioEquipos } from './repositorios/equiposRepositorio.js';
import { crearRepositorioReservas } from './repositorios/reservasRepositorio.js';
import { crearRepositorioUsuarios } from './repositorios/usuariosRepositorio.js';
import { crearServicioEquipos } from './servicios/equiposServicio.js';
import { crearServicioReservas } from './servicios/reservasServicio.js';
import { crearServicioUsuarios } from './servicios/usuariosServicio.js';
import { crearControladorEquipos } from './controladores/equiposControlador.js';
import { crearControladorAuth } from './controladores/authControlador.js';
import { crearControladorReservas } from './controladores/reservasControlador.js';
import { crearControladorAdmin } from './controladores/adminControlador.js';
import { crearRutasEquipos } from './rutas/equiposRutas.js';
import { crearRutasAuth } from './rutas/authRutas.js';
import { crearRutasReservas } from './rutas/reservasRutas.js';
import { crearRutasAdmin } from './rutas/adminRutas.js';
import { crearCargarUsuario } from './middleware/autenticacion.js';
import { prepararCsrf } from './middleware/csrf.js';
import { mostrarAvisos } from './middleware/avisos.js';
import { crearLimitadorLogin } from './middleware/limitador.js';
import { crearTratarError, paginaNoEncontrada } from './middleware/errores.js';
import * as helpers from './presentacion/helpers.js';

const NOMBRE_COOKIE_SESION = 'reservas.sid';

export function crearApp() {
  const datos = crearDatosIniciales();
  const repoEquipos = crearRepositorioEquipos(datos.equipos);
  const repoReservas = crearRepositorioReservas(datos.reservas);
  const repoUsuarios = crearRepositorioUsuarios(datos.usuarios);

  const servicioEquipos = crearServicioEquipos(repoEquipos, repoReservas);
  const servicioReservas = crearServicioReservas(repoReservas, repoEquipos, repoUsuarios);
  const servicioUsuarios = crearServicioUsuarios(repoUsuarios);

  const controladorEquipos = crearControladorEquipos(servicioEquipos, config.produccion);
  const controladorAuth = crearControladorAuth(servicioUsuarios, servicioReservas, NOMBRE_COOKIE_SESION, config.produccion);
  const controladorReservas = crearControladorReservas(servicioReservas);
  const controladorAdmin = crearControladorAdmin(servicioEquipos, servicioReservas);

  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', fileURLToPath(new URL('../views', import.meta.url)));
  app.disable('x-powered-by');
  app.locals.helpers = helpers;

  if (config.produccion) {
    app.set('trust proxy', 1);
  }

  app.use(express.static(fileURLToPath(new URL('../public', import.meta.url))));
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));
  app.use(cookieParser());
  app.use(session({
    name: NOMBRE_COOKIE_SESION,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.produccion,
      sameSite: 'lax',
      maxAge: 30 * 60 * 1000
    }
  }));
  app.use(crearCargarUsuario(servicioUsuarios));
  app.use(prepararCsrf);
  app.use(mostrarAvisos);

  app.get('/', (req, res) => res.redirect('/equipos'));
  app.use(crearRutasEquipos(controladorEquipos));
  app.use(crearRutasAuth(controladorAuth, crearLimitadorLogin()));
  app.use(crearRutasReservas(controladorReservas));
  app.use(crearRutasAdmin(controladorAdmin));

  app.use(paginaNoEncontrada);
  app.use(crearTratarError(config.entorno !== 'test'));

  return app;
}
