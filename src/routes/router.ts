import { Router } from "express";
import BaileysService from "../services/BaileysService";

const url = "/api/v1";
const router = Router();

// Rota de Teste
router.get(`${url}/test`, (req, res) => {
  res.status(200).json({ message: "Rota de teste funcionando!" });
});

router.post(`${url}/whatsapp/send-message`, async (req, res) => {
  const baileysService = await BaileysService.getInstance();
  if (baileysService.isConnected()) {
    try {
      const { jid, message } = req.body;
      console.log("==>>", jid, message);

      // Aqui você chamaria o método de envio de mensagem do baileysService
      baileysService.sendMessage(jid, message);
      res.status(200).json({ message: "Mensagem enviada com sucesso!" });
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      res.status(500).json({ message: "Erro ao enviar mensagem" });
    }
  } else {
    res.status(500).json({ message: "Socket não conectado" });
  }
});

router.post(`${url}/whatsapp/send-presence`, async (req, res) => {
  const baileysService = await BaileysService.getInstance();
  if (baileysService.isConnected()) {
    try {
      console.log(req.body);

      const { jid } = req.body;
      // Aqui você chamaria o método de envio de presença do baileysService
      baileysService.sendPresence(jid, "composing");
      res.status(200).json({ message: "Presença enviada com sucesso!" });
    } catch (error) {
      console.error("Erro ao enviar presença:", error);
      res.status(500).json({ message: "Erro ao enviar presença" });
    }
  } else {
    res.status(500).json({ message: "Socket não conectado" });
  }
});

export default router;
