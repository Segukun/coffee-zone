# Coffee Zone

Coffee Zone es una red social orientada a desarrolladores, estudiantes de programación y personas interesadas en tecnología.

La plataforma busca ofrecer un espacio simple para compartir publicaciones, snippets de código, ideas, recursos y experiencias relacionadas con el desarrollo de software.

El diseño general estará inspirado en plataformas como X/Twitter y LinkedIn, adaptado a una comunidad enfocada en programación.

## Tecnologías

### Frontend
- React
- Vite

### Backend
- Node.js
- Express.js

### Base de datos
- MongoDB
- Mongoose

## Estructura

```text
coffee-zone/
├── frontend/
├── backend/
└── README.md
```

La rama compartida `develop` integra ambos módulos. `backend` y `frontend` conservan sus historiales y siguen disponibles para el trabajo de cada integrante. `main` se mantiene como versión principal estable.

- [Documentación de frontend](frontend/README.md).
- [Documentación de backend](backend/README.md).
- [Contrato de la API de usuarios](backend/docs/users-api.md).
- [Matriz de pruebas de la API de usuarios](backend/docs/users-api-test-matrix.md).

El backend implementa registro, login, JWT, perfiles y cambio de contraseña. El frontend incluye Login, Sign Up, Home, Profile, Settings y edición de perfil, además de publicaciones, comentarios y likes con datos locales en memoria. La comunicación HTTP entre módulos todavía no está conectada.

## Desarrollo local desde develop

Usar Node.js 24.x y npm. Instalar y ejecutar cada módulo en una terminal independiente; cada uno mantiene su propio `package.json`, lockfile y `node_modules/`.

Backend:

```sh
cd backend
npm ci
npm run dev
```

Se necesita `backend/.env` con la configuración descrita en su README: `MONGODB_URI`, `JWT_SECRET` y las opciones de puerto, JWT, bcrypt y seguridad. Si ya existe, conservarlo; no sobrescribir la conexión de Atlas. Para un entorno nuevo, usar `backend/.env.example` como plantilla local. El puerto por defecto es `3000` y la comprobación de disponibilidad es `GET /api/health`.

Frontend, en otra terminal desde la raíz:

```sh
cd frontend
npm ci
npm run dev
```

Vite utiliza por defecto `http://localhost:5173`. `frontend/.env.example` declara `VITE_API_URL=http://localhost:3000/api`; esta configuración está preparada para la futura conexión, pero los servicios actuales no envían solicitudes HTTP. Las variables `VITE_*` son públicas: no copiar credenciales de backend. Los `.env` y sus variantes locales están ignorados en ambos módulos; solo sus ejemplos se versionan.

Verificaciones desde la raíz:

```sh
npm --prefix backend test
npm --prefix backend run test:integration
npm --prefix frontend run lint
npm --prefix frontend run build
```

Las pruebas de backend usan MongoDB temporal local por defecto. Mantener `MONGODB_TEST_URI` sin definir para no utilizar el modo remoto opcional. El frontend no tiene un script de pruebas automatizadas versionado; sus comandos disponibles son `dev`, `build`, `lint` y `preview`.

Crear las próximas ramas de funcionalidades desde `develop` y proponer sus integraciones mediante Pull Requests. Antes de conectar HTTP, acordar el manejo de sesión, carga y errores del cliente, adaptar los perfiles al contrato existente, y definir los contratos pendientes de publicaciones, comentarios, likes y archivos. Los orígenes de frontend deben coincidir con `CORS_ORIGINS` del backend.

## Alcance del MVP

La primera versión del proyecto contempla:

- Registro de usuarios.
- Inicio de sesión.
- Autenticación con JWT.
- Perfil de usuario.
- Creación de publicaciones.
- Publicaciones con snippets de código.
- Feed principal.
- Likes.
- Comentarios.
- Diseño responsive.

La presencia de pantallas y acciones locales no implica que esas funcionalidades estén conectadas a persistencia remota. Se conservan los recursos de propuesta y diseño del proyecto en la raíz.
