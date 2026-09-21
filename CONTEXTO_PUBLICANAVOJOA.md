# 📌 Memoria de Contexto del Proyecto: Publica Navojoa

**Fecha de consolidación:** Septiembre 2026  
**Repositorio:** `PublicaNavojoa` (`c:\Users\ENRIQ\OneDrive\Documents\PROYECTO CON MONICA`)  
**URL de Producción:** `https://publicanavojoa.com`  
**WABA ID:** `1469904981636541`  
**Phone ID Meta:** `1280742211792981`  
**Base de Datos:** Firebase Firestore (`loquese-app`)  

---

## 🏗️ 1. Arquitectura y Componentes Clave

1. **`admin.html` (Panel de Administración y CRM):**
   - **Pestaña Chat WhatsApp:** Interfaz en tiempo real con historial de mensajes entrantes/salientes, soporte de multimedia (imágenes, audios, PDFs), búsqueda y botón para enviar plantillas oficiales.
   - **Pestaña CRM (Directorio de Contactos):** 
     - Tabla con fecha, nombre, teléfono, colonia, perfil comercial y estado Opt-in.
     - **Botón de Edición de Nombre (`✏️`):** Permite corregir los nombres capturados de WhatsApp directamente a Firestore y actualizar la UI al instante.
     - Botón de eliminación y cambio de estado comercial (Prospecto, Contacto, Activo, Comprador VIP, etc.).
   - **Pestaña Catálogo de Ofertas:** Gestión de promociones activas para el Bot de WhatsApp con fotos, vigencias y enlaces.
   - **Pestaña Pedidos / Anuncios (`anuncios_pedidos`):**
     - Control de vigencia en Facebook (fechas fijadas/desfijadas).
     - Control de envíos masivos por WhatsApp.
     - **Botón "Pasar a Catálogo Bot":** Cuenta con compresión automática en cliente (Canvas) para evitar el error de límite de 1MB de Firestore y subida automática a CDN.
   - **Pestaña Finanzas & Comisiones:** Control de ingresos, egresos y cálculo del 30% de comisión para Mónica y 30% para Enrique.
   - **Módulo de Difusión Masiva WhatsApp Cloud API:**
     - Selección de plantillas oficiales con sus imágenes de cabecera y variables `{{1}}`.
     - Filtro por audiencia (Todos con Opt-in, Compradores VIP, Anunciantes).
     - Envío de prueba a número específico.
     - Consola en tiempo real con pausas de seguridad y auto-detección de errores.

2. **`api/webhook.js` (Servidor Webhook en Vercel):**
   - **Motor de Búsqueda Inteligente:** Ponderación por palabras clave, límites de palabra (`\b`) para evitar falsos positivos, taxonomías por categorías (Belleza, Autos, Eventos, Muebles, etc.).
   - **Gestión de Opt-Out / Bajas:**
     - Suscripción al webhook `user_preferences`.
     - Detección automática del error `#131050` (*"El usuario detuvo la recepción de marketing"*).
     - Marcado inmediato en Firestore como `opt_in = "No"` y `marketing_status = "opt_out"` para excluirlo automáticamente de futuras difusiones masivas.
   - **Entrega de Catálogo y Respuestas Automáticas:** Envío secuencial de ofertas con foto, descripción y enlaces.

3. **`formulario.html` (Registro de Anunciantes y Pedidos):**
   - Captura de datos del cliente, paquete contratado, enlaces a redes sociales, fotos y comprobante de pago.

4. **`facebook_cover_publicanavojoa.svg`:**
   - Plantilla vectorial para portada de Facebook (1640x624 px) editable en Adobe Illustrator por capas.

---

## 👥 2. Clientes y Plantillas Configuradas

1. **MB STORE — Material & Uñas (`ORD-207375`):**
   - **Oferta en Catálogo:** `OFF-MBSTORE-207375` (Prioridad #1).
   - **Categoría:** `Belleza, Barberías, Uñas & Spa`.
   - **Keywords:** `uñas`, `nail store`, `esmaltes`, `acrilicos`, `gelish`, `mesa de trabajo`, `mb store`, `material de uñas`.
   - **WhatsApp Ventas:** `+52 642 147 8275`.
   - **Plantilla Meta:** `mb_store_navojoa`.

2. **Nikol Vásquez — AuraBrows (`ORD-653253`):**
   - **Categoría:** `Belleza, Barberías & Spa` (Cejas, Pestañas, Microblading).
   - **Plantilla Meta:** `nikol_vasquez_brows` (Aprobada en Meta, imagen: `https://iili.io/nx9mdKl.jpg`).

3. **Martha Avendaño Salón (`ORD-990554`):**
   - **Categoría:** `Belleza, Barberías & Spa` (Extensiones y Diseño de Color).
   - **Plantilla Meta:** `martha_avendano_salon` (Aprobada en Meta, imagen: `https://iili.io/nopsdYJ.jpg`).

4. **PC Repair / CPU Gamer — Adrian Almada (`ORD-586036`):**
   - **Categoría:** `Tecnología & Computación`.
   - **Plantilla Meta:** `cpu_gamer_adrian_almada` (Aprobada en Meta, imagen: `https://publicanavojoa.com/cpu_gamer_adrian_almada.jpg`).

---

## 🔒 3. Buenas Prácticas y Reglas del Sistema

- **Exclusión de Opt-Out:** Cualquier contacto con `opt_in === 'No'` o `marketing_status === 'opt_out'` se excluye automáticamente de las audiencias masivas.
- **Compresión de Imágenes:** Antes de registrar cualquier oferta o foto pesada en Firestore, se comprime en el navegador a un tamaño menor a 100 KB o se usa una URL pública HTTPS para no exceder el límite de 1MB por documento.
- **Despliegues:** Todo cambio se sincroniza a través de Git y se despliega en producción mediante el repositorio principal en GitHub.
