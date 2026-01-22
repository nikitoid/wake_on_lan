import net from 'net';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { ip, key } = req.query;

  // 1. Проверка ключа безопасности
  if (key !== process.env.AUTH_KEY) {
    return res.status(403).json({ error: 'Forbidden: Invalid Secret Key' });
  }

  // Проверка входных данных
  if (!ip) {
    return res.status(400).json({ error: 'Missing required parameter: ip' });
  }

  return new Promise((resolve) => {
    const socket = new net.Socket();
    const TIMEOUT = 2000; // 2 секунды таймаут

    // Устанавливаем таймаут
    socket.setTimeout(TIMEOUT);

    socket.on('connect', () => {
      socket.destroy();
      // Yandex Smart Home expects ONLY value: true/false
      res.status(200).json({ value: true });
      resolve();
    });

    socket.on('timeout', () => {
      socket.destroy();
      res.status(200).json({ value: false });
      resolve();
    });

    socket.on('error', (err) => {
      socket.destroy();
      res.status(200).json({ value: false });
      resolve();
    });

    try {
      socket.connect(135, ip);
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error', details: err.message });
      resolve();
    }
  });
}
