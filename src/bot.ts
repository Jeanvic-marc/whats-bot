import makeWASocket, {
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  WASocket
} from '@whiskeysockets/baileys';

import * as P from 'pino';
import { Boom } from '@hapi/boom';
import { DisconnectReason } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';

let sock: WASocket | null = null;
let lastQRCodeDataUrl: string | null = null;

export async function startBot() {
  if (sock) {
    try {
      await sock.logout();
      sock.ws.close();
    } catch (err) {
      // ignorar erros
    }
    sock = null;
  }

  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger: P.default({ level: 'silent' }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, P.default({ level: 'silent' })),
    },
    generateHighQualityLinkPreview: true,
    markOnlineOnConnect: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      lastQRCodeDataUrl = await QRCode.toDataURL(qr);
      console.log('QR code atualizado');
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Conexão encerrada. Reconectando...', shouldReconnect);
      if (shouldReconnect) {
        setTimeout(() => startBot(), 5000);
      }
    } else if (connection === 'open') {
      console.log('✅ Bot conectado ao WhatsApp');
      lastQRCodeDataUrl = null; // QR não mais necessário
    }
  });
}

export function getSocket(): WASocket {
  if (!sock) {
    throw new Error('Socket ainda não inicializado');
  }
  return sock;
}

export function getQRCode(): string | null {
  return lastQRCodeDataUrl;
}
