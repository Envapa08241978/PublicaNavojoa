# 📘 MEMORIA TÉCNICA, ARQUITECTURA Y BITÁCORA DEL PROYECTO
## **PUBLICA NAVOJOA**
> **Slogan Oficial:** *"Privado, personalizado y directo."*  
> **Comunidad Base:** Grupo de Facebook (*Limpia Tu Closet Navojoa*, +78,700 miembros).  
> **Dominio Oficial:** [https://publicanavojoa.com](https://publicanavojoa.com)  
> **Línea Oficial WhatsApp Cloud API:** `+52 642 152 0280` (Phone ID: `1280742211792981`)  
> **Fecha de Documentación:** Septiembre 2026  
> **Responsables:** Enrique Valenzuela & Mónica Obregón

---

## 1. RESUMEN EJECUTIVO Y OBJETIVO
**Publica Navojoa** es un ecosistema comercial y de difusión multicanal en Navojoa, Sonora. Su objetivo es monetizar y conectar la comunidad de más de 78,700 miembros locales con comercios y negocios a través de:
1. **Publicidad y Catálogo VIP por WhatsApp:** Envíos directos y segmentados por colonia a usuarios autorizados (*Opt-in*).
2. **Publicaciones Fijadas en Facebook:** Visibilidad preferente en el grupo líder de la ciudad.
3. **Campañas Meta Ads (Click-to-WhatsApp):** Anuncios pagados en Facebook e Instagram dirigidos a la audiencia local con botón directo al chat del comercio.

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
    │     (/api/webhook.js)       │◄─────────────────────────►│  • /registro (Registro VIP) │
    └──────────────┬──────────────┘                           │  • /admin (Panel CRM)       │
                   │                                          │  • /precios (Media Kit)     │
                   │ (Lectura / Escritura por REST API)       │  • /privacidad (Aviso Legal)│
                   ▼                                          └──────────────┬──────────────┘
    ┌────────────────────────────────────────────────────────────────────────┴──────────────┐
    │                        FIREBASE FIRESTORE (loquese-app)                               │
    │  • Colección 'contacts': Documentos únicos indexados por teléfono (/contacts/642XXXX) │
    │  • Sin duplicidades, con colonia, nombre y autorización Opt-in                        │
    └───────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. CONFIGURACIONES CLAVE Y CREDENCIALES

### 📱 Meta WhatsApp Cloud API:
* **App Name:** Publica Navojoa (App ID: `1424457482915670`).
* **Estado de la App:** **`Publicada (Live)`**.
* **Identificador de Teléfono (Phone ID):** `1280742211792981`.
* **WABA ID (WhatsApp Business Account ID):** `1469904981636541`.
* **Token de Acceso:** Permanente (Generado a través de *System User* con permisos `whatsapp_business_messaging` y `whatsapp_business_management`, con el activo de la cuenta de WhatsApp asignado con Control Total).
* **Webhook URL:** `https://publicanavojoa.com/api/webhook`.
* **Verify Token:** `publica_navojoa_token_2026`.
* **Eventos Suscritos:** `messages`.

### ☁️ Variables de Entorno en Vercel:
* `META_ACCESS_TOKEN`: Token Permanente de System User.
* `META_PHONE_ID`: `1280742211792981`.
* `META_VERIFY_TOKEN`: `publica_navojoa_token_2026`.

### 🔥 Firebase Firestore (`loquese-app`):
* **Reglas de Seguridad Activas:** `allow read, write: if true;` (sin caducidad).
* **Estructura de Datos:** Colección única `/contacts/{cleanPhone}` con los siguientes campos:
  * `nombre` *(String)*: Nombre del cliente.
  * `whatsapp` *(String)*: Teléfono a 10 dígitos (ej. `6421600559`).
  * `colonia` *(String)*: Colonia o sector de Navojoa.
  * `interes_anunciar` *(String)*: `Sí` o `No` — indica si la persona quiere anunciar sus productos/servicios.
  * `opt_in` *(String)*: `Autorizado`.
  * `origen` *(String)*: Origen del lead (*Formulario Web VIP*, *WhatsApp Bot Cloud*, *Preguntas FB Grupo*, etc.).
  * `fecha` *(String)*: Fecha de registro.

---

## 4. MAPA DE RUTAS Y PÁGINAS DEL SITIO

| Ruta | Archivo Físico | Función |
| :--- | :--- | :--- |
| `https://publicanavojoa.com/` | `registro.html` | Formulario de Captación VIP con selector de colonias y Opt-in. |
| `https://publicanavojoa.com/registro` | `registro.html` | Enlace directo para registro y actualización de datos de miembros. |
| `https://publicanavojoa.com/admin` | `admin.html` | Dashboard CRM, directorio de contactos, chat y exportación a Meta Ads. |
| `https://publicanavojoa.com/precios` | `media_kit.html` | Kit de medios comercial y tarifario ($600, $1,200, $2,500 MXN). |
| `https://publicanavojoa.com/privacidad` | `privacidad.html` | Aviso de Privacidad Integral conforme a LFPDPPP y políticas de Meta. |
| `https://publicanavojoa.com/api/webhook` | `api/webhook.js` | Endpoint Serverless que procesa el Bot de WhatsApp 24/7. |

---

## 5. LÓGICA E INTELIGENCIA DEL BOT DE WHATSAPP (`api/webhook.js`)

1. **Reconocimiento Automático por Nombre:**
   * Al recibir un mensaje, el bot consulta `/contacts/{phone}` en Firestore.
   * Si el usuario ya está registrado (ej. *Enrique Valenzuela*), **lo saluda por su nombre de pila en todas las respuestas** (*"¡Hola Enrique!"*) y reconoce su membresía activa sin pedirle volver a registrarse.
2. **Bloqueo Inteligente para Usuarios No Registrados:**
   * Si el número es nuevo o no tiene colonia registrada, el bot **no le permite acceder a comandos** (OFERTAS, ANUNCIAR, etc.).
   * Solo le envía un mensaje con su enlace personalizado pre-llenado: `https://publicanavojoa.com/registro?tel=642XXXXXXX`.
   * Una vez que completa el formulario y regresa a WhatsApp, el bot lo reconoce de inmediato por su nombre y colonia.
3. **Comandos y Reglas por Palabras Clave (Solo para Registrados):**
   * **`HOLA` / `CLUB VIP` / `UNIRME`:** Saludo personalizado y estado de membresía.
   * **`CATÁLOGO` / `OFERTAS` / `REMATE`:** Envío del catálogo de ofertas de la semana.
   * **`ANUNCIAR` / `PAQUETES` / `PRECIOS`:** Desglose de los 3 paquetes publicitarios (Bronce, Plata VIP, Oro Premium) y opción de contactar con un asesor humano.
   * **`BAJA` / `CANCELAR`:** Confirmación inmediata de baja de la lista de difusión.
   * **Cualquier otro mensaje:** Saludo con el nombre del cliente y menú rápido de opciones.

---

## 6. FORMULARIO WEB VIP & LISTA DE COLONIAS DE NAVOJOA
El formulario en `/registro` cuenta con:
* Pre-llenado inteligente del teléfono desde la URL (`?tel=...`).
* **Selector exhaustivo de +75 colonias y sectores de Navojoa, Sonora.**
* **Cualificación Comercial Rápida:** Toggle Sí / No para *"¿Te gustaría también anunciar tus productos o servicios?"* que etiqueta al contacto como `💼 Anunciante` o `🛍️ Comprador` en Firebase y en el Panel Admin.
* **Redirección Automática a WhatsApp:** Al confirmar el registro, el usuario es redirigido automáticamente al chat de WhatsApp con un mensaje pre-cargado (*"¡Hola! Envío este mensaje para confirmar mi registro al Club VIP"*), donde el Bot toma el control y lo saluda por su nombre de pila.
* **Deduplicación Estricta:** Al enviar el formulario, actualiza el registro existente en Firebase sin crear documentos duplicados (`set(..., { merge: true })`).

---

## 7. ENLACES OPERATIVOS RÁPIDOS

* **Enlace Click-to-WhatsApp Oficial:**
  ```text
  https://wa.me/526421520280?text=%C2%A1Hola!%20Quiero%20unirme%20al%20Club%20VIP%20de%20Publica%20Navojoa%20y%20recibir%20las%20ofertas%20semanales.
  ```
* **Panel de Administración:** [https://publicanavojoa.com/admin](https://publicanavojoa.com/admin)
* **Formulario de Registro:** [https://publicanavojoa.com/registro](https://publicanavojoa.com/registro)
* **Kit de Medios / Precios:** [https://publicanavojoa.com/precios](https://publicanavojoa.com/precios)
* **Aviso de Privacidad:** [https://publicanavojoa.com/privacidad](https://publicanavojoa.com/privacidad)
* **Meta Developers App:** [https://developers.facebook.com/apps/1424457482915670/](https://developers.facebook.com/apps/1424457482915670/)
* **Firebase Console:** [https://console.firebase.google.com/project/loquese-app/firestore](https://console.firebase.google.com/project/loquese-app/firestore)
