# Sistema de reserva de equipos informáticos

Práctica de las unidades didácticas 2 y 3 de **Desarrollo Web en Entorno Servidor (DWES)**.

**Alumno:** Marcos Martínez Cossío · 2.º DAW

## Índice

1. [Descripción](#descripción)
2. [Tecnologías utilizadas](#tecnologías-utilizadas)
3. [Requisitos](#requisitos)
4. [Instalación](#instalación)
5. [Configuración del archivo .env](#configuración-del-archivo-env)
6. [Iniciar el servidor](#iniciar-el-servidor)
7. [Usuarios de prueba](#usuarios-de-prueba)
8. [Funcionalidades y cómo se han implementado](#funcionalidades-y-cómo-se-han-implementado)
9. [Rutas de la aplicación](#rutas-de-la-aplicación)
10. [Estructura de carpetas](#estructura-de-carpetas)
11. [Parte en TypeScript](#parte-en-typescript)
12. [Pruebas automatizadas](#pruebas-automatizadas)
13. [Ejemplos con curl](#ejemplos-con-curl)
14. [Evidencias](#evidencias)

## Descripción

Aplicación web para gestionar la reserva de los equipos informáticos (ordenadores de sobremesa y portátiles) de un centro educativo.

- Los **visitantes** pueden consultar el catálogo de equipos, filtrarlo y ver la ficha de cada equipo.
- Los **usuarios registrados** pueden reservar un equipo para una fecha y un turno (mañana o tarde), consultar sus reservas y cancelarlas.
- Los **administradores** pueden añadir equipos, cambiar su estado (operativo / fuera de servicio) y consultar o cancelar cualquier reserva.

La aplicación controla los permisos, mantiene la sesión de los usuarios y no permite dos reservas activas del mismo equipo en la misma fecha y turno.

Los datos se guardan **en memoria** (no se usa base de datos), por lo que al reiniciar el servidor se vuelve a los datos de prueba iniciales.

## Tecnologías utilizadas

| Tecnología | Uso |
|---|---|
| Node.js 24 | Entorno de ejecución |
| Express 5 | Servidor web y rutas |
| EJS | Vistas generadas en el servidor |
| express-session | Sesiones del servidor |
| cookie-parser | Lectura de la cookie de preferencias |
| bcrypt | Hash de las contraseñas |
| express-rate-limit | Límite de intentos de inicio de sesión |
| TypeScript | Versión tipada del núcleo de reservas |
| Vitest + Supertest | Pruebas automatizadas |
| HTML + CSS | Interfaz (sin frameworks de estilos) |

## Requisitos

- **Node.js 24** o superior (hace falta la opción `--env-file`, que existe desde Node 20.6).
- **npm** (viene con Node.js).
- **Git Bash** o cualquier terminal con `curl` para probar los ejemplos de la API.

## Instalación

```bash
git clone https://github.com/<tu-usuario>/Reserva_Equipos_Informaticos_MartinezCossio_Marcos.git
cd Reserva_Equipos_Informaticos_MartinezCossio_Marcos
npm install
```

## Configuración del archivo .env

La configuración se lee de variables de entorno. En el repositorio solo está `.env.example` (sin secretos). El archivo `.env` está en `.gitignore` y no se sube.

1. Copia el ejemplo:

   ```bash
   cp .env.example .env
   ```

2. Genera un secreto aleatorio para la sesión:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

3. Pega el valor en `SESSION_SECRET`. El archivo quedará así:

   ```env
   PORT=3000
   NODE_ENV=development
   SESSION_SECRET=pega_aqui_el_valor_generado
   ```

| Variable | Valores permitidos | Para qué sirve |
|---|---|---|
| `PORT` | Número entre 1 y 65535 | Puerto del servidor |
| `NODE_ENV` | `development`, `test` o `production` | En `production` la cookie de sesión se marca como `secure` (solo HTTPS) |
| `SESSION_SECRET` | Texto de 32 caracteres o más | Firma la cookie de sesión |

El archivo `src/config.js` comprueba estos valores **al arrancar**. Si alguno no es correcto, el servidor no arranca y muestra qué variable falla, sin mostrar el secreto. Por ejemplo, con `PORT=abc`:

```
Error: PORT debe ser un número entre 1 y 65535
```

## Iniciar el servidor

```bash
npm start
```

Después abre <http://localhost:3000> en el navegador.

Para desarrollo, `npm run dev` reinicia el servidor automáticamente al guardar cambios.

| Script | Qué hace |
|---|---|
| `npm start` | Arranca el servidor cargando `.env` |
| `npm run dev` | Igual que `start`, pero reiniciando al guardar |
| `npm test` | Ejecuta todas las pruebas automatizadas |
| `npm run check:ts` | Comprueba los tipos de TypeScript sin generar archivos |
| `npm run build:ts` | Compila TypeScript a la carpeta `dist/` |
| `npm run demo:ts` | Ejecuta la demostración compilada de TypeScript |

## Usuarios de prueba

Al arrancar el servidor se cargan estos usuarios (las contraseñas se guardan como hash de bcrypt en `src/datos/datosIniciales.js`):

| Nombre | Correo | Contraseña | Rol |
|---|---|---|---|
| Administrador | `admin@example.com` | `admin1234` | admin |
| Ana García | `ana@example.com` | `ana12345` | usuario |
| Luis Pérez | `luis@example.com` | `luis12345` | usuario |

Datos iniciales de equipos y reservas:

| ID | Código | Nombre | Tipo | Estado |
|---|---|---|---|---|
| 1 | PC-001 | Ordenador aula 1 | sobremesa | operativo |
| 2 | PORT-001 | Portátil Lenovo | portátil | operativo |
| 3 | PC-002 | Ordenador aula 2 | sobremesa | fuera de servicio |
| 4 | PORT-002 | Portátil HP | portátil | operativo |

| ID | Equipo | Usuario | Fecha | Turno | Estado |
|---|---|---|---|---|---|
| 1 | PC-001 | Ana | 15/01/2027 | mañana | activa |
| 2 | PORT-001 | Luis | 15/01/2027 | tarde | activa |
| 3 | PORT-001 | Ana | 20/01/2027 | mañana | cancelada |

## Funcionalidades y cómo se han implementado

### Consulta de equipos y filtros

- `GET /equipos` muestra una tabla con todos los equipos. Se puede filtrar con `?tipo=portatil`, `?tipo=sobremesa`, `?tipo=todos` y `?operativos=true`, y se pueden combinar.
- El controlador comprueba que los valores del filtro son válidos (si no, responde **400**) y el servicio `equiposServicio.listar()` aplica el filtro con `filter()`.
- `GET /equipos/:id` muestra la ficha del equipo (EJS) con su estado y los turnos que ya tiene reservados. Si el id no es un número responde **400**, y si no existe, **404**.

### Cookie de preferencias

- En el catálogo hay un formulario *Tipo preferido* que hace `POST /preferencias` y guarda la cookie `tipoPreferido` (`portatil` o `sobremesa`) durante 30 días, con `httpOnly`, `sameSite=lax` y `secure` en producción.
- Cuando se entra en `/equipos` sin indicar el tipo, se usa esa cookie como filtro inicial.
- El valor de la cookie se comprueba siempre contra la lista de tipos válidos. **No se usa nunca para decidir permisos**: el rol sale siempre del usuario guardado en el servidor.

### Registro, inicio y cierre de sesión

- **Registro** (`GET/POST /registro`): se normalizan los datos (correo en minúsculas y sin espacios) y se validan (nombre de 2 a 60 caracteres, correo válido, contraseña de 8 a 100 caracteres que coincida con la repetida). Se comprueba que el correo no exista. La contraseña se guarda con `bcrypt.hash`. El rol se asigna siempre como `usuario`, aunque se envíe otro rol en el formulario.
- **Inicio de sesión** (`GET/POST /login`): se compara la contraseña con `bcrypt.compare`. Si el correo no existe o la contraseña no coincide, el mensaje es el mismo ("Correo o contraseña incorrectos.") y la respuesta es **401**, así no se puede saber si un correo está registrado. Si es correcto, se llama a `req.session.regenerate()` para cambiar el identificador de la sesión y solo se guarda `usuarioId`.
- **Cierre de sesión** (`POST /logout`, con token CSRF): `req.session.destroy()` borra la sesión del servidor y `res.clearCookie('reservas.sid')` borra la cookie del navegador.
- **Perfil** (`GET /perfil`): solo para usuarios autenticados. Muestra nombre, correo, rol, tipo preferido y número de reservas activas. La vista no recibe nunca el hash de la contraseña.

### Sesiones

Se usa `express-session` con esta configuración (en `src/app.js`):

```js
session({
  name: 'reservas.sid',
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: config.produccion, sameSite: 'lax', maxAge: 30 * 60 * 1000 }
})
```

En la sesión solo se guardan el `usuarioId`, el token CSRF y los mensajes de confirmación de un solo uso (*flash*) que se muestran después de una redirección. El almacén es el de memoria por defecto (`MemoryStore`), que vale para la práctica pero no para producción.

### Creación de reservas

- `GET /reservas/nueva` tiene dos pasos: primero se elige **fecha y turno** (formulario GET) y la página muestra **solo los equipos disponibles** para esa fecha y turno, usando `obtenerEquiposDisponibles()`. Después se elige el equipo y se envía con `POST /reservas`.
- El usuario de la reserva se toma de la sesión (`req.usuario.id`), **nunca** de un campo del formulario (si se envía `usuarioId` se ignora).
- Aunque el formulario solo ofrezca opciones válidas, el servicio `reservasServicio.crearReserva()` vuelve a comprobar todo: formato de los datos (`validarReserva()`), que la fecha no sea anterior a hoy, que el turno sea `manana` o `tarde`, que el equipo exista (**404**), que esté operativo (**409**) y que no haya otra reserva activa igual (`estaReservado()`, **409**).
- Si todo va bien se aplica el patrón **Post/Redirect/Get**: se guarda el aviso en la sesión y se redirige con **303** a `/mis-reservas`, donde aparece el mensaje "Reserva creada correctamente." una sola vez.
- Si hay un error se vuelve a mostrar el formulario con los mensajes y **conservando los campos que eran correctos**.

### Consulta y cancelación de reservas

- `GET /mis-reservas` lista las reservas del usuario (activas y canceladas).
- `POST /reservas/:id/cancelar` cambia el estado a `cancelada` (no se borra el registro). El servicio comprueba que la reserva exista (**404**), que **sea del usuario** (**403**, aunque se cambie el id de la URL), que esté activa (**409**) y que su fecha no haya pasado (**409**).
- Como `estaReservado()` solo tiene en cuenta reservas `activa`, una reserva cancelada deja libre el equipo para otra persona.

### Administración

Rutas protegidas con `exigirRol('admin')`. Un usuario normal recibe **403** aunque escriba la URL o envíe la petición directamente.

- `GET /admin/equipos`: listado de equipos con un formulario para añadir equipos y otro en cada fila para cambiar su estado.
- `POST /admin/equipos`: valida código (3-15 caracteres, letras, números y guiones), nombre y tipo. Si el código ya existe responde **409**.
- `POST /admin/equipos/:id/estado`: cambia entre `operativo` y `fuera_de_servicio` (**400** si el estado no es válido, **404** si el equipo no existe).
- `GET /admin/reservas`: todas las reservas con el nombre del usuario y el código del equipo.
- `POST /admin/reservas/:id/cancelar`: cancela cualquier reserva activa.

### Seguridad

| Requisito | Implementación |
|---|---|
| Middleware de autenticación | `exigirAutenticacion` en `src/middleware/autenticacion.js`. Si no hay sesión redirige a `/login` con **303** |
| Middleware de roles | `exigirRol(...roles)` devuelve un middleware que responde **403** si el rol no está permitido |
| Propiedad de las reservas | Se comprueba en `reservasServicio.cancelarReserva()` comparando `reserva.usuarioId` con el usuario de la sesión |
| CSRF | `prepararCsrf` crea un token aleatorio (`crypto.randomBytes`) en la sesión y `comprobarCsrf` lo compara con `timingSafeEqual`. Se aplica a todos los formularios autenticados que cambian datos, incluido el logout |
| Límite de intentos | `express-rate-limit` en `POST /login`: 10 intentos fallidos cada 15 minutos por IP. Después responde **429** |
| Validación | Funciones de `src/utilidades/validaciones.js` y `src/utilidades/reservas.js`. Se comprueban tipo, formato y longitud de todos los campos |
| Errores centralizados | `src/middleware/errores.js`: traduce los `ErrorDominio` a su código HTTP y el resto a un **500** genérico, sin trazas ni datos internos |
| Escape de HTML | Todos los datos se muestran con `<%= %>` de EJS, que escapa el contenido |

Códigos HTTP utilizados:

| Situación | Código |
|---|---|
| Página mostrada / operación correcta con redirección | 200 / 303 |
| Datos incorrectos | 400 |
| Credenciales incorrectas | 401 |
| Usuario sin permisos, token CSRF incorrecto o reserva ajena | 403 |
| Recurso inexistente | 404 |
| Equipo ya reservado, fuera de servicio o reserva ya cancelada | 409 |
| Demasiados intentos de login | 429 |
| Visitante anónimo en una página privada | 303 a `/login` |

### Arquitectura por capas

```
Petición → Ruta → Middleware → Controlador → Servicio → Repositorio
                                    ↓
                               Vista EJS ← modelo de vista
```

- **Rutas** (`src/rutas`): método, URL y middleware de cada operación.
- **Controladores** (`src/controladores`): leen `req`, convierten los datos, llaman al servicio y deciden la respuesta (render o redirección).
- **Servicios** (`src/servicios`): reglas de negocio (disponibilidad, conflictos, cancelaciones, permisos sobre reservas). **No usan `req`, `res` ni EJS**.
- **Repositorios** (`src/repositorios`): acceso a las colecciones en memoria con `Map`. Devuelven copias de los objetos.
- **Vistas** (`views`): plantillas EJS con 4 parciales (`cabecera`, `pie`, `avisos`, `errores`).
- **Errores de dominio** (`src/errores/ErrorDominio.js`): representan situaciones previstas con un código (`YA_RESERVADO`, `NO_ENCONTRADO`, `SIN_PERMISO`...).
- `src/app.js` monta la aplicación (función `crearApp()`) y `src/server.js` solo la pone a escuchar. Así las pruebas pueden crear la aplicación sin abrir un puerto.

### Funciones pedidas en el enunciado

Están en `src/utilidades/reservas.js` (fuera de los controladores y sin depender de `req` ni `res`):

- `obtenerEquiposDisponibles(equipos, reservas, fecha, turno)`: usa `filter()`.
- `estaReservado(equipoId, fecha, turno, reservas)`: usa `some()`.
- `validarReserva(datos)`: devuelve un objeto con los errores de cada campo.

En el resto del proyecto también se usan `find()` (buscar usuarios y equipos), `map()` (copias, modelos de vista, unir reservas con equipos y usuarios), bucles `for...of` en las vistas, conversiones (`Number`, `String`) y funciones asíncronas (`async/await`).

### Interfaz

- **Parciales**: `cabecera.ejs` (menú según el rol), `pie.ejs`, `avisos.ejs` (mensajes de confirmación de un solo uso) y `errores.ejs` (lista de errores de validación).
- **Modelo de vista**: `src/presentacion/formularioReservaVM.js` prepara los datos del formulario de reservas (opciones de equipos y turnos, valores seleccionados, errores y token).
- **Helpers de presentación**: `src/presentacion/helpers.js` (formato de fecha `dd/mm/aaaa` y nombres de turnos, tipos y estados).
- **Diseño**: CSS propio en `public/css/estilos.css`, con tablas, tarjetas y diseño adaptable a móvil.

## Rutas de la aplicación

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/equipos` | Público | Catálogo con filtros `tipo` y `operativos` |
| GET | `/equipos/:id` | Público | Ficha del equipo |
| POST | `/preferencias` | Público | Guarda la cookie del tipo preferido |
| GET/POST | `/registro` | Público | Registro de usuarios |
| GET/POST | `/login` | Público | Inicio de sesión (con límite de intentos) |
| POST | `/logout` | Autenticado + CSRF | Cierre de sesión |
| GET | `/perfil` | Autenticado | Perfil del usuario |
| GET | `/reservas/nueva` | Autenticado | Formulario de reserva (`?fecha=&turno=`) |
| POST | `/reservas` | Autenticado + CSRF | Crear reserva |
| GET | `/mis-reservas` | Autenticado | Reservas del usuario |
| POST | `/reservas/:id/cancelar` | Autenticado + CSRF | Cancelar una reserva propia |
| GET | `/admin/equipos` | Admin | Gestión de equipos |
| POST | `/admin/equipos` | Admin + CSRF | Añadir equipo |
| POST | `/admin/equipos/:id/estado` | Admin + CSRF | Cambiar estado del equipo |
| GET | `/admin/reservas` | Admin | Todas las reservas |
| POST | `/admin/reservas/:id/cancelar` | Admin + CSRF | Cancelar cualquier reserva |

## Estructura de carpetas

```
Reserva_Equipos_Informaticos_MartinezCossio_Marcos/
├── evidencias/                    Capturas y salidas reales de la aplicación
├── public/
│   └── css/estilos.css
├── src/
│   ├── app.js                     Crea y configura la aplicación Express
│   ├── server.js                  Arranca el servidor
│   ├── config.js                  Lee y valida las variables de entorno
│   ├── controladores/             authControlador, equiposControlador, reservasControlador, adminControlador
│   ├── datos/datosIniciales.js    Equipos, reservas y usuarios de prueba
│   ├── errores/ErrorDominio.js
│   ├── middleware/                autenticacion, csrf, avisos, limitador, errores
│   ├── presentacion/              helpers y modelo de vista del formulario de reservas
│   ├── repositorios/              equipos, reservas y usuarios (Map en memoria)
│   ├── rutas/                     equiposRutas, authRutas, reservasRutas, adminRutas
│   ├── servicios/                 equiposServicio, reservasServicio, usuariosServicio
│   └── utilidades/                reservas.js (funciones del enunciado) y validaciones.js
├── src-ts/                        Núcleo de reservas en TypeScript
│   ├── modelos.ts
│   ├── RepositorioReservas.ts
│   ├── RepositorioReservasMemoria.ts
│   ├── ErrorDominio.ts
│   ├── ServicioReservas.ts
│   └── demo.ts
├── tests/
│   ├── app.test.js                Pruebas de las rutas con Supertest
│   ├── funciones.test.js          Pruebas de las funciones y de la configuración
│   ├── servicioReservas.test.ts   Pruebas del servicio en TypeScript
│   └── ayudas.js
├── views/
│   ├── parciales/                 cabecera, pie, avisos, errores
│   ├── equipos/                   lista, ficha
│   ├── auth/                      registro, login, perfil
│   ├── reservas/                  nueva, mis-reservas
│   ├── admin/                     equipos, reservas
│   └── error.ejs
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── vitest.config.js
```

## Parte en TypeScript

La versión tipada del núcleo de reservas está en `src-ts/` como módulo independiente (no hace falta para que funcione la web):

- `modelos.ts`: interfaces `Equipo`, `Reserva` y `Usuario`, y tipos unión `Rol` (`'usuario' | 'admin'`), `Turno` (`'manana' | 'tarde'`), `EstadoReserva`, `EstadoEquipo` y `TipoEquipo`.
- `RepositorioReservas.ts`: interfaz del repositorio con todos los métodos tipados (`Promise<Reserva[]>`, `Promise<Reserva | undefined>`...).
- `RepositorioReservasMemoria.ts`: clase que implementa la interfaz usando un `Map<number, Reserva>`.
- `ServicioReservas.ts`: clase que recibe el repositorio **en el constructor** (inyección de dependencias) e implementa crear, consultar y cancelar reservas. Incluye las funciones `estaReservado` y `obtenerEquiposDisponibles` tipadas.
- `ErrorDominio.ts`: error con un código de tipo unión.
- `demo.ts`: ejemplo que ejecuta varios casos (reserva correcta, duplicada, equipo fuera de servicio, turno inválido, cancelación ajena...).

Se compila con `strict: true` y no se usa `any`. Los valores que llegan sin tipo conocido (como el turno) se reciben como `unknown` y se comprueban con una función de guarda (`esTurno`).

```bash
npm run check:ts     # comprueba los tipos sin generar archivos
npm run build:ts     # compila a dist/
npm run demo:ts      # ejecuta dist/demo.js
```

Salida real de la demostración:

```
Disponibles el 15/01/2027 por la mañana: PORT-001
OK    Ana reserva PORT-001 el 15/01/2027 por la mañana
ERROR Luis intenta reservar PORT-001 en el mismo turno -> YA_RESERVADO: El equipo ya está reservado para esa fecha y turno.
ERROR Luis intenta reservar PC-002 (fuera de servicio) -> NO_OPERATIVO: El equipo está fuera de servicio.
ERROR Luis intenta usar un turno inválido -> DATOS_INVALIDOS: El turno debe ser mañana o tarde.
ERROR Luis intenta cancelar la reserva 1 de Ana -> SIN_PERMISO: No puedes cancelar una reserva de otro usuario.
OK    Ana cancela su reserva 1
OK    Luis reserva PC-001 tras la cancelación
Reservas de Ana: 1:cancelada, 2:activa
```

## Pruebas automatizadas

```bash
npm test
```

Las pruebas usan **Vitest** y **Supertest**. Cada prueba crea su propia aplicación con `crearApp()` y datos de prueba nuevos, así que no dependen de un servidor arrancado ni de cuentas reales. `request.agent()` mantiene las cookies entre peticiones para simular a un usuario con la sesión iniciada. Las variables de entorno de las pruebas están en `vitest.config.js`.

Hay **32 pruebas** en 3 archivos. Las 10 que pide el enunciado están numeradas en `tests/app.test.js`:

| N.º | Prueba |
|---|---|
| 1 | Registro de un usuario válido (y se comprueba que el rol enviado se ignora) |
| 2 | Rechazo de credenciales incorrectas (mismo mensaje y 401 exista o no el correo) |
| 3 | Acceso a rutas privadas sin autenticación (303 a `/login`) |
| 4 | Acceso correcto al perfil con sesión |
| 5 | Un usuario normal recibe 403 en las operaciones de administrador |
| 6 | Reserva válida con PRG y mensaje de confirmación de un solo uso |
| 7 | Rechazo (409) de una reserva duplicada |
| 8 | Rechazo (403) de la cancelación de una reserva ajena |
| 9 | Rechazo (403) de un cambio de estado sin token CSRF válido |
| 10 | Invalidación de la sesión después del logout (la cookie antigua deja de servir) |

Además se prueban: regeneración del id de sesión, límite de intentos (429), registro duplicado, validaciones de reserva (fecha pasada, turno, id, equipo inexistente o fuera de servicio), que una reserva cancelada no bloquea, cancelación propia, gestión completa del administrador, cookie de preferencias, cookie manipulada, filtros, 404/400, escape de HTML, las funciones `estaReservado`, `obtenerEquiposDisponibles` y `validarReserva`, la validación de la configuración y el servicio de TypeScript.

Resultado real (`evidencias/resultado-npm-test.txt`):

```
 Test Files  3 passed (3)
      Tests  32 passed (32)
```

## Ejemplos con curl

Los ejemplos están pensados para **Git Bash** (en Windows) o cualquier terminal Linux/macOS, con el servidor arrancado con `npm start`. En PowerShell hay que escribir `curl.exe` en lugar de `curl`.

### Cómo mantener la sesión y obtener el token CSRF

- **Cookies**: `-c cookies.txt` guarda las cookies que envía el servidor y `-b cookies.txt` las vuelve a enviar en la siguiente petición. Se usan las dos a la vez para que la sesión se mantenga (también cuando el login regenera la cookie).
- **Token CSRF**: solo existe cuando hay sesión iniciada. Está en un campo oculto `_csrf` de cualquier página con sesión (por ejemplo `/perfil`, que tiene el formulario de logout en la cabecera). Se saca del HTML con `grep` y se guarda en una variable:

```bash
CSRF=$(curl -s -b cookies.txt http://localhost:3000/perfil | grep -o 'name="_csrf" value="[^"]*"' | head -1 | cut -d'"' -f4)
echo $CSRF
```

- El token se mantiene durante toda la sesión. Después de hacer login hay que obtenerlo otra vez porque la sesión se regenera.
- `-w '%{http_code}'` muestra el código HTTP de la respuesta y `-o /dev/null` oculta el HTML.

### Consulta de equipos (público)

```bash
curl http://localhost:3000/equipos
curl "http://localhost:3000/equipos?tipo=portatil"
curl "http://localhost:3000/equipos?tipo=sobremesa"
curl "http://localhost:3000/equipos?operativos=true"
curl "http://localhost:3000/equipos?tipo=portatil&operativos=true"
curl http://localhost:3000/equipos/1
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/equipos/99      # 404
```

### Cookie de preferencias

```bash
curl -c preferencias.txt -b preferencias.txt -d "tipo=portatil" http://localhost:3000/preferencias
curl -b preferencias.txt http://localhost:3000/equipos       # solo muestra portátiles
curl -c preferencias.txt -b preferencias.txt -d "tipo=ninguno" http://localhost:3000/preferencias
```

### Registro

```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' \
  -d "nombre=Marta Lopez&email=marta@example.com&password=marta12345&password2=marta12345" \
  http://localhost:3000/registro
# 303 http://localhost:3000/login
```

### Inicio de sesión, perfil y token CSRF

```bash
curl -s -o /dev/null -w '%{http_code}\n' -d "email=ana@example.com&password=mala" http://localhost:3000/login
# 401

curl -s -c cookies.txt -b cookies.txt -o /dev/null -w '%{http_code} %{redirect_url}\n' \
  -d "email=ana@example.com&password=ana12345" http://localhost:3000/login
# 303 http://localhost:3000/perfil

curl -b cookies.txt http://localhost:3000/perfil

CSRF=$(curl -s -b cookies.txt http://localhost:3000/perfil | grep -o 'name="_csrf" value="[^"]*"' | head -1 | cut -d'"' -f4)
```

### Crear una reserva

```bash
curl -b cookies.txt "http://localhost:3000/reservas/nueva?fecha=2027-01-15&turno=manana"

curl -s -b cookies.txt -c cookies.txt -o /dev/null -w '%{http_code} %{redirect_url}\n' \
  -d "_csrf=$CSRF&equipoId=2&fecha=2027-01-15&turno=manana" http://localhost:3000/reservas
# 303 http://localhost:3000/mis-reservas

curl -s -b cookies.txt -o /dev/null -w '%{http_code}\n' \
  -d "_csrf=$CSRF&equipoId=2&fecha=2027-01-15&turno=manana" http://localhost:3000/reservas
# 409 (ya reservado)

curl -s -b cookies.txt -o /dev/null -w '%{http_code}\n' \
  -d "_csrf=$CSRF&equipoId=1&fecha=2020-01-01&turno=manana" http://localhost:3000/reservas
# 400 (fecha pasada)

curl -s -b cookies.txt -o /dev/null -w '%{http_code}\n' \
  -d "equipoId=1&fecha=2027-02-01&turno=tarde" http://localhost:3000/reservas
# 403 (sin token CSRF)
```

### Mis reservas y cancelación

```bash
curl -b cookies.txt http://localhost:3000/mis-reservas

curl -s -b cookies.txt -o /dev/null -w '%{http_code}\n' -d "_csrf=$CSRF" http://localhost:3000/reservas/2/cancelar
# 403 (la reserva 2 es de Luis)

curl -s -b cookies.txt -c cookies.txt -o /dev/null -w '%{http_code} %{redirect_url}\n' \
  -d "_csrf=$CSRF" http://localhost:3000/reservas/1/cancelar
# 303 http://localhost:3000/mis-reservas
```

### Cierre de sesión

```bash
curl -s -b cookies.txt -c cookies.txt -o /dev/null -w '%{http_code} %{redirect_url}\n' \
  -d "_csrf=$CSRF" http://localhost:3000/logout
# 303 http://localhost:3000/login

curl -s -b cookies.txt -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/perfil
# 303 http://localhost:3000/login
```

### Administración

```bash
curl -s -c admin.txt -b admin.txt -o /dev/null -w '%{http_code}\n' \
  -d "email=admin@example.com&password=admin1234" http://localhost:3000/login

CSRF_ADMIN=$(curl -s -b admin.txt http://localhost:3000/admin/equipos | grep -o 'name="_csrf" value="[^"]*"' | head -1 | cut -d'"' -f4)

curl -b admin.txt http://localhost:3000/admin/equipos

curl -s -b admin.txt -c admin.txt -o /dev/null -w '%{http_code} %{redirect_url}\n' \
  -d "_csrf=$CSRF_ADMIN&codigo=PC-003&nombre=Ordenador aula 3&tipo=sobremesa" http://localhost:3000/admin/equipos
# 303 http://localhost:3000/admin/equipos

curl -s -b admin.txt -c admin.txt -o /dev/null -w '%{http_code} %{redirect_url}\n' \
  -d "_csrf=$CSRF_ADMIN&estado=fuera_de_servicio" http://localhost:3000/admin/equipos/1/estado
# 303 http://localhost:3000/admin/equipos

curl -s -b admin.txt -o /dev/null -w '%{http_code}\n' -d "estado=operativo" http://localhost:3000/admin/equipos/1/estado
# 403 (sin token CSRF)

curl -b admin.txt http://localhost:3000/admin/reservas

curl -s -b admin.txt -c admin.txt -o /dev/null -w '%{http_code} %{redirect_url}\n' \
  -d "_csrf=$CSRF_ADMIN" http://localhost:3000/admin/reservas/2/cancelar
# 303 http://localhost:3000/admin/reservas
```

Con la sesión de Ana (`cookies.txt`), las mismas rutas de administración devuelven **403**.

### Límite de intentos de inicio de sesión

```bash
for i in $(seq 1 11); do curl -s -o /dev/null -w '%{http_code} ' -d "email=x@example.com&password=mala" http://localhost:3000/login; done
# 401 401 401 401 401 401 401 401 401 401 429
```

La salida real de todos estos ejemplos, ejecutados contra la aplicación, está en [`evidencias/pruebas-curl.txt`](evidencias/pruebas-curl.txt).

## Evidencias

Capturas reales de la aplicación funcionando (`npm start`), hechas con el navegador Microsoft Edge. Todas están en la carpeta [`evidencias/`](evidencias).

| Archivo | Descripción |
|---|---|
| [`resultado-npm-test.txt`](evidencias/resultado-npm-test.txt) | Salida de `npm test`: 32 pruebas superadas |
| [`resultado-typescript.txt`](evidencias/resultado-typescript.txt) | Salida de `check:ts`, `build:ts` y `demo:ts` |
| [`pruebas-curl.txt`](evidencias/pruebas-curl.txt) | Salida de los ejemplos con curl |

### 1. Catálogo de equipos
Listado público con los filtros y el formulario de tipo preferido.

![Catálogo de equipos](evidencias/01-catalogo-equipos.png)

### 2. Catálogo filtrado
Filtro `tipo=portatil` y `operativos=true` aplicado desde el formulario.

![Catálogo filtrado](evidencias/02-catalogo-filtrado-portatiles-operativos.png)

### 3. Ficha de un equipo
Ficha EJS del equipo PC-001 con su estado y los turnos ya reservados.

![Ficha de equipo](evidencias/03-ficha-equipo.png)

### 4. Cookie de preferencias
Después de guardar *Portátil* como tipo preferido, el catálogo se abre filtrado por portátiles.

![Cookie de preferencias](evidencias/04-cookie-tipo-preferido.png)

### 5. Registro con errores de validación
El servidor rechaza el nombre demasiado corto y la contraseña corta, y conserva los campos.

![Errores de registro](evidencias/05-registro-errores-validacion.png)

### 6. Formulario de registro
Formulario relleno con un usuario nuevo.

![Formulario de registro](evidencias/06-registro-formulario.png)

### 7. Registro correcto
Tras registrarse se redirige al login con un mensaje de confirmación de un solo uso.

![Registro correcto](evidencias/07-registro-correcto-login.png)

### 8. Login con credenciales incorrectas
Mensaje genérico que no indica si el correo existe (respuesta 401).

![Login incorrecto](evidencias/08-login-credenciales-incorrectas.png)

### 9. Login correcto y perfil
Perfil de Ana tras iniciar sesión, con el mensaje de bienvenida.

![Perfil](evidencias/09-login-correcto-perfil.png)

### 10. Nueva reserva: equipos disponibles
Para el 15/01/2027 por la mañana solo aparecen los equipos libres y operativos (PC-001 está reservado y PC-002 fuera de servicio).

![Nueva reserva](evidencias/10-nueva-reserva-equipos-disponibles.png)

### 11. Reserva creada (PRG)
Después del POST se redirige a *Mis reservas* y se muestra la confirmación.

![Reserva creada](evidencias/11-reserva-creada-mis-reservas.png)

### 12. Reserva duplicada rechazada (409)
Se modificó el HTML del formulario para enviar un equipo ya reservado esa tarde. El servidor vuelve a comprobarlo y lo rechaza, conservando la fecha y el turno.

![Reserva duplicada](evidencias/12-reserva-duplicada-409.png)

### 13. Cancelación de una reserva propia
La reserva pasa a *Cancelada* (no se borra) y aparece el aviso.

![Reserva cancelada](evidencias/13-reserva-cancelada.png)

### 14. Usuario sin permisos (403)
Ana intenta entrar en `/admin/equipos` escribiendo la URL.

![Acceso denegado](evidencias/14-usuario-sin-permiso-403.png)

### 15. Administración: equipo añadido
El administrador añade el equipo PC-003.

![Equipo añadido](evidencias/15-admin-equipo-anadido.png)

### 16. Administración: cambio de estado
PC-002 pasa de *Fuera de servicio* a *Operativo*.

![Cambio de estado](evidencias/16-admin-cambio-estado.png)

### 17. Administración: todas las reservas
Listado de todas las reservas con el usuario y el equipo.

![Todas las reservas](evidencias/17-admin-todas-las-reservas.png)

### 18. Administración: cancelar una reserva
El administrador cancela la reserva de Luis.

![Admin cancela reserva](evidencias/18-admin-reserva-cancelada.png)

### 19. Logout
Después de cerrar sesión, al intentar entrar en `/perfil` se redirige al login.

![Logout](evidencias/19-logout-perfil-redirige-login.png)

### 20. Diseño adaptable
*Mis reservas* en la pantalla de un móvil (390 px de ancho).

![Vista móvil](evidencias/20-responsive-movil.png)
