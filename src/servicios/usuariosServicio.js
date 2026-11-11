import bcrypt from 'bcrypt';
import { ErrorDominio } from '../errores/ErrorDominio.js';

function usuarioPublico(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol
  };
}

export function crearServicioUsuarios(repoUsuarios) {
  return {
    async registrar(datos) {
      const existente = await repoUsuarios.buscarPorEmail(datos.email);
      if (existente) {
        throw new ErrorDominio('EMAIL_DUPLICADO', 'No se puede crear la cuenta.', {
          email: 'No se puede crear una cuenta con ese correo.'
        });
      }
      const passwordHash = await bcrypt.hash(datos.password, 10);
      const usuario = await repoUsuarios.crear({
        nombre: datos.nombre,
        email: datos.email,
        passwordHash,
        rol: 'usuario'
      });
      return usuarioPublico(usuario);
    },

    async comprobarCredenciales(email, password) {
      const usuario = await repoUsuarios.buscarPorEmail(email);
      const coincide = usuario ? await bcrypt.compare(password, usuario.passwordHash) : false;
      return coincide ? usuarioPublico(usuario) : null;
    },

    async buscarPorId(id) {
      const usuario = await repoUsuarios.buscarPorId(id);
      return usuario ? usuarioPublico(usuario) : null;
    }
  };
}
