import { ErrorDominio } from '../errores/ErrorDominio.js';

export const TIPOS_EQUIPO = ['sobremesa', 'portatil'];
export const ESTADOS_EQUIPO = ['operativo', 'fuera_de_servicio'];

export function texto(valor) {
  return typeof valor === 'string' ? valor : '';
}

export function convertirId(valor) {
  if (typeof valor !== 'string' || !/^[1-9]\d{0,8}$/.test(valor)) {
    throw new ErrorDominio('DATOS_INVALIDOS', 'El identificador no es válido.');
  }
  return Number(valor);
}

export function normalizarRegistro(body = {}) {
  return {
    nombre: texto(body.nombre).trim(),
    email: texto(body.email).trim().toLowerCase(),
    password: texto(body.password),
    password2: texto(body.password2)
  };
}

export function validarRegistro(valores) {
  const errores = {};
  if (valores.nombre.length < 2 || valores.nombre.length > 60) {
    errores.nombre = 'El nombre debe tener entre 2 y 60 caracteres.';
  }
  if (valores.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valores.email)) {
    errores.email = 'Introduce un correo electrónico válido.';
  }
  if (valores.password.length < 8 || valores.password.length > 100) {
    errores.password = 'La contraseña debe tener entre 8 y 100 caracteres.';
  } else if (valores.password !== valores.password2) {
    errores.password2 = 'Las contraseñas no coinciden.';
  }
  return errores;
}

export function normalizarLogin(body = {}) {
  return {
    email: texto(body.email).trim().toLowerCase(),
    password: texto(body.password)
  };
}

export function validarLogin(valores) {
  if (!valores.email || !valores.password) {
    return 'Introduce el correo y la contraseña.';
  }
  if (valores.email.length > 254 || valores.password.length > 100) {
    return 'Correo o contraseña incorrectos.';
  }
  return null;
}

export function normalizarEquipo(body = {}) {
  return {
    codigo: texto(body.codigo).trim().toUpperCase(),
    nombre: texto(body.nombre).trim(),
    tipo: texto(body.tipo)
  };
}

export function validarEquipo(valores) {
  const errores = {};
  if (!/^[A-Z0-9-]{3,15}$/.test(valores.codigo)) {
    errores.codigo = 'El código debe tener entre 3 y 15 caracteres (letras, números y guiones).';
  }
  if (valores.nombre.length < 3 || valores.nombre.length > 60) {
    errores.nombre = 'El nombre debe tener entre 3 y 60 caracteres.';
  }
  if (!TIPOS_EQUIPO.includes(valores.tipo)) {
    errores.tipo = 'El tipo debe ser sobremesa o portátil.';
  }
  return errores;
}
