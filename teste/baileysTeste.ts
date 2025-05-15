import makeWASocket, {
  useMultiFileAuthState,
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  proto,
  AnyMessageContent,
  downloadMediaMessage,
} from "baileys";
import P from "pino";
import NodeCache from "node-cache";
import { Boom } from "@hapi/boom";

const logger = P({ level: "info" });

const startSock = async () => {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  console.log(
    "state ================================================================================================================",
    state
  );
  //   console.log("saveCreds", saveCreds);

  const { version } = await fetchLatestBaileysVersion();

  const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: true,
    browser: Browsers.macOS("AiHouse"),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    getMessage: async (key: proto.IMessageKey) => {
      // Implemente a lógica para recuperar mensagens do seu armazenamento
      return undefined;
    },
    cachedGroupMetadata: async (jid) => groupCache.get(jid),
    markOnlineOnConnect: false,
  });

  sock.ev.on("creds.update", (e) => {
    console.log(
      "Credenciais atualizadas ============================================================================================",
      e
    );
    saveCreds();
  });

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    console.log(
      "connection.update ==================================================================================================="
    );
    console.log(
      "connection =========================================================================================================",
      connection
    );
    console.log(
      "lastDisconnection =====================================================================================================",
      lastDisconnect
    );
    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;
      if (shouldReconnect) {
        startSock();
      }
    } else if (connection === "open") {
      console.log("Conectado com sucesso!");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;
    if (msg.key.remoteJid?.includes("@g.us")) return; // Ignora mensagens de grupos
    if (msg.key.remoteJid?.includes("@newsletter")) return; // Ignora mensagens de grupos
    if (msg.key.fromMe) return; // Ignora mensagens enviadas pelo próprio bot
    const sender = msg.key.remoteJid;
    const text =
      msg.message.conversation || msg.message.extendedTextMessage?.text;
    // console.log("==>>NOVA MENSAGEM", msg);

    const mensagem = msg.message;
    if (mensagem.imageMessage) {
      console.log("Recebi uma imagem");
      // Baixando a imagem
      const buffer = await downloadMediaMessage(
        msg,
        "buffer",
        {},
        {
          // o método precisa dessas funções utilitárias
          logger: logger,
          reuploadRequest: sock.updateMediaMessage,
        }
      );

      // Salvando a imagem localmente
      const fs = require("fs");
      const path = require("path");
      const nomeArquivo = `imagem-${Date.now()}.jpg`;
      fs.writeFileSync(path.join(__dirname, nomeArquivo), buffer);

      console.log(`Imagem salva como ${nomeArquivo}`);

      // Opcional: responder que recebeu
      await sock.sendMessage(
        msg.key.remoteJid as string,
        { text: "Recebi sua imagem!" },
        { quoted: msg }
      );
    }

    // 🎵 Áudio
    else if (mensagem.audioMessage) {
      console.log("Recebi um áudio");
    }

    // 📄 Documento (PDF, etc.)
    else if (mensagem.documentMessage) {
      console.log("Recebi um documento");
    }

    // 🎥 Vídeo
    else if (mensagem.videoMessage) {
      console.log("Recebi um vídeo");
    }

    // 💬 Texto
    else if (mensagem.conversation) {
      console.log("Recebi um texto:", mensagem.conversation);
    }

    // Texto vindo de botão ou lista (também texto!)
    else if (mensagem.extendedTextMessage) {
      console.log(
        "Texto de resposta a botão ou mensagem estendida:",
        mensagem.extendedTextMessage.text
      );
    }
  });
  // const jid = "5521967048484:39@s.whatsapp.net";
  // const jid = "5521996399775@s.whatsapp.net";
  const jid = "554796394653@s.whatsapp.net";
  //   try {
  //     const result = await sock.sendMessage(jid, {
  //       text: "Olá Mundo!",
  //     });
  //     console.log("Mensagem enviada com sucesso:", result);
  //     return result;
  //   } catch (error) {
  //     console.error("Erro ao enviar mensagem:", error);
  //     throw error;
  //   }
  // setTimeout(async () => {
  //   console.log(
  //     "==>>Envio STATUS",
  //     await sock.presenceSubscribe(jid), // Subscreve à presença do contato
  //     await sock.sendPresenceUpdate("composing", jid) // Indica que está digitando
  //   );
  // }, 1000);
  setTimeout(async () => {
    // console.log(
    //   "==>>Envio",
    //   sock.ev.emit("messages.upsert", {
    //     messages: [
    //       {
    //         key: { remoteJid: "5521996399775@s.whatsapp.net", fromMe: true },
    //         message: { conversation: "Teste da api" },
    //         pushName: "Nunes",
    //         status: 2,
    //       },
    //     ],
    //     type: "notify",
    //     requestId: "5521996399775@s.whatsapp.net",
    //   })
    // );
    // console.log(
    //   "==>>Envio sendMessage",
    //   await sock.sendMessage(jid, { text: "Teste da api" })
    // );
    // await sock.sendMessage(jid, {
    //   image: { url: "https://img.odcdn.com.br/wp-content/uploads/2023/12/Inteligencia-Artificial-1.png" },
    //   caption: "Imagem da internet!",
    // });
  }, 5000);
};

startSock();
