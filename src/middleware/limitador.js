import { rateLimit } from 'express-rate-limit';

export function crearLimitadorLogin() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (req, res) => {
      res.status(429).render('auth/login', {
        titulo: 'Iniciar sesión',
        valores: { email: '' },
        error: 'Demasiados intentos de inicio de sesión. Prueba de nuevo dentro de 15 minutos.'
      });
    }
  });
}
