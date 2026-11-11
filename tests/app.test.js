import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { crearApp } from '../src/app.js';
import { iniciarSesion, nuevoAgente, sacarCsrf } from './ayudas.js';

describe('Registro e inicio de sesión', () => {
  it('1. registra un usuario válido y después puede iniciar sesión', async () => {
    const agente = nuevoAgente();
    const respuesta = await agente.post('/registro').type('form').send({
      nombre: 'Marta López',
      email: 'Marta@Example.com',
      password: 'marta12345',
      password2: 'marta12345',
      rol: 'admin'
    });
    expect(respuesta.status).toBe(303);
    expect(respuesta.headers.location).toBe('/login');

    const login = await agente.get('/login');
    expect(login.text).toContain('Cuenta creada correctamente');

    await iniciarSesion(agente, 'marta@example.com', 'marta12345');
    const perfil = await agente.get('/perfil');
    expect(perfil.text).toContain('Marta López');
    expect(perfil.text).toContain('usuario');
    await agente.get('/admin/equipos').expect(403);
  });

  it('rechaza el registro con un correo duplicado o datos incorrectos', async () => {
    const agente = nuevoAgente();
    const duplicado = await agente.post('/registro').type('form').send({
      nombre: 'Otra Ana', email: 'ana@example.com', password: 'otra12345', password2: 'otra12345'
    });
    expect(duplicado.status).toBe(400);
    expect(duplicado.text).toContain('No se puede crear una cuenta con ese correo');

    const incorrecto = await agente.post('/registro').type('form').send({
      nombre: 'A', email: 'no-es-un-correo', password: '123', password2: '123'
    });
    expect(incorrecto.status).toBe(400);
    expect(incorrecto.text).toContain('Introduce un correo electrónico válido');
  });

  it('2. rechaza credenciales incorrectas con el mismo mensaje exista o no el correo', async () => {
    const agente = nuevoAgente();
    const malaClave = await agente.post('/login').type('form').send({ email: 'ana@example.com', password: 'incorrecta' });
    const noExiste = await agente.post('/login').type('form').send({ email: 'nadie@example.com', password: 'incorrecta' });

    expect(malaClave.status).toBe(401);
    expect(noExiste.status).toBe(401);
    expect(malaClave.text).toContain('Correo o contraseña incorrectos.');
    expect(noExiste.text).toContain('Correo o contraseña incorrectos.');
    expect(malaClave.headers['set-cookie']).toBeUndefined();
  });

  it('regenera el identificador de sesión al iniciar sesión', async () => {
    const agente = nuevoAgente();
    const registro = await agente.post('/registro').type('form').send({
      nombre: 'Pedro', email: 'pedro@example.com', password: 'pedro12345', password2: 'pedro12345'
    });
    const cookieAntes = registro.headers['set-cookie'][0].split(';')[0];
    const login = await agente.post('/login').type('form').send({ email: 'pedro@example.com', password: 'pedro12345' });
    const cookieDespues = login.headers['set-cookie'][0].split(';')[0];

    expect(cookieDespues).not.toBe(cookieAntes);
    expect(login.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(login.headers['set-cookie'][0]).toContain('SameSite=Lax');
  });

  it('limita los intentos de inicio de sesión fallidos', async () => {
    const agente = nuevoAgente();
    for (let i = 0; i < 10; i++) {
      await agente.post('/login').type('form').send({ email: 'nadie@example.com', password: 'mala' }).expect(401);
    }
    const bloqueado = await agente.post('/login').type('form').send({ email: 'ana@example.com', password: 'ana12345' });
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.text).toContain('Demasiados intentos');
  });
});

describe('Rutas privadas y roles', () => {
  it('3. redirige al login a un visitante anónimo', async () => {
    const app = crearApp();
    for (const ruta of ['/perfil', '/mis-reservas', '/reservas/nueva', '/admin/equipos']) {
      const respuesta = await request(app).get(ruta);
      expect(respuesta.status).toBe(303);
      expect(respuesta.headers.location).toBe('/login');
    }
  });

  it('4. permite acceder al perfil con una sesión iniciada', async () => {
    const agente = nuevoAgente();
    await iniciarSesion(agente, 'ana@example.com', 'ana12345');
    const perfil = await agente.get('/perfil');
    expect(perfil.status).toBe(200);
    expect(perfil.text).toContain('Ana García');
    expect(perfil.text).not.toContain('$2b$');
  });

  it('5. rechaza con 403 una operación de administrador hecha por un usuario normal', async () => {
    const agente = nuevoAgente();
    const csrf = await iniciarSesion(agente, 'ana@example.com', 'ana12345');

    await agente.get('/admin/equipos').expect(403);
    await agente.get('/admin/reservas').expect(403);
    await agente.post('/admin/equipos').type('form').send({ _csrf: csrf, codigo: 'PC-999', nombre: 'Intento', tipo: 'sobremesa' }).expect(403);
    await agente.post('/admin/equipos/1/estado').type('form').send({ _csrf: csrf, estado: 'fuera_de_servicio' }).expect(403);
    await agente.post('/admin/reservas/2/cancelar').type('form').send({ _csrf: csrf }).expect(403);

    const ficha = await agente.get('/equipos/1');
    expect(ficha.text).toContain('Operativo');
  });

  it('permite al administrador gestionar equipos y reservas', async () => {
    const agente = nuevoAgente();
    const csrf = await iniciarSesion(agente, 'admin@example.com', 'admin1234');

    await agente.get('/admin/equipos').expect(200);
    await agente.post('/admin/equipos').type('form').send({ _csrf: csrf, codigo: 'pc-010', nombre: 'Ordenador biblioteca', tipo: 'sobremesa' }).expect(303);
    const lista = await agente.get('/admin/equipos');
    expect(lista.text).toContain('PC-010');

    const duplicado = await agente.post('/admin/equipos').type('form').send({ _csrf: csrf, codigo: 'PC-010', nombre: 'Repetido', tipo: 'sobremesa' });
    expect(duplicado.status).toBe(409);

    await agente.post('/admin/equipos/3/estado').type('form').send({ _csrf: csrf, estado: 'operativo' }).expect(303);
    await agente.post('/admin/equipos/3/estado').type('form').send({ _csrf: csrf, estado: 'roto' }).expect(400);
    await agente.post('/admin/equipos/99/estado').type('form').send({ _csrf: csrf, estado: 'operativo' }).expect(404);

    await agente.post('/admin/reservas/2/cancelar').type('form').send({ _csrf: csrf }).expect(303);
    const reservas = await agente.get('/admin/reservas');
    expect(reservas.text).toContain('Reserva 2 cancelada correctamente');
    await agente.post('/admin/reservas/2/cancelar').type('form').send({ _csrf: csrf }).expect(409);
  });
});

describe('Reservas', () => {
  it('6. crea una reserva válida y aplica el patrón PRG', async () => {
    const agente = nuevoAgente();
    const csrf = await iniciarSesion(agente, 'ana@example.com', 'ana12345');

    const formulario = await agente.get('/reservas/nueva?fecha=2027-03-10&turno=tarde');
    expect(formulario.status).toBe(200);
    expect(formulario.text).toContain('PC-001');
    expect(formulario.text).not.toContain('PC-002');

    const respuesta = await agente.post('/reservas').type('form').send({
      _csrf: csrf, equipoId: '1', fecha: '2027-03-10', turno: 'tarde', usuarioId: '3'
    });
    expect(respuesta.status).toBe(303);
    expect(respuesta.headers.location).toBe('/mis-reservas');

    const misReservas = await agente.get('/mis-reservas');
    expect(misReservas.text).toContain('Reserva creada correctamente.');
    expect(misReservas.text).toContain('10/03/2027');

    const otraVez = await agente.get('/mis-reservas');
    expect(otraVez.text).not.toContain('Reserva creada correctamente.');

    const despues = await agente.get('/reservas/nueva?fecha=2027-03-10&turno=tarde');
    expect(despues.text).not.toContain('PC-001 - Ordenador aula 1');
  });

  it('7. rechaza con 409 una reserva duplicada para el mismo equipo, fecha y turno', async () => {
    const agente = nuevoAgente();
    const csrf = await iniciarSesion(agente, 'luis@example.com', 'luis12345');

    const respuesta = await agente.post('/reservas').type('form').send({
      _csrf: csrf, equipoId: '1', fecha: '2027-01-15', turno: 'manana'
    });
    expect(respuesta.status).toBe(409);
    expect(respuesta.text).toContain('El equipo ya está reservado para esa fecha y turno.');
    expect(respuesta.text).toContain('value="2027-01-15"');
  });

  it('valida los datos de la reserva en el servidor', async () => {
    const agente = nuevoAgente();
    const csrf = await iniciarSesion(agente, 'ana@example.com', 'ana12345');

    const pasada = await agente.post('/reservas').type('form').send({ _csrf: csrf, equipoId: '1', fecha: '2020-01-01', turno: 'manana' });
    expect(pasada.status).toBe(400);
    expect(pasada.text).toContain('La fecha no puede ser anterior al día de hoy.');

    const turnoMalo = await agente.post('/reservas').type('form').send({ _csrf: csrf, equipoId: '1', fecha: '2027-05-05', turno: 'noche' });
    expect(turnoMalo.status).toBe(400);

    const idMalo = await agente.post('/reservas').type('form').send({ _csrf: csrf, equipoId: 'abc', fecha: '2027-05-05', turno: 'manana' });
    expect(idMalo.status).toBe(400);

    const noExiste = await agente.post('/reservas').type('form').send({ _csrf: csrf, equipoId: '99', fecha: '2027-05-05', turno: 'manana' });
    expect(noExiste.status).toBe(404);

    const averiado = await agente.post('/reservas').type('form').send({ _csrf: csrf, equipoId: '3', fecha: '2027-05-05', turno: 'manana' });
    expect(averiado.status).toBe(409);
    expect(averiado.text).toContain('El equipo está fuera de servicio.');
  });

  it('una reserva cancelada no impide reservar el mismo equipo, fecha y turno', async () => {
    const agente = nuevoAgente();
    const csrf = await iniciarSesion(agente, 'luis@example.com', 'luis12345');
    await agente.post('/reservas').type('form').send({ _csrf: csrf, equipoId: '2', fecha: '2027-01-20', turno: 'manana' }).expect(303);
  });

  it('permite cancelar una reserva propia sin borrarla', async () => {
    const agente = nuevoAgente();
    const csrf = await iniciarSesion(agente, 'ana@example.com', 'ana12345');
    await agente.post('/reservas/1/cancelar').type('form').send({ _csrf: csrf }).expect(303);
    const lista = await agente.get('/mis-reservas');
    expect(lista.text).toContain('Reserva cancelada correctamente.');
    expect(lista.text).toContain('15/01/2027');
    await agente.post('/reservas/1/cancelar').type('form').send({ _csrf: csrf }).expect(409);
  });

  it('8. impide cancelar la reserva de otro usuario aunque se cambie el id', async () => {
    const agente = nuevoAgente();
    const csrf = await iniciarSesion(agente, 'ana@example.com', 'ana12345');

    const respuesta = await agente.post('/reservas/2/cancelar').type('form').send({ _csrf: csrf });
    expect(respuesta.status).toBe(403);

    await agente.post('/reservas/999/cancelar').type('form').send({ _csrf: csrf }).expect(404);

    const luis = nuevoAgente();
    await iniciarSesion(luis, 'luis@example.com', 'luis12345');
    const reservasLuis = await luis.get('/mis-reservas');
    expect(reservasLuis.text).toContain('Activa');
  });
});

describe('CSRF, logout y cookies', () => {
  it('9. rechaza un cambio de estado sin token CSRF válido', async () => {
    const agente = nuevoAgente();
    await iniciarSesion(agente, 'admin@example.com', 'admin1234');

    await agente.post('/admin/equipos/1/estado').type('form').send({ estado: 'fuera_de_servicio' }).expect(403);
    await agente.post('/admin/equipos/1/estado').type('form').send({ _csrf: 'token-falso', estado: 'fuera_de_servicio' }).expect(403);

    const ficha = await agente.get('/equipos/1');
    expect(ficha.text).toContain('Operativo');
    expect(ficha.text).not.toContain('Fuera de servicio</span>');
  });

  it('10. invalida la sesión después del logout', async () => {
    const agente = nuevoAgente();
    const app = crearApp();
    const login = await request(app).post('/login').type('form').send({ email: 'ana@example.com', password: 'ana12345' });
    const cookie = login.headers['set-cookie'][0].split(';')[0];

    const perfil = await request(app).get('/perfil').set('Cookie', cookie);
    expect(perfil.status).toBe(200);
    const csrf = sacarCsrf(perfil.text);

    const logout = await request(app).post('/logout').set('Cookie', cookie).type('form').send({ _csrf: csrf });
    expect(logout.status).toBe(303);
    expect(logout.headers['set-cookie'][0]).toContain('reservas.sid=;');

    const despues = await request(app).get('/perfil').set('Cookie', cookie);
    expect(despues.status).toBe(303);
    expect(despues.headers.location).toBe('/login');

    await agente.get('/perfil').expect(303);
  });

  it('el logout sin token CSRF no cierra la sesión', async () => {
    const agente = nuevoAgente();
    await iniciarSesion(agente, 'ana@example.com', 'ana12345');
    await agente.post('/logout').type('form').send({}).expect(403);
    await agente.get('/perfil').expect(200);
  });

  it('guarda el tipo preferido en una cookie y lo usa como filtro inicial', async () => {
    const agente = nuevoAgente();
    const respuesta = await agente.post('/preferencias').type('form').send({ tipo: 'portatil' });
    expect(respuesta.status).toBe(303);
    expect(respuesta.headers['set-cookie'][0]).toContain('tipoPreferido=portatil');
    expect(respuesta.headers['set-cookie'][0]).toContain('HttpOnly');

    const catalogo = await agente.get('/equipos');
    expect(catalogo.text).toContain('PORT-001');
    expect(catalogo.text).not.toContain('PC-001');

    await agente.post('/preferencias').type('form').send({ tipo: 'tablet' }).expect(400);
  });

  it('una cookie de preferencia manipulada no da permisos ni rompe el catálogo', async () => {
    const app = crearApp();
    const catalogo = await request(app).get('/equipos').set('Cookie', 'tipoPreferido=<script>; rol=admin');
    expect(catalogo.status).toBe(200);
    expect(catalogo.text).toContain('PC-001');
    const admin = await request(app).get('/admin/equipos').set('Cookie', 'rol=admin');
    expect(admin.status).toBe(303);
  });
});

describe('Catálogo y errores', () => {
  it('filtra los equipos por tipo y estado', async () => {
    const app = crearApp();
    const portatiles = await request(app).get('/equipos?tipo=portatil&operativos=true');
    expect(portatiles.status).toBe(200);
    expect(portatiles.text).toContain('PORT-001');
    expect(portatiles.text).not.toContain('PC-001');

    const operativos = await request(app).get('/equipos?operativos=true');
    expect(operativos.text).not.toContain('PC-002');

    await request(app).get('/equipos?tipo=tablet').expect(400);
  });

  it('muestra la ficha de un equipo y devuelve 404 o 400 cuando corresponde', async () => {
    const app = crearApp();
    const ficha = await request(app).get('/equipos/1');
    expect(ficha.status).toBe(200);
    expect(ficha.text).toContain('Ordenador aula 1');
    await request(app).get('/equipos/99').expect(404);
    await request(app).get('/equipos/abc').expect(400);
    await request(app).get('/no-existe').expect(404);
  });

  it('escapa el contenido introducido por los usuarios', async () => {
    const agente = nuevoAgente();
    const csrf = await iniciarSesion(agente, 'admin@example.com', 'admin1234');
    await agente.post('/admin/equipos').type('form').send({ _csrf: csrf, codigo: 'PC-XSS', nombre: '<b>Equipo</b>', tipo: 'sobremesa' }).expect(303);
    const catalogo = await agente.get('/equipos');
    expect(catalogo.text).toContain('&lt;b&gt;Equipo&lt;/b&gt;');
    expect(catalogo.text).not.toContain('<b>Equipo</b>');
  });
});
