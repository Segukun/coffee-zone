# Coffee Zone — Frontend

Frontend de React + Vite para las pantallas del MVP. Incluye navegación, layouts, componentes visuales compartidos, formularios de login y registro con validación local, editor CreatePost, tarjetas de posts de ejemplo en Home, perfil visual con publicaciones propias, modal Edit Profile, Settings con pestañas de apariencia y contraseña e hilos de comentarios con formulario de respuesta. El tema claro/oscuro y el tamaño de texto se aplican globalmente al elegir una opción y se guardan en el navegador. Todavía no hay autenticación real, publicación real, cambio real de contraseña, guardado de perfil, feed conectado ni integración HTTP. Se puede ejecutar sin backend.

## Tecnologías y requisitos

- Node.js **24.x** y npm.
- React y React DOM 19, JavaScript/JSX y módulos ES.
- Vite 8 con su plugin de React.
- React Router DOM 7 en modo declarativo.
- ESLint 10, reglas recomendadas de JavaScript, React Hooks y React Refresh.
- CSS propio, sin librerías de UI, estado o cliente HTTP.
- React Icons para el sidebar, imágenes, GIF y los iconos de navegación y metadatos.

package.json declara las dependencias y package-lock.json fija las versiones resueltas. Sidebar usa IoHomeOutline, CgProfile e IoSettingsOutline de React Icons; CreatePost usa IoImageOutline para la acción de imagen deshabilitada. ProfileHeader usa IoArrowBackOutline, IoLocationOutline e IoCalendarOutline. ThreadPage usa IoArrowBackOutline; CommentForm usa IoImageOutline y HiOutlineGif. Los demás iconos compartidos siguen siendo SVG locales.

## Instalación y ejecución

Trabajar sobre la rama **frontend**. Desde la raíz del repositorio:

~~~sh
cd frontend
npm install
~~~

Para instalaciones reproducibles con el lockfile, usar npm ci. Copiar .env.example a .env (PowerShell: Copy-Item .env.example .env) y ejecutar:

~~~sh
npm run dev
~~~

Abrir la URL que indique Vite. No hace falta iniciar Express ni MongoDB.

~~~sh
npm run lint
npm run build
npm run preview
~~~

lint revisa JS/JSX sin permitir advertencias. build genera dist/; preview sirve esa compilación para revisión local. node_modules/ y dist/ están ignorados.

Al publicar esta SPA, el hosting deberá devolver index.html para las rutas del frontend (/profile, /login, etc.). Esto permite abrirlas directamente o recargarlas con BrowserRouter.

## Variables de entorno

~~~dotenv
VITE_API_URL=http://localhost:3000/api
~~~

src/services/api.js exporta **apiBaseUrl**, lee import.meta.env.VITE_API_URL, usa ese valor local por defecto y quita las barras finales. Todavía no envía solicitudes HTTP.

Reiniciar Vite al cambiar .env. Las variables VITE_* son públicas en el navegador: no incluir secretos, JWT privados ni credenciales de MongoDB. .env y sus variantes están ignorados; .env.example sí se versiona.

## Estructura

~~~text
frontend/
├── public/
├── src/
│   ├── assets/
│   │   ├── images/                # Los tres logos originales
│   │   └── icons/                 # Reservado para recursos de iconos
│   ├── components/
│   │   ├── common/
│   │   │   ├── Avatar.jsx
│   │   │   ├── BrandLogo.jsx
│   │   │   ├── Icon.jsx
│   │   │   └── PagePlaceholder.jsx
│   │   ├── layout/
│   │   │   ├── PageHeader.jsx
│   │   │   ├── RightSidebar.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── auth/                  # AuthField, LoginForm y RegisterForm
│   │   ├── posts/                 # CreatePost y PostCard: editor y tarjetas visuales
│   │   ├── profile/               # ProfileHeader y EditProfileModal
│   │   └── comments/              # CommentForm: respuesta visual sin publicación
│   ├── layouts/
│   │   ├── AppLayout.jsx
│   │   └── AuthLayout.jsx
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── SettingsPage.jsx
│   │   ├── ThreadPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   └── NotFoundPage.jsx
│   ├── routes/
│   │   └── AppRouter.jsx
│   ├── services/
│   │   └── api.js
│   ├── context/
│   ├── hooks/
│   ├── utils/
│   ├── styles/
│   │   ├── variables.css
│   │   ├── global.css
│   │   └── layout.css
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
~~~

public/ contiene archivos servidos sin importarlos. context/ queda reservado para estado compartido cuando sea necesario, sin sesión simulada. hooks/ queda reservado para hooks reutilizables. utils/authValidation.js contiene las validaciones locales de login y registro.

## Components, pages y layouts

- **Components:** piezas reutilizables. common/ contiene elementos generales y layout/ contiene navegación, encabezado y descubrimiento. Las carpetas por dominio se completarán con sus futuras funcionalidades.
- **Pages:** contenido de una ruta. Cada página arma su pantalla usando componentes; los placeholders actuales se reemplazan aquí.
- **Layouts:** estructura compartida que permanece entre páginas. Ambos layouts usan Outlet para insertar la página correspondiente.

App.jsx monta BrowserRouter; routes/AppRouter.jsx define el árbol de rutas. No hay rutas privadas ni redirecciones basadas en sesión.

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

Sidebar usa NavLink, que aplica el estilo activo y aria-current="page". El espacio inferior del usuario está reservado y no representa una sesión. RightSidebar contiene búsqueda deshabilitada, desarrolladores con Follow deshabilitado y tendencias estáticas tomadas del diseño. No se simulan acciones exitosas.

AuthLayout ofrece encabezado, enlace a la otra pantalla de acceso, contenido central y pie. LoginPage y RegisterPage componen los formularios de components/auth/. AuthField comparte etiquetas, errores accesibles y controles independientes para mostrar u ocultar contraseñas.

Los formularios validan campos obligatorios y formato de email; registro también valida username sin @ (letras, números y guiones bajos), nombre no vacío, contraseña de al menos ocho caracteres con una letra y un número, y confirmación coincidente. Estas reglas de interfaz deben acordarse con backend antes de integrar la API; no reemplazan su validación.

Al enviar datos válidos se informa que la conexión al backend está pendiente: no se crea una cuenta, no se inicia sesión ni se guardan contraseñas o tokens. Remember me y Forgot password? permanecen deshabilitados. Los textos legales no son enlaces, porque todavía no existen páginas legales.

PostCard recibe un objeto post con author (name, username sin @, avatarUrl y avatarAccent opcionales), createdAt ISO, content, codeSnippet opcional (language y code), likesCount, comments opcional e isLiked opcional. Muestra avatar por imagen o iniciales, fecha, contenido y hashtags, código como texto sin ejecutarlo y contadores; el número de comentarios corresponde a los hijos directos del ejemplo. El icono de comentarios abre el hilo del post. threadPath, isComment e isDetail permiten reutilizar la tarjeta para comentarios navegables y el contenido seleccionado. Likes y opciones siguen deshabilitados. utils/previewPosts.js reúne los ejemplos visuales de Home, Profile y sus comentarios anidados; no define un contrato de API ni representa una sesión real.

CreatePost reemplaza el placeholder del editor en Home. Incluye textarea de contenido, editor de código opcional desplegable, selector de lenguaje y botón Post. El contenido vacío o compuesto solo por espacios muestra un error accesible y recibe el foco. El snippet puede quedar vacío; al ocultar su editor se conservan código y lenguaje. El código se trata como texto y no se ejecuta. La acción de imagen está deshabilitada. Post informa explícitamente que no se publicó nada y conserva los campos; no agrega tarjetas al feed ni escribe en el almacenamiento del navegador. El borrador solo vive en el estado local del componente y se pierde al salir de Home o recargar. No se impone un límite de caracteres sin acordarlo con backend.

ThreadPage muestra el post o comentario seleccionado en la columna central de AppLayout, conservando ambas sidebars y sus puntos de corte responsive. Se abre desde el icono de comentarios de Home/Profile o desde el contenido y el icono de respuesta de un comentario. Muestra avatar, autor, fecha, contenido, formulario y comentarios de ejemplo; cada respuesta puede abrir su propio hilo. Los comentarios incluyen enlaces al post original y, cuando corresponde, al comentario padre. El botón superior vuelve al origen mediante el historial; una entrada directa vuelve al padre, Home o Profile según el ejemplo. IDs inexistentes o comentarios de otro post muestran NotFound. El contenido seleccionado recibe el foco de encabezado y se lleva al inicio; Reply enfoca el textarea sin agregar una entrada al historial.

CommentForm valida contenido vacío o compuesto solo por espacios, asocia el error y enfoca el campo. El envío válido informa que no se publicó nada y conserva el texto. No agrega comentarios, no escribe en localStorage/sessionStorage ni solicita una API. Cambiar de hilo o recargar descarta el borrador y sus avisos. Imagen y GIF son controles visuales deshabilitados; likes también siguen sin conexión. Los contadores muestran solo las respuestas directas presentes en los datos de ejemplo.

ProfilePage muestra el perfil de ejemplo de Alex Morgan y dos posts propios, uno de texto y otro con snippet, reutilizando PostCard. ProfileHeader recibe profile, postsCount y onEdit: nombre, username sin @, avatarUrl opcional, bio y ubicación opcionales, joinedAt ISO, followingCount y followersCount. Presenta portada violeta, avatar superpuesto, bio, fecha de ingreso y contadores informativos. El enlace superior vuelve a Home, incluso al acceder directamente a /profile. Edit Profile abre el modal; Replies permanece deshabilitado y Posts es el encabezado del listado, no un control de pestañas simulado. El perfil no representa una sesión real ni modifica los ejemplos de Home.

EditProfileModal recibe profile y onClose. Usa dialog nativo con showModal para aislar el fondo y mantener el foco en el formulario, con nombre, username sin @, bio y ubicación opcionales precargados. Location aparece debajo de Bio. Sobre los campos se muestra el banner con el avatar superpuesto. Ambas imágenes tienen controles superpuestos: hover y foco visible oscurecen la imagen y muestran un icono; en dispositivos sin hover o con puntero táctil los iconos permanecen visibles. Clic, Enter o Espacio activan el selector nativo de la imagen correspondiente, sin botones externos. Se pueden previsualizar imágenes PNG, JPG o WebP para el banner y la foto únicamente en el borrador local. Se comprueba que sean decodificables; archivos inválidos conservan la selección anterior y muestran errores asociados al control correspondiente. Cada imagen mantiene su selección independiente. Las URLs temporales se liberan al reemplazar la imagen o cerrar, y una selección anterior lenta no reemplaza la más reciente ni actualiza un modal cerrado. El control del banner recibe el foco inicial. Cancel y el evento de Escape cierran el diálogo y devuelven el foco a Edit Profile. El scroll del fondo se bloquea mientras está abierto; en pantallas bajas el modal tiene scroll interno. Se validan nombre y username no vacíos y el mismo formato de username del registro. Save Changes informa que no se guardó nada y conserva el borrador: no modifica el perfil, los posts ni el almacenamiento ni sube archivos. Al cerrar se descarta el borrador, incluidas ambas imágenes, y al reabrir se recuperan los datos originales. No hay campos de contraseña; el formulario correspondiente está en Settings.

SettingsPage contiene las pestañas Appearance y Password en la misma ruta, sin modales adicionales. Usa tablist, tab y tabpanel con selección, relaciones accesibles y foco itinerante; las flechas izquierda/derecha, Home y End seleccionan y enfocan las pestañas. Appearance presenta grupos de radio para Light/Dark Mode y Small/Medium/Large, precargados con las preferencias activas. Elegir una opción la aplica y guarda inmediatamente: el tema mediante data-theme y coffee-zone-theme (light/dark), y el tamaño mediante data-font-size y coffee-zone-font-size (small/medium/large), en localStorage. No hay backend ni botones Save Preferences o Cancel en Appearance. Los avisos de ambas preferencias son independientes: guardar una no oculta un error de almacenamiento de la otra. Si el navegador impide escribir, el cambio se aplica durante la visita y se informa que no pudo guardarse. Ambas preferencias se conservan al cambiar de pestaña, navegar o recargar.

Password reutiliza AuthField para contraseña actual, nueva y confirmación, con visibilidad independiente. validatePasswordChange comprueba campos obligatorios, la misma regla de registro para la contraseña nueva y confirmación exacta sin recortar espacios. Los errores están asociados a los campos y el primero recibe el foco. Change Password informa que no se cambió nada ni se verificó la contraseña actual, conservando el borrador local. Cancel vacía los campos, errores y aviso y vuelve a ocultar todas las contraseñas; salir de la pestaña desmonta el formulario y descarta los datos sensibles. No hay solicitudes HTTP ni persistencia de contraseñas.

## Diseño y responsive

La referencia principal son las seis capturas del Figma.docx suministrado. Se conservan bordes sutiles y la paleta violeta actualizada para acompañar el logo:

- #2C0A4A: Dark Purple.
- #531887: Primary Purple.
- #8D34DB: Accent Purple.
- #CDB4E2: Light Purple.

styles/variables.css centraliza colores, tipografía, espaciado y dimensiones. Los valores predeterminados son Dark y Medium, sin depender del tema del sistema. index.html restaura coffee-zone-theme y coffee-zone-font-size antes de cargar React y las hojas de estilo, evitando cambios tardíos de apariencia. Solo acepta light/dark y small/medium/large; valores ausentes o inválidos y almacenamiento inaccesible mantienen los valores predeterminados sin impedir el arranque. Cada lectura es independiente: un fallo no impide restaurar la otra preferencia. La tipografía usa --font-scale: Small 0.875, Medium 1 y Large 1.125. Medium conserva la tipografía original; Small y Large la reducen/aumentan un 12.5 %. Solo se escalan los tamaños de texto, incluidos campos, títulos y snippets; el tamaño raíz, espacios, radios, columnas, iconos e imágenes no cambian. Las variables de modo claro se activan con :root[data-theme='light'], incluido color-scheme para los controles nativos. El tema permanece al navegar por los dos layouts y recargar. En oscuro, los enlaces usan Light Purple para mantener contraste con la nueva paleta; Accent Purple se conserva para detalles y foco. Los controles superpuestos de imágenes mantienen iconos blancos sobre el sombreado en ambos temas.

BrandLogo alterna el horizontal dark/light según el tema y usa el símbolo original en espacios compactos. Los archivos se copiaron sin modificar su contenido. El original LogoHorizontalLigthmode.webp tiene un error de escritura en el nombre: solo su copia interna se llama LogoHorizontalLightmode.webp.

- Desde 1200 px: tres columnas, ancho máximo de 1440 px.
- De 1024 a 1199 px: tres columnas con anchos y espacios reducidos.
- De 768 a 1023 px: sidebar y contenido; se oculta la columna derecha.
- De 600 a 767 px: navegación lateral compacta con iconos y etiquetas.
- Hasta 599 px: contenido central, logo superior y navegación inferior fija con las tres rutas. Se reserva espacio inferior para que no tape el contenido.

Se incluyen nombres accesibles, títulos jerárquicos, foco visible y enlace para saltar al contenido.

## Convenciones

- Nombres técnicos en inglés; documentación en español.
- Textos de la interfaz y etiquetas de accesibilidad en inglés.
- Componentes en PascalCase y páginas con sufijo Page.
- Funciones y variables en camelCase; hooks con prefijo use.
- .jsx para componentes y .js para módulos sin JSX.
- Imports relativos con extensión; dos espacios, comillas simples en JS y dobles en JSX, punto y coma.
- CSS separado: variables de diseño, estilos generales y estructura responsive.
- Reutilizar componentes pequeños y evitar estilos inline o duplicación.
- Mantener estado local por defecto. Agregar context solo cuando haya una necesidad compartida.
- No incorporar lógica de negocio ni solicitudes HTTP en los layouts.

## Agregar una página

1. Crear src/pages/ExamplePage.jsx con un componente exportado por defecto.
2. Importarlo en src/routes/AppRouter.jsx.
3. Agregar la ruta dentro del grupo de AppLayout o AuthLayout, según corresponda:

~~~jsx
<Route path="example" element={<ExamplePage />} />
~~~

4. Si debe aparecer en la navegación principal, agregar su entrada al arreglo navigationItems de Sidebar.jsx.
5. Revisar acceso directo, navegación, ruta activa y tamaños de pantalla.

Ejemplo del contenido de una página:

~~~jsx
import PageHeader from '../components/layout/PageHeader.jsx';

export default function ExamplePage() {
  return <PageHeader title="Example" />;
}
~~~

## Agregar un componente reutilizable

1. Revisar si ya existe una pieza equivalente.
2. Crear un archivo PascalCase en components/common/ si es general, o en la carpeta de su dominio si es específico.
3. Recibir datos y callbacks por props; mantener separada la comunicación HTTP.
4. Agregar las clases CSS necesarias y reutilizar las variables de diseño.
5. Importarlo desde las páginas o componentes que lo necesiten. Quitar el .gitkeep si era una carpeta reservada.

## Integrar la API en el futuro

Flujo previsto:

~~~text
Page / Hook → Service por recurso → services/api.js → Backend /api
~~~

La configuración base ya se puede importar:

~~~js
import { apiBaseUrl } from './api.js';
~~~

Cuando comience la integración, agregar el transporte compartido con fetch en services/api.js y crear services como postService.js o userService.js. Usar rutas relativas al prefijo /api, sin duplicarlo. Acordar endpoints, campos, códigos HTTP y autenticación con backend antes de implementar cada operación.

El contrato previsto devuelve { data: ... } en éxito y { error: { message: ... } } en errores. El transporte futuro deberá comprobar el estado HTTP y propagar los errores; páginas y hooks manejarán carga y error. Estos comportamientos todavía no están implementados.

## Validación y pendientes

- Instalación, inicio de Vite, lint y build verificados.
- Las rutas se comprueban mediante respuesta HTTP y renderizado React con el router en memoria: layouts correctos, enlaces de navegación y estado activo.
- El frontend renderiza sin backend y no implementa solicitudes HTTP.
- Login y registro se probaron en el navegador integrado con campos vacíos, datos inválidos y válidos, confirmación de contraseña, controles de visibilidad y navegación entre pantallas. También se ejecutaron 14 comprobaciones de validación local.
- Se verificó el renderizado y la ausencia de overflow horizontal de ambos formularios en 1440, 1024, 768, 600, 390 y 320 px mediante iframes del navegador.
- PostCard pasó 16 comprobaciones de renderizado: datos del autor, fecha, avatar por imagen o iniciales, snippet opcional, contadores en cero, variantes visuales y contenido HTML escapado. Se revisó una captura de Home y se comprobó ausencia de overflow en seis anchos, incluso con nombres y contenido largos; el código mantiene scroll horizontal interno.
- CreatePost pasó 18 comprobaciones de comportamiento en navegador: envío vacío y solo con espacios, error asociado y foco, texto sin snippet, editor opcional, selección de lenguaje, conservación de campos, código literal, feed sin cambios y ausencia de escrituras en almacenamiento. Se comprobaron 12 casos responsive (editor cerrado y abierto con contenido largo en seis anchos), scroll interno del código y regresiones de login, registro, perfil y ajustes. Sin errores de consola ni solicitudes HTTP de API.
- Perfil pasó 20 comprobaciones de renderizado y variantes (bio y ubicación ausentes, avatar por imagen o iniciales, contadores en cero y texto HTML escapado), 10 comprobaciones de comportamiento y 12 casos responsive en seis anchos con datos originales y textos largos. Se revisó una captura del perfil y se verificó navegación con teclado antes de integrar el modal. Navegación del sidebar, autor de ambos posts y regresiones de Home, login, registro y ajustes verificados. Sin errores de consola ni solicitudes de API.
- EditProfileModal pasó 25 comprobaciones DOM: apertura modal en StrictMode, valores iniciales, foco, fondo aislado, validación, texto literal, ausencia de contraseñas, perfil y almacenamiento sin cambios, Cancel, evento nativo de cancelación y reapertura sin datos anteriores. Pasaron 24 casos responsive (estado inicial, errores y borrador largo en seis anchos y dos pantallas de poca altura), con botones accesibles mediante scroll interno. Regresiones de las otras rutas verificadas; sin errores de consola ni solicitudes de API.
- Los controles superpuestos del banner y la foto pasaron 43 comprobaciones DOM y de imágenes: selectores independientes, PNG/JPG/WebP, archivos inválidos, reemplazo, selecciones concurrentes, cierre/reapertura, foco visible, recursos liberados y ausencia de guardado. El hover de ambas imágenes se verificó mediante el selector y el estilo calculado. Pasaron 24 casos responsive con estado inicial, errores/ubicación larga y ambas imágenes seleccionadas. La regla que muestra los iconos en dispositivos táctiles se comprobó activándola temporalmente; no se probó un gesto táctil real. Home, login, registro y Settings siguieron renderizando sin overflow a 390 px.
- Antes de activar el tema, Settings pasó 33 comprobaciones DOM de su interfaz como borrador: pestañas y sus relaciones, manejo sintético de flechas/Home/End, grupos de radio, selección/cancelación de preferencias, avisos sin guardado, validación de contraseñas, foco, visibilidad independiente, limpieza al cancelar o salir de Password y ausencia de almacenamiento. Pasaron 10 casos de validación de contraseña y dos regresiones de validación de login/registro. Se comprobaron 40 casos responsive en seis anchos y dos pantallas bajas: Appearance inicial/con aviso y Password inicial/con errores/con borrador largo y aviso. Los controles y acciones se mantuvieron accesibles mediante scroll, sin overflow horizontal. Pasaron ocho regresiones de Home, perfil/modal, login y registro en 1440 y 320 px.
- La primera versión del tema, con confirmación de guardado, pasó 27 comprobaciones en navegador: selección como borrador, Save/Cancel, cambio global, navegación, recargas reales en claro y oscuro, conservación entre pestañas, aviso ante escritura bloqueada, recuperación del almacenamiento, ausencia de guardado del tamaño de texto y regresiones de contraseña/modal. Ocho casos del script de arranque comprobaron valores válidos, ausentes o inválidos y errores de lectura/acceso a localStorage; se verificó que la inicialización precede a React también en la compilación. Pasaron 128 casos responsive en ambos temas: Home/editor, perfil/modal, Settings/errores de contraseña, login y registro en seis anchos y dos pantallas bajas. Se verificaron las variantes de logo y su carga, ausencia de overflow y 2036 muestras de contraste de textos, con mínimos de 5.43:1 en claro y 6.01:1 en oscuro. Los cuatro violetas permanecen exactamente como los definió el usuario. Sin errores de consola ni solicitudes de API; las pruebas de DOM no sustituyen la revisión visual de ambos temas.
- Antes de activar el tamaño de texto, el guardado inmediato del tema reemplazó la confirmación anterior y pasó 20 comprobaciones de comportamiento y recarga, incluyendo cambio y persistencia al seleccionar Light/Dark, ausencia de botones o formulario de guardado en Appearance, navegación, avisos ante almacenamiento bloqueado y recuperación, conservación de esos avisos al seleccionar tamaño de fuente, independencia de Password y ausencia de escrituras ajenas al tema. Pasaron 32 casos responsive de Appearance y Password con errores en ambos temas, seis anchos y dos pantallas bajas, sin overflow y con logos correctos. Lint y build correctos. La revisión visual y de teclado nativo sigue pendiente.
- Small/Medium/Large pasó 25 comprobaciones de comportamiento y recarga: escala inmediata de cuerpo, títulos y campos, conservación de espacios y tamaño raíz, persistencia de los tres tamaños, navegación, relación independiente con el tema, fallos y recuperación de almacenamiento, avisos separados y regresiones de Password. Pasaron 32 casos del script de arranque con preferencias válidas, ausentes o inválidas y lecturas bloqueadas; la restauración precede a React y CSS también en producción. Se comprobaron 320 casos responsive en los tres tamaños y ambos temas: Home/editor con líneas largas, perfil/modal con bio larga, Settings/errores de contraseña, login y registro en seis anchos, más Large en dos pantallas bajas. Sin overflow horizontal de página; código con scroll interno, logos correctos y acciones del modal accesibles mediante scroll. Lint y build correctos. La revisión visual y de teclado nativo sigue pendiente.
- Los hilos de comentarios pasaron 38 comprobaciones de comportamiento y recarga: validación, errores asociados y foco, borrador literal, avisos sin publicación, cambio de hilo, respuestas anidadas, regreso a Home/Profile, conservación del modal y descarte al recargar. Siete escenarios de entrada directa verificaron regreso al origen correspondiente y rechazo de IDs inexistentes o de otro post. El renderizado SSR pasó 166 escenarios con 2117 aserciones, incluidos los cinco posts, los 16 comentarios, estados sin respuestas, 108 rutas inválidas y contenido/snippets HTML escapados. Pasaron 324 casos responsive de post/comentario/hilo vacío, estado inicial/error/borrador largo, ambos temas, tres tamaños y seis anchos, más 60 regresiones de las cinco páginas iniciales. Sin overflow horizontal ni cambios de tamaño raíz, almacenamiento o solicitudes de API; lint y build correctos. Estas pruebas usan DOM e iframes, no clics nativos ni capturas.
- La comparación visual con capturas y la revisión manual con teclado de login, registro, CreatePost, EditProfileModal, Settings y los hilos de comentarios quedan pendientes: el navegador integrado estaba oculto durante esas pruebas. Capturas y clics nativos informan NATIVE_BROWSER_VIEWPORT_UNAVAILABLE. La cancelación del modal se probó mediante su evento nativo, no pulsando Escape; las comprobaciones del DOM y eventos sintéticos no sustituyen esa revisión. También queda pendiente revisar visualmente los controles de imágenes y el selector nativo de archivos; la prueba de Tab en el navegador oculto no desplazó el foco.
- Comprobar manualmente las rutas iniciales y los hilos de posts/comentarios, navegación con clic y teclado, atrás/adelante, recarga y ausencia de scroll horizontal en 1440, 1024, 768, 600, 390 y 320 px.
- Tras aplicar las actualizaciones compatibles, npm audit sigue informando cuatro alertas moderadas de desarrollo en la cadena ESLint/minimatch. No se incluyen en el bundle de producción; no se aplicó el downgrade de ESLint que propone --force.

Los formularios de login y registro, CreatePost, las tarjetas de posts, el perfil, su modal de edición, Settings y los hilos de comentarios con formulario de respuesta ya están implementados como interfaz, con tema claro/oscuro y tamaño de texto funcionales y persistencia local de apariencia. Siguen pendientes la publicación real, el feed conectado, las acciones reales de likes y comentarios, los datos y el guardado reales del perfil y de sus imágenes y el cambio real de contraseña. La conexión al backend y la sesión real se abordarán después de acordar los contratos; no se integran operaciones de backend.
