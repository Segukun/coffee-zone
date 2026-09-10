# Coffee Zone — Backend

Coffee Zone es una red social para desarrolladores y estudiantes de programación, con inspiración visual en X/Twitter y LinkedIn.

Esta rama (`backend`) incluye la estructura, las convenciones y un servidor Express mínimo con `GET /api/health`. No hay conexión a MongoDB, schemas, autenticación ni lógica de negocio. Los ejemplos de funcionalidades de este documento son futuros.

## Stack y entorno común

- Node.js 24.x y npm, también utilizados en frontend.
- Express.js para HTTP, CORS abierto para desarrollo y `express.json()` para recibir JSON.
- dotenv para cargar `.env` y nodemon para reiniciar el servidor durante el desarrollo.
- MongoDB y Mongoose previstos para persistencia y ODM; Mongoose ya está declarado, pero todavía no se utiliza.
- JWT y bcrypt previstos para autenticación; todavía no se instalan ni implementan.
- JavaScript con módulos ES (`import` / `export`), dos espacios de indentación, comillas simples y punto y coma.

`package.json` define las dependencias base y `package-lock.json` fija sus versiones para instalaciones reproducibles. No se necesita MongoDB para revisar esta estructura.

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
| `config/` | Configuración general y futura conexión a MongoDB. |
| `utils/` | Funciones auxiliares reutilizables, con una responsabilidad clara. |
| `app.js` | Configurar Express, middlewares generales y registro de rutas. No iniciar el servidor. |
| `server.js` | Cargar dotenv, leer `PORT` e iniciar el servidor con `app.listen`. La conexión a MongoDB se implementará en otra tarjeta. |

El flujo representa el camino habitual de las funcionalidades futuras; el middleware de errores se registrará después de las rutas. Por ahora, el health check temporal está definido directamente en `app.js` y solo confirma que el servidor HTTP responde; no comprueba una base de datos.

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
    "message": "Mensaje del error"
  }
}
```

Usar códigos HTTP de error apropiados y mensajes seguros; no enviar credenciales ni detalles internos. Antes de implementar una operación, acordar con frontend los campos de entrada, `data`, códigos de estado y errores. Estos ejemplos no constituyen una API disponible.

## Variables de entorno

Copiar `.env.example` a `.env` dentro de `backend/`. Solo `PORT` se utiliza actualmente; las otras variables quedan reservadas para futuras tarjetas:

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

Nunca subir `.env`, variantes locales ni credenciales. `.gitignore` permite versionar únicamente `.env.example` entre estos archivos. Mantener el ejemplo actualizado y sin valores sensibles. `server.js` carga `.env` mediante dotenv.

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

Ambos comandos muestran `Coffee Zone API running on port 3000` con la configuración local. No se necesita MongoDB. Detener el proceso con `Ctrl+C` antes de ejecutar el otro comando en el mismo puerto.

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

## Cómo agregar una nueva funcionalidad

Ejemplo conceptual para publicaciones, a realizar en una tarea posterior:

1. Acordar el contrato HTTP con frontend y crear o actualizar el model `Post` en `models/Post.js`.
2. Crear `services/postService.js` con las reglas de negocio y operaciones sobre el model.
3. Crear `controllers/postController.js` para extraer parámetros, invocar el service y responder con el formato acordado.
4. Crear `routes/postRoutes.js` para asociar métodos y rutas relativas a sus controllers.
5. Registrar las rutas bajo `/api/posts` en `app.js`.
6. Agregar y conectar middlewares de validación o autenticación si corresponde.

Trabajar los cambios de `backend/` en la rama `backend`. Mantener responsabilidades separadas, actualizar este README y `.env.example` si cambia el contrato o la configuración, y agregar verificaciones relevantes cuando exista comportamiento. Si se agrega una dependencia, actualizar también `package-lock.json`; no subir `node_modules/` ni secretos.
