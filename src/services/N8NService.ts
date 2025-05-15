import axios from "axios";

class N8NService {
  private static url = process.env.N8N_WEBHOOK_URL;
  private static url_test = process.env.N8N_WEBHOOK_UR_TEST;

  public static async sendWebhook(data: any) {
    console.log("Enviando webhook para N8N:", this.url);

    const response = await axios.post(this.url!, data);
    if (response.status !== 200) {
      console.error("Erro ao enviar webhook:", response.statusText);
      await this.sendWebhookTest(data);
    }
  }
  private static async sendWebhookTest(data: any) {
    console.log("Enviando webhook de TESTE para N8N:", this.url_test);
    
    try {
      const response = await axios.post(this.url_test!, data);
      console.log("Webhook enviado com sucesso:", response.data);
    } catch (error) {
      console.error("Erro ao enviar webhook de TESTE:", error);
    }
  }
}

export default N8NService;
