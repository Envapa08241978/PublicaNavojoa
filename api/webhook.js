const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'publica_navojoa_token_2026';
const PHONE_ID = process.env.META_PHONE_ID || '1280742211792981';
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || 'EAAUPiVpET1YBST456Cx6ZAuNEXN8iEghj5W3msjAvZC4q8unGAcJrpeOdMBNNokantyZBcAYJS64NEx7XAV9tneN0MY6s3K2KphrgvJLzeVvpWZAvXXhDxxdMsUyQZBBaYzzDfNrcdZCFWNyaCvZBvQpyZB7wdp0m33Ytwy0uwZAN0W57js1ag6ZBAtZCNL4p2A4nRLTAZDZD';

async function saveToFirestore(cleanPhone, senderName, text, type) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    try {
        // Petición PATCH con updateMask para actualizar solo los campos de mensaje sin borrar colonia u opt_in existentes
        const fieldsToUpdate = ['last_msg', 'last_time', 'whatsapp'];
        const bodyFields = {
            whatsapp: { stringValue: cleanPhone },
            origen: { stringValue: 'WhatsApp Cloud Bot' },
            last_msg: { stringValue: text },
            last_time: { stringValue: timeStr }
        };

        if (senderName && senderName !== 'Cliente WhatsApp' && senderName !== 'Cliente VIP') {
            bodyFields.nombre = { stringValue: senderName };
            fieldsToUpdate.push('nombre');
        }

        const maskParams = fieldsToUpdate.map(f => `updateMask.fieldPaths=${f}`).join('&');

        await fetch(`https://firestore.googleapis.com/v1/projects/loquese-app/databases/(default)/documents/contacts/${cleanPhone}?${maskParams}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: bodyFields })
        });
    } catch (e) {
        console.error('[FIRESTORE ERR]', e);
    }
}

async function sendWhatsAppMessage(toPhone, text, cleanPhone = '', senderName = '') {
    const url = `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`;
    try {
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
        console.log('[BOT RES]', response.status, data);

        // Guardar respuesta del bot en Firestore
        if (cleanPhone) {
            await saveToFirestore(cleanPhone, senderName || 'Publica Navojoa', text, 'outgoing');
        }
    } catch (e) {
        console.error('[BOT ERROR]', e);
    }
}

async function getContactFromFirestore(cleanPhone) {
    try {
        const res = await fetch(`https://firestore.googleapis.com/v1/projects/loquese-app/databases/(default)/documents/contacts/${cleanPhone}`);
        if (res.ok) {
            const data = await res.json();
            const fields = data?.fields || {};
            const nombre = fields?.nombre?.stringValue || '';
            const colonia = fields?.colonia?.stringValue || '';
            const optIn = fields?.opt_in?.stringValue || '';
            const interesAnunciar = fields?.interes_anunciar?.stringValue || '';
            if (nombre && nombre !== '??' && nombre !== 'Cliente VIP' && nombre !== 'Cliente WhatsApp' && colonia && colonia !== 'Navojoa') {
                return { isRegistered: true, nombre, colonia, optIn, interesAnunciar };
            }
        }
    } catch (e) {
        console.error('[GET CONTACT ERR]', e);
    }
    return { isRegistered: false, nombre: '', colonia: '', optIn: '', interesAnunciar: '' };
}

async function processBotRules(senderPhone, rawPhone, senderName, msgText) {
    const textLower = msgText.toLowerCase().trim();
    let metaTo = rawPhone;
    if (rawPhone.length === 10) {
        metaTo = '52' + rawPhone;
    }

    // 1. Consultar si el contacto ya está registrado en Firebase Firestore
    const contactInfo = await getContactFromFirestore(rawPhone);
    const isRegistered = contactInfo.isRegistered;
    const finalName = isRegistered ? contactInfo.nombre : (senderName !== 'Cliente WhatsApp' ? senderName : '');
    const firstName = finalName ? finalName.split(' ')[0] : '';
    const nameSalute = firstName ? `¡Hola ${firstName}!` : '¡Hola!';
    const coloniaText = contactInfo.colonia && contactInfo.colonia !== 'Navojoa' ? ` (Zona: *${contactInfo.colonia}*)` : '';

    // 2. Guardar/actualizar datos del contacto en Firestore
    await saveToFirestore(rawPhone, finalName || senderName, msgText, 'incoming');

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

    // Regla 2: Catálogo de Ofertas (Solo para registrados)
    if (textLower.includes('catálogo') || textLower.includes('catalogo') || textLower.includes('oferta') || textLower.includes('remate')) {
        const respuesta = `🛍️ *Catálogo Semanal de Ofertas — Navojoa* 🛍️\n\n${nameSalute} Aquí tienes los remates y promociones destacadas de esta semana en Navojoa:\n\n1. 🪑 *Mueblería & Decoración:* Comedores y piezas decorativas de ocasión.\n2. 👗 *Moda & Boutique:* Descuentos de temporada en comercios locales.\n3. 🍽️ *Gastronomía Local:* Promociones y cupones 2x1.\n\n💬 *Si te interesa alguna de estas promociones, responde con el número de la oferta para enviarte los detalles directos.*`;
        await sendWhatsAppMessage(metaTo, respuesta, rawPhone, finalName);
        return;
    }

    // Regla 3: Atención Comercial para Negocios y Anunciantes
    if (textLower.includes('anunciar') || textLower.includes('paquete') || textLower.includes('publicidad') || textLower.includes('precio')) {
        const respuesta = `📢 *Atención Comercial — Publica Navojoa* 🚀\n\n${nameSalute} Qué gusto que desees dar a conocer tus productos o negocio ante nuestros más de *78,700 miembros locales* en Navojoa.\n\n👤 *Un asesor comercial de nuestro equipo te contactará directamente en este chat a la brevedad* para conocer tu negocio y brindarte la atención personalizada.\n\n🌟 *Nuestra red incluye publicaciones fijadas en el grupo de Facebook más grande de la ciudad y difusión directa al celular de nuestra comunidad de WhatsApp.*`;
        await sendWhatsAppMessage(metaTo, respuesta, rawPhone, finalName);
        return;
    // Regla 4: Agradecimiento / Confirmación (ok, gracias, perfecto, listo, etc.)
    const confirmWords = ['ok', 'okay', 'gracias', 'perfecto', 'esta bien', 'está bien', 'entendido', 'excelente', 'listo', 'sale', 'va', 'super', 'súper', 'muy bien', 'de acuerdo', 'muchas gracias'];
    const isConfirm = confirmWords.some(w => textLower === w || textLower.startsWith(w + ' ') || textLower.endsWith(' ' + w) || textLower.includes(w));

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

                if (msg.type === 'text') {
                    msgText = msg.text?.body || '';
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
