const META_PHONE_ID = '1280742211792981';
const META_TOKEN = 'EAAUPiVpET1YBST456Cx6ZAuNEXN8iEghj5W3msjAvZC4q8unGAcJrpeOdMBNNokantyZBcAYJS64NEx7XAV9tneN0MY6s3K2KphrgvJLzeVvpWZAvXXhDxxdMsUyQZBBaYzzDfNrcdZCFWNyaCvZBvQpyZB7wdp0m33Ytwy0uwZAN0W57js1ag6ZBAtZCNL4p2A4nRLTAZDZD';

async function testSingle() {
    // Probar primero con el nombre que causó el error: KR'beauty
    const payload = {
        messaging_product: 'whatsapp',
        to: '526421611384',
        type: 'template',
        template: {
            name: 'martha_avendano_salon',
            language: { code: 'es_MX' },
            components: [
                {
                    type: 'header',
                    parameters: [{ type: 'image', image: { link: 'https://iili.io/nopsdYJ.jpg' } }]
                },
                {
                    type: 'body',
                    parameters: [{ type: 'text', text: "KR'beauty" }]
                }
            ]
        }
    };

    const res = await fetch(`https://graph.facebook.com/v20.0/${META_PHONE_ID}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${META_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('Intento con es_MX:', JSON.stringify(data, null, 2));

    // Probar con fallback 'es'
    payload.template.language.code = 'es';
    const res2 = await fetch(`https://graph.facebook.com/v20.0/${META_PHONE_ID}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${META_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    const data2 = await res2.json();
    console.log('Intento con fallback es:', JSON.stringify(data2, null, 2));
}

testSingle();
