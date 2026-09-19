const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function sendChatMessage(message: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? `Echec de l'appel au chat (${response.status})`);
  }
  return body.reply;
}
