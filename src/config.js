export function cargarConfig(variables) {
  const entorno = variables.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(entorno)) {
    throw new Error('NODE_ENV debe ser development, test o production');
  }

  const puertoTexto = variables.PORT ?? '3000';
  const puerto = Number(puertoTexto);
  if (!/^\d+$/.test(puertoTexto) || puerto < 1 || puerto > 65535) {
    throw new Error('PORT debe ser un número entre 1 y 65535');
  }

  const secreto = variables.SESSION_SECRET;
  if (!secreto || secreto.length < 32) {
    throw new Error('SESSION_SECRET no está configurado o tiene menos de 32 caracteres');
  }

  return Object.freeze({
    entorno,
    puerto,
    produccion: entorno === 'production',
    sessionSecret: secreto
  });
}

export const config = cargarConfig(process.env);
