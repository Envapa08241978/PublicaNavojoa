const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'publica_navojoa_token_2026';
const PHONE_ID = process.env.META_PHONE_ID || '1280742211792981';
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || 'EAAUPiVpET1YBST456Cx6ZAuNEXN8iEghj5W3msjAvZC4q8unGAcJrpeOdMBNNokantyZBcAYJS64NEx7XAV9tneN0MY6s3K2KphrgvJLzeVvpWZAvXXhDxxdMsUyQZBBaYzzDfNrcdZCFWNyaCvZBvQpyZB7wdp0m33Ytwy0uwZAN0W57js1ag6ZBAtZCNL4p2A4nRLTAZDZD';
const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/loquese-app/databases/(default)/documents';

// ═══════════════════════════════════════════════════════════════════════════
// DEDUPLICACIÓN PERSISTENTE EN FIRESTORE (funciona aunque Vercel haga cold start)
// Colección: processed_msgs/{hash del msgId} → { msgId, ts }
// ═══════════════════════════════════════════════════════════════════════════
function hashMsgId(msgId) {
    if (!msgId) return 'unknown';
    return 'msg_' + msgId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function isDuplicateMessage(msgId) {
    if (!msgId) return false;
    const safeId = hashMsgId(msgId);
    const docUrl = `${FIRESTORE_BASE}/processed_msgs/${safeId}`;
    try {
        const res = await fetch(docUrl);
        if (res.ok) {
            // Ya existe → es duplicado
            console.log(`[DEDUP] Documento ${safeId} ya existe → DUPLICADO`);
            return true;
        }
        // No existe (404) → marcarlo como procesado de inmediato
        console.log(`[DEDUP] Documento ${safeId} no existe → Registrando como nuevo`);
        await fetch(docUrl + '?updateMask.fieldPaths=ts&updateMask.fieldPaths=mid', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: { 
                ts: { integerValue: String(Date.now()) },
                mid: { stringValue: msgId }
            }})
        });
        return false;
    } catch (e) {
        console.error('[DEDUP ERR]', e);
        return false; // En caso de error, procesar para no perder mensajes legítimos
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// COOLDOWN POR TELÉFONO PERSISTENTE EN FIRESTORE
// Colección: cooldowns/{phone} → { ts }
// ═══════════════════════════════════════════════════════════════════════════
async function isCatalogOnCooldown(cleanPhone) {
    const COOLDOWN_MS = 60000; // 60 segundos de cooldown anti-saturación
    const docUrl = `${FIRESTORE_BASE}/cooldowns/${cleanPhone}`;
    const now = Date.now();
    try {
        const res = await fetch(docUrl);
        if (res.ok) {
            const doc = await res.json();
            const lastTs = parseInt(doc?.fields?.ts?.integerValue || '0', 10);
            if (now - lastTs < COOLDOWN_MS) {
                return true; // Aún en cooldown
            }
        }
        // Actualizar timestamp del cooldown
        await fetch(docUrl + '?updateMask.fieldPaths=ts', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: { ts: { integerValue: String(now) } } })
        });
        return false;
    } catch (e) {
        console.error('[COOLDOWN ERR]', e);
        return false;
    }
}

async function saveToFirestore(cleanPhone, senderName, text, type, fileUrl = '', fileType = '', fileName = '') {
    const timeStr = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Hermosillo' });
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

        // Prevenir duplicados (si el ultimo mensaje es identico en < 60 segundos)
        if (existingMsgs.length > 0) {
            const lastM = existingMsgs[existingMsgs.length - 1];
            if (lastM.text === text && lastM.type === type && (Date.now() - (lastM.timestamp || 0) < 60000)) {
                console.log(`[SAVE DEDUP] Mensaje idéntico ignorado para ${cleanPhone}: "${text}"`);
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
        if (existingMsgs.length > 100) existingMsgs = existingMsgs.slice(-100);

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
// ═════════════════════════════════════════════════════════════════════
// TAXONOMÍA DE CATEGORÍAS & SINÓNIMOS PARA BÚSQUEDA INTELIGENTE
// ═════════════════════════════════════════════════════════════════════
const CATEGORIES_TAXONOMY = [
    {
        id: 'restaurantes',
        nombre: '🍔 Comida, Restaurantes & Gastronomía',
        shortName: 'Comida & Restaurantes',
        keywords: [
            'comida', 'restaurante', 'restaurantes', 'gastronomia', 'gastronomía', 'comer', 'cenar', 
            'desayuno', 'desayunos', 'almuerzo', 'almuerzos', 'cena', 'cenas', 'taco', 'tacos', 'taqueria', 
            'taquería', 'hamburguesa', 'hamburguesas', 'burger', 'burgers', 'pizza', 'pizzas', 'pizzeria', 
            'pizzería', 'marisco', 'mariscos', 'marisqueria', 'marisquería', 'sushi', 'hotdog', 'hotdogs', 
            'dogo', 'dogos', 'carne asada', 'asador', 'postre', 'postres', 'pastel', 'pasteles', 'pasteleria', 
            'pastelería', 'reposteria', 'repostería', 'cafe', 'café', 'cafes', 'cafeteria', 'cafetería', 
            'bar', 'antojito', 'antojitos', 'snack', 'snacks', 'alita', 'alitas', 'boneless', 'fondita', 
            'birria', 'menudo', 'desayunar', 'lonche', 'alimentos', 'carnitas', 'pollos', 'pollo asado', 
            'tortas', 'cenaduria', 'cenaduría'
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
            'gorra', 'gorras', 'falda', 'faldas', 'traje', 'trajes', 'bebe', 'bebé', 'bebes', 'infantil', 
            'tienda de ropa', 'jeans', 'playeras', 'playera', 'sandalias', 'tacones', 'ropa interior', 
            'lenceria', 'lencería', 'perfumes', 'perfume', 'outfit'
        ]
    },
    {
        id: 'muebles',
        nombre: '🛋️ Muebles, Hogar & Decoración',
        shortName: 'Muebles & Hogar',
        keywords: [
            'mueble', 'muebles', 'muebleria', 'mueblería', 'hogar', 'decoracion', 'decoración', 'sala', 
            'salas', 'comedor', 'comedores', 'recamara', 'recámaras', 'recamaras', 'colchon', 'colchón', 
            'colchones', 'cocina', 'cocinas', 'cocinas modernas', 'persiana', 'persianas', 'persianas sheer', 
            'persianas zebra', 'cortina', 'cortinas', 'lampara', 'lámparas', 'lamparas', 'electrodomesticos', 
            'electrodomésticos', 'linea blanca', 'línea blanca', 'refrigerador', 'refrigeradores', 'estufa', 
            'estufas', 'lavadora', 'lavadoras', 'almohada', 'almohadas', 'sabanas', 'sillon', 'sillones', 
            'tapiceria', 'tapicería', 'jacott'
        ]
    },
    {
        id: 'belleza',
        nombre: '✂️ Belleza, Barberías, Uñas & Spa',
        shortName: 'Belleza & Barberías',
        keywords: [
            'belleza', 'barberia', 'barbería', 'barbero', 'barber', 'barbershop', 'spa', 'estetica', 'estética', 
            'salon de belleza', 'salón de belleza', 'unas', 'uñas', 'acrilicas', 'acrílicas', 'pestanas', 
            'pestañas', 'ceja', 'cejas', 'corte de pelo', 'corte de cabello', 'tinte', 'tintes', 'peinado', 
            'peinados', 'maquillaje', 'makeup', 'masaje', 'masajes', 'facial', 'faciales', 'depilacion', 
            'depilación', 'skincare', 'cuidado personal', 'cosmeticos', 'cosméticos', 'manicure', 'pedicure', 
            'microblading', 'alisado', 'keratina', 'barba', 'aurabrows', 'nikol vasquez', 'cejas y pestañas'
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
            'odontologia', 'odontología', 'optica', 'óptica', 'oftalmologo', 'oftalmólogo', 'psicologo', 
            'psicólogo', 'psicologia', 'nutriologo', 'nutriólogo', 'nutricion', 'nutrición', 'laboratorio', 
            'analisis clinicos', 'análisis clínicos', 'pediatra', 'ginecologo', 'ginecólogo', 'ginecologia', 
            'fisioterapia', 'rehabilitacion', 'rehabilitación', 'terapia', 'medicina', 'cardiologo', 
            'traumatologo', 'ultrasonido', 'rayos x', 'divina salud'
        ]
    },
    {
        id: 'autos',
        nombre: '🚗 Autos, Talleres Mecánicos & Refacciones',
        shortName: 'Autos & Talleres',
        keywords: [
            'auto', 'autos', 'carro', 'carros', 'coche', 'coches', 'vehiculo', 'vehículos', 'vehiculos', 
            'taller', 'talleres', 'mecanico', 'mecánico', 'mecanicos', 'mecánicos', 'refacciones', 
            'refaccionaria', 'llanta', 'llantas', 'vulcanizadora', 'car wash', 'autolavado', 'lavado de autos', 
            'lavado de carros', 'lavado a domicilio', 'cambio de aceite', 'frenos', 'suspension', 'suspensión', 
            'laminado automotriz', 'hojalateria', 'laminado y pintura', 'pintura automotriz', 'bateria', 
            'batería', 'baterias', 'acumuladores', 'moto', 'motos', 'motocicleta', 'motocicletas', 
            'parabrisas', 'polarizado', 'transmisiones', 'afinacion', 'afinación'
        ]
    },
    {
        id: 'inmobiliaria',
        nombre: '🏡 Bienes Raíces, Renta y Hospedaje',
        shortName: 'Bienes Raíces & Hospedaje',
        keywords: [
            'bienes raices', 'bienes raíces', 'inmobiliaria', 'casa en renta', 'casa en venta', 'casas en renta', 
            'terreno', 'terrenos', 'lote', 'lotes', 'hospedaje', 'hospedajes', 'cabana', 'cabaña', 'cabañas', 
            'ranchito de alamos', 'alamos sonora', 'alamos', 'departamento', 'departamentos', 'depa', 'depas', 
            'local comercial', 'bodega', 'bodegas', 'rancho', 'ranchos', 'propiedad', 'propiedades', 
            'inmueble', 'inmuebles', 'arrendamiento', 'traspaso', 'fraccionamiento'
        ]
    },
    {
        id: 'eventos',
        nombre: '🎉 Eventos, Fiestas, Grupos & Sonido',
        shortName: 'Eventos & Sonido',
        keywords: [
            'evento', 'eventos', 'fiesta', 'fiestas', 'sonido', 'musica', 'música', 'grupo musical', 'banda', 
            'norteno', 'norteño', 'mariachi', 'dj', 'dj shawn', 'audio', 'audio profesional', 'iluminacion para eventos', 
            'luces', 'salon de fiestas', 'salon de eventos', 'salón de eventos', 'quinceanera', 'quinceañera', 'boda', 
            'bodas', 'cumpleanos', 'cumpleaños', 'banquete', 'banquetes', 'mesas y sillas', 'manteleria', 
            'mantelería', 'brincolin', 'brincolines', 'inflable', 'inflables', 'sonido disco', 'toldos', 
            'animacion de fiestas'
        ]
    },
    {
        id: 'tecnologia',
        nombre: '📱 Celulares, Computación & Tecnología',
        shortName: 'Celulares & Tecnología',
        keywords: [
            'celular', 'celulares', 'telefono', 'teléfono', 'telefonos', 'smartphone', 'smartphones', 
            'computacion', 'computación', 'computadora', 'computadoras', 'laptop', 'laptops', 'pc', 'gamer', 
            'gaming', 'cpu gamer', 'cpu', 'pcrepair', 'tablet', 'tablets', 'electronica', 'electrónica', 
            'reparacion de celulares', 'accesorios de celular', 'pantalla', 'pantallas', 'funda', 'fundas', 
            'cargador', 'cargadores', 'tecnologia', 'tecnología', 'videojuegos', 'consola', 'consolas', 
            'audifonos', 'audífonos', 'impresoras', 'camaras de seguridad', 'iphone', 'samsung', 'ryzen', 
            'geforce', 'rtx'
        ]
    },
    {
        id: 'servicios',
        nombre: '💼 Servicios Profesionales, Mantenimiento & Limpieza',
        shortName: 'Servicios & Mantenimiento',
        keywords: [
            'servicios', 'servicio', 'mantenimiento', 'limpieza', 'limpieza profunda', 'grupo altua', 'altua', 
            'jardineria', 'jardinería', 'poda', 'jardin', 'jardín', 'electricista', 'electricidad', 'plomero', 
            'plomeria', 'plomería', 'pintor', 'pintura de casas', 'carpintero', 'carpinteria', 'carpintería', 
            'aire acondicionado', 'refrigeracion', 'refrigeración', 'minisplit', 'climas', 'herrero', 'herreria', 
            'herrería', 'cerrajero', 'cerrajeria', 'cerrajería', 'fumigacion', 'fumigación', 'fumigador', 
            'diseno grafico', 'diseno publicitario', 'imprenta', 'publicidad', 'rotulacion', 'rotulación', 
            'soldadura', 'mudanzas', 'fletes', 'abogado', 'abogados', 'contador', 'contadores', 'arquitecto', 
            'ingeniero'
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

function matchKeywordInText(normKeyword, normText) {
    if (!normKeyword || !normText) return false;
    const escaped = normKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|\\s)${escaped}(\\s|$)`).test(normText);
}

function findCategoryByQuery(queryText) {
    const normQuery = normalizeText(queryText);
    if (!normQuery || normQuery.length < 2) return null;

    for (const cat of CATEGORIES_TAXONOMY) {
        for (const kw of cat.keywords) {
            const normKw = normalizeText(kw);
            if (matchKeywordInText(normKw, normQuery) || normQuery === normKw) {
                return cat;
            }
        }
    }
    return null;
}

function searchOffers(allOffers, queryText) {
    const normQuery = normalizeText(queryText);
    if (!normQuery || normQuery.length < 2) return [];

    const queryWords = normQuery.split(' ').filter(w => w.length >= 2);
    const matchedCat = findCategoryByQuery(queryText);

    // Puntuación de relevancia para cada oferta
    const scoredOffers = [];

    for (const off of allOffers) {
        const offCat = normalizeText(off.categoria || '');
        const offTit = normalizeText(off.titulo || '');
        const offDesc = normalizeText(off.descripcion || '');
        const offNom = normalizeText(off.contacto_nombre || '');

        let score = 0;

        // 1. Coincidencia directa del query completo en Título o Categoría (Puntuación máxima: 100)
        if (matchKeywordInText(normQuery, offTit) || matchKeywordInText(normQuery, offCat)) {
            score += 100;
        }

        // 2. Coincidencia directa del query en nombre del negocio / contacto (Puntuación: 90)
        if (matchKeywordInText(normQuery, offNom)) {
            score += 90;
        }

        // 3. Coincidencia de palabras del query en Título o Categoría (Puntuación: 50 por palabra)
        for (const w of queryWords) {
            if (matchKeywordInText(w, offTit) || matchKeywordInText(w, offCat)) {
                score += 50;
            }
        }

        // 4. Si el query mapea a una categoría de la taxonomía
        if (matchedCat) {
            const catId = normalizeText(matchedCat.id);
            const catShort = normalizeText(matchedCat.shortName);

            // Si la categoría de la oferta es afín a la categoría taxonomía
            if (matchKeywordInText(catId, offCat) || matchKeywordInText(catShort, offCat)) {
                score += 45;
            } else {
                for (const kw of matchedCat.keywords) {
                    const normKw = normalizeText(kw);
                    if (matchKeywordInText(normKw, offCat)) {
                        score += 35;
                        break;
                    }
                }
            }

            // Coincidencia de palabras clave de la taxonomía en el título
            for (const kw of matchedCat.keywords) {
                const normKw = normalizeText(kw);
                if (matchKeywordInText(normKw, offTit)) {
                    score += 30;
                    break;
                }
            }
        }

        // 5. Coincidencia en descripción
        for (const w of queryWords) {
            if (w.length >= 3 && matchKeywordInText(w, offDesc)) {
                const genericWords = ['casa', 'hogar', 'espacio', 'espacios', 'facil', 'limpieza', 'eventos', 'calidad', 'servicio', 'contacto', 'mensaje'];
                if (!genericWords.includes(w)) {
                    score += 25;
                }
            }
        }

        // Bonificación extra para eventos/música/sonido/audio/dj
        if (['musica', 'sonido', 'audio', 'dj'].includes(normQuery) && (offTit.includes('dj') || offCat.includes('sonido'))) {
            score += 50;
        }

        if (score > 0) {
            scoredOffers.push({ offer: off, score });
        }
    }

    // Ordenar por relevancia descendente
    scoredOffers.sort((a, b) => b.score - a.score);

    if (scoredOffers.length > 0) {
        const topScore = scoredOffers[0].score;
        const threshold = Math.max(35, topScore * 0.6);
        return scoredOffers.filter(item => item.score >= threshold).map(item => item.offer);
    }

    return [];
}

async function sendSingleOffer(metaTo, rawPhone, finalName, off, idxNumber = 1) {
    const cleanT = off.contacto_telefono ? off.contacto_telefono.replace(/\D/g, '') : '';
    
    // Construir texto de la oferta
    let cardMsg = `👑 *Publicación #${idxNumber}: ${off.titulo}*\n`;
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

async function sendOffersList(metaTo, rawPhone, finalName, offersList, introHeader = '') {
    if (!offersList || offersList.length === 0) return;

    if (introHeader) {
        await sendWhatsAppMessage(metaTo, introHeader, rawPhone, finalName);
        await new Promise(r => setTimeout(r, 600));
    }

    for (let idx = 0; idx < offersList.length; idx++) {
        if (idx > 0) {
            // Intervalo ágil de 800ms entre cada imagen para entrega limpia y veloz
            await new Promise(r => setTimeout(r, 800));
        }
        await sendSingleOffer(metaTo, rawPhone, finalName, offersList[idx], idx + 1);
    }

    // Mensaje final orientador de búsqueda tras terminar de enviar todas las publicaciones
    await new Promise(r => setTimeout(r, 800));
    const tipMsg = `*¿Buscas algo específico?* Escribe directamente lo que necesitas (ej: _evento_, _DJ_, _ferretería_, _comida_, _ropa_) y te mostraremos solo las ofertas de esa categoría.`;
    await sendWhatsAppMessage(metaTo, tipMsg, rawPhone, finalName);
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

    // Regla 1: Saludo / Bienvenida / Club VIP / ¿Cómo funciona?
    if (textLower.includes('cómo funciona') || textLower.includes('como funciona') || textLower.includes('funciona el club') || textLower.includes('club vip') || textLower.includes('unirme') || textLower.includes('hola') || textLower.includes('bienvenid') || textLower.includes('confirmar mi registro') || textLower.includes('terminar mi registro')) {
        const welcomeText = `${nameSalute} 👋 Qué gusto saludarte en *Publica Navojoa*.\n\n👑 *El Club VIP de Navojoa* es la comunidad privada de difusión (+78,700 miembros) donde recibes en tu celular el Catálogo Semanal de Ofertas, Remates y Promociones en tu colonia${coloniaText}.\n\n📌 Comandos rápidos:\n- Escribe *OFERTAS* para ver todo el catálogo de esta semana.\n- Escribe *CATEGORÍAS* para ver la lista de giros disponibles (comida, ropa, muebles, autos, etc.).\n- Escribe *ANUNCIAR* si deseas promocionar tu negocio.`;
        await sendWhatsAppMessage(metaTo, welcomeText, rawPhone, finalName);
        return;
    }

    // Regla 2: Menú de Categorías (cuando escriben 'categorias', 'categoria', 'giros', 'rubros', 'menu')
    const isCategoryMenu = ['categorias', 'categoria', 'giros', 'giro', 'rubros', 'rubro', 'menu', 'secciones', 'que venden', 'que hay'].some(w => textNorm === w || textNorm === `ver ${w}` || textNorm === `mostrar ${w}` || textNorm.startsWith('buscar'));
    if (isCategoryMenu && !textNorm.includes('oferta') && !textNorm.includes('anunciar')) {
        const menuCategorias = `🏷️ *Categorías Disponibles en Publica Navojoa* 🛍️\n\n${nameSalute} Puedes buscar ofertas exclusivas escribiendo directamente la categoría o producto que necesitas:\n\n1️⃣ 🍔 *COMIDA* (Restaurantes, Tacos, Sushi, Mariscos)\n2️⃣ 👗 *ROPA* (Moda, Calzado, Boutiques, Accesorios)\n3️⃣ 🛋️ *MUEBLES* (Hogar, Salas, Comedores, Decoración)\n4️⃣ ✂️ *BELLEZA* (Barberías, Uñas, Spa, Estéticas)\n5️⃣ 🩺 *SALUD* (Médicos, Dentistas, Clínicas, Farmacias)\n6️⃣ 🚗 *AUTOS* (Talleres, Refacciones, Car Wash, Mecánicos)\n7️⃣ 🏡 *CASAS* (Bienes Raíces, Renta, Terrenos, Locales)\n8️⃣ 🎉 *FIESTAS* (Eventos, Música, Grupos, DJ, Inflables)\n9️⃣ 📱 *CELULARES* (Tecnología, Laptops, Reparaciones)\n🔟 💼 *SERVICIOS* (Abogados, Contadores, Refrigeración, Oficios)\n\n💡 *Tip:* Escribe directamente lo que buscas (ejemplo: *DJ*, *tacos*, *mueblería*, *dentista*, *rentas*, *ropa*) y te enviaremos las ofertas de esa categoría al instante.`;
        await sendWhatsAppMessage(metaTo, menuCategorias, rawPhone, finalName);
        return;
    }

    // Regla 3: Búsqueda Inteligente por Categoría Específica, DJ, Eventos, Negocios y Palabras Clave
    const isGeneralCatalogWord = textNorm === 'ofertas' || textNorm === 'oferta' || textNorm === 'catalogo' || textNorm === 'remates' || textNorm === 'remate' || textNorm === 'ver catalogo' || textNorm === 'ver ofertas' || textLower.includes('ver catálogo de ofertas de la semana');

    if (!isGeneralCatalogWord && textNorm.length >= 2) {
        const allActiveOffers = await getOffersFromFirestore();
        const searchResults = searchOffers(allActiveOffers, msgText);

        if (searchResults.length > 0) {
            const introSearchMsg = `🏷️ *Búsqueda:* _${msgText.trim()}_ 🛍️\n\n${nameSalute} Encontramos *${searchResults.length}* ${searchResults.length === 1 ? 'promoción activa' : 'promociones activas'} para ti:\n\n_Te ${searchResults.length === 1 ? 'la enviamos' : 'las enviamos'} a continuación con todos los detalles 👇_`;
            await sendOffersList(metaTo, rawPhone, finalName, searchResults, introSearchMsg);
            return;
        }
    }

    // Regla 4: Catálogo Completo General de Ofertas (Envío de cada publicidad con fotos cada 3 segundos)
    if (isGeneralCatalogWord || textLower.includes('catálogo') || textLower.includes('catalogo') || textLower.includes('oferta') || textLower.includes('remate')) {
        if (await isCatalogOnCooldown(rawPhone)) {
            console.log(`[COOLDOWN] Catálogo ignorado por cooldown para ${rawPhone}`);
            return;
        }

        const activeOffers = await getOffersFromFirestore();

        if (activeOffers.length === 0) {
            const respuestaVacia = `🛍️ *Catálogo de Ofertas — Publica Navojoa* 🛍️\n\n${nameSalute} Estamos actualizando el catálogo con las mejores promociones de esta semana.\n\nMuy pronto recibirás aquí la notificación de los nuevos remates en tu zona. ¡Mantente atento! 🎉`;
            await sendWhatsAppMessage(metaTo, respuestaVacia, rawPhone, finalName);
            return;
        }

        const introMsg = `🛍️ *Catálogo Semanal de Ofertas — Publica Navojoa* 🛍️\n\n${nameSalute} Aquí tienes las *${activeOffers.length}* promociones y eventos activos esta semana en Navojoa:\n\n_Te enviamos cada una a continuación con sus imágenes y detalles 👇_`;
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

    // Regla 8: Respuesta por defecto (Mensajes libres sin coincidencia)
    const respuestaDefault = `¡Hola ${firstName || ''}! 👋 Recibimos tu mensaje en *Publica Navojoa*.\n\nUn asesor de nuestro equipo te responderá aquí mismo a la brevedad.\n\n💡 *Comandos disponibles:*\n- Escribe *OFERTAS* para ver el catálogo semanal completo con fotos.\n- Escribe directamente lo que buscas (ej: *DJ*, *evento*, *comida*, *ropa*, *ferretería*) para ver ofertas de ese giro.\n- Escribe *ANUNCIAR* si deseas promocionar tu negocio.`;
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

        // ═══════════════════════════════════════════════════════════════
        // PASO 1: Procesar eventos de Opt-Out / Preferencias de usuario
        // Webhook "user_preferences" y estados de error 131050
        // ═══════════════════════════════════════════════════════════════
        const entry = data?.entry?.[0];
        const changes = entry?.changes?.[0];
        const field = changes?.field;
        const value = changes?.value;

        // Caso A: Evento oficial de Meta 'user_preferences'
        if (field === 'user_preferences' || value?.user_preferences) {
            const pref = value?.user_preferences || value;
            const waId = pref?.wa_id || pref?.phone_number || pref?.recipient_id;
            let cleanPhone = waId ? String(waId).replace(/\D/g, '') : '';
            if (cleanPhone.startsWith('521') && cleanPhone.length === 13) cleanPhone = cleanPhone.slice(3);
            else if (cleanPhone.startsWith('52') && cleanPhone.length === 12) cleanPhone = cleanPhone.slice(2);

            const category = pref?.category || 'marketing';
            const status = pref?.status || pref?.action; // 'opt_out' / 'opt_in' / 'STOP'

            console.log(`[USER PREFERENCE] Phone: ${cleanPhone}, Cat: ${category}, Status: ${status}`);

            if (cleanPhone) {
                try {
                    const isOptOut = status === 'opt_out' || status === 'STOP' || status === 'disabled';
                    await fetch(`https://firestore.googleapis.com/v1/projects/loquese-app/databases/(default)/documents/contacts/${cleanPhone}?updateMask.fieldPaths=opt_in&updateMask.fieldPaths=marketing_status&updateMask.fieldPaths=motivo_baja`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            fields: {
                                opt_in: { stringValue: isOptOut ? 'No' : 'Sí' },
                                marketing_status: { stringValue: isOptOut ? 'opt_out' : 'active' },
                                motivo_baja: { stringValue: isOptOut ? 'Usuario detuvo mensajes de marketing en WhatsApp (Meta 131050)' : '' }
                            }
                        })
                    });
                    console.log(`[USER PREFERENCE UPDATED] Contacto ${cleanPhone} actualizado a opt_in=${isOptOut ? 'No' : 'Sí'}`);
                } catch(e) {
                    console.error('[USER PREF ERROR]', e);
                }
            }
            return res.status(200).json({ status: 'user_preferences_handled' });
        }

        // Caso B: Errores en 'statuses' como código 131050 (User opted out)
        const statuses = value?.statuses;
        if (statuses && statuses.length > 0) {
            const st = statuses[0];
            const recipientId = st?.recipient_id || '';
            const errorCode = st?.errors?.[0]?.code;

            if (errorCode === 131050 || errorCode === '131050') {
                let cleanPhone = String(recipientId).replace(/\D/g, '');
                if (cleanPhone.startsWith('521') && cleanPhone.length === 13) cleanPhone = cleanPhone.slice(3);
                else if (cleanPhone.startsWith('52') && cleanPhone.length === 12) cleanPhone = cleanPhone.slice(2);

                if (cleanPhone) {
                    try {
                        console.log(`[STATUS OPT-OUT 131050] Marcando ${cleanPhone} como No en opt-in`);
                        await fetch(`https://firestore.googleapis.com/v1/projects/loquese-app/databases/(default)/documents/contacts/${cleanPhone}?updateMask.fieldPaths=opt_in&updateMask.fieldPaths=marketing_status&updateMask.fieldPaths=motivo_baja`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                fields: {
                                    opt_in: { stringValue: 'No' },
                                    marketing_status: { stringValue: 'opt_out' },
                                    motivo_baja: { stringValue: 'Meta Error 131050: Usuario detuvo recepción de marketing' }
                                }
                            })
                        });
                    } catch(e) {}
                }
            }
            return res.status(200).json({ status: 'statuses_handled' });
        }

        const messages = value?.messages;

        // Si no hay mensajes (status updates, delivery receipts, etc.), responder y salir
        if (!messages || messages.length === 0) {
            return res.status(200).json({ status: 'no_messages' });
        }

        const msg = messages[0];
        const msgId = msg?.id || '';

        // ═══════════════════════════════════════════════════════════════
        // PASO 2: DEDUPLICACIÓN — Verificar en Firestore ANTES de todo
        // Si Meta reintenta este webhook (cold start, timeout, etc.),
        // el message ID ya estará guardado y se descarta al instante.
        // ═══════════════════════════════════════════════════════════════
        if (msgId) {
            const isDuplicate = await isDuplicateMessage(msgId);
            if (isDuplicate) {
                console.log(`[DUPLICATE BLOCKED] msg.id=${msgId} ya fue procesado. Ignorando reintento.`);
                return res.status(200).json({ status: 'duplicate_blocked' });
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // PASO 3: Procesar el mensaje (ya confirmado como único)
        // ═══════════════════════════════════════════════════════════════
        try {
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
        } catch (err) {
            console.error('[EXCEPCION WEBHOOK]', err);
        }

        return res.status(200).json({ status: 'success' });
    }

    return res.status(405).send('Method Not Allowed');
};

