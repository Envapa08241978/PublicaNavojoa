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
        const res = await fetch(`https://firestore.googleapis.com/v1/projects/loquese-app/databases/(default)/documents/offers`);
        if (res.ok) {
            const data = await res.json();
            const docs = data?.documents || [];
            const offers = [];
            docs.forEach(doc => {
                const f = doc.fields || {};
                const activo = f.activo?.booleanValue !== undefined ? f.activo.booleanValue : true;
                if (activo) {
                    let pList = [];
                    if (f.imagenes_json?.stringValue) {
                        try { pList = JSON.parse(f.imagenes_json.stringValue); } catch(e) {}
                    }
                    if (pList.length === 0 && f.imagen_url?.stringValue) {
                        pList = [f.imagen_url.stringValue];
                    }

                    offers.push({
                        id: doc.name.split('/').pop(),
                        titulo: f.titulo?.stringValue || 'Oferta Destacada',
                        categoria: f.categoria?.stringValue || 'Comercio Local',
                        descripcion: f.descripcion?.stringValue || '',
                        imagen_url: f.imagen_url?.stringValue || '',
                        imagenes: pList,
                        enlace_facebook: f.enlace_facebook?.stringValue || '',
                        contacto_nombre: f.contacto_nombre?.stringValue || '',
                        contacto_telefono: f.contacto_telefono?.stringValue || '',
                        orden: Number(f.orden?.integerValue || 1)
                    });
                }
            });
            offers.sort((a, b) => a.orden - b.orden);
            return offers;
        }
    } catch(e) {
        console.error('[GET OFFERS ERR]', e);
    }
    return [];
}

async function processBotRules(senderPhone, rawPhone, senderName, msgText) {
    const textLower = msgText.toLowerCase().trim();
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
                const welcomeText = `${fName ? `¡Hola ${fName}!` : '¡Hola!'} 👋 Tu registro al *Club VIP de Publica Navojoa* ha quedado 100% confirmado para la colonia *${freshInfo.colonia}*.\n\nPor favor *guarda este número en tus contactos* para que te llegue el Catálogo Semanal de Ofertas y Remates de tu zona. ¡Bienvenido! 🎉\n\n📌 Comandos rápidos:\n- Escribe *OFERTAS* para ver los descuentos de esta semana.\n- Escribe *ANUNCIAR* si deseas promocionar tu negocio.`;
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
        const welcomeText = `${nameSalute} 👋 Qué gusto saludarte de nuevo en *Publica Navojoa*.\n\n👑 Tu Membresía VIP al Catálogo de Ofertas sigue activa${coloniaText}.\n\n📌 Comandos rápidos:\n- Escribe *OFERTAS* para ver los descuentos y remates de esta semana.\n- Escribe *ANUNCIAR* si deseas promocionar tu negocio.`;
        await sendWhatsAppMessage(metaTo, welcomeText, rawPhone, finalName);
        return;
    }

    // Regla 2: Catálogo Dinámico de Ofertas (Consultado en tiempo real de Firestore)
    if (textLower.includes('catálogo') || textLower.includes('catalogo') || textLower.includes('oferta') || textLower.includes('remate')) {
        const activeOffers = await getOffersFromFirestore();
        let respuesta = '';

        if (activeOffers.length > 0) {
            let listado = '';
            activeOffers.forEach((off, idx) => {
                const num = idx + 1;
                listado += `*${num}.* ✨ *${off.titulo}*\n`;
                if (off.categoria) listado += `   🏷️ _Categoría: ${off.categoria}_\n`;
                if (off.descripcion) listado += `   📝 ${off.descripcion}\n`;
                if (off.enlace_facebook) listado += `   📸 Ver fotos en Facebook: ${off.enlace_facebook}\n`;
                if (off.contacto_telefono) {
                    const cleanT = off.contacto_telefono.replace(/\D/g, '');
                    listado += `   📲 Contacto directo: wa.me/52${cleanT} (${off.contacto_nombre || 'Vendedor'})\n`;
                }
                listado += `\n`;
            });

            respuesta = `🛍️ *Catálogo Semanal de Ofertas — Publica Navojoa* 🛍️\n\n${nameSalute} Aquí tienes las ofertas y promociones activas de esta semana:\n\n${listado}💬 *Responde con el número de la oferta (ej. 1) para enviarte la foto y detalles directos.*`;
        } else {
            respuesta = `🛍️ *Catálogo Semanal de Ofertas — Navojoa* 🛍️\n\n${nameSalute} Estamos actualizando el catálogo con las mejores promociones de esta semana.\n\nMuy pronto recibirás aquí la notificación de los nuevos remates en tu zona. ¡Mantente atento! 🎉`;
        }

        await sendWhatsAppMessage(metaTo, respuesta, rawPhone, finalName);
        return;
    }

    // Regla 2.1: El usuario responde con el número de una oferta (ej: '1', 'oferta 1', 'la 1')
    const numberMatch = textLower.match(/(?:oferta\s*|la\s*|ver\s*)?([1-9])(?:\b|$)/);
    if (numberMatch && !textLower.includes('anunciar') && !textLower.includes('precio')) {
        const selectedIndex = parseInt(numberMatch[1], 10) - 1;
        const activeOffers = await getOffersFromFirestore();
        if (activeOffers[selectedIndex]) {
            const off = activeOffers[selectedIndex];
            const cleanT = off.contacto_telefono ? off.contacto_telefono.replace(/\D/g, '') : '';
            const captionMsg = `👑 *Oferta #${selectedIndex + 1}: ${off.titulo}*\n\n📝 ${off.descripcion}\n\n📲 *Vendedor:* ${off.contacto_nombre || 'Contacto'}${cleanT ? ` (wa.me/52${cleanT})` : ''}${off.enlace_facebook ? `\n\n📸 *Ver más fotos en Facebook:* ${off.enlace_facebook}` : ''}`;

            const photos = off.imagenes && off.imagenes.length > 0 ? off.imagenes : (off.imagen_url ? [off.imagen_url] : []);

            if (photos.length > 0) {
                // Enviar foto principal con el caption descriptivo
                const firstImgUrl = photos[0].startsWith('http') ? photos[0] : `https://publicanavojoa.com/api/img?offerId=${off.id}&index=0`;
                await sendWhatsAppImage(metaTo, firstImgUrl, captionMsg, rawPhone, finalName);

                // Si hay más fotos (hasta 3), enviarlas consecutivamente
                for (let i = 1; i < photos.length; i++) {
                    await new Promise(r => setTimeout(r, 600)); // pausa para orden de llegada
                    const nextImgUrl = photos[i].startsWith('http') ? photos[i] : `https://publicanavojoa.com/api/img?offerId=${off.id}&index=${i}`;
                    await sendWhatsAppImage(metaTo, nextImgUrl, `📸 Foto ${i + 1} de ${photos.length} — ${off.titulo}`, rawPhone, finalName);
                }
            } else {
                const detailMsg = `👑 *Detalles de la Oferta #${selectedIndex + 1}* 👑\n\n✨ *${off.titulo}*\n🏷️ *Categoría:* ${off.categoria}\n\n📝 *Descripción:* ${off.descripcion}\n\n📸 *Ver publicación y fotos en Facebook:* \n👉 ${off.enlace_facebook}\n\n📲 *Contactar directamente al vendedor:* \n${off.contacto_nombre ? `👤 *${off.contacto_nombre}*\n` : ''}${cleanT ? `👉 https://wa.me/52${cleanT}` : ''}\n\n--- \n_Menciona que viste su oferta en Publica Navojoa para un trato preferencial._`;
                await sendWhatsAppMessage(metaTo, detailMsg, rawPhone, finalName);
            }
            return;
        }
    }

    // Regla 3: Atención Comercial para Negocios y Anunciantes
    if (textLower.includes('anunciar') || textLower.includes('paquete') || textLower.includes('publicidad') || textLower.includes('precio')) {
        const respuesta = `📢 *Atención Comercial — Publica Navojoa* 🚀\n\n${nameSalute} Qué gusto que desees dar a conocer tus productos o negocio ante nuestros más de *78,700 miembros locales* en Navojoa.\n\n👤 *Un asesor comercial de nuestro equipo te contactará directamente en este chat a la brevedad* para conocer tu negocio y brindarte la atención personalizada.\n\n🌟 *Nuestra red incluye publicaciones fijadas en el grupo de Facebook más grande de la ciudad y difusión directa al celular de nuestra comunidad de WhatsApp.*`;
        await sendWhatsAppMessage(metaTo, respuesta, rawPhone, finalName);
        return;
    }

    // Regla 4: Agradecimiento / Confirmación (ok, gracias, perfecto, listo, etc.)
    const confirmWords = ['ok', 'okay', 'gracias', 'perfecto', 'esta bien', 'está bien', 'entendido', 'excelente', 'listo', 'sale', 'va', 'super', 'súper', 'muy bien', 'de acuerdo', 'muchas gracias'];
    const isConfirm = confirmWords.some(w => textLower === w || textLower.startsWith(w + ' ') || textLower.endsWith(' ' + w) || textLower === 'ok');

    if (isConfirm) {
        const respuestaConfirm = `¡Excelente! 👍 Quedamos a la orden${firstName ? `, ${firstName}` : ''}.\n\nUn asesor comercial de nuestro equipo se comunicará contigo directamente por este chat a la brevedad. ¡Que tengas un excelente día! ☀️`;
        await sendWhatsAppMessage(metaTo, respuestaConfirm, rawPhone, finalName);
        return;
    }

    // Regla 5: Cancelar suscripción
    if (textLower.includes('baja') || textLower.includes('cancelar')) {
        const respuesta = `✅ ${nameSalute} Has sido dado de baja de la lista de difusión de Publica Navojoa. ¡Gracias por habernos acompañado!`;
        await sendWhatsAppMessage(metaTo, respuesta, rawPhone, finalName);
        return;
    }

    // Regla 6: Respuesta por defecto (Mensajes libres)
    const respuestaDefault = `¡Hola ${firstName || ''}! 👋 Recibimos tu mensaje en *Publica Navojoa*.\n\nUn asesor de nuestro equipo te responderá aquí mismo a la brevedad.`;
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
