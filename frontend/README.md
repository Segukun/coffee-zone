# Coffee Zone — Frontend

Frontend de React + Vite para las pantallas del MVP. Incluye navegación, layouts, componentes visuales compartidos y formularios de login y registro con validación local. Las páginas sociales conservan placeholders explícitos; todavía no hay autenticación real, feed ni integración HTTP. Se puede ejecutar sin backend.

## Tecnologías y requisitos

- Node.js **24.x** y npm.
- React y React DOM 19, JavaScript/JSX y módulos ES.
- Vite 8 con su plugin de React.
- React Router DOM 7 en modo declarativo.
- ESLint 10, reglas recomendadas de JavaScript, React Hooks y React Refresh.
- CSS propio, sin librerías de UI, iconos, estado o cliente HTTP.

package.json declara las dependencias y package-lock.json fija las versiones resueltas. Los iconos compartidos son SVG locales.

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
│   │   ├── posts/                 # Reservado para publicaciones
│   │   ├── profile/               # Reservado para perfil
│   │   └── comments/              # Reservado para comentarios
│   ├── layouts/
│   │   ├── AppLayout.jsx
│   │   └── AuthLayout.jsx
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── SettingsPage.jsx
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
| /login | LoginPage | AuthLayout |
| /register | RegisterPage | AuthLayout |
| Otras | NotFoundPage | AppLayout |

Sidebar usa NavLink, que aplica el estilo activo y aria-current="page". El espacio inferior del usuario está reservado y no representa una sesión. RightSidebar contiene búsqueda deshabilitada, desarrolladores con Follow deshabilitado y tendencias estáticas tomadas del diseño. No se simulan acciones exitosas.

AuthLayout ofrece encabezado, enlace a la otra pantalla de acceso, contenido central y pie. LoginPage y RegisterPage componen los formularios de components/auth/. AuthField comparte etiquetas, errores accesibles y controles independientes para mostrar u ocultar contraseñas.

Los formularios validan campos obligatorios y formato de email; registro también valida username sin @ (letras, números y guiones bajos), nombre no vacío, contraseña de al menos ocho caracteres con una letra y un número, y confirmación coincidente. Estas reglas de interfaz deben acordarse con backend antes de integrar la API; no reemplazan su validación.

Al enviar datos válidos se informa que la conexión al backend está pendiente: no se crea una cuenta, no se inicia sesión ni se guardan contraseñas o tokens. Remember me y Forgot password? permanecen deshabilitados. Los textos legales no son enlaces, porque todavía no existen páginas legales.

## Diseño y responsive

La referencia principal son las seis capturas del Figma.docx suministrado. Se conservan fondo casi negro, bordes sutiles y paleta oficial:

- #2E073F: Dark Purple.
- #7A1CAC: Primary Purple.
- #AD49E1: Accent Purple.
- #EBD3F8: Light Purple.

styles/variables.css centraliza colores, tipografía, espaciado y dimensiones. El tema oscuro es el predeterminado, sin depender de las preferencias del sistema. Las variables de modo claro están preparadas en :root[data-theme='light']; no hay selector de tema, persistencia ni lógica de Settings.

BrandLogo usa el horizontal dark para el fondo oscuro, prepara la variante light y usa el símbolo original en espacios compactos. Los archivos se copiaron sin modificar su contenido. El original LogoHorizontalLigthmode.webp tiene un error de escritura en el nombre: solo su copia interna se llama LogoHorizontalLightmode.webp.

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
- Las cinco rutas se comprueban mediante respuesta HTTP y renderizado React con el router en memoria: layouts correctos, enlaces de navegación y estado activo.
- El frontend renderiza sin backend y no implementa solicitudes HTTP.
- Login y registro se probaron en el navegador integrado con campos vacíos, datos inválidos y válidos, confirmación de contraseña, controles de visibilidad y navegación entre pantallas. También se ejecutaron 14 comprobaciones de validación local.
- Se verificó el renderizado y la ausencia de overflow horizontal de ambos formularios en 1440, 1024, 768, 600, 390 y 320 px mediante iframes del navegador.
- La comparación visual con capturas y la revisión manual con teclado quedan pendientes: el navegador integrado estaba oculto y no permitió obtener capturas. Las comprobaciones del DOM no sustituyen esa revisión.
- Comprobar manualmente las cinco rutas, navegación con clic y teclado, atrás/adelante, recarga y ausencia de scroll horizontal en 1440, 1024, 768, 600, 390 y 320 px.
- Tras aplicar las actualizaciones compatibles, npm audit sigue informando cuatro alertas moderadas de desarrollo en la cadena ESLint/minimatch. No se incluyen en el bundle de producción; no se aplicó el downgrade de ESLint que propone --force.

Los formularios de login y registro ya están implementados como interfaz. El próximo paso de autenticación es acordar el contrato con backend e integrar servicios HTTP, manejo de carga y errores, y sesión real. Feed, publicaciones, likes, comentarios, perfil, modal de edición y Settings siguen pendientes.
