const PHONE_ID = process.env.META_PHONE_ID || '1280742211792981';
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || 'EAAUPiVpET1YBST456Cx6ZAuNEXN8iEghj5W3msjAvZC4q8unGAcJrpeOdMBNNokantyZBcAYJS64NEx7XAV9tneN0MY6s3K2KphrgvJLzeVvpWZAvXXhDxxdMsUyQZBBaYzzDfNrcdZCFWNyaCvZBvQpyZB7wdp0m33Ytwy0uwZAN0W57js1ag6ZBAtZCNL4p2A4nRLTAZDZD';

async function saveMessageToFirestore(cleanPhone, msgData) {
    try {
        const docId = `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const fields = {
            text: { stringValue: msgData.text || '' },
            type: { stringValue: msgData.type || 'outgoing' },
            time: { stringValue: msgData.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
            timestamp: { integerValue: Date.now().toString() }
        };

        if (msgData.fileUrl && !msgData.fileUrl.startsWith('data:')) {
            fields.fileUrl = { stringValue: msgData.fileUrl };
        }
        if (msgData.fileType) fields.fileType = { stringValue: msgData.fileType };
        if (msgData.fileName) fields.fileName = { stringValue: msgData.fileName };

        await fetch(`https://firestore.googleapis.com/v1/projects/loquese-app/databases/(default)/documents/contacts/${cleanPhone}/messages/${docId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields })
        });
    } catch (e) {
        console.error('[FIRESTORE MSG SAVE ERR]', e);
    }
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { phone, text, fileUrl, fileType, fileName } = req.body || {};
    if (!phone) {
        return res.status(400).json({ error: 'Número de WhatsApp requerido' });
    }

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('52') && cleanPhone.length === 12) cleanPhone = cleanPhone.slice(2);
    if (cleanPhone.startsWith('521') && cleanPhone.length === 13) cleanPhone = cleanPhone.slice(3);

    let metaTo = cleanPhone.length === 10 ? '52' + cleanPhone : cleanPhone;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let displayText = text || '';
    if (!displayText) {
        if (fileType?.startsWith('image/')) displayText = `🖼️ Imagen: ${fileName || 'Foto'}`;
        else if (fileType === 'application/pdf') displayText = `📄 Documento PDF: ${fileName || 'Archivo.pdf'}`;
        else displayText = 'Mensaje de Publica Navojoa';
    }

    const msgPayload = {
        text: displayText,
        type: 'outgoing',
        time: timeStr,
        fileUrl: fileUrl && fileUrl.startsWith('data:') ? '' : fileUrl,
        fileType,
        fileName
    };

    // Save to Firestore
    await saveMessageToFirestore(cleanPhone, msgPayload);

    // Call Meta API
    try {
        let metaBody = {
            messaging_product: 'whatsapp',
            to: metaTo,
            type: 'text',
            text: { body: displayText }
        };

        // Standard public URLs for media
        if (fileUrl && fileUrl.startsWith('http')) {
            if (fileType?.startsWith('image/')) {
                metaBody = {
                    messaging_product: 'whatsapp',
                    to: metaTo,
                    type: 'image',
                    image: { link: fileUrl, caption: text || '' }
                };
            } else if (fileType === 'application/pdf') {
                metaBody = {
                    messaging_product: 'whatsapp',
                    to: metaTo,
                    type: 'document',
                    document: { link: fileUrl, caption: text || '', filename: fileName || 'documento.pdf' }
                };
            }
        }

        const response = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(metaBody)
        });

        const data = await response.json();
        console.log('[META API SEND RESULT]', data);

        return res.status(200).json({ success: !data.error, data });
    } catch (err) {
        console.error('[META API SEND ERR]', err);
        return res.status(500).json({ error: err.message });
    }
};
