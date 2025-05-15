// BaileysService.ts
import makeWASocket, {
  useMultiFileAuthState,
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  proto,
  AnyMessageContent,
} from "baileys";
import P from "pino";
import NodeCache from "node-cache";
import { Boom } from "@hapi/boom";
import { WACustonAuthState } from "../utils/WACustomAuthState";

class BaileysService {
  private static instance: BaileysService;
  private sock: ReturnType<typeof makeWASocket> | null = null;
  private groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });
  private isSocketConnected: boolean = false;
  private onMessageReceived?: (data: any) => void;

  private constructor() {}

  public static getInstance(): BaileysService {
    if (!BaileysService.instance) {
      BaileysService.instance = new BaileysService();
      BaileysService.instance.initialize();
    }
    return BaileysService.instance;
  }

  public setOnMessageReceived(callback: (data: any) => void) {
    this.onMessageReceived = callback;
  }

  private async initialize() {
    const logger = P({ level: "info" });
    // const { state, saveCreds } = await useMultiFileAuthState(
    //   "auth_info_baileys"
    // );

    const db_host = process.env.POSTGRES_HOST || "";
    const db_port = parseInt(process.env.POSTGRES_PORT || "0");
    const db_user = process.env.POSTGRES_USER || "";
    const db_password = process.env.POSTGRES_PASSWORD || "";
    const db_database = process.env.POSTGRES_DB || "";
    const db_table_name = process.env.POSTGRES_WA_TABLE || "";

    if (!db_host || !db_port || !db_user || !db_password || !db_database)
      throw new Error("Configuração do banco de dados inválida");
    if (!db_table_name)
      throw new Error("Configuração do nome da tabela inválida");

    const { state, saveCreds, removeCreds } =
      await WACustonAuthState.usePostgresAuthState({
        session: "session_1",
        host: db_host,
        port: db_port,
        user: db_user,
        password: db_password,
        database: db_database,
        tableName: db_table_name,
      });

    const { version } = await fetchLatestBaileysVersion();

    this.sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: true,
      browser: Browsers.windows("AiHouse"),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      getMessage: async () => undefined,
      cachedGroupMetadata: async (jid) => this.groupCache.get(jid),
      markOnlineOnConnect: false,
    });

    this.sock.ev.on("creds.update", () => saveCreds());

    this.sock.ev.on(
      "connection.update",
      async ({ connection, lastDisconnect }) => {
        if (connection === "close") {
          this.isSocketConnected = false;
          const statusCode = (lastDisconnect?.error as Boom)?.output
            ?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          if (shouldReconnect) {
            this.initialize(); // reconecta
          } else if (statusCode === DisconnectReason.loggedOut) {
            // Remove as credenciais e reinicia a conexão
            await removeCreds();
            this.initialize();
          }
        } else if (connection === "open") {
          this.isSocketConnected = true;
          console.log("Conectado com sucesso!");
        }
      }
    );

    this.sock.ev.on("messages.upsert", async ({ messages }) => {
      const msg = messages[0];
      if (
        !msg.message ||
        msg.key.fromMe ||
        msg.key.remoteJid?.includes("@g.us") ||
        msg.key.remoteJid?.includes("@newsletter")
      )
        return;
      const sender = {
        jid: msg.key.remoteJid,
        pushName: msg.pushName,
      };

      const text =
        msg.message.conversation || msg.message.extendedTextMessage?.text;
      console.log("==>>NOVA MENSAGEM", text, "de", msg.key.remoteJid);

      if (this.onMessageReceived) {
        this.onMessageReceived(msg);
      }
    });
  }

  public isConnected(): boolean {
    return this.isSocketConnected;
  }

  public async sendMessage(jid: string, message: string) {
    if (!this.sock || !this.isSocketConnected)
      throw new Error("Socket não conectado");
    return await this.sock.sendMessage(jid, { text: message });
  }

  public async sendPresence(
    jid: string,
    presence: "available" | "composing" | "recording" | "paused" | "unavailable"
  ) {
    if (!this.sock || !this.isSocketConnected)
      throw new Error("Socket não conectado");
    await this.sock.presenceSubscribe(jid);
    return await this.sock.sendPresenceUpdate(presence, jid);
  }
}

export default BaileysService;
