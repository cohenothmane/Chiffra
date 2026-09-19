import type { FastifyInstance } from "fastify";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getAzureChatModel } from "../agents/llm-client.js";

const SYSTEM_PROMPT =
  "Tu es l'assistant de Chiffra, une application de controle comptable pour cabinets marocains. " +
  "Reponds de maniere concise, en francais, a la question posee.";

interface ChatRequestBody {
  message?: string;
}

export async function chatRoutes(app: FastifyInstance) {
  app.post<{ Body: ChatRequestBody }>("/api/chat", async (request, reply) => {
    const message = request.body?.message;
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      reply.code(400);
      return { error: "Le champ 'message' est requis." };
    }

    try {
      const model = getAzureChatModel();
      const response = await model.invoke([new SystemMessage(SYSTEM_PROMPT), new HumanMessage(message)]);
      const reply_ = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
      return { reply: reply_ };
    } catch (err) {
      reply.code(502);
      return { error: err instanceof Error ? err.message : "Appel au LLM echoue." };
    }
  });
}
