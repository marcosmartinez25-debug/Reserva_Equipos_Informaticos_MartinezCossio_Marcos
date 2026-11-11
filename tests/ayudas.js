import request from 'supertest';
import { crearApp } from '../src/app.js';

export function nuevoAgente() {
  return request.agent(crearApp());
}

export function sacarCsrf(html) {
  const resultado = html.match(/name="_csrf" value="([a-f0-9]+)"/);
  return resultado ? resultado[1] : '';
}

export async function iniciarSesion(agente, email, password) {
  await agente.post('/login').type('form').send({ email, password }).expect(303);
  const respuesta = await agente.get('/perfil').expect(200);
  return sacarCsrf(respuesta.text);
}
