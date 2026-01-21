import dgram from 'dgram';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { ip, port, mac, key } = req.query;

  // 1. Проверка ключа безопасности
  if (key !== process.env.AUTH_KEY) {
    return res.status(403).json({ error: 'Forbidden: Invalid Secret Key' });
  }

  // Проверка входных данных
  if (!ip || !mac) {
    return res.status(400).json({ error: 'Missing required parameters: ip, mac' });
  }

  const targetPort = parseInt(port) || 9;

  try {
    // 2. Формирование Magic Packet
    // Формат: 6 байт 0xFF, затем 16 повторений MAC-адреса
    const macParts = mac.split(':').map(part => parseInt(part, 16));
    
    if (macParts.length !== 6 || macParts.some(isNaN)) {
        return res.status(400).json({ error: 'Invalid MAC address format. Use XX:XX:XX:XX:XX:XX' });
    }

    const buffer = Buffer.alloc(6 + 16 * 6);
    
    // Первые 6 байт заполняем 0xFF
    for (let i = 0; i < 6; i++) {
        buffer[i] = 0xFF;
    }

    // Заполняем MAC-адресом 16 раз
    for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 6; j++) {
            buffer[6 + i * 6 + j] = macParts[j];
        }
    }

    // 3. Отправка пакета по UDP
    const client = dgram.createSocket('udp4');

    await new Promise((resolve, reject) => {
        client.send(buffer, targetPort, ip, (err) => {
            client.close();
            if (err) reject(err);
            else resolve();
        });
    });

    return res.status(200).json({ 
        message: 'Magic Packet sent successfully', 
        target: { ip, port: targetPort, mac } 
    });

  } catch (error) {
    console.error('WoL Error:', error);
    return res.status(500).json({ error: 'Failed to send packet', details: error.message });
  }
}
