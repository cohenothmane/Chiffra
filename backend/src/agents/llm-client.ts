import { AzureChatOpenAI } from "@langchain/openai";

const DEFAULT_AZURE_API_VERSION = "2024-08-01-preview";

let cachedModel: AzureChatOpenAI | null = null;

// Client Azure OpenAI partage entre l'Ingestor (structuration JSON) et le
// chat (texte libre). Un seul point de configuration des variables
// AZURE_OPENAI_*, une seule instance mise en cache.
export function getAzureChatModel(): AzureChatOpenAI {
  if (cachedModel) return cachedModel;

  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

  if (!apiKey || !endpoint || !deploymentName) {
    throw new Error(
      "Variables AZURE_OPENAI_API_KEY / AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_DEPLOYMENT_NAME manquantes",
    );
  }

  cachedModel = new AzureChatOpenAI({
    azureOpenAIApiKey: apiKey,
    azureOpenAIEndpoint: endpoint,
    azureOpenAIApiDeploymentName: deploymentName,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION ?? DEFAULT_AZURE_API_VERSION,
    temperature: 0,
  });

  return cachedModel;
}
