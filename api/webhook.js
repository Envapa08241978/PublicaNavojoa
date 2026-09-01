const VERIFY_TOKEN = 'publica_navojoa_token_2026';
const PHONE_ID = '1280742211792981';
const ACCESS_TOKEN = 'EAAUPiVpET1YBSQ8qkBXZAVUmr6HkAPrWM9hnF2fd6wSFqZA5AYsKa6rE8pDpBb1jE1qHWrKmzrv3xZBvJNOXNJPsWl3JEW6G7vWmJUbWzVq8w8wdrX6IQZCpmMznEwW4RSIX5vQ62vPLxRXvZBQZCF1u6HzDIiCmubU1IkrdRKAYAQ27CTr8oNeiJtrC6ZB5dS2wQZDZD';

async function sendWhatsAppMessage(toPhone, text) {
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
    } catch (e) {
        console.error('[BOT ERROR]', e);
    }
}

async function sendWhatsAppTemplate(toPhone, templateName = 'bienvenida_club_vip', lang = 'es') {
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
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: lang }
                }
            })
        });
        const data = await response.json();
        console.log('[BOT TEMPLATE]', response.status, data);
    } catch (e) {
        console.error('[BOT TEMPLATE ERROR]', e);
    }
}

async function processBotRules(senderPhone, rawPhone, senderName, msgText) {
    const textLower = msgText.toLowerCase().trim();
    let metaTo = rawPhone;
    if (rawPhone.length === 10) {
        metaTo = '52' + rawPhone;
    }

    console.log(`[BOT RULES] Analyzing message from ${senderName}: '${textLower}'`);

    // Regla 1: Registro al Club VIP / Mensaje de Bienvenida
    if (textLower.includes('club vip') || textLower.includes('unirme') || textLower.includes('hola') || textLower.includes('bienvenid')) {
        await sendWhatsAppTemplate(metaTo, 'bienvenida_club_vip', 'es');
        return;
    }

    // Regla 2: Catálogo de Ofertas
    if (textLower.includes('catálogo') || textLower.includes('catalogo') || textLower.includes('oferta') || textLower.includes('remate')) {
        const respuesta = "🛍️ *Catálogo Semanal de Ofertas de Navojoa* 🛍️\n\nAquí tienes los remates de la semana:\n1. 🪑 Mueblería y Decoración — Muebles de Ocasión\n2. 👗 Ropa y Accesorios — Descuentos de Temporada\n3. 🍽️ Restaurantes Locales — Promociones 2x1\n\n📌 ¿Te interesa anunciar tu negocio o vender algún producto? Responde con *ANUNCIAR*.";
        await sendWhatsAppMessage(metaTo, respuesta);
        return;
    }

    // Regla 3: Paquetes Publicitarios para Negocios
    if (textLower.includes('anunciar') || textLower.includes('paquete') || textLower.includes('publicidad') || textLower.includes('precio')) {
        const respuesta = "📢 *Paquetes Publicitarios — Publica Navojoa* 🚀\n\nLlega a más de 78,700 personas en la ciudad:\n\n🥉 *Bronce ($600 MXN)*: Publicación fijada en Grupo FB por 7 días + Envío a lista VIP.\n🥈 *Plata VIP ($1,200 MXN)*: Publicación fijada 15 días + Difusión WhatsApp + Campaña Meta Ads.\n🥇 *Oro Premium ($2,500 MXN)*: Cobertura total 30 días + Campaña pagada prioritaria + Bot personalizado.\n\n📲 Responde *QUIERO ANUNCIAR* para coordinar con un asesor humano.";
        await sendWhatsAppMessage(metaTo, respuesta);
        return;
    }

    // Regla 4: Cancelar suscripción
    if (textLower.includes('baja') || textLower.includes('cancelar')) {
        const respuesta = "✅ Has sido dado de baja de la lista de difusión de Publica Navojoa. ¡Gracias por habernos acompañado!";
        await sendWhatsAppMessage(metaTo, respuesta);
        return;
    }

    // Regla 5: Respuesta por defecto
    const respuestaDefault = `¡Hola ${senderName}! 👋 Recibimos tu mensaje en *Publica Navojoa*.\n\nUn asesor humano te responderá a la brevedad.\n\n📌 Comandos rápidos:\n- Escribe *OFERTAS* para ver el catálogo semanal.\n- Escribe *ANUNCIAR* para ver nuestros paquetes publicitarios.`;
    await sendWhatsAppMessage(metaTo, respuestaDefault);
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
