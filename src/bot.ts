import makeWASocket, {
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  WASocket
} from '@whiskeysockets/baileys';

import * as P from 'pino';
import { Boom } from '@hapi/boom';
import { DisconnectReason } from '@whiskeysockets/baileys';
// no topo do arquivo bot.ts
const qrcode = require('qrcode-terminal');


let sock: WASocket;

export async function startBot() {
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

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Conexão encerrada. Reconectando...', shouldReconnect);
      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === 'open') {
      console.log('✅ Bot conectado ao WhatsApp');
    }
  });
}

export function getSocket(): WASocket {
  if (!sock) {
    throw new Error('Socket ainda não inicializado');
  }
  return sock;
}
