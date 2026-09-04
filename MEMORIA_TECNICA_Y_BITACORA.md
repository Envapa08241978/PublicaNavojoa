# 📘 MEMORIA TÉCNICA, ARQUITECTURA Y BITÁCORA DEL PROYECTO
## **PUBLICA NAVOJOA**
> **Slogan Oficial:** *"Privado, personalizado y directo."*  
> **Comunidad Base:** Grupo de Facebook (*Limpia Tu Closet Navojoa*, +78,700 miembros).  
> **Dominio Oficial:** [https://publicanavojoa.com](https://publicanavojoa.com)  
> **Línea Oficial WhatsApp Cloud API:** `+52 642 152 0280` (Phone ID: `1280742211792981`)  
> **Fecha de Documentación:** Septiembre 2026  
> **Responsables:** Enrique Valenzuela & Mónica Obregón

---

## 1. RESUMEN EJECUTIVO Y OBJETIVO DEL NEGOCIO
**Publica Navojoa** es un ecosistema comercial y de difusión multicanal en Navojoa, Sonora. Su objetivo es monetizar y conectar la comunidad de más de 78,700 miembros locales con comercios y negocios a través de un modelo 100% orgánico y directo:

1. **Difusión Directa por WhatsApp (Club VIP):** Mensajes masivos y segmentados por colonia enviados de 1 a 1 a usuarios autorizados (*Opt-in*).
2. **Publicaciones Fijadas en Facebook:** Visibilidad preferente en el grupo líder de compra/venta de la ciudad (+78,700 miembros).

> [!IMPORTANT]
> **Alcance del Servicio:** Publica Navojoa **NO ofrece ni realiza campañas pagadas dirigidas en Facebook e Instagram (Meta Ads)**. El modelo comercial se enfoca al 100% en el tráfico orgánico del grupo de Facebook y la base de datos de WhatsApp.

---

## 2. ARQUITECTURA TECNOLÓGICA IMPLEMENTADA

```
                                 ┌─────────────────────────────────┐
                                 │       USUARIO / CLIENTE         │
                                 │     (WhatsApp / Web / FB)       │
                                 └───────────────┬─────────────────┘
                                                 │
                   ┌─────────────────────────────┴────────────────────────────┐
                   ▼                                                          ▼
    ┌─────────────────────────────┐                           ┌─────────────────────────────┐
    │     META CLOUD API          │                           │      DOMINIO VERCEL         │
    │   (WhatsApp Business)       │                           │  (publicanavojoa.com)       │
    │  Phone ID: 1280742211792981 │                           └──────────────┬──────────────┘
    └──────────────┬──────────────┘                                          │
                   │ (Webhook POST /api/webhook)                             │
                   ▼                                                         ▼
    ┌─────────────────────────────┐                           ┌─────────────────────────────┐
    │   VERCEL SERVERLESS BOT     │                           │  PÁGINAS & FRONTEND (HTML5) │
    │  • /api/webhook.js          │◄─────────────────────────►│  • / (index.html - Tarifario)│
    │  • /api/send-message.js     │                           │  • /registro (Registro VIP) │
    │  • /api/download-media.js   │                           │  • /admin (Panel CRM)       │
    └──────────────┬──────────────┘                           │  • /privacidad (Aviso Legal)│
                   │                                          └──────────────┬──────────────┘
                   │ (Lectura / Escritura por REST API)                      │
                   ▼                                                         ▼
    ┌────────────────────────────────────────────────────────────────────────┴──────────────┐
    │                        FIREBASE FIRESTORE (loquese-app)                               │
    │  • Colección 'contacts': Documentos únicos por teléfono (/contacts/642XXXXXXX)        │
    │  • Guardado en tiempo real de datos del usuario, pipeline comercial y mensajes_json   │
    └───────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. MAPA DE RUTAS OFICIALES EN PRODUCCIÓN (`vercel.json`)

| Ruta URL | Archivo Físico | Descripción / Función |
| :--- | :--- | :--- |
| `https://publicanavojoa.com/` | `index.html` | Media Kit Oficial & Tarifario Publicitario 2026 ($600, $1,200, $2,500 MXN). |
| `https://publicanavojoa.com/registro` | `registro.html` | Formulario de Captación VIP con selector de +75 colonias y toggle comercial. |
| `https://publicanavojoa.com/admin` | `admin.html` | Dashboard CRM, directorio de contactos, pipeline de ventas y chat multimedios. |
| `https://publicanavojoa.com/privacidad` | `privacidad.html` | Aviso de Privacidad Integral conforme a LFPDPPP y políticas de Meta. |
| `https://publicanavojoa.com/api/webhook` | `api/webhook.js` | Endpoint Serverless que procesa la lógica del Bot de WhatsApp 24/7. |
| `https://publicanavojoa.com/api/send-message` | `api/send-message.js` | API de envío de mensajes y archivos desde el panel admin a WhatsApp. |
| `https://publicanavojoa.com/api/download-media` | `api/download-media.js` | Proxy de descarga con autenticación Bearer para archivos adjuntos de WhatsApp. |
| `https://publicanavojoa.com/api/img` | `api/img.js` | Servidor de imágenes serverless que entrega fotos de ofertas a Meta WhatsApp. |

---

## 4. ESTRUCTURA DE BASE DE DATOS EN FIREBASE FIRESTORE (`loquese-app`)

Todos los contactos se indexan de forma única en la colección `/contacts/{cleanPhone}` (donde `cleanPhone` son los 10 dígitos del teléfono en Navojoa, ej. `6421600559`).

### Campos del Documento:
* `nombre` *(String)*: Nombre completo del contacto.
* `whatsapp` *(String)*: Teléfono a 10 dígitos.
* `colonia` *(String)*: Colonia o sector de Navojoa (+75 opciones).
* `interes_anunciar` *(String)*: `Sí` (interesado en anunciar) / `No` (solo ofertas).
* `estado_comercial` *(String)*: Pipeline de ventas (`prospecto`, `contacto_hecho`, `cliente_activo`, `no_interesado`, `comprador`).
* `messages_json` *(String JSON)*: Historial de mensajes bidireccionales en formato array JSON `[{ text, type, time, timestamp, fileUrl, fileType, fileName }]`.
* `opt_in` *(String)*: `Autorizado`.
* `origen` *(String)*: `Formulario Web VIP` o `WhatsApp Bot Cloud`.
* `last_msg` / `last_time` *(String)*: Último mensaje recibido/enviado y hora.

### Colección de Catálogo de Ofertas (`/offers/{docId}`):
* `titulo` *(String)*: Nombre de la oferta, promoción o evento.
* `categoria` *(String)*: Categoría comercial (ej. *Mueblería & Decoración*, *Eventos*, *Gastronomía*).
* `descripcion` *(String)*: Ficha descriptiva para WhatsApp.
* `imagen_url` *(String)*: Imagen optimizada en Base64 (o URL pública) entregada vía `/api/img?offerId=...`.
* `enlace_facebook` *(String)*: Enlace opcional a la publicación original en Facebook.
* `enlace_maps` *(String)*: Enlace opcional de Google Maps para cómo llegar al evento o negocio.
* `contacto_nombre` *(String)*: Nombre del vendedor o encargado.
* `contacto_telefono` *(String)*: WhatsApp a 10 dígitos para enlace directo `wa.me/52...`.
* `activo` *(Boolean)*: `true` (visible en bot y catálogo) / `false` (pausado).
* `orden` *(Number)*: Orden secuencial de entrega en WhatsApp.

---

## 5. FLUJO INTELIGENTE DEL BOT DE WHATSAPP (`api/webhook.js`)

1. **Bloqueo Inteligente a Usuarios No Registrados:**
   - Si un número no registrado intenta enviar comandos al WhatsApp oficial (`+52 642 152 0280`), el bot no le da menú ni comandos.
   - Le envía amablemente un enlace directo: `https://publicanavojoa.com/registro?tel=642XXXXXXX` para que complete su registro.

2. **Reconocimiento Personalizado por Nombre:**
   - Al registrarse, el bot saluda por su nombre de pila en cada interacción (*"¡Hola Enrique!"*).

3. **Respuesta Consultiva para Anunciantes (`ANUNCIAR`):**
   - No envía listas de precios frías o agresivas.
   - Responde: *"Un asesor comercial de nuestro equipo se comunicará contigo directamente por este chat a la brevedad."* y notifica al CRM en el estado `💼 Prospecto Anunciante`.

4. **Respuesta Ágil para Compradores (`OFERTAS`):**
   - Entrega limpia del catálogo semanal sin acoso de venta.

5. **Cierre Educado en Palabras de Confirmación (`ok`, `gracias`, `perfecto`, `sale`):**
   - Responde cortésmente confirmando la atención humana sin repetir menús por defecto.

---

## 6. PANEL DE ADMINISTRACIÓN Y CHAT MULTIMEDIOS (`admin.html`)

1. **Pipeline de Ventas Interactivo:**
   - Dropdown interactivo en la tabla CRM para actualizar el estado comercial en 1 clic (`💼 Prospecto Anunciante`, `📞 Contacto Realizado`, `🟢 Cliente Activo / Cerrado`, `🔴 No Interesado`, `🛍️ Comprador VIP`).
2. **Sincronización en Tiempo Real (`onSnapshot`):**
   - Escucha los cambios en Firebase sin recargar la página y actualiza tanto la lista de contactos como el chat en vivo.
3. **Chat Multimedios (Fotos y PDFs):**
   - Soporta el envío y recepción de fotografías (`PNG`/`JPG`) a color en alta resolución.
   - Soporta la recepción y envío de documentos `PDF` interactivos con botón directo de descarga/apertura.
4. **Proxy de Autenticación de Medios (`/api/download-media.js`):**
   - Resuelve de raíz el error **401 Authentication Error** de Meta al interceptar y adjuntar el token de servidor para abrir cualquier adjunto enviado por WhatsApp.
5. **Botón Borrar Historial (`🗑️ Borrar Chat`):**
   - Permite borrar el historial de conversación de un contacto específico tanto en el almacenamiento local como en Firebase.
6. **Diseño Visual Optimizado:**
   - Altura delimitada (`max-height: 600px`) para garantizar que la barra de texto y los botones permanezcan 100% visibles en pantalla sin necesidad de hacer scroll.

---

## 7. HERRAMIENTAS Y DOCUMENTOS RECIENTES GENERADOS

* **Presentación PowerPoint (`PRESENTACION_PROYECTO.pptx`):** 37 Diapositivas institucionales con el flujo detallado de captación y arquitectura comercial para la reunión con Mónica Obregón.
* **Guía de Preguntas de Facebook (`GUIA_PUBLICIDAD_Y_BASE_DATOS.md`):** Configuración de las 3 preguntas de admisión para el grupo de Facebook (78.7k miembros).

---

## 8. ENLACES OPERATIVOS EN PRODUCCIÓN

* **Página Principal (Media Kit & Tarifario):** [https://publicanavojoa.com](https://publicanavojoa.com)
* **Formulario de Registro VIP:** [https://publicanavojoa.com/registro](https://publicanavojoa.com/registro)
* **Panel CRM & Chat WhatsApp:** [https://publicanavojoa.com/admin](https://publicanavojoa.com/admin)
* **Aviso de Privacidad:** [https://publicanavojoa.com/privacidad](https://publicanavojoa.com/privacidad)

---

## 9. IDENTIDAD VISUAL Y ACTIVOS DEL GRUPO DE FACEBOOK (+78.9K MIEMBROS)

* **Portada Oficial Grupo Facebook (1640 x 856 px):**
  - Concepto unisex e inclusivo diseñado para maximizar el comercio de hombres y mujeres en Navojoa (herramientas de taller, electrónica/videojuegos, tecnología, artículos para el hogar, calzado, chamarras y servicios).
  - Incluye el logotipo oficial a color (`Publica navojoa logotipo oficial.png`) en una tarjeta blanca elegante con borde dorado en la esquina inferior derecha.
* **Formatos y Archivos Disponibles en el Proyecto:**
  - `portada_grupo_facebook_oficial_2026.png`: Imagen rasterizada a resolución exacta de **1640 x 856 px** lista para subir a Facebook.
  - `portada_grupo_facebook_oficial_2026.svg`: Archivo vectorial nativo con mesa de trabajo (*artboard*) de **1640 x 856 px**, capas organizadas y editable en **Adobe Illustrator**.
  - `portada_grupo_facebook_oficial_2026.pdf`: Documento PDF con dimensiones exactas de **1640 x 856 pt** para apertura vectorial directa en **Adobe Illustrator**.

---

## 10. SEGURIDAD Y CONTROL DE ACCESO AL PANEL CRM (`/admin`)

* **Autenticación con Firebase Authentication:**
  - El acceso a `https://publicanavojoa.com/admin` se encuentra completamente protegido tras una pantalla de autenticación con correo electrónico y contraseña.
  - El panel CRM y el chat en vivo solo se renderizan en el DOM cuando un usuario con sesión activa y verificada por Firebase está presente (`auth.onAuthStateChanged`).
* **Recuperación de Contraseña:**
  - Enlace interactivo *"¿Olvidaste tu contraseña?"* que activa el flujo de recuperación oficial de Firebase (`sendPasswordResetEmail`), enviando un correo con enlace seguro para restablecer credenciales.
* **Gestión de Sesión:**
  - Píldora de usuario en el encabezado con el correo del administrador autenticado y botón **"Salir 🚪"** (`handleLogout`) para invalidar la sesión y bloquear el acceso inmediato.

---

## 11. SISTEMA DE MENSAJES NO LEÍDOS Y VISTA PREVIA TIPO WHATSAPP

* **Indicador Visual de No Leídos:**
  - Badge verde numérico con micro-animación pulsante para los contactos con mensajes nuevos entrantes.
  - El avatar del contacto se resalta en verde oscuro con borde verde brillante cuando tiene mensajes pendientes.
  - El nombre del contacto y la vista previa se destacan en negrita verde.
* **Vista Previa en Tiempo Real:**
  - Muestra la hora exacta del último mensaje en la esquina superior derecha del ítem.
  - Muestra el texto del último mensaje (con prefijo *"Tú: "* si fue enviado por nosotros, o el texto del cliente).
* **Ordenamiento Dinámico:**
  - La lista de contactos se auto-ordena colocando automáticamente arriba las conversaciones con mensajes no leídos y las de interacción más reciente.
* **Marcado de Lectura Automático:**
  - Al dar clic en un contacto, sus mensajes se marcan automáticamente como leídos (`markAsRead`), limpiando el badge al instante.

---

## 12. CATÁLOGO DINÁMICO DE OFERTAS Y REMATES (FIREBASE + BOT WHATSAPP)

* **Gestor de Catálogo en Panel `/admin` (Pestaña 3):**
  - Nueva pestaña interactiva: **"🏷️ Catálogo de Ofertas (Bot WhatsApp)"**.
  - Formulario modal (`openOfferModal`) para agregar o editar promociones en segundos: título, categoría, descripción para WhatsApp, enlace a la publicación de Facebook y WhatsApp del vendedor.
  - Botón de alternancia instantánea: **Pausar ⏸️ / Activar ▶️** para encender o apagar ofertas que caduquen o se agoten.
* **Integración en Tiempo Real con Firebase Firestore:**
  - Colección dedicada `offers` en Firestore (`loquese-app`).
  - La oferta #1 se cargó con éxito: *Artículos de Decoración y Estilo para el Hogar* (Mónica Obregón / `https://www.facebook.com/share/p/1Biw9XvppQ/`).
* **Subida y Gestión de Fotos de Ofertas y Eventos:**
  - Formato limpio optimizado a **1 Fotografía Opcional**: carga instantánea en menos de 0.2 segundos mediante compresión en navegador (HTML5 Canvas).
  - Campo de enlace dual: **Enlace a Facebook (Opcional)** y **Enlace a Google Maps / Ubicación (Opcional)** para eventos, locales comerciales y puntos de venta.
  - En `/admin`, las tarjetas muestran la fotografía del producto/evento y botones directos a Facebook y Google Maps (`📍 Cómo Llegar`).
* **Servicio Serverless de Entrega de Imágenes (`api/img.js`):**
  - Endpoint dedicado `https://publicanavojoa.com/api/img?offerId=...&index=0` que entrega las imágenes en binario JPEG con encabezados HTTP nativos (`Content-Type`, `Cache-Control`).
  - Meta WhatsApp Cloud API descarga y despacha las imágenes a máxima velocidad sin depender de servicios externos de terceros.
* **Inteligencia en el Bot de WhatsApp (`api/webhook.js`) — Envío Secuencial Automático:**
  - Al escribir **"OFERTAS"** o **"CATÁLOGO"**:
    - El bot envía de inmediato un saludo introductorio con el total de promociones activas.
    - **Envía automáticamente cada oferta de una por una con intervalo de 2 segundos** entre cada mensaje, en el orden exacto del catálogo.
    - Cada oferta se entrega con su **fotografía en alta resolución, descripción completa, enlace a Google Maps (`📍 Cómo llegar`), enlace a Facebook y botón de WhatsApp del vendedor**.
    - Experiencia 100% fluida, visual y atractiva para el usuario final sin requerir pasos adicionales.---

## 13. OPTIMIZACIONES DE INTERFAZ (UI/UX), SCROLLBARS Y DEEP LINKING EN IPHONE

* **Solución a Scrollbars y Altura del Chat en `/admin`:**
  - **Scrollbars visibles permanentes:** Se implementó estilización personalizada webkit (`::-webkit-scrollbar`) y estándar (`scrollbar-color`) con `overflow-y: scroll` en la raíz de la página, asegurando una barra de desplazamiento visible en todas las pestañas (Chat, CRM y Catálogo).
  - **Barra de mensajes fija y visible:** Ajuste de altura dinámica con `calc(100vh - 120px)` y `min-height: 480px`, anclando permanentemente el campo de entrada de texto (`#chat-input`), el botón de adjuntar archivos (`📎`) y el botón de enviar (`Enviar ➔`) en cualquier resolución de pantalla de laptop o monitor de escritorio.
  - **Scroll independiente en lista de contactos:** La columna lateral izquierda (`.chat-list`) cuenta con su propio desplazamiento vertical forzado para explorar libremente todas las conversaciones de clientes registrados.

* **Solución de Redirección a WhatsApp en iOS Safari y Navegadores In-App (Facebook/Instagram):**
  - **Problema diagnosticado:** En iPhone (iOS), cuando un usuario se registraba dentro del navegador interno de Facebook o en Safari, las URLs HTTP `wa.me` o `api.whatsapp.com` ejecutadas tras una promesa asíncrona de Firestore eran bloqueadas como ventanas emergentes o redirigidas erróneamente a la página web de *"Descargar WhatsApp"* (`whatsapp.com/download`).
  - **Solución implementada en `registro.html`:** Uso del protocolo nativo **`whatsapp://send?phone=526421520280&text=...`** mediante un elemento ancla simulado con `click()`. Este deep link ordena directamente a iOS abrir la aplicación instalada de WhatsApp de forma instantánea sin pantallas intermedias ni redirecciones a la App Store.

* **Estrategia de Difusión y Captación de Contactos:**
  - Enlaces directos **`https://wa.me/5216421520280`** configurados para activar los 3 botones de respuesta rápida de Meta Cloud API:
    1. 🛍️ *Ver Catálogo de Ofertas de la Semana*
    2. 👑 *¿Cómo funciona el Club VIP de Navojoa?*
    3. 📢 *Quiero Anunciar mi Negocio o Evento*
  - Mensajes de difusión y reenvío optimizados para amigos, grupos y comercios locales de Navojoa.
