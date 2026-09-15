// Endpoint Serverless para conteo y redirección transparente de Códigos QR
// https://publicanavojoa.com/qr1 -> +1 a Promotor 1 -> Redirige a wa.me/526421520280
// https://publicanavojoa.com/qr2 -> +1 a Promotor 2 -> Redirige a wa.me/526421520280

const WA_OFFICIAL_URL = "https://wa.me/526421520280";
const WA_SCHEME_URL = "whatsapp://send?phone=526421520280";

module.exports = async function handler(req, res) {
    // Si la petición es para consultar estadísticas desde el CRM admin
    if (req.query.stats || req.query.get) {
        const metricsUrl = `https://firestore.googleapis.com/v1/projects/loquese-app/databases/(default)/documents/stats/qr_metrics`;
        let p1 = 0, p2 = 0, lastTime = '';
        try {
            const getRes = await fetch(metricsUrl);
            if (getRes.ok) {
                const doc = await getRes.json();
                p1 = parseInt(doc.fields?.scans_p1?.integerValue || '0', 10);
                p2 = parseInt(doc.fields?.scans_p2?.integerValue || '0', 10);
                lastTime = doc.fields?.last_scan_time?.stringValue || '';
            }
        } catch(e) {}
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.status(200).json({ scans_p1: p1, scans_p2: p2, last_scan_time: lastTime });
    }

    const promoterParam = (req.query.p || req.query.promotor || '1').toString().trim();
    const promoterId = promoterParam === '2' ? 'P2' : 'P1';
    const promoterName = promoterParam === '2' ? 'Promotor 2' : 'Promotor 1';
    const now = Date.now();
    const dateStr = new Date().toLocaleString('es-MX', { timeZone: 'America/Hermosillo' });
    const userAgent = req.headers['user-agent'] || 'Desconocido';

    // 1. Registrar el escaneo en Firebase Firestore en segundo plano
    try {
        const scanDocId = `scan_${promoterId}_${now}`;
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/loquese-app/databases/(default)/documents/qr_scans/${scanDocId}`;
        
        const scanData = {
            fields: {
                promotor_id: { stringValue: promoterId },
                promotor_nombre: { stringValue: promoterName },
                timestamp: { integerValue: String(now) },
                fecha: { stringValue: dateStr },
                user_agent: { stringValue: userAgent.substring(0, 250) }
            }
        };

        // Guardar el registro de escaneo individual
        await fetch(firestoreUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(scanData)
        });

        // Actualizar contador acumulado en stats/qr_metrics
        const metricsUrl = `https://firestore.googleapis.com/v1/projects/loquese-app/databases/(default)/documents/stats/qr_metrics`;
        
        // Obtener métricas previas
        let curP1 = 0;
        let curP2 = 0;
        try {
            const getRes = await fetch(metricsUrl);
            if (getRes.ok) {
                const doc = await getRes.json();
                curP1 = parseInt(doc.fields?.scans_p1?.integerValue || '0', 10);
                curP2 = parseInt(doc.fields?.scans_p2?.integerValue || '0', 10);
            }
        } catch(e) {}

        if (promoterId === 'P1') curP1 += 1;
        else curP2 += 1;

        await fetch(metricsUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fields: {
                    scans_p1: { integerValue: String(curP1) },
                    scans_p2: { integerValue: String(curP2) },
                    last_scan_time: { stringValue: dateStr },
                    last_scan_promoter: { stringValue: promoterName }
                }
            })
        });
    } catch (err) {
        console.error('[QR TRACKING ERROR]', err);
    }

    // 2. Definir mensaje natural de saludo para identificar el promotor al enviar WhatsApp
    const naturalMsg = promoterId === 'P2' 
        ? '¡Hola! Quiero ver las ofertas de Navojoa 🛍️' 
        : 'Hola Publica Navojoa 👋';
    const encodedMsg = encodeURIComponent(naturalMsg);
    const waOfficialUrl = `https://wa.me/526421520280?text=${encodedMsg}`;
    const waSchemeUrl = `whatsapp://send?phone=526421520280&text=${encodedMsg}`;

    // 3. Responder con página ligera que abre la app de WhatsApp al instante y redirige
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Conectando con Publica Navojoa...</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #0f172a; text-align: center; padding: 20px; }
        .spinner { width: 48px; height: 48px; border: 4px solid #e2e8f0; border-top-color: #16a34a; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 20px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .btn { display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 12px; font-weight: bold; text-decoration: none; margin-top: 16px; font-size: 1rem; }
    </style>
</head>
<body>
    <div class="spinner"></div>
    <h2 style="margin:0 0 8px;">Abriendo WhatsApp...</h2>
    <p style="color:#64748b; margin:0 0 16px; font-size: 0.95rem;">Te estamos conectando con Publica Navojoa</p>
    <a href="${waOfficialUrl}" class="btn">Continuar a WhatsApp ➔</a>

    <script>
        // Intento de apertura de la app nativa de WhatsApp
        window.location.href = "${waSchemeUrl}";
        // Redirección HTTP como respaldo si la app tarda
        setTimeout(function() {
            window.location.href = "${waOfficialUrl}";
        }, 300);
    </script>
</body>
</html>`;

    return res.status(200).send(html);
};
