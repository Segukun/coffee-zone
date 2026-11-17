# Coffee Zone — Backend

Coffee Zone es una red social para desarrolladores y estudiantes de programación, con inspiración visual en X/Twitter y LinkedIn.

Esta rama (`backend`) incluye registro, login con JWT, consulta y edición de perfiles, middleware de autenticación, health check, conexión a MongoDB, modelo `User`, validaciones reutilizables y manejo global de errores.

## Stack y entorno común

- Node.js 24.x y npm, también utilizados en frontend.
- Express.js para HTTP, CORS abierto para desarrollo y `express.json()` para recibir JSON.
- dotenv para cargar `.env` y nodemon para reiniciar el servidor durante el desarrollo.
- MongoDB y Mongoose para persistencia y ODM; el arranque conecta a MongoDB antes de escuchar solicitudes.
- bcrypt para hashes asíncronos de contraseñas y jsonwebtoken para JWT HS256.
- JavaScript con módulos ES (`import` / `export`), dos espacios de indentación, comillas simples y punto y coma.

`package.json` define las dependencias y `package-lock.json` fija sus versiones para instalaciones reproducibles. `npm test` combina mocks de almacenamiento y MongoDB temporal local para perfiles, sin credenciales reales. La integración adicional utiliza una base temporal aislada de MongoDB.

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

Endpoints públicos disponibles

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | `/api/health` | Estado del servidor, HTTP 200 |
| POST | `/api/auth/register` | Registro, HTTP 201 |
| POST | `/api/auth/login` | JWT y usuario, HTTP 200 |

Los endpoints `/api/users/me` utilizan el middleware de autenticación existente. La consulta por username es pública.

Las siguientes rutas corresponden a próximas tarjetas

```text
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

Copiar `.env.example` a `.env` dentro de `backend/`. Completar `MONGODB_URI` y `JWT_SECRET`. Mantener la URI legacy funcional del entorno local.

```dotenv
PORT=3000
MONGODB_URI=
JWT_SECRET=
JWT_EXPIRES_IN=1d
BCRYPT_ROUNDS=12
```

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto HTTP. Usa `3000` como valor por defecto si no está definido o está vacío, consistente con `VITE_API_URL` del frontend. |
| `MONGODB_URI` | URI de conexión a MongoDB. |
| `JWT_SECRET` | Secreto privado aleatorio de al menos 32 bytes. Se valida al firmar o verificar tokens. |
| `JWT_EXPIRES_IN` | Expiración positiva con unidad `s`, `m`, `h` o `d`, por ejemplo `30m`, `24h` o `1d`. Por defecto `1d`. |
| `BCRYPT_ROUNDS` | Costo entero de 10 a 14. Por defecto 12. |

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

Ambos comandos muestran `Coffee Zone API running on port 3000` con la configuración local después de conectar a MongoDB y esperar la inicialización de los índices únicos del modelo `User`. Se necesita una `MONGODB_URI` válida y acceso a esa base de datos. Detener el proceso con `Ctrl+C` antes de ejecutar el otro comando en el mismo puerto.

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

## Registro y login

La implementación sigue `authRoutes.js` → `authController.js` → `authService.js` → `User`. Las reglas HTTP de autenticación se componen en `utils/authValidation.js` con las funciones de `validationUtils.js`. `config/auth.js` valida la configuración cuando se utiliza y propaga errores mediante `AppError`.

Para registrar un usuario, enviar `POST /api/auth/register` con `Content-Type: application/json` y el siguiente cuerpo

```json
{
  "name": "Alex Morgan",
  "username": "alexcodes",
  "email": "alex@example.com",
  "password": "ExamplePassword123!"
}
```

Se aplican las siguientes reglas

- Nombre de 2 a 80 caracteres, recortando espacios exteriores.
- Username de 3 a 30 caracteres ASCII, con letras, números o `_`, normalizado a minúsculas y sin espacios exteriores.
- Email con formato básico, hasta 254 caracteres, normalizado a minúsculas y sin espacios exteriores.
- Password con al menos 8 caracteres Unicode y hasta 72 bytes UTF-8. Los espacios de la contraseña se conservan. Strings vacíos o compuestos solo por espacios se rechazan.
- Todos los campos deben ser strings. Los datos adicionales del cliente se ignoran.

bcrypt utiliza sus operaciones asíncronas. El límite de 72 bytes se comprueba antes del hash y de la comparación para evitar truncamientos. Los usuarios se guardan en `users` con `passwordHash`. El schema excluye ese campo de las consultas por defecto y el service construye explícitamente la representación pública.

Los índices únicos de email y username resuelven las carreras de registro y sus errores 11000 llegan al middleware global como HTTP 409. La consulta previa usa collation sin distinguir mayúsculas para detectar también documentos existentes con identificadores mixtos. Los nuevos registros siempre almacenan identificadores normalizados.

El registro devuelve HTTP 201 con el siguiente formato

```json
{
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Alex Morgan",
      "username": "alexcodes",
      "email": "alex@example.com",
      "bio": "",
      "avatar": ""
    }
  }
}
```

El token se obtiene con `POST /api/auth/login`

```json
{
  "email": "alex@example.com",
  "password": "ExamplePassword123!"
}
```

El login normaliza el email, solicita explícitamente el hash y compara con bcrypt. Las contraseñas de usuarios existentes pueden tener menos de 8 caracteres si fueron creadas antes de las reglas actuales de registro. El límite de 72 bytes se aplica también al login. Para emails inexistentes se ejecuta una comparación con un hash ficticio generado en memoria. El error HTTP 401 es idéntico para ambas credenciales incorrectas

```json
{ "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid email or password" } }
```

Con credenciales válidas se devuelve HTTP 200, `Cache-Control: no-store` y `{ "data": { "token": "JWT_TOKEN", "user": { ... } } }`. El objeto user tiene los mismos campos públicos que el registro. El JWT contiene únicamente `sub`, `iat` y `exp`, se firma con HS256 y utiliza la duración configurada. Una configuración de firma ausente o inválida genera HTTP 500 con el mensaje genérico del middleware global.

Para generar un secreto local se puede ejecutar el siguiente comando y guardar su salida en el archivo local de configuración

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

## Middleware JWT

`middlewares/authMiddleware.js` exige `Authorization: Bearer JWT_TOKEN`. Usa `jwt.verify()` restringido a HS256, exige un `sub` ObjectId válido y un `exp` entero, y comprueba que el usuario siga existiendo. Asigna únicamente `{ id }` a `request.user`.

Un header ausente o malformado, token inválido, expirado, con algoritmo o firma incorrectos, o usuario eliminado, devuelve HTTP 401 con `UNAUTHORIZED` y `Authentication required.`. Los errores inesperados de almacenamiento conservan el manejo global de errores.

Una futura ruta puede utilizarlo del siguiente modo, una vez que exista su controller

```js
import authMiddleware from '../middlewares/authMiddleware.js';

router.post('/', authMiddleware, createPost);
// createPost puede acceder a request.user.id.
```

## Perfiles de usuario

| Método | Endpoint | Autenticación | Resultado |
| --- | --- | --- | --- |
| GET | `/api/users/me` | Bearer JWT | Perfil propio con email y ambas fechas |
| GET | `/api/users/:username` | Público | Perfil público, con fecha de creación |
| PATCH | `/api/users/me` | Bearer JWT | Actualización parcial del perfil propio |

La ruta específica `/me` se registra primero. `me` queda reservado por el mínimo de tres caracteres del username, compartido entre registro, edición y consulta pública. Los parámetros username se recortan y normalizan a minúsculas. La búsqueda usa collation para encontrar también documentos antiguos con mayúsculas.

Las rutas protegidas obtienen la identidad exclusivamente de `request.user.id`. Un JWT de un usuario eliminado devuelve 401. Si el usuario desaparece después de autenticar y antes de la consulta o actualización, el service devuelve 404.

El perfil propio contiene `id`, `name`, `username`, `email`, `bio`, `avatar`, `createdAt` y `updatedAt`. La representación pública contiene únicamente `id`, `name`, `username`, `bio`, `avatar` y `createdAt`. `userSerialization.js` selecciona explícitamente cada propiedad y comparte la representación de cuenta con los endpoints de autenticación. Sus respuestas existentes conservan sus campos.

Ejemplo de edición parcial

```http
PATCH /api/users/me
Authorization: Bearer JWT_TOKEN
Content-Type: application/json

{"name":"Alex Morgan","username":"alexdev","bio":"Software developer","avatar":"https://example.com/avatar.png"}
```

Reglas de los campos editables

- `name` debe ser string de 2 a 80 caracteres después de recortar espacios.
- `username` debe contener entre 3 y 30 letras ASCII, números o `_`. Se guarda en minúsculas.
- `bio` admite hasta 500 caracteres y una cadena vacía para borrar la descripción.
- `avatar` admite hasta 2048 caracteres, una URL absoluta HTTP/HTTPS sin credenciales incrustadas, o una cadena vacía para borrarlo. El servidor almacena la referencia URL.

Todos los campos deben ser strings. Se recortan espacios exteriores. El cuerpo debe contener al menos un campo editable. Cualquier campo adicional, incluido `id`, `_id`, `email`, `passwordHash`, fechas, roles u operadores MongoDB, provoca 400 y se rechaza toda la actualización.

La actualización usa un `$set` construido con campos permitidos y un filtro basado en la identidad autenticada. Los campos omitidos conservan sus valores, incluso ante ediciones concurrentes de campos diferentes. Mongoose actualiza `updatedAt` y conserva `createdAt`.

La respuesta HTTP 200 de consulta propia o edición tiene este formato

```json
{
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Alex Morgan",
      "username": "alexdev",
      "email": "alex@example.com",
      "bio": "Software developer",
      "avatar": "https://example.com/avatar.png",
      "createdAt": "2026-11-17T12:00:00.000Z",
      "updatedAt": "2026-11-17T13:00:00.000Z"
    }
  }
}
```

La respuesta de `GET /api/users/alexdev` usa el mismo envoltorio `data.user` con los campos públicos indicados arriba. Las respuestas propias llevan `Cache-Control: no-store`.

Los errores siguen el formato global. Datos inválidos generan 400 `VALIDATION_ERROR`, autenticación inválida 401 `UNAUTHORIZED`, perfiles ausentes 404 `USER_NOT_FOUND` y usernames ocupados 409 `DUPLICATE_KEY`. Una comprobación previa excluye al propio usuario, permitiendo conservar su username. El índice único sigue resolviendo conflictos concurrentes. Los errores inesperados generan 500 con mensaje genérico.

`test/profiles.test.js` prueba las tres rutas con un MongoDB local temporal, separado de Atlas y de los usuarios reales. Comprueba protección de identidad, privacidad, tipos, límites, campos prohibidos, actualizaciones parciales, timestamps y carreras contra el índice único. `npm test` incluye estas pruebas y la regresión de autenticación. Su primera ejecución puede descargar el binario oficial mediante la dependencia de desarrollo ya existente `mongodb-memory-server`.

La eliminación de cuentas queda pendiente. Antes de implementar `DELETE /api/users/me` se debe definir el tratamiento de publicaciones, comentarios, likes y referencias al usuario en otras colecciones. Las políticas de eliminación de documentos relacionados se definirán en esa tarjeta.

## Cambio de contraseña

`PATCH /api/users/me/password` requiere `Authorization: Bearer JWT_TOKEN` y usa exclusivamente `request.user.id`. El body admite exactamente `currentPassword` y `newPassword`, ambos strings presentes y con contenido. Los campos adicionales y operadores MongoDB generan HTTP 400.

```http
PATCH /api/users/me/password
Authorization: Bearer JWT_TOKEN
Content-Type: application/json

{"currentPassword":"CurrentPassword123!","newPassword":"NewPassword456!"}
```

El service verifica la contraseña actual mediante `bcrypt.compare()`. Una contraseña incorrecta genera HTTP 401 con `INVALID_CURRENT_PASSWORD` y `Current password is incorrect`. Después aplica a la nueva contraseña la política compartida con Sign Up, de al menos 8 caracteres Unicode y máximo 72 bytes UTF-8, y comprueba con bcrypt que sea diferente de la anterior. Los espacios y las mayúsculas se conservan exactamente. La contraseña actual también respeta el máximo de bytes para evitar truncamientos, pero admite contraseñas antiguas menores de ocho caracteres.

El hash nuevo se genera de forma asíncrona con el mismo `getBcryptRounds()` del registro, por defecto `BCRYPT_ROUNDS=12`. La actualización filtra por `_id` y por el hash que se verificó. Si otra solicitud cambia ese hash primero, la actualización no coincide y devuelve HTTP 409 `PASSWORD_UPDATE_CONFLICT`. El cliente deberá volver a intentar la operación con la contraseña actualizada.

Se actualiza únicamente `passwordHash`, además de `updatedAt` gestionado por Mongoose. El perfil y `createdAt` se conservan. La respuesta HTTP 200 lleva `Cache-Control: no-store` y el siguiente contenido

```json
{"data":{"message":"Password updated successfully"}}
```

Datos inválidos o contraseña nueva igual a la actual generan 400 `VALIDATION_ERROR`. El middleware JWT conserva su respuesta 401 para tokens inválidos o usuarios eliminados. Si el usuario desaparece después de autenticar, el service devuelve 404 `USER_NOT_FOUND`. Los errores inesperados se procesan como 500 con mensaje genérico mediante el middleware global.

Los JWT ya emitidos siguen siendo válidos hasta su vencimiento. Cambiar la contraseña no cierra las sesiones que ya tengan tokens válidos. La respuesta de cambio no emite otro token. La revocación de sesiones queda para una mejora futura.

`test/passwordChange.test.js` ejecuta los casos de autenticación, validación, privacidad, Login posterior, timestamps y actualizaciones concurrentes contra MongoDB temporal local. Forma parte de `npm test` y utiliza únicamente usuarios ficticios de ese proceso temporal.

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

Las utilidades generales mantienen su independencia de las rutas. Las reglas de registro y login se encuentran en `authValidation.js`.

## Pruebas

```sh
npm test
```

Se utiliza `node:test`, `assert` y `fetch` de Node 24. `register.test.js`, `login.test.js` y `authMiddleware.test.js` verifican cada tarjeta por separado con mocks de consultas. bcrypt y JWT ejecutan sus operaciones reales. La suite conserva las 47 pruebas anteriores de errores, validaciones y arranque. Los tests HTTP utilizan puertos locales temporales.

La integración real se ejecuta por separado

```sh
npm run test:integration
```

Por defecto utiliza `mongodb-memory-server`, una dependencia de desarrollo que inicia un proceso MongoDB temporal local con el binario oficial. La primera instalación o ejecución descarga ese binario y requiere acceso a Internet. El proceso se detiene al finalizar. Para probar Atlas u otro servidor, configurar explícitamente `MONGODB_TEST_URI` en el entorno del proceso.

El script crea una base nueva `coffee_zone_auth_test_<uuid>` con `dbName`, espera sus índices únicos y comprueba registro, hashes, duplicados, una carrera real de índices, login, JWT, documentos antiguos y usuario eliminado. Crea únicamente usuarios ficticios en esa base y elimina esa misma base al finalizar, comprobando el nombre antes de eliminarla. La cuenta de testing remota debe tener permisos para crear y eliminar la base temporal. La suite normal combina mocks y MongoDB temporal local y no carga el archivo local de credenciales.

## Cómo agregar una nueva funcionalidad

Ejemplo conceptual para publicaciones, a realizar en una tarea posterior:

1. Acordar el contrato HTTP con frontend y crear o actualizar el model `Post` en `models/Post.js`.
2. Crear `services/postService.js` con las reglas de negocio y operaciones sobre el model.
3. Crear `controllers/postController.js` para extraer parámetros, invocar el service y responder con el formato acordado.
4. Crear `routes/postRoutes.js` para asociar métodos y rutas relativas a sus controllers.
5. Registrar las rutas bajo `/api/posts` en `app.js`.
6. Agregar y conectar middlewares de validación o autenticación si corresponde.

Trabajar los cambios de `backend/` en la rama `backend`. Mantener responsabilidades separadas, actualizar este README y `.env.example` si cambia el contrato o la configuración, y agregar verificaciones relevantes cuando exista comportamiento. Si se agrega una dependencia, actualizar también `package-lock.json`; no subir `node_modules/` ni secretos.
