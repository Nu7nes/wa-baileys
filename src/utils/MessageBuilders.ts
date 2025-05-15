type TypeMessageType =
  | "image"
  | "audio"
  | "document"
  | "video"
  | "text"
  | "extendText"
  | "notFound";

interface IMessageBuild {
  sender: {
    jid: string;
    pushName: string;
  };
  type: TypeMessageType;
  data: any;
}

export class MessageBuilders {
  private static indentifyTypeMessage(message: any): TypeMessageType {
    let messageType: TypeMessageType;

    if (message?.imageMessage) messageType = "image";
    else if (message?.audioMessage) messageType = "audio";
    else if (message?.documentMessage) messageType = "document";
    else if (message?.videoMessage) messageType = "video";
    else if (message?.conversation) messageType = "text";
    else if (message?.extendedTextMessage) messageType = "extendText";
    else messageType = "notFound";

    return messageType;
  }

  public static handleMessage(message: any): IMessageBuild {
    console.log(message);
    const messageBuilded = {} as IMessageBuild;

    const messageType = this.indentifyTypeMessage(message);
    messageBuilded.type = messageType;

    return messageBuilded;
  }
}
