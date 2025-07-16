import express from 'express';
import { startBot, getSocket } from './bot';
import { GROUPS } from './config';

const app = express();
const port = 3000;

app.use(express.json());

app.post('/send', async (req, res) => {
  try {
    const { message, link } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem ausente' });
    }

    const sock = getSocket();

    for (const groupId of GROUPS) {
      const isValidLink = typeof link === 'string' && link.startsWith('http');
      const finalText = `${message}${isValidLink ? `\n\n👉 ${link}` : ''}`;

      console.log('📝 Mensagem:', message);
      console.log('🔗 Link recebido:', link);
      console.log('📦 Mensagem final enviada:', finalText);

      await sock.sendMessage(groupId, {
        text: finalText,
        linkPreview: isValidLink ? null : undefined
      });

      console.log(`✅ Mensagem enviada para: ${groupId}`);
    }

    res.status(200).json({ success: true, message: 'Mensagem enviada aos grupos' });
  } catch (err) {
    console.error('❌ Erro ao enviar mensagem:', err);
    res.status(500).json({ error: 'Erro interno ao enviar mensagem' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${port}`);
  startBot();
});
