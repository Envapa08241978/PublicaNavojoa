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


