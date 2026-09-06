# Coffee Zone — Frontend

Coffee Zone es una red social para desarrolladores y estudiantes de programación, con inspiración visual en X/Twitter y LinkedIn.

Esta rama (`frontend`) prepara exclusivamente la estructura y las convenciones. React y Vite tienen un arranque mínimo: `App` devuelve `null`, por lo que la pantalla está vacía intencionalmente. No hay páginas, componentes de producto, autenticación, llamadas HTTP ni lógica de negocio. Todos los ejemplos de funcionalidades son futuros.

## Stack y entorno común

- Node.js 24.x y npm para herramientas, también utilizados en backend.
- React y React DOM para la interfaz.
- Vite y su plugin de React para desarrollo y compilación.
- JavaScript con módulos ES (`import` / `export`), dos espacios de indentación, comillas simples y punto y coma; comillas dobles en atributos JSX.

`package.json` define las dependencias base y `package-lock.json` fija sus versiones para instalaciones reproducibles. Todavía no se agrega una biblioteca de rutas, de estado global ni de HTTP.

## Estructura

```text
frontend/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── common/
│   │   ├── layout/
│   │   ├── posts/
│   │   └── comments/
│   ├── pages/
│   ├── services/
│   ├── context/
│   ├── hooks/
│   ├── routes/
│   ├── utils/
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

Las carpetas vacías tienen un `.gitkeep` para que Git las conserve. Eliminarlo cuando se agregue el primer archivo real a esa carpeta. `index.html` y `vite.config.js` son únicamente archivos de arranque de Vite.

## Responsabilidades

| Ubicación | Responsabilidad y ejemplos futuros |
| --- | --- |
| `assets/` | Recursos estáticos importados por la aplicación, como imágenes e iconos. |
| `components/` | Componentes reutilizables, agrupados por responsabilidad. |
| `components/common/` | Componentes genéricos: `Avatar`, `Button`, `Modal`. |
| `components/layout/` | Estructura general de la aplicación: `Sidebar`, `Navbar`. |
| `components/posts/` | Componentes de publicaciones: `PostCard`, `CreatePost`. |
| `components/comments/` | Componentes de comentarios: `Comment`. |
| `pages/` | Pantallas completas: `HomePage.jsx`, `LoginPage.jsx`, `RegisterPage.jsx`, `ProfilePage.jsx`. |
| `services/` | Toda comunicación HTTP con el backend: `api.js`, `authService.js`, `postService.js`, `userService.js`. |
| `context/` | Estado global solo cuando sea necesario, por ejemplo `AuthContext.jsx`. |
| `hooks/` | Custom hooks reutilizables; nombres con prefijo `use`, como `usePosts.js`. |
| `routes/` | Configuración futura de navegación y rutas de React. |
| `utils/` | Funciones auxiliares reutilizables, independientes de la UI. |
| `App.jsx` | Composición futura de páginas, rutas y providers. Hoy es un componente vacío. |
| `main.jsx` | Punto de entrada que monta React en el elemento raíz de `index.html`. |

## Convenciones de nombres y código

- Carpetas, archivos, funciones, variables y código en inglés; documentación en español.
- Componentes y sus archivos en `PascalCase`: `PostCard.jsx`, `CreatePost.jsx`, `UserProfile.jsx`.
- Páginas con sufijo `Page`: `HomePage.jsx`, `ProfilePage.jsx`.
- Services en `camelCase` con sufijo `Service`: `authService.js`, `postService.js`. `api.js` será el módulo compartido de transporte HTTP.
- Variables y funciones en `camelCase`: `createPost`, `handleSubmit`, `currentUser`, `isLoading`.
- `.jsx` para archivos con JSX; `.js` para services, hooks sin JSX y utilidades.
- Cada componente debe tener una responsabilidad clara. Separar UI, acceso a API, estado y lógica reutilizable.
- Mantener estado local por defecto; usar context solo cuando sea necesario compartirlo. Evitar archivos gigantes y abstracciones que no necesita el MVP.

## Comunicación con el backend

Toda comunicación HTTP se centralizará en `services/`. Los componentes, páginas y hooks invocarán funciones de esos services; no usarán `fetch` directamente ni repetirán URLs como `http://localhost:3000/api/posts`.

Flujo previsto:

```text
Page / Component → Service → api.js → Backend /api
```

Cuando se implemente, `services/api.js` leerá `import.meta.env.VITE_API_URL` y centralizará la URL base, opciones comunes y tratamiento de respuestas HTTP. Los services de cada recurso definirán operaciones como `createPost` y `getUserById`. Usar rutas relativas como `/posts`: la URL base ya incluye `/api` y no debe duplicarse.

Contrato acordado con backend para respuestas exitosas:

```json
{
  "data": {}
}
```

`data` contendrá un objeto o una lista según la operación. Respuestas de error:

```json
{
  "error": {
    "message": "Mensaje del error"
  }
}
```

El transporte compartido deberá comprobar el estado HTTP, extraer `data` en éxitos y propagar un error con el mensaje disponible en fallos. Las páginas o hooks gestionarán los estados de carga y error para la UI. Antes de implementar cada operación, acordar campos, códigos HTTP y errores con backend. Estos módulos y comportamientos todavía no existen.

## Variables de entorno

Copiar `.env.example` a `.env` dentro de `frontend/`:

```dotenv
VITE_API_URL=http://localhost:3000/api
```

La URL coincide con el puerto local previsto de backend (`3000`) y su prefijo `/api`. La aplicación vacía todavía no lee esta variable ni necesita una API disponible. Al integrar backend, ajustar la URL según el entorno y reiniciar Vite después de cambiar `.env`.

Las variables `VITE_*` se exponen en el código del navegador: solo pueden contener configuración pública. Nunca agregar `JWT_SECRET`, credenciales de MongoDB ni otros secretos al frontend.

No subir `.env` ni variantes locales. Mantener `.env.example` actualizado sin valores sensibles. `.gitignore` también excluye `node_modules/`, `dist/`, cobertura y logs.

## Cómo ejecutar el proyecto

Desde la raíz del checkout de la rama `frontend`:

```sh
cd frontend
npm ci
```

Crear `.env` copiando `.env.example` (en PowerShell: `Copy-Item .env.example .env`). Después:

```sh
npm run dev
```

Abrir la URL que muestre Vite en la terminal. La pantalla vacía es el resultado esperado en esta etapa; no es necesario iniciar backend.

Para comprobar la compilación:

```sh
npm run build
```

Genera `dist/`, que no se versiona. Para revisar esa compilación localmente:

```sh
npm run preview
```

## Cómo agregar una nueva funcionalidad

Ejemplo conceptual para publicaciones, a realizar en una tarea posterior:

1. Acordar el contrato HTTP con backend y crear `services/postService.js`, utilizando el transporte compartido de `services/api.js` cuando se implemente.
2. Crear los componentes necesarios en `components/posts/`; ubicar piezas genéricas en `components/common/`.
3. Crear o actualizar la página correspondiente, por ejemplo `pages/HomePage.jsx`, y registrar su navegación en `routes/` cuando exista el router.
4. Manejar estados de carga y error en la página o en un hook reutilizable, evitando estado global innecesario.
5. Integrar con la API a través del service y comprobar respuestas exitosas y errores del contrato.
6. Mantener UI, acceso HTTP, estado y lógica reutilizable separados.

Trabajar los cambios de `frontend/` en la rama `frontend`. Reutilizar componentes existentes antes de crear otros, actualizar documentación y `.env.example` si cambia la configuración, y agregar verificaciones relevantes cuando exista comportamiento. Si se agrega una dependencia, actualizar también `package-lock.json`; no subir `node_modules/`, `dist/` ni secretos.
