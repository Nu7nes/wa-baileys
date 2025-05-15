import express, { Request, Response } from "express";
import router from "../routes/router";
import N8NService from "../services/N8NService";
import BaileysService from "../services/BaileysService";
import morgan from "morgan";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4100;

// Middleware para interpretar JSON
app.use(express.json());
// Use Router
app.use(router);

app.get("/qr", async (req, res) => {
  const baileysService = await BaileysService.getInstance();
  baileysService.setOnMessageReceived((data) => {
    N8NService.sendWebhook(data);
  });
  if (baileysService.qrImageData) {
    res.send(`
      <html>
        <body>
          <h1>Escaneie o QR Code com o WhatsApp</h1>
          <img src="${baileysService.qrImageData}" />
        </body>
      </html>
    `);
  } else {
    res.send("QR Code não disponível no momento.");
  }
});

// BaileysService

// Logs com Morgan
app.use(morgan("dev"));
// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
