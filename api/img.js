// Endpoint público para servir imágenes de ofertas en alta velocidad
// URLs: /api/img?offerId=oferta_1&index=0
// Esto permite que Meta WhatsApp Cloud API descargue la imagen por HTTP de forma 100% nativa y segura

module.exports = async function handler(req, res) {
    const { offerId, index } = req.query || {};

    if (!offerId) {
        return res.status(400).send('offerId is required');
    }

    try {
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/loquese-app/databases/(default)/documents/offers/${offerId}`;
        const fsRes = await fetch(firestoreUrl);
        if (!fsRes.ok) {
            return res.status(404).send('Offer not found');
        }

        const data = await fsRes.json();
        const fields = data?.fields || {};

        let photos = [];
        if (fields.imagenes_json?.stringValue) {
            try { photos = JSON.parse(fields.imagenes_json.stringValue); } catch(e) {}
        }
        if (photos.length === 0 && fields.imagen_url?.stringValue) {
            photos = [fields.imagen_url.stringValue];
        }

        const targetIdx = parseInt(index || '0', 10);
        const selectedBase64 = photos[targetIdx] || photos[0];

        if (!selectedBase64) {
            return res.status(404).send('Image not found');
        }

        // Si ya es una URL http externa, redirigir
        if (selectedBase64.startsWith('http')) {
            return res.redirect(302, selectedBase64);
        }

        // Si es Data URL base64, decodificar a binario JPEG y enviar con headers de imagen
        const matches = selectedBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            const contentType = matches[1];
            const buffer = Buffer.from(matches[2], 'base64');
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            return res.status(200).send(buffer);
        }

        return res.status(400).send('Invalid image format');
    } catch(e) {
        console.error('[IMG PROXY ERR]', e);
        return res.status(500).send('Internal server error');
    }
};
