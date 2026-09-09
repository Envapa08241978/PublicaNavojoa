const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'publica_navojoa_token_2026';
const PHONE_ID = process.env.META_PHONE_ID || '1280742211792981';
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || 'EAAUPiVpET1YBST456Cx6ZAuNEXN8iEghj5W3msjAvZC4q8unGAcJrpeOdMBNNokantyZBcAYJS64NEx7XAV9tneN0MY6s3K2KphrgvJLzeVvpWZAvXXhDxxdMsUyQZBBaYzzDfNrcdZCFWNyaCvZBvQpyZB7wdp0m33Ytwy0uwZAN0W57js1ag6ZBAtZCNL4p2A4nRLTAZDZD';

async function saveToFirestore(cleanPhone, senderName, text, type, fileUrl = '', fileType = '', fileName = '') {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    try {
        const docUrl = `https://firestore.googleapis.com/v1/projects/loquese-app/databases/(default)/documents/contacts/${cleanPhone}`;
        let existingMsgs = [];
        let currentNombre = '';

        // Attempt to fetch existing messages and name from contact doc
        try {
            const getRes = await fetch(docUrl);
            if (getRes.ok) {
                const getDoc = await getRes.json();
                const jsonStr = getDoc?.fields?.messages_json?.stringValue;
                if (jsonStr) existingMsgs = JSON.parse(jsonStr);
                currentNombre = getDoc?.fields?.nombre?.stringValue || '';
            }
        } catch(e) {}

        // Prevenir duplicados (si el ultimo mensaje es identico en < 2 segundos)
        if (existingMsgs.length > 0) {
            const lastM = existingMsgs[existingMsgs.length - 1];
            if (lastM.text === text && lastM.type === type && (Date.now() - (lastM.timestamp || 0) < 2000)) {
                return;
            }
        }

        const newMsg = {
            text: text || '',
            type: type || 'incoming',
            time: timeStr,
            timestamp: Date.now()
        };
        if (fileUrl) newMsg.fileUrl = fileUrl;
        if (fileType) newMsg.fileType = fileType;
        if (fileName) newMsg.fileName = fileName;

        existingMsgs.push(newMsg);
        if (existingMsgs.length > 50) existingMsgs = existingMsgs.slice(-50);

        const bodyFields = {
            whatsapp: { stringValue: cleanPhone },
            origen: { stringValue: 'WhatsApp Cloud Bot' },
            last_msg: { stringValue: text || (fileType?.startsWith('image/') ? '🖼️ Imagen' : '📄 PDF') },
            last_time: { stringValue: timeStr },
            messages_json: { stringValue: JSON.stringify(existingMsgs) }
        };

        // Preservar el nombre real registrado si ya existe en Firestore (para no sobreescribir con emojis de WhatsApp)
        if (!currentNombre || currentNombre === 'Cliente WhatsApp' || currentNombre === 'Cliente VIP' || currentNombre === '??') {
            if (senderName && senderName !== 'Cliente WhatsApp' && senderName !== 'Cliente VIP') {
                bodyFields.nombre = { stringValue: senderName };
            }
        }

        const fieldsToUpdate = Object.keys(bodyFields);
        const maskParams = fieldsToUpdate.map(f => `updateMask.fieldPaths=${f}`).join('&');

        await fetch(`${docUrl}?${maskParams}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: bodyFields })
        });
    } catch (e) {
        console.error('[FIRESTORE ERR]', e);
    }
}

async function getMetaMediaUrl(mediaId) {
    if (!mediaId) return '';
    try {
        const res = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
            headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
        });
        if (res.ok) {
            const data = await res.json();
            return data.url || '';
        }
    } catch(e) {}
    return '';
}

async function sendWhatsAppMessage(toPhone, text, cleanPhone = '', senderName = '') {
    const url = `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`;
    try {
        if (cleanPhone) {
            await saveToFirestore(cleanPhone, senderName || 'Publica Navojoa', text, 'outgoing');
        }
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: toPhone,
                type: 'text',
                text: { body: text }
            })
        });
        const data = await response.json();
        console.log('[SEND WA RES]', data);
    } catch (e) {
        console.error('[SEND WA ERR]', e);
    }
}

async function sendWhatsAppImage(toPhone, imageUrl, caption = '', cleanPhone = '', senderName = '') {
    const url = `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`;
    try {
        if (cleanPhone) {
            await saveToFirestore(cleanPhone, senderName || 'Publica Navojoa', caption || '🖼️ Foto de la oferta', 'outgoing', imageUrl, 'image/jpeg');
        }
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: toPhone,
                type: 'image',
                image: {
                    link: imageUrl,
                    caption: caption
                }
            })
        });
        const data = await response.json();
        console.log('[SEND WA IMG RES]', data);
    } catch (e) {
        console.error('[SEND WA IMG ERR]', e);
    }
}

async function getContactFromFirestore(cleanPhone) {
    try {
        const res = await fetch(`https://firestore.googleapis.com/v1/projects/loquese-app/databases/(default)/documents/contacts/${cleanPhone}`);
        if (res.ok) {
            const data = await res.json();
            const fields = data?.fields || {};
            const nombre = fields?.nombre?.stringValue || '';
            const colonia = fields?.colonia?.stringValue || 'Navojoa';
            const optIn = fields?.opt_in?.stringValue || '';
            const interesAnunciar = fields?.interes_anunciar?.stringValue || '';
            if (nombre && nombre !== '??' && nombre !== 'Cliente VIP' && nombre !== 'Cliente WhatsApp') {
                return { isRegistered: true, nombre, colonia, optIn, interesAnunciar };
            }
        }
    } catch (e) {
        console.error('[GET CONTACT ERR]', e);
    }
    return { isRegistered: false, nombre: '', colonia: '', optIn: '', interesAnunciar: '' };
}

async function getOffersFromFirestore() {
    try {
        const res = await fetch(`https://firestore.googleapis.com/v1/projects/loquese-app/databases/(default)/documents:runQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                structuredQuery: {
                    from: [{ collectionId: 'offers' }]
                }
            })
        });
        if (res.ok) {
            const data = await res.json();
            const offers = [];
            data.forEach(item => {
                const doc = item.document;
                if (!doc || !doc.fields) return;
                const f = doc.fields || {};
                const activo = f.activo?.booleanValue !== undefined ? f.activo.booleanValue : true;
                if (activo) {
                    // Verificar si la oferta ya expiró según su fecha de expiración configurada
                    const diasVig = f.dias_vigencia?.integerValue !== undefined ? Number(f.dias_vigencia.integerValue) : (f.dias_vigencia?.doubleValue !== undefined ? Number(f.dias_vigencia.doubleValue) : 30);
                    const fechaExp = f.fecha_expiracion_bot?.stringValue || '';
                    if (diasVig !== 999 && fechaExp) {
                        const expDate = new Date(fechaExp + 'T23:59:59');
                        if (!isNaN(expDate.getTime()) && Date.now() > expDate.getTime()) {
                            return; // Expirada: no incluir en catálogo activo del bot
                        }
                    }

                    let pList = [];
                    if (f.imagenes_json?.stringValue) {
                        try { pList = JSON.parse(f.imagenes_json.stringValue); } catch(e) {}
                    }
                    if (pList.length === 0 && f.imagen_url?.stringValue) {
                        pList = [f.imagen_url.stringValue];
                    }

                    let ts = 0;
                    if (f.timestamp?.integerValue) ts = Number(f.timestamp.integerValue);
                    else if (f.timestamp?.doubleValue) ts = Number(f.timestamp.doubleValue);
                    else if (f.fecha_activacion_bot?.stringValue) {
                        try { ts = new Date(f.fecha_activacion_bot.stringValue + 'T00:00:00').getTime(); } catch(e) {}
                    }
                    else if (f.fecha?.stringValue) {
                        try { ts = new Date(f.fecha.stringValue).getTime(); } catch(e) {}
                    }
                    if (!ts) ts = Date.now();

                    offers.push({
                        id: doc.name.split('/').pop(),
                        titulo: f.titulo?.stringValue || 'Oferta Destacada',
                        categoria: f.categoria?.stringValue || 'Comercio Local',
                        descripcion: f.descripcion?.stringValue || '',
                        imagen_url: f.imagen_url?.stringValue || '',
                        imagenes: pList,
                        enlace_facebook: f.enlace_facebook?.stringValue || '',
                        enlace_instagram: f.enlace_instagram?.stringValue || '',
                        enlace_maps: f.enlace_maps?.stringValue || '',
                        contacto_nombre: f.contacto_nombre?.stringValue || '',
                        contacto_telefono: f.contacto_telefono?.stringValue || '',
                        timestamp: ts,
                        orden: Number(f.orden?.integerValue || 1)
                    });
                }
            });
            // Orden cronológico estricto: La publicación más reciente aparece primero
            offers.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            return offers;
        }
    } catch(e) {
        console.error('[GET OFFERS ERR]', e);
    }
    return [];
}

// ═════════════════════════════════════════════════════════════════════
// TAXONOMÍA DE CATEGORÍAS & SINÓNIMOS PARA BÚSQUEDA INTELIGENTE
// ═════════════════════════════════════════════════════════════════════
const CATEGORIES_TAXONOMY = [
    {
        id: 'restaurantes',
        nombre: '🍔 Comida, Restaurantes & Gastronomía',
        shortName: 'Comida & Restaurantes',
        keywords: [
            'comida', 'restaurante', 'restaurantes', 'gastronomia', 'comer', 'cenar', 'desayuno', 'desayunos', 
            'almuerzo', 'almuerzos', 'cena', 'cenas', 'taco', 'tacos', 'taqueria', 'taquería', 'hamburguesa', 
            'hamburguesas', 'burger', 'burgers', 'pizza', 'pizzas', 'pizzeria', 'pizzería', 'marisco', 'mariscos', 
            'marisqueria', 'marisquería', 'sushi', 'hotdog', 'hotdogs', 'dogo', 'dogos', 'carne asada', 'asador', 
            'postre', 'postres', 'pastel', 'pasteles', 'pasteleria', 'pastelería', 'reposteria', 'repostería', 
            'cafe', 'café', 'cafes', 'cafeteria', 'cafetería', 'bar', 'antojito', 'antojitos', 'snack', 'snacks', 
            'alita', 'alitas', 'boneless', 'fondita', 'birria', 'menudo', 'desayunar', 'lonche', 'alimentos', 
            'carnitas', 'pollos', 'pollo asado', 'tortas', 'mariscos navojoa', 'cenaduria'
        ]
    },
    {
        id: 'ropa',
        nombre: '👗 Ropa, Calzado & Accesorios de Moda',
        shortName: 'Ropa & Moda',
        keywords: [
            'ropa', 'calzado', 'moda', 'zapato', 'zapatos', 'zapateria', 'zapatería', 'tenis', 'vestido', 
            'vestidos', 'pantalon', 'pantalón', 'pantalones', 'camisa', 'camisas', 'blusa', 'blusas', 'boutique', 
            'closet', 'accesorios', 'bolsa', 'bolsas', 'joyeria', 'joyería', 'joyas', 'joya', 'reloj', 'relojes', 
            'gorra', 'gorras', 'falda', 'faldas', 'traje', 'trajes', 'lentes', 'bebe', 'bebé', 'bebes', 
            'ropa de bebe', 'infantil', 'tienda de ropa', 'jeans', 'playeras', 'playera', 'sandalias', 'tacones', 
            'ropa interior', 'lenceria', 'perfumes', 'perfume', 'outfit'
        ]
    },
    {
        id: 'muebles',
        nombre: '🛋️ Muebles, Hogar & Decoración',
        shortName: 'Muebles & Hogar',
        keywords: [
            'mueble', 'muebles', 'muebleria', 'mueblería', 'hogar', 'decoracion', 'decoración', 'casa', 'sala', 
            'salas', 'comedor', 'comedores', 'recamara', 'recámaras', 'recamaras', 'colchon', 'colchón', 
            'colchones', 'cocina', 'cocinas', 'carpinteria', 'carpintería', 'cortina', 'cortinas', 'persiana', 
            'persianas', 'lampara', 'lámparas', 'lamparas', 'jardineria', 'jardinería', 'jardin', 'jardín', 
            'ferreteria', 'ferretería', 'herramientas', 'pintura', 'electrodomesticos', 'electrodomésticos', 
            'linea blanca', 'refrigerador', 'refrigeradores', 'estufa', 'estufas', 'lavadora', 'lavadoras', 
            'almohada', 'almohadas', 'sabanas', 'sillon', 'sillones', 'closets', 'muebleria navojoa', 'tapiceria'
        ]
    },
    {
        id: 'belleza',
        nombre: '✂️ Belleza, Barberías, Uñas & Spa',
        shortName: 'Belleza & Barberías',
        keywords: [
            'belleza', 'barberia', 'barbería', 'barbero', 'barber', 'barbershop', 'spa', 'estetica', 'estética', 
            'salon de belleza', 'salón de belleza', 'unas', 'uñas', 'acrilicas', 'pestanas', 'pestañas', 'ceja', 
            'cejas', 'corte de pelo', 'corte de cabello', 'corte', 'tinte', 'tintes', 'peinado', 'peinados', 
            'maquillaje', 'makeup', 'masaje', 'masajes', 'facial', 'faciales', 'depilacion', 'depilación', 
            'skincare', 'cuidado personal', 'cosmeticos', 'manicure', 'pedicure', 'microblading', 'alisado', 
            'keratina', 'barba'
        ]
    },
    {
        id: 'salud',
        nombre: '🩺 Salud, Clínicas & Médicos Especialistas',
        shortName: 'Salud & Médicos',
        keywords: [
            'salud', 'medico', 'médico', 'medicos', 'médicos', 'doctor', 'doctores', 'doctora', 'doctoras', 
            'clinica', 'clínica', 'consultorio', 'hospital', 'farmacia', 'farmacias', 'medicamento', 
            'medicamentos', 'dentista', 'dentistas', 'dental', 'dientes', 'odontologo', 'odontólogo', 
            'odontologia', 'optica', 'óptica', 'oftalmologo', 'lentes', 'psicologo', 'psicólogo', 'psicologia', 
            'nutriologo', 'nutriólogo', 'nutricion', 'laboratorio', 'analisis', 'análisis', 'pediatra', 
            'ginecologo', 'ginecólogo', 'ginecologia', 'fisioterapia', 'rehabilitacion', 'terapia', 'medicina', 
            'cardiologo', 'traumatologo', 'ultrasonido', 'rayos x'
        ]
    },
    {
        id: 'autos',
        nombre: '🚗 Autos, Talleres Mecánicos & Refacciones',
        shortName: 'Autos & Talleres',
        keywords: [
            'auto', 'autos', 'carro', 'carros', 'coche', 'coches', 'vehiculo', 'vehículos', 'vehiculos', 
            'taller', 'talleres', 'mecanico', 'mecánico', 'mecanicos', 'refacciones', 'refaccionaria', 'llanta', 
            'llantas', 'vulcanizadora', 'car wash', 'autolavado', 'lavado de autos', 'aceite', 'cambio de aceite', 
            'frenos', 'suspension', 'suspensión', 'laminado', 'pintura automotriz', 'bateria', 'batería', 
            'baterias', 'acumuladores', 'moto', 'motos', 'motocicleta', 'motocicletas', 'parabrisas', 
            'polarizado', 'transmisiones', 'afinacion'
        ]
    },
    {
        id: 'inmobiliaria',
        nombre: '🏡 Bienes Raíces, Renta y Venta de Casas/Terrenos',
        shortName: 'Bienes Raíces & Terrenos',
        keywords: [
            'bienes raices', 'bienes raíces', 'inmobiliaria', 'casa', 'casas', 'terreno', 'terrenos', 'lote', 
            'lotes', 'renta', 'rentar', 'rentas', 'se renta', 'se vende', 'venta de casas', 'departamento', 
            'departamentos', 'depa', 'depas', 'local', 'locales', 'local comercial', 'bodega', 'bodegas', 
            'rancho', 'ranchos', 'propiedad', 'propiedades', 'inmueble', 'inmuebles', 'arrendamiento', 
            'traspaso', 'fraccionamiento'
        ]
    },
    {
        id: 'eventos',
        nombre: '🎉 Eventos, Fiestas, Grupos & Banquetes',
        shortName: 'Eventos & Fiestas',
        keywords: [
            'evento', 'eventos', 'fiesta', 'fiestas', 'sonido', 'musica', 'música', 'grupo musical', 'banda', 
            'norteno', 'norteño', 'mariachi', 'dj', 'salon de fiestas', 'salon de eventos', 'salón de eventos', 
            'quinceanera', 'quinceañera', 'boda', 'bodas', 'cumpleanos', 'cumpleaños', 'banquete', 'banquetes', 
            'mesas y sillas', 'manteleria', 'brincolin', 'brincolines', 'inflable', 'inflables', 'fotografia', 
            'fotografía', 'video', 'pinata', 'piñata', 'decoracion de fiestas', 'animacion', 'sonido disco', 'toldos'
        ]
    },
    {
        id: 'tecnologia',
        nombre: '📱 Celulares, Computación & Tecnología',
        shortName: 'Celulares & Tecnología',
        keywords: [
            'celular', 'celulares', 'telefono', 'teléfono', 'telefonos', 'smartphone', 'smartphones', 
            'computacion', 'computación', 'computadora', 'computadoras', 'laptop', 'laptops', 'pc', 'tablet', 
            'tablets', 'electronica', 'electrónica', 'reparacion de celulares', 'accesorios de celular', 
            'pantalla', 'pantallas', 'funda', 'fundas', 'cargador', 'cargadores', 'tecnologia', 'tecnología', 
            'videojuegos', 'consola', 'consolas', 'audifonos', 'impresoras', 'camaras de seguridad', 'iphone', 'samsung'
        ]
    },
    {
        id: 'servicios',
        nombre: '💼 Servicios Profesionales, Técnicos & Oficios',
        shortName: 'Servicios Profesionales',
        keywords: [
            'servicios', 'servicio', 'abogado', 'abogados', 'contador', 'contadores', 'arquitecto', 
            'arquitectos', 'ingeniero', 'electricista', 'plomero', 'plomeria', 'plomería', 'aire acondicionado', 
            'refrigeracion', 'refrigeración', 'minisplit', 'climas', 'carpintero', 'herrero', 'herreria', 
            'herrería', 'cerrajero', 'cerrajeria', 'cerrajería', 'fumigacion', 'fumigación', 'fumigador', 
            'limpieza', 'diseno', 'diseño', 'imprenta', 'publicidad', 'rotulacion', 'mantenimiento', 
            'soldadura', 'mudanzas', 'fletes', 'seguros', 'tramites'
        ]
    }
];

function normalizeText(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'¡!¿]/g, ' ') // Quitar puntuación
        .replace(/\s+/g, ' ')
        .trim();
}

function findCategoryByQuery(queryText) {
    const normQuery = normalizeText(queryText);
    if (!normQuery || normQuery.length < 3) return null;

    const words = normQuery.split(' ');

    for (const cat of CATEGORIES_TAXONOMY) {
        for (const kw of cat.keywords) {
            const normKw = normalizeText(kw);
            if (normKw.includes(' ')) {
                if (normQuery.includes(normKw)) return cat;
            } else {
                if (words.includes(normKw)) return cat;
            }
        }
    }
    return null;
}

function filterOffersByCategory(offers, categoryObj) {
    const catKeywords = categoryObj.keywords.map(k => normalizeText(k));
    const catShort = normalizeText(categoryObj.shortName);
    const catId = normalizeText(categoryObj.id);

    return offers.filter(off => {
        const offCat = normalizeText(off.categoria || '');
        const offTit = normalizeText(off.titulo || '');
        const offDesc = normalizeText(off.descripcion || '');

        // 1. Coincidencia directa en el campo categoría
        if (offCat.includes(catId) || offCat.includes(catShort)) return true;
        if (catKeywords.some(kw => offCat.includes(kw))) return true;

        // 2. Coincidencia de palabras clave en título o descripción
        if (catKeywords.some(kw => offTit.includes(kw) || offDesc.includes(kw))) return true;

        return false;
    });
}

async function sendOffersList(metaTo, rawPhone, finalName, offersList, introHeader) {
    if (offersList.length === 0) return;

    // Mensaje inicial de cabecera
    await sendWhatsAppMessage(metaTo, introHeader, rawPhone, finalName);

    // Envío de cada oferta de una por una con intervalo de 2 segundos
    for (let idx = 0; idx < offersList.length; idx++) {
        await new Promise(r => setTimeout(r, 2000)); // pausa de 2 segundos exacta entre ofertas

        const off = offersList[idx];
        const cleanT = off.contacto_telefono ? off.contacto_telefono.replace(/\D/g, '') : '';
        
        // Construir texto de la oferta
        let cardMsg = `👑 *Publicación #${idx + 1}: ${off.titulo}*\n`;
        if (off.categoria) cardMsg += `🏷️ *Categoría:* ${off.categoria}\n`;
        cardMsg += `\n📝 ${off.descripcion}\n`;

        if (off.enlace_maps) {
            cardMsg += `\n📍 *Cómo llegar (Google Maps):*\n👉 ${off.enlace_maps}\n`;
        }
        if (off.enlace_facebook) {
            cardMsg += `\n📸 *Ver fotos y detalles en Facebook:*\n👉 ${off.enlace_facebook}\n`;
        }
        if (off.enlace_instagram) {
            cardMsg += `\n📷 *Ver fotos y detalles en Instagram:*\n👉 ${off.enlace_instagram}\n`;
        }
        if (cleanT) {
            cardMsg += `\n📲 *Contacto directo / WhatsApp:*\n👉 wa.me/52${cleanT} (${off.contacto_nombre || 'Contacto'})\n`;
        }

        // Si tiene foto, enviarla con el texto como caption. Si no, enviar texto solo
        const hasPhoto = off.imagen_url || (off.imagenes && off.imagenes.length > 0);
        if (hasPhoto) {
            const imgUrl = (off.imagen_url && off.imagen_url.startsWith('http')) 
                ? off.imagen_url 
                : `https://publicanavojoa.com/api/img?offerId=${off.id}&index=0`;
            await sendWhatsAppImage(metaTo, imgUrl, cardMsg, rawPhone, finalName);
        } else {
            await sendWhatsAppMessage(metaTo, cardMsg, rawPhone, finalName);
        }
    }
}

async function processBotRules(senderPhone, rawPhone, senderName, msgText) {
    const textLower = msgText.toLowerCase().trim();
    const textNorm = normalizeText(msgText);
    const metaTo = senderPhone || (rawPhone.length === 10 ? '52' + rawPhone : rawPhone);

    // 1. Consultar si el contacto ya está registrado en Firebase Firestore
    const contactInfo = await getContactFromFirestore(rawPhone);
    const isRegistered = contactInfo.isRegistered;
    const finalName = isRegistered ? contactInfo.nombre : (senderName !== 'Cliente WhatsApp' ? senderName : '');
    const firstName = finalName ? finalName.split(' ')[0] : '';
    const nameSalute = firstName ? `¡Hola ${firstName}!` : '¡Hola!';
    const coloniaText = contactInfo.colonia && contactInfo.colonia !== 'Navojoa' ? ` (Zona: *${contactInfo.colonia}*)` : '';

    console.log(`[BOT RULES] User: '${finalName || senderName}' (${rawPhone}) Registered: ${isRegistered} Msg: '${textLower}'`);

    // ═══════════════════════════════════════════════════════════════════
    // BLOQUEO PARA USUARIOS NO REGISTRADOS: Redirigir al formulario web
    // ═══════════════════════════════════════════════════════════════════
    if (!isRegistered) {
        // Detectar si viene del formulario (mensaje de confirmación de registro)
        if (textLower.includes('confirmar mi registro') || textLower.includes('terminar mi registro')) {
            // El usuario acaba de completar el formulario, reconsultar Firestore tras 2 segundos
            await new Promise(resolve => setTimeout(resolve, 2000));
            const freshInfo = await getContactFromFirestore(rawPhone);
            if (freshInfo.isRegistered) {
                const fName = freshInfo.nombre.split(' ')[0];
                const welcomeText = `${fName ? `¡Hola ${fName}!` : '¡Hola!'} 👋 Tu registro al *Club VIP de Publica Navojoa* ha quedado 100% confirmado para la colonia *${freshInfo.colonia}*.\n\nPor favor *guarda este número en tus contactos* para que te llegue el Catálogo Semanal de Ofertas y Remates de tu zona. ¡Bienvenido! 🎉\n\n📌 Comandos rápidos:\n- Escribe *OFERTAS* para ver los descuentos de esta semana.\n- Escribe *CATEGORÍAS* para buscar por giro comercial (comida, ropa, muebles, etc.).\n- Escribe *ANUNCIAR* si deseas promocionar tu negocio.`;
                await sendWhatsAppMessage(metaTo, welcomeText, rawPhone, freshInfo.nombre);
                return;
            }
        }

        // Cualquier otro mensaje de un usuario no registrado: solo enlace de registro
        const regText = `👑 *¡Bienvenido al Club VIP de Publica Navojoa!* 🎉\n\nPara desbloquear el *Catálogo Semanal de Ofertas y Remates* y recibir las promociones más exclusivas de tu zona, activa tu membresía gratuita en 15 segundos:\n\n👉 https://publicanavojoa.com/registro?tel=${rawPhone}\n\n📍 *(Tu número ya está cargado, solo selecciona tu colonia y confirma para empezar a recibir las ofertas).*`;
        await sendWhatsAppMessage(metaTo, regText, rawPhone, senderName);
        return;
    }

    // ═══════════════════════════════════════════════════════════════════
    // USUARIOS REGISTRADOS: Acceso completo a comandos y funcionalidades
    // ═══════════════════════════════════════════════════════════════════

    // Regla 1: Saludo / Bienvenida / Club VIP
    if (textLower.includes('club vip') || textLower.includes('unirme') || textLower.includes('hola') || textLower.includes('bienvenid') || textLower.includes('confirmar mi registro') || textLower.includes('terminar mi registro')) {
        const welcomeText = `${nameSalute} 👋 Qué gusto saludarte de nuevo en *Publica Navojoa*.\n\n👑 Tu Membresía VIP al Catálogo de Ofertas sigue activa${coloniaText}.\n\n📌 Comandos rápidos:\n- Escribe *OFERTAS* para ver todo el catálogo de esta semana.\n- Escribe *CATEGORÍAS* para ver la lista de giros disponibles (comida, ropa, muebles, autos, etc.).\n- Escribe *ANUNCIAR* si deseas promocionar tu negocio.`;
        await sendWhatsAppMessage(metaTo, welcomeText, rawPhone, finalName);
        return;
    }

    // Regla 2: Menú de Categorías (cuando escriben 'categorias', 'categoria', 'giros', 'rubros', 'buscar', 'menu')
    const isCategoryMenu = ['categorias', 'categoria', 'giros', 'giro', 'rubros', 'rubro', 'menu', 'secciones', 'que venden', 'que hay'].some(w => textNorm === w || textNorm === `ver ${w}` || textNorm === `mostrar ${w}` || textNorm.startsWith('buscar'));
    if (isCategoryMenu && !textNorm.includes('oferta') && !textNorm.includes('anunciar')) {
        const menuCategorias = `🏷️ *Categorías Disponibles en Publica Navojoa* 🛍️\n\n${nameSalute} Puedes buscar ofertas exclusivas escribiendo directamente la categoría o producto que necesitas:\n\n1️⃣ 🍔 *COMIDA* (Restaurantes, Tacos, Sushi, Mariscos)\n2️⃣ 👗 *ROPA* (Moda, Calzado, Boutiques, Accesorios)\n3️⃣ 🛋️ *MUEBLES* (Hogar, Salas, Comedores, Decoración)\n4️⃣ ✂️ *BELLEZA* (Barberías, Uñas, Spa, Estéticas)\n5️⃣ 🩺 *SALUD* (Médicos, Dentistas, Clínicas, Farmacias)\n6️⃣ 🚗 *AUTOS* (Talleres, Refacciones, Car Wash, Mecánicos)\n7️⃣ 🏡 *CASAS* (Bienes Raíces, Renta, Terrenos, Locales)\n8️⃣ 🎉 *FIESTAS* (Eventos, Música, Grupos, Inflables)\n9️⃣ 📱 *CELULARES* (Tecnología, Laptops, Reparaciones)\n🔟 💼 *SERVICIOS* (Abogados, Contadores, Refrigeración, Oficios)\n\n💡 *Tip:* Escribe directamente lo que buscas (ejemplo: *tacos*, *mueblería*, *dentista*, *rentas*, *ropa*) y te enviaremos las ofertas de esa categoría al instante.`;
        await sendWhatsAppMessage(metaTo, menuCategorias, rawPhone, finalName);
        return;
    }

    // Regla 3: Búsqueda Inteligente por Categoría Específica y Sinónimos
    const matchedCategory = findCategoryByQuery(msgText);
    const isGeneralCatalogWord = textNorm === 'ofertas' || textNorm === 'oferta' || textNorm === 'catalogo' || textNorm === 'remates' || textNorm === 'remate' || textNorm === 'ver catalogo' || textNorm === 'ver ofertas';

    if (matchedCategory && !isGeneralCatalogWord) {
        const allActiveOffers = await getOffersFromFirestore();
        const categoryOffers = filterOffersByCategory(allActiveOffers, matchedCategory);

        if (categoryOffers.length === 0) {
            const respuestaVaciaCat = `🏷️ *Categoría: ${matchedCategory.nombre}*\n\n${nameSalute} Por el momento no tenemos ofertas vigentes en esta categoría específica.\n\n✨ Escribe *OFERTAS* para ver todo el catálogo semanal o *CATEGORÍAS* para consultar otros giros comerciales.`;
            await sendWhatsAppMessage(metaTo, respuestaVaciaCat, rawPhone, finalName);
            return;
        }

        const introCatMsg = `🏷️ *Categoría: ${matchedCategory.nombre}* 🛍️\n\n${nameSalute} Encontramos *${categoryOffers.length}* promociones activas para ti en este rubro.\n\n_Te enviamos cada una a continuación 👇_`;
        await sendOffersList(metaTo, rawPhone, finalName, categoryOffers, introCatMsg);
        return;
    }

    // Regla 4: Catálogo Dinámico General de Ofertas (Envío secuencial cronológico más reciente primero)
    if (textLower.includes('catálogo') || textLower.includes('catalogo') || textLower.includes('oferta') || textLower.includes('remate')) {
        const activeOffers = await getOffersFromFirestore();

        if (activeOffers.length === 0) {
            const respuestaVacia = `🛍️ *Catálogo de Ofertas — Publica Navojoa* 🛍️\n\n${nameSalute} Estamos actualizando el catálogo con las mejores promociones de esta semana.\n\nMuy pronto recibirás aquí la notificación de los nuevos remates en tu zona. ¡Mantente atento! 🎉`;
            await sendWhatsAppMessage(metaTo, respuestaVacia, rawPhone, finalName);
            return;
        }

        const introMsg = `🛍️ *Catálogo de Ofertas y Eventos — Publica Navojoa* 🛍️\n\n${nameSalute} Aquí tienes las *${activeOffers.length}* promociones y eventos destacados activos esta semana (mostrando las más recientes primero).\n\n_Te enviamos cada una a continuación 👇_`;
        await sendOffersList(metaTo, rawPhone, finalName, activeOffers, introMsg);
        return;
    }

    // Regla 5: Atención Comercial para Negocios y Anunciantes
    if (textLower.includes('anunciar') || textLower.includes('paquete') || textLower.includes('publicidad') || textLower.includes('precio')) {
        const respuesta = `📢 *Atención Comercial — Publica Navojoa* 🚀\n\n${nameSalute} Qué gusto que desees dar a conocer tus productos o negocio ante nuestros más de *78,700 miembros locales* en Navojoa.\n\n👤 *Un asesor comercial de nuestro equipo te contactará directamente en este chat a la brevedad* para conocer tu negocio y brindarte la atención personalizada.\n\n🌟 *Nuestra red incluye publicaciones fijadas en el grupo de Facebook más grande de la ciudad y difusión directa al celular de nuestra comunidad de WhatsApp.*`;
        await sendWhatsAppMessage(metaTo, respuesta, rawPhone, finalName);
        return;
    }

    // Regla 6: Agradecimiento / Confirmación (ok, gracias, perfecto, listo, etc.)
    const confirmWords = ['ok', 'okay', 'gracias', 'perfecto', 'esta bien', 'está bien', 'entendido', 'excelente', 'listo', 'sale', 'va', 'super', 'súper', 'muy bien', 'de acuerdo', 'muchas gracias'];
    const isConfirm = confirmWords.some(w => textLower === w || textLower.startsWith(w + ' ') || textLower.endsWith(' ' + w) || textLower === 'ok');

    if (isConfirm) {
        const respuestaConfirm = `¡Excelente! 👍 Quedamos a la orden${firstName ? `, ${firstName}` : ''}.\n\nUn asesor comercial de nuestro equipo se comunicará contigo directamente por este chat a la brevedad. ¡Que tengas un excelente día! ☀️`;
        await sendWhatsAppMessage(metaTo, respuestaConfirm, rawPhone, finalName);
        return;
    }

    // Regla 7: Cancelar suscripción
    if (textLower.includes('baja') || textLower.includes('cancelar')) {
        const respuesta = `✅ ${nameSalute} Has sido dado de baja de la lista de difusión de Publica Navojoa. ¡Gracias por habernos acompañado!`;
        await sendWhatsAppMessage(metaTo, respuesta, rawPhone, finalName);
        return;
    }

    // Regla 8: Respuesta por defecto (Mensajes libres)
    const respuestaDefault = `¡Hola ${firstName || ''}! 👋 Recibimos tu mensaje en *Publica Navojoa*.\n\nUn asesor de nuestro equipo te responderá aquí mismo a la brevedad.\n\n💡 *Comandos disponibles:*\n- Escribe *OFERTAS* para ver el catálogo semanal.\n- Escribe *CATEGORÍAS* para buscar por giros (comida, ropa, muebles, etc.).\n- Escribe *ANUNCIAR* si deseas promocionar tu negocio.`;
    await sendWhatsAppMessage(metaTo, respuestaDefault, rawPhone, finalName);
}

module.exports = async function handler(req, res) {
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('[OK] Webhook Cloud verificado exitosamente!');
            return res.status(200).send(challenge);
        } else {
            return res.status(403).send('Forbidden');
        }
    }

    if (req.method === 'POST') {
        const data = req.body;
        console.log('[CLOUD WEBHOOK] Evento recibido de Meta:', JSON.stringify(data));

        try {
            const entry = data?.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const messages = value?.messages;

            if (messages && messages.length > 0) {
                const msg = messages[0];
                const contacts = value?.contacts?.[0];
                const senderPhone = msg?.from || '';
                let cleanPhone = senderPhone;

                if (cleanPhone.startsWith('521') && cleanPhone.length === 13) {
                    cleanPhone = cleanPhone.slice(3);
                } else if (cleanPhone.startsWith('52') && cleanPhone.length === 12) {
                    cleanPhone = cleanPhone.slice(2);
                }

                const senderName = contacts?.profile?.name || 'Cliente WhatsApp';
                let msgText = '';
                let fileUrl = '';
                let fileType = '';
                let fileName = '';

                if (msg.type === 'text') {
                    msgText = msg.text?.body || '';
                } else if (msg.type === 'image') {
                    msgText = msg.image?.caption || '🖼️ Imagen recibida';
                    fileType = 'image/jpeg';
                    fileName = 'Foto WhatsApp';
                    if (msg.image?.id) fileUrl = await getMetaMediaUrl(msg.image.id);
                } else if (msg.type === 'document') {
                    fileName = msg.document?.filename || 'Documento PDF';
                    msgText = msg.document?.caption || `📄 PDF: ${fileName}`;
                    fileType = 'application/pdf';
                    if (msg.document?.id) fileUrl = await getMetaMediaUrl(msg.document.id);
                } else if (msg.type === 'button') {
                    msgText = msg.button?.text || '';
                } else if (msg.type === 'interactive') {
                    const interactive = msg.interactive;
                    if (interactive?.type === 'button_reply') {
                        msgText = interactive.button_reply?.title || '';
                    } else if (interactive?.type === 'list_reply') {
                        msgText = interactive.list_reply?.title || '';
                    }
                }

                if (cleanPhone) {
                    await saveToFirestore(cleanPhone, senderName, msgText, 'incoming', fileUrl, fileType, fileName);
                    if (msgText) {
                        console.log(`[MENSAJE EN NUBE] De ${senderName} (${cleanPhone}): ${msgText}`);
                        await processBotRules(senderPhone, cleanPhone, senderName, msgText);
                    }
                }
            }
        } catch (err) {
            console.error('[EXCEPCION WEBHOOK]', err);
        }

        return res.status(200).json({ status: 'success' });
    }

    return res.status(405).send('Method Not Allowed');
};
