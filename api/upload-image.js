const FormData = require('form-data');
const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { imageBase64, filename } = req.body || {};
        if (!imageBase64) {
            return res.status(400).json({ error: 'No se envió ninguna imagen en base64' });
        }

        // Clean base64 string
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');

        const form = new FormData();
        form.append('key', '6d207e02198a847aa98d0a2a901485a5');
        form.append('action', 'upload');
        form.append('format', 'json');
        form.append('source', buffer, {
            filename: filename || 'oferta.jpg',
            contentType: 'image/jpeg'
        });

        const uploadRes = await fetch('https://freeimage.host/api/1/upload', {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });

        const data = await uploadRes.json();
        console.log('[FREEIMAGE HOST RES]', data);

        if (data && data.image && data.image.url) {
            return res.status(200).json({
                success: true,
                url: data.image.url,
                display_url: data.image.display_url || data.image.url,
                thumb: data.image.thumb ? data.image.thumb.url : data.image.url
            });
        } else {
            return res.status(500).json({ error: 'Error al subir imagen', details: data });
        }
    } catch (e) {
        console.error('[UPLOAD IMAGE ERR]', e);
        return res.status(500).json({ error: e.message });
    }
};
