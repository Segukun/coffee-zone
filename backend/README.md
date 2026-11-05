# Coffee Zone — Backend

Coffee Zone es una red social para desarrolladores y estudiantes de programación, con inspiración visual en X/Twitter y LinkedIn.

Esta rama (`backend`) incluye el servidor Express con `GET /api/health`, conexión a MongoDB, modelo `User`, validaciones reutilizables y manejo global de errores. No hay autenticación ni funcionalidades de negocio; los endpoints de ejemplo de este documento son futuros.

## Stack y entorno común

- Node.js 24.x y npm, también utilizados en frontend.
- Express.js para HTTP, CORS abierto para desarrollo y `express.json()` para recibir JSON.
- dotenv para cargar `.env` y nodemon para reiniciar el servidor durante el desarrollo.
- MongoDB y Mongoose para persistencia y ODM; el arranque conecta a MongoDB antes de escuchar solicitudes.
- JWT y bcrypt previstos para autenticación; todavía no se instalan ni implementan.
- JavaScript con módulos ES (`import` / `export`), dos espacios de indentación, comillas simples y punto y coma.

`package.json` define las dependencias base y `package-lock.json` fija sus versiones para instalaciones reproducibles. Las pruebas se ejecutan sin MongoDB ni credenciales reales.

## Estructura

```text
backend/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   ├── routes/
│   ├── middlewares/
│   ├── utils/
│   ├── app.js
│   └── server.js
├── .env.example
├── test/
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

Las carpetas vacías tienen un `.gitkeep` para que Git las conserve. Eliminarlo cuando se agregue el primer archivo real a esa carpeta.

## Arquitectura y responsabilidades

Flujo previsto de una solicitud:

```text
Route → Middleware → Controller → Service → Model → MongoDB
```

| Ubicación | Responsabilidad |
| --- | --- |
| `routes/` | Definir endpoints y asociarlos a middlewares y controllers. Sin lógica de negocio ni consultas a datos. |
| `middlewares/` | Interceptar solicitudes para autenticación y validaciones generales; centralizar manejo de errores. |
| `controllers/` | Recibir `request` y `response`, extraer parámetros, llamar a services y devolver respuestas HTTP. Evitar lógica de negocio compleja. |
| `services/` | Contener lógica de negocio, coordinar operaciones y utilizar models. No depender de `request` o `response` de Express. |
| `models/` | Definir schemas y Models de Mongoose, representar datos y permitir su acceso. |
| `config/` | Configuración general y conexión a MongoDB. |
| `utils/` | Funciones auxiliares reutilizables, con una responsabilidad clara. |
| `app.js` | Configurar Express, middlewares generales y registro de rutas. No iniciar el servidor. |
| `server.js` | Cargar dotenv, leer `PORT`, conectar a MongoDB e iniciar el servidor con `app.listen`. |

El flujo representa el camino habitual de las funcionalidades futuras. El orden en `app.js` es CORS → parser JSON → rutas → rutas no encontradas → errores globales. El health check temporal conserva su respuesta y solo confirma que el servidor HTTP responde; no comprueba la disponibilidad actual de la base de datos.

## Convenciones de nombres y código

- Carpetas, archivos, funciones, variables y código en inglés; documentación en español.
- Variables y funciones en `camelCase`: `createPost`, `getUserById`, `currentUser`, `postId`.
- Archivos por responsabilidad: `authController.js`, `authService.js`, `authRoutes.js`, `authMiddleware.js`.
- Models y sus archivos en `PascalCase`: `User` / `User.js`, `Post` / `Post.js`, `Comment` / `Comment.js`.
- Colecciones de MongoDB en minúsculas y plural: `users`, `posts`, `comments`.
- Un módulo con una responsabilidad clara. Dividir archivos cuando acumulen responsabilidades; priorizar código simple sobre abstracciones innecesarias.
- No acceder a models desde routes ni mover reglas de negocio a controllers.

## Contrato de la API

Todos los endpoints utilizarán el prefijo `/api`. Se registrará el prefijo en `app.js`; los routers definirán rutas relativas para evitar duplicarlo.

Ejemplos previstos, **todavía no implementados**:

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/users/:id
PATCH  /api/users/me
GET    /api/posts
POST   /api/posts
GET    /api/posts/:id
DELETE /api/posts/:id
POST   /api/posts/:id/like
GET    /api/posts/:id/comments
POST   /api/posts/:id/comments
```

Respuesta exitosa:

```json
{
  "data": {}
}
```

`data` contendrá un objeto o una lista según la operación. Los códigos HTTP deben reflejar el resultado (por ejemplo, `200` para lectura y `201` para creación).

Respuesta de error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data.",
    "details": [{ "field": "email", "message": "Invalid email address." }]
  }
}
```

`code` es consistente y `details` es opcional; cada detalle contiene únicamente `field` y `message`. Los mensajes públicos se escriben en inglés. No se envían credenciales ni detalles internos. Antes de implementar una operación, acordar con frontend los campos de entrada, `data`, códigos de estado y errores. Los endpoints de negocio anteriores todavía no están disponibles.

## Variables de entorno

Copiar `.env.example` a `.env` dentro de `backend/`. Completar `MONGODB_URI` para iniciar el servidor; `JWT_SECRET` sigue reservado para autenticación futura:

```dotenv
PORT=3000
MONGODB_URI=
JWT_SECRET=
```

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto HTTP. Usa `3000` como valor por defecto si no está definido o está vacío, consistente con `VITE_API_URL` del frontend. |
| `MONGODB_URI` | URI de conexión a MongoDB. |
| `JWT_SECRET` | Secreto privado para la autenticación futura; completar al implementar JWT. |

Nunca subir `.env`, variantes locales ni credenciales. `.gitignore` permite versionar únicamente `.env.example` entre estos archivos. Mantener el ejemplo actualizado y sin valores sensibles. `server.js` importa `config/environment.js`, que carga siempre `backend/.env` mediante una ruta absoluta, incluso si se invoca Node desde otro directorio. Las variables ya presentes en el proceso tienen prioridad y no se sobrescriben.

## Instalación y ejecución

Desde la raíz del checkout de la rama `backend`:

```sh
cd backend
npm ci
```

Crear `.env` copiando `.env.example` (en PowerShell: `Copy-Item .env.example .env`).

Iniciar el servidor en desarrollo:

```sh
npm run dev
```

El script de desarrollo usa nodemon para reiniciar ante cambios. Para iniciar sin nodemon:

```sh
npm start
```

Ambos comandos muestran `Coffee Zone API running on port 3000` con la configuración local después de conectar a MongoDB. Se necesita una `MONGODB_URI` válida y acceso a esa base de datos. Detener el proceso con `Ctrl+C` antes de ejecutar el otro comando en el mismo puerto.

Probar `GET http://localhost:3000/api/health` en el navegador o con `curl.exe http://localhost:3000/api/health` en PowerShell. Responde con HTTP `200` y:

```json
{
  "data": {
    "status": "ok",
    "message": "Coffee Zone API is running"
  }
}
```

CORS permite cualquier origen durante el desarrollo; la restricción de orígenes se definirá al preparar el despliegue.

## Diagnóstico seguro del arranque

Si falla el inicio, `utils/startupDiagnostics.js` registra la etapa (`database` o `http`), tipo, código, categoría y una orientación estática en inglés. También extrae códigos seguros de errores anidados de selección de servidores. Nunca registra el mensaje original, stack, hostname, URI, credenciales ni la topología completa. Los nombres y códigos de texto se filtran mediante listas permitidas; los desconocidos se muestran como `UnknownError` / `UNKNOWN`.

Por ejemplo, `DNS_ERROR` + `ECONNREFUSED` + `querySrv` indica un rechazo de la consulta DNS antes de conectar y autenticar. Revisar el resolvedor de la interfaz de red activa, el DNS proporcionado por VPN/router y las reglas que afectan consultas SRV/TXT. Una prueba con otro resolvedor permite distinguir ese problema de credenciales o configuración de Atlas. La aplicación no cambia los DNS del equipo ni incorpora un resolvedor público automáticamente.

Otras categorías distinguen configuración ausente o URI inválida, autenticación, permisos, TLS, red, selección de servidores y puerto ocupado. Son orientaciones de diagnóstico; por ejemplo, un timeout no demuestra por sí solo que la IP esté fuera de la lista de Atlas. La conexión a MongoDB sigue siendo obligatoria antes de abrir el puerto HTTP y se mantiene la validación TLS.

## Validaciones y manejo de errores

`src/utils/AppError.js` representa un error controlado. Controllers y services pueden lanzarlo sin construir respuestas HTTP:

```js
import AppError from '../utils/AppError.js';

throw new AppError('Resource not found.', 404, 'RESOURCE_NOT_FOUND');
```

El constructor recibe `(message, statusCode, code, details)`. Acepta códigos de error enteros entre 400 y 599. El mensaje y los detalles de errores controlados deben ser texto público escrito por el desarrollador: nunca interpolar contraseñas, tokens, documentos ni valores recibidos.

Express 5 propaga automáticamente los errores de handlers `async` y promesas **retornadas**. No se necesita un wrapper asíncrono. Los callbacks deben enviar sus errores mediante `next(error)`; los services solo lanzan errores y no dependen de Express. Registrar las nuevas rutas **antes** de los dos middlewares finales.

| Caso | HTTP | Código de respuesta |
| --- | --- | --- |
| `AppError` controlado de cliente | 400–499 | Código indicado; por defecto `APP_ERROR` |
| JSON malformado | 400 | `INVALID_JSON` |
| Mongoose `ValidationError` | 400 | `VALIDATION_ERROR` |
| Mongoose `CastError` | 400 | `INVALID_VALUE` |
| MongoDB código 11000 | 409 | `DUPLICATE_KEY` |
| Endpoint inexistente | 404 | `NOT_FOUND` |
| Otro error con `statusCode` o `status` válido | Se conserva, p. ej. 401, 403, 413, 415, 422 o 429 | `HTTP_ERROR` para 4xx |
| Error inesperado o código inválido | 500 | `INTERNAL_SERVER_ERROR` |
| Cualquier error 5xx | Se conserva, p. ej. 503 | `INTERNAL_SERVER_ERROR` |

`errorMiddleware.js` no devuelve mensajes crudos de Mongoose, valores rechazados, documentos ni stacks. En validaciones solo devuelve nombres de campos con formato seguro y mensajes genéricos. En índices duplicados informa únicamente los nombres públicos `email`, `username` y `_id`; otros índices reciben el mismo 409 sin detalles. Ampliar esa lista explícita cuando otro campo público lo requiera.

Todos los errores 5xx, incluso los creados con `AppError`, usan un mensaje genérico y omiten detalles. El log HTTP registra solo método y código de estado, sin URL, query, body, mensaje original ni stack. El diagnóstico de arranque descrito arriba se limita a la consola del servidor y no se envía al cliente. Si la respuesta ya comenzó, el middleware delega en `next(error)` para evitar escribir dos respuestas.

Las funciones de `src/utils/validationUtils.js` no modifican los datos ni dependen de rutas:

| Función | Uso |
| --- | --- |
| `isRequired(value)` | Rechaza `null`, `undefined` y strings vacíos o con espacios. `0` y `false` son valores presentes; no valida su tipo. |
| `isNonEmptyString(value)` | Exige un string con contenido. |
| `isType(value, type)` | Tipos `string`, `number` finito, `boolean`, `array` u `object` plano. Un tipo no soportado es un error de programación. |
| `isEmail(value)` | Formato básico, sin espacios; no verifica que la cuenta exista. |
| `isObjectId(value)` | String hexadecimal de exactamente 24 caracteres; no verifica que el recurso exista. |
| `hasLength(value, { min, max })` | Límites inclusivos elegidos por el caller para strings o arrays, sin políticas predefinidas. Usa `.length` sin recortar espacios; límites inválidos generan `RangeError`. |
| `validateRequiredFields(data, fields)` | Devuelve una lista `{ field, message }`, o `[]` si los campos propios requeridos están presentes. Rechaza bodies que no sean objetos planos. |

Ejemplo para un futuro controller, sin registrar un endpoint nuevo:

```js
import AppError from '../utils/AppError.js';
import { isEmail, validateRequiredFields } from '../utils/validationUtils.js';

const details = validateRequiredFields(request.body, ['email']);
if (details.length === 0 && !isEmail(request.body.email)) {
  details.push({ field: 'email', message: 'Invalid email address.' });
}
if (details.length > 0) {
  throw new AppError('Invalid request data.', 400, 'VALIDATION_ERROR', details);
}
```

No hay reglas de negocio de autenticación, username ni contraseña en estas utilidades.

## Pruebas

```sh
npm test
```

Se utiliza `node:test`, `assert` y `fetch` de Node 24, sin nuevas dependencias. Los tests HTTP levantan el `app` real y una aplicación aislada en puertos locales temporales. Comprueban health, 404, JSON inválido, errores controlados, Mongoose, confidencialidad, errores asíncronos, límites del parser y recuperación después de solicitudes inválidas. Las rutas artificiales existen solo dentro de `test/`.

Las validaciones de Mongoose se ejecutan en memoria; los errores de índice único usan instancias del error del driver con datos de ejemplo. La conexión se prueba con un mock y el entry point con una URI vacía, sin contactar Atlas. Una conexión real y la creación efectiva de índices requieren una prueba de integración posterior con una base de datos de prueba.

## Cómo agregar una nueva funcionalidad

Ejemplo conceptual para publicaciones, a realizar en una tarea posterior:

1. Acordar el contrato HTTP con frontend y crear o actualizar el model `Post` en `models/Post.js`.
2. Crear `services/postService.js` con las reglas de negocio y operaciones sobre el model.
3. Crear `controllers/postController.js` para extraer parámetros, invocar el service y responder con el formato acordado.
4. Crear `routes/postRoutes.js` para asociar métodos y rutas relativas a sus controllers.
5. Registrar las rutas bajo `/api/posts` en `app.js`.
6. Agregar y conectar middlewares de validación o autenticación si corresponde.

Trabajar los cambios de `backend/` en la rama `backend`. Mantener responsabilidades separadas, actualizar este README y `.env.example` si cambia el contrato o la configuración, y agregar verificaciones relevantes cuando exista comportamiento. Si se agrega una dependencia, actualizar también `package-lock.json`; no subir `node_modules/` ni secretos.
