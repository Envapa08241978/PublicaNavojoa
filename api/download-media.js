const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || 'EAAUPiVpET1YBST456Cx6ZAuNEXN8iEghj5W3msjAvZC4q8unGAcJrpeOdMBNNokantyZBcAYJS64NEx7XAV9tneN0MY6s3K2KphrgvJLzeVvpWZAvXXhDxxdMsUyQZBBaYzzDfNrcdZCFWNyaCvZBvQpyZB7wdp0m33Ytwy0uwZAN0W57js1ag6ZBAtZCNL4p2A4nRLTAZDZD';

module.exports = async function handler(req, res) {
    const { url, filename } = req.query || {};
    if (!url) {
        return res.status(400).send('URL de archivo requerida');
    }

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`
            }
        });

        if (!response.ok) {
            return res.status(response.status).send(`Error de autenticación Meta API: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const buffer = await response.arrayBuffer();

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        if (filename) {
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
        }

        return res.status(200).send(Buffer.from(buffer));
    } catch (err) {
        console.error('[MEDIA PROXY ERR]', err);
        return res.status(500).send('Error al descargar archivo: ' + err.message);
    }
};
