import axios from "axios";

class N8NService {
  private static url = process.env.N8N_WEBHOOK_URL;
  private static url_test = process.env.N8N_WEBHOOK_URL_TEST;

  public static async sendWebhook(data: any) {
    try {
      const response = await axios.post(this.url!, data);
      console.log("Webhook enviado com sucesso:", response.data);
    } catch (error) {
      console.error("Erro ao enviar webhook:", error);
      await this.sendWebhookTest(data);
    }
  }
  private static async sendWebhookTest(data: any) {
    try {
      const response = await axios.post(this.url_test!, data);
      console.log("Webhook enviado com sucesso:", response.data);
    } catch (error) {
      console.error("Erro ao enviar webhook de TESTE:", error);
    }
  }
}

export default N8NService;
