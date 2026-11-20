# Coffee Zone — Frontend

Frontend de React + Vite para el MVP, funcional sin backend mediante datos iniciales JavaScript y servicios locales en memoria. Permite crear y editar publicaciones propias con texto, snippets, imágenes y archivos, responder comentarios anidados, dar/quitar likes y editar el perfil completo.

**Los cambios de contenido se conservan al navegar y se reinician al recargar.** Solo el tema claro/oscuro y el tamaño de texto persisten en localStorage. No hay autenticación real, solicitudes de API, publicación remota ni subida de archivos a un servidor.

## Tecnologías y requisitos

- Node.js **24.x** y npm.
- React y React DOM 19, JavaScript/JSX y módulos ES.
- Vite 8 con su plugin de React.
- React Router DOM 7 en modo declarativo.
- ESLint 10 con reglas de JavaScript, React Hooks y React Refresh.
- CSS propio y React Icons, sin librerías adicionales de UI, estado o cliente HTTP.

package.json declara las dependencias y package-lock.json fija las versiones resueltas.

## Instalación y ejecución

Trabajar sobre la rama **frontend**. Desde la raíz del repositorio:

~~~sh
cd frontend
npm install
npm run dev
~~~

Para instalaciones reproducibles con el lockfile, usar npm ci. Abrir la URL que indique Vite. No hace falta iniciar Express ni MongoDB.

~~~sh
npm run lint
npm run build
npm run preview
~~~

lint revisa JS/JSX sin permitir advertencias. build genera dist/; preview sirve esa compilación para revisión local. node_modules/ y dist/ están ignorados.

Al publicar esta SPA, el hosting deberá devolver index.html para las rutas del frontend, permitiendo abrirlas directamente o recargarlas con BrowserRouter.

## Variables de entorno

La configuración para la futura API sigue disponible en .env.example:

~~~dotenv
VITE_API_URL=http://localhost:3000/api
~~~

Para un entorno nuevo, copiar .env.example a .env (PowerShell: Copy-Item .env.example .env); conservar el archivo local si ya existe. `src/services/apiConfig.js` lee `import.meta.env.VITE_API_URL`, valida una URL absoluta HTTP/HTTPS sin credenciales, query ni fragmento, y normaliza sus barras. Si la variable no está definida, utiliza `http://localhost:3000/api`; un valor explícito vacío o inválido genera `INVALID_API_URL`. Configurar la URL del backend correspondiente antes de compilar para otro entorno. Reiniciar Vite al cambiar .env. `src/services/api.js` conserva el export `apiBaseUrl` por compatibilidad.

Las variables VITE_* son públicas: no incluir secretos, tokens privados ni credenciales de MongoDB. .env y sus variantes están ignorados; .env.example sí se versiona.

## Cliente HTTP y servicios de API

La infraestructura HTTP está preparada para la futura integración. Ninguna pantalla, formulario ni servicio de datos locales la invoca todavía. No se necesita Axios ni otra dependencia: se utilizan `fetch`, `Headers`, `URL` y `AbortController` nativos.

| Archivo en `src/services/` | Responsabilidad |
| --- | --- |
| `apiConfig.js` | URL base desde Vite, normalización y construcción de URLs/query. |
| `apiClient.js` | Singleton `api` exportado por defecto y fábrica `createApiClient`; métodos GET, POST, PUT, PATCH y DELETE; JSON, JWT, cancelación y errores centralizados. |
| `ApiError.js` | Error común con `status`, `code`, `message`, `details` opcionales y `retryAfter`. |
| `authApi.js` | `register(data, options)` y `login(data, options)`, públicos, mediante POST. |
| `usersApi.js` | `getMe(options)`, `updateMe(data, options)` y `changePassword(data, options)` privados; `getPublicProfile(username, options)` público. |
| `api.js` | Exports compatibles de configuración y acceso a `api`, `createApiClient` y `ApiError`. |
| `localData.js` | Servicios locales actuales, sin cambios ni conexión HTTP. |

### Solicitudes y respuestas

```js
import api from './services/apiClient.js'; // Ajustar la ruta relativa al módulo consumidor.

const health = await api.get('/health');
const login = await api.post('/auth/login', { email, password });
// Se conserva el JSON completo: login.data.token y login.data.user.
```

Todos los métodos devuelven **el contenido JSON completo**, sin extraer automáticamente `data` ni eliminar propiedades adicionales. Las respuestas vacías (incluidos 204 y 205) devuelven `null`. GET y DELETE reciben `(path, options)` y no llevan body; POST, PUT y PATCH reciben `(path, data, options)`. `data` se serializa como JSON y añade `Content-Type: application/json`; si se omite, no envía ese header. `Accept` siempre es `application/json`. `FormData` conserva el body y deja que fetch establezca su Content-Type con el boundary; no se implementa un endpoint de subida.

Los paths son relativos a la base: usar `/users/me`, no `/api/users/me` ni una URL absoluta. Los prefijos repetidos, URLs externas y segmentos `..` se rechazan con `INVALID_REQUEST`. Para parámetros de ruta variables usar `encodeURIComponent`; `usersApi.getPublicProfile` ya lo hace. Las opciones admitidas son `{ query, headers, auth, signal }`. Query acepta un objeto de valores string/número/booleano, arrays como claves repetidas o `URLSearchParams`; omite null/undefined y conserva false/0. Se añaden headers propios sin modificar los originales. No escribir query o fragmentos dentro del path: usar `query`.

Ejemplo de opciones: `api.get('/health', { headers: { 'X-Request-ID': requestId } })`. El soporte genérico de query, PUT y DELETE prepara el transporte: los seis endpoints actuales no definen filtros query y usan únicamente GET, POST y PATCH. El backend tampoco habilita PUT/DELETE en CORS actualmente. No hay servicios de posts, likes o comentarios remotos.

### JWT y servicios específicos

```js
import api from './services/apiClient.js';
import authApi from './services/authApi.js';
import usersApi from './services/usersApi.js';

// Conectar una vez desde la futura capa de autenticación.
// readCurrentToken debe devolver el token actual o null; puede ser asíncrona.
api.setTokenProvider(readCurrentToken);

const result = await authApi.login({ email, password });
// La futura capa de sesión decide qué hacer con result.data.token.
const profile = await usersApi.getMe();
const updated = await usersApi.updateMe({ bio: 'Software developer' });
```

Antes de `getMe`, la futura capa de sesión debe hacer que el proveedor devuelva el token obtenido. El cliente consulta al proveedor en cada solicitud con `auth: true` y construye `Authorization: Bearer <token>`. También se puede usar `api.get('/users/me', { auth: true })`. Los métodos privados de `usersApi` fuerzan esa opción; registro, login y consulta pública fuerzan `auth: false`, aunque el consumidor indique otra cosa. No pasar Authorization manualmente en `headers`.

Una solicitud privada sin token falla localmente con `AUTH_TOKEN_MISSING`, `status: null` y sin llamar al servidor. Si el proveedor falla o devuelve un token con espacios internos, se usa `AUTH_TOKEN_UNAVAILABLE`. `api.setTokenProvider(() => null)` desconecta el proveedor. Para una instancia independiente, `createApiClient({ baseUrl, getToken })`; las fábricas `createAuthApi(client)` y `createUsersApi(client)` permiten asociarle servicios.

El cliente no guarda tokens, no accede a localStorage, no genera JWT, no renueva sesiones ni cierra sesión ante un 401. No envía cookies y rechaza redirects HTTP para evitar reenviar solicitudes con credenciales fuera del destino configurado. No imprime headers, tokens, cuerpos ni errores de transporte en consola.

Al conectar Login, implementar estado de sesión/proveedor, carga, errores y navegación usando `result.data.token` y `result.data.user`. Sign Up utilizará `authApi.register`, mostrará validaciones/duplicados y deberá hacer login por separado: el registro no emite token. Profile utilizará `getMe`, `getPublicProfile` y `updateMe`, adaptando campos al [contrato real](../backend/docs/users-api.md): el perfil público no incluye email, la edición permite solo name/username/bio/avatar y no recibe archivos, banner ni ubicación. `changePassword` recibe exactamente currentPassword/newPassword; no invalida los JWT ya emitidos. Ninguno de estos flujos está conectado en esta tarjeta.

### Errores, reintentos y cancelación

```js
import { ApiError } from './services/ApiError.js';

const controller = new AbortController();
try {
  const health = await api.get('/health', { signal: controller.signal });
  // Usar health.data.status.
} catch (error) {
  if (error.name !== 'AbortError' && error instanceof ApiError) {
    // Mostrar error.message; asociar error.details a los campos cuando existan.
    // Para 429, error.retryAfter indica los segundos antes de volver a intentar.
  }
}
// Llamar controller.abort() al cancelar o desmontar el consumidor.
```

| Situación | Resultado |
| --- | --- |
| HTTP 4xx | `ApiError` conserva status y código del backend, y su mensaje cuando es seguro. `details` conserva únicamente field/message válidos. Incluye 400, 401, 403, 404, 409, 413, 415, 429 y otros estados. |
| HTTP 5xx | Conserva status/código seguro; utiliza mensaje genérico y omite detalles técnicos. |
| HTTP sin envelope de error o HTML de proxy | Conserva el estado observado, con `HTTP_ERROR` y mensaje seguro; no expone contenido crudo. |
| 429 / Retry-After | `retryAfter` expresa segundos, admite número o fecha HTTP y vale `null` si falta o es inválido. El backend expone este header mediante CORS. |
| Fetch rechaza sin respuesta | `NETWORK_ERROR`, `status: null`; no se inventa HTTP 500. El navegador no permite distinguir de manera fiable backend caído, red y bloqueo CORS: comprobar Network/CORS y disponibilidad del servidor. |
| Respuesta exitosa no JSON | `INVALID_RESPONSE` con el status observado. |
| JSON malformado | `INVALID_JSON_RESPONSE` con el status observado. |
| Fallo al leer el body | `RESPONSE_READ_ERROR` con el status observado. |
| Cancelación | `DOMException` con `name: 'AbortError'`, sin exponer el motivo original; manejarla sin mostrar un error al usuario. |

No se adjuntan causas, requests, responses, URLs o cuerpos crudos a `ApiError`. Se filtran valores de token/contraseñas enviados y patrones técnicos sensibles de mensajes y detalles. Los errores de configuración/entrada también usan `ApiError` con status null. El consumidor debe mirar `code` además de status: un 401 de login (`INVALID_CREDENTIALS`) o de contraseña actual (`INVALID_CURRENT_PASSWORD`) no equivale necesariamente a una sesión vencida.

No hay reintentos automáticos ni deduplicación de solicitudes: cada llamada explícita produce como máximo un intento de fetch. Los consumidores futuros deben coordinar carga/cancelación y evitar dobles envíos; las URLs, headers y tratamiento HTTP no se duplican en componentes.

### Pruebas del transporte

Desde `frontend/`:

```sh
npm test
npm run lint
npm run build
```

Se utiliza `node:test` de Node 24, sin nuevas dependencias. `test/apiClient.test.js` usa fetch simulado y respuestas nativas para métodos/JSON/FormData, autenticación, errores, Retry-After y AbortSignal. `test/apiConfig.test.js` comprueba normalización, query y paths; también utiliza Vite para verificar realmente `import.meta.env.VITE_API_URL`, deshabilitando la lectura de `.env`. `test/apiServices.test.js` verifica los seis contratos mediante fetch simulado. Las pruebas no crean usuarios, no usan MongoDB ni realizan solicitudes de red. Pueden requerir permiso para iniciar el subproceso local de Vite; no prueban el comportamiento CORS de un navegador real.

## Organización

~~~text
src/
├── assets/images/       # Logos originales
├── components/
│   ├── common/          # Avatar, BrandLogo, Icon y PagePlaceholder
│   ├── layout/          # PageHeader, Sidebar y RightSidebar
│   ├── auth/            # AuthField, LoginForm y RegisterForm
│   ├── posts/           # CreatePost, PostCard, EditPostModal,
│   │                    # AttachmentPicker y PostAttachments
│   ├── profile/         # ProfileHeader y EditProfileModal
│   └── comments/        # CommentForm
├── context/             # DataContext y DataProvider
├── hooks/               # useData y useAttachments
├── layouts/             # AppLayout y AuthLayout
├── pages/               # Home, Profile, Settings, Thread, Login,
│                        # Register y NotFound
├── routes/AppRouter.jsx
├── services/            # Cliente HTTP, configuración, authApi/usersApi y localData.js
├── utils/               # previewPosts.js y authValidation.js
├── styles/              # variables.css, global.css y layout.css
├── App.jsx
└── main.jsx
~~~

App.jsx monta DataProvider por fuera de BrowserRouter, por lo que el estado publicado sobrevive a la navegación. No hay rutas privadas ni redirecciones basadas en sesión. Los layouts usan Outlet y no contienen lógica de negocio ni solicitudes HTTP.

| Ruta | Página | Layout |
| --- | --- | --- |
| / | HomePage | AppLayout |
| /profile | ProfilePage | AppLayout |
| /settings | SettingsPage | AppLayout |
| /posts/:postId | ThreadPage | AppLayout |
| /posts/:postId/comments/:commentId | ThreadPage | AppLayout |
| /login | LoginPage | AuthLayout |
| /register | RegisterPage | AuthLayout |
| Otras | NotFoundPage | AppLayout |

## Datos y servicios locales

utils/previewPosts.js contiene el perfil inicial de Alex Morgan y cinco publicaciones con comentarios anidados. Home usa el listado unificado; Profile comienza con las tres publicaciones propias presentes en ese listado. Estos ejemplos no son un contrato de API ni representan una sesión autenticada.

services/localData.js crea una instancia independiente con una copia de los datos iniciales y expone:

- getSnapshot y subscribe para leer y observar el estado compartido.
- createPost y updatePost para publicar y editar contenido propio.
- addComment para responder un post o comentario.
- toggleLike para alternar el like y su contador.
- updateProfile para guardar campos e imágenes del perfil.
- dispose para liberar las URLs de archivos que pertenecen al servicio.

Las mutaciones son métodos asíncronos que notifican a los componentes mediante useData y useSyncExternalStore. No escriben en localStorage, sessionStorage ni en los archivos JavaScript. Una recarga crea una instancia nueva y descarta publicaciones, comentarios, likes, perfil e imágenes modificados. Un enlace a una publicación creada localmente deja de existir tras recargar.

### Publicaciones y adjuntos

CreatePost acepta texto, código o adjuntos: cualquiera de los tres permite publicar sin exigir los otros. Los espacios solos no son contenido válido. El editor opcional conserva código y lenguaje al ocultarlo; el código y el HTML se muestran como texto, nunca se ejecutan.

Al publicar se agrega la tarjeta al feed y se limpia el borrador. En el menú de las tarjetas propias se puede abrir EditPostModal; también se pueden editar los comentarios propios. Guardar mantiene el ID, fecha de creación, likes y respuestas, y muestra la marca Edited. Cancelar descarta los cambios del borrador. El servicio comprueba la propiedad antes de editar. No hay eliminación de publicaciones.

AttachmentPicker permite seleccionar varios archivos y useAttachments administra validación, previews y limpieza:

- Imágenes PNG, JPG, WebP o GIF, hasta **10 MB por imagen**, comprobando que se puedan decodificar.
- Archivos generales de hasta **25 MB por archivo**.
- Los archivos generales se ofrecen como descargas con su nombre original y tipo application/octet-stream, sin previsualizar HTML u otros documentos ejecutables.
- Los recursos guardados tienen URLs independientes de las del borrador. Cancelar una edición no elimina los adjuntos publicados; reemplazarlos o quitarlos al guardar libera los recursos que dejan de usarse.

No se impone un límite de caracteres ni de cantidad de adjuntos sin acordarlo con backend. Los archivos permanecen únicamente en memoria durante esta visita; no se suben a ningún servidor.

### Comentarios y likes

ThreadPage mantiene las sidebars, muestra el elemento seleccionado y sus respuestas directas, y permite abrir hilos anidados. Incluye enlaces al post original y al comentario padre. El botón superior vuelve al origen por historial; en una entrada directa vuelve al padre, Home o Profile según corresponda. IDs inexistentes o comentarios de otro post muestran NotFound. Reply enfoca el formulario sin agregar una entrada al historial.

CommentForm publica texto o adjuntos en el estado compartido, actualiza el contador y limpia el borrador. Los likes de posts y comentarios funcionan localmente. La búsqueda de GIFs mediante GIPHY sigue deshabilitada; se puede adjuntar un GIF propio desde el selector de imágenes.

### Perfil

ProfilePage obtiene el perfil compartido y permite alternar Posts y Replies. Sidebar muestra ese mismo perfil local, no una sesión real. EditProfileModal guarda nombre, username sin @, bio, ubicación, banner y foto; los cambios de autor se reflejan también en las publicaciones y respuestas propias.

El diálogo nativo mantiene el foco dentro y bloquea el scroll del fondo. Location aparece debajo de Bio. El avatar se superpone al banner; hover o foco oscurecen las imágenes y muestran sus controles. En dispositivos sin hover, los iconos permanecen visibles. También se pueden quitar las imágenes.

Banner y foto aceptan PNG, JPG o WebP de hasta **10 MB**, comprobando que se puedan abrir. Una selección inválida mantiene la anterior y muestra un error asociado. Guardar espera las comprobaciones pendientes; cancelar descarta el borrador sin modificar el perfil. Al reabrir se muestran los datos guardados durante la visita. No hay campos de contraseña en este modal.

### Apariencia y autenticación

Settings contiene las pestañas Appearance y Password, con relaciones accesibles y navegación de pestañas mediante flechas, Home y End.

Elegir Light/Dark o Small/Medium/Large aplica y guarda la preferencia inmediatamente. Se usan data-theme y data-font-size, y las claves coffee-zone-theme y coffee-zone-font-size. index.html las restaura antes de React y CSS; valores inválidos o almacenamiento inaccesible mantienen Dark y Medium. Los fallos de cada preferencia son independientes y no impiden aplicar el cambio durante la visita.

Login, registro y Password validan campos localmente, pero un envío válido informa que la autenticación o el cambio de contraseña no están conectados. No crean cuentas, verifican contraseñas, generan sesiones ni guardan contraseñas o tokens. Remember me y Forgot password? siguen deshabilitados. Los datos sensibles del borrador de Password se descartan al salir de su pestaña.

RightSidebar mantiene la búsqueda y Follow deshabilitados, con tendencias estáticas. No se simulan esas acciones.

## Diseño y responsive

Se conserva la referencia de Figma, los bordes sutiles y la paleta violeta:

- #2C0A4A: Dark Purple.
- #531887: Primary Purple.
- #8D34DB: Accent Purple.
- #CDB4E2: Light Purple.

variables.css centraliza colores, tipografía, espacios y dimensiones. Small usa escala 0.875, Medium 1 y Large 1.125. Solo cambia el texto; el tamaño raíz de 16 px, espacios, columnas, iconos e imágenes se mantienen. El código conserva scroll horizontal interno y los modales tienen scroll interno en pantallas bajas.

- Desde 1200 px: tres columnas, ancho máximo de 1440 px.
- De 1024 a 1199 px: tres columnas con espacios reducidos.
- De 768 a 1023 px: sidebar y contenido, sin columna derecha.
- De 600 a 767 px: navegación lateral compacta.
- Hasta 599 px: contenido central, logo superior y navegación inferior fija.

BrandLogo alterna las versiones claras/oscuras y usa el símbolo en espacios compactos. Se mantienen nombres accesibles, encabezados jerárquicos, foco visible y enlace para saltar al contenido.

## Convenciones

- Nombres técnicos y textos de interfaz en inglés; documentación en español.
- Componentes PascalCase y páginas con sufijo Page; funciones camelCase y hooks con prefijo use.
- .jsx para componentes y .js para módulos sin JSX.
- Imports relativos con extensión; dos espacios, comillas simples en JS y dobles en JSX, punto y coma.
- Reutilizar componentes y variables CSS; no agregar lógica HTTP a los layouts.
- Estado de borradores en cada formulario; datos publicados en el proveedor compartido.

Para agregar una página, crear su componente en pages/, importarlo en AppRouter.jsx y agregar una Route dentro del layout correspondiente. Si debe aparecer en la navegación principal, actualizar navigationItems en Sidebar.jsx. Revisar entrada directa, navegación y responsive.

## Integrar la API en el futuro

La capa local separa las operaciones de datos de los formularios. Al conectar backend, habrá que reemplazar su implementación por servicios HTTP y adaptar carga, errores y actualización del estado compartido, manteniendo los componentes cuando los contratos lo permitan.

Antes de hacerlo, acordar endpoints, campos, IDs, paginación, autenticación, permisos, formatos de error y transporte de archivos con backend. Los blobs locales deberán reemplazarse por archivos enviados y URLs proporcionadas por el servidor. Las comprobaciones del cliente no sustituyen validación ni autorización del servidor. No se asume que conectar la API sea un reemplazo automático sin esos acuerdos.

## Validación y pendientes

- Vite, lint y build verificados sin backend y sin nuevas dependencias.
- 32 comprobaciones de servicios locales: datos iniciales e independientes, creación/edición, propiedad, respuestas anidadas, likes, perfil compartido, archivos descargables, limpieza de recursos y reinicio.
- 65 comprobaciones DOM de los flujos locales: publicaciones, snippets, edición y cancelación, adjuntos, límites e imágenes inválidas, respuestas anidadas, doble envío, perfil y propagación del autor, cancelación y eliminación de imágenes, recursos temporales y ausencia de persistencia del contenido.
- 144 casos responsive mediante iframes: editor con adjuntos, tarjetas publicadas, modal de edición y controles de imágenes del perfil, en ambos temas, los tres tamaños y 1440, 1024, 768, 600, 390 y 320 px, sin overflow horizontal de página. Otros 24 casos en pantallas de 390/320 × 430 px comprobaron las acciones de ambos modales mediante scroll interno.
- Recarga real comprobada: el hilo de una publicación nueva deja de existir, Home y Profile vuelven a sus fixtures, campos e imágenes del perfil se reinician y solo la apariencia sigue almacenada.
- Tras corregir claves repetidas entre la tarjeta seleccionada y el formulario del hilo, pasaron 30 comprobaciones adicionales de creación, edición, likes, respuestas, perfil, navegación por todos los hilos iniciales y limpieza de las preferencias usadas en las pruebas, sin tarjetas residuales ni errores React. Lint y build volvieron a pasar; no hubo solicitudes de API.
- Las pruebas anteriores de apariencia y validación de autenticación siguen siendo referencias de esas áreas; los antiguos avisos de formularios sin publicación fueron reemplazados por la funcionalidad local.
- Queda pendiente la revisión visual y con teclado/puntero nativos: el navegador integrado está oculto y no permite capturas ni interacción nativa fiable. Las pruebas DOM, eventos sintéticos e iframes no sustituyen esa revisión, incluido el selector nativo y los gestos táctiles.
- Backend, autenticación, publicación remota, almacenamiento remoto de archivos y GIPHY permanecen sin integrar.
