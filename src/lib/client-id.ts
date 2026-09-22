const CLIENT_ID_KEY = "quizz-feed:clientId";
const LEGACY_CLIENT_ID_KEY = "tikcode:clientId";

export function getOrCreateClientId() {
  const existing =
    localStorage.getItem(CLIENT_ID_KEY) ??
    localStorage.getItem(LEGACY_CLIENT_ID_KEY);
  if (existing) {
    if (!localStorage.getItem(CLIENT_ID_KEY)) {
      localStorage.setItem(CLIENT_ID_KEY, existing);
      localStorage.removeItem(LEGACY_CLIENT_ID_KEY);
    }
    return existing;
  }

  const clientId = crypto.randomUUID();
  localStorage.setItem(CLIENT_ID_KEY, clientId);
  return clientId;
}
