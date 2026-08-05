import { api } from "./api";

const SESSION_KEY = "podemais_session_id";

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function getSessionId() {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export async function pingSession() {
  const sessionId = getSessionId();
  try {
    await api.post('/analytics/session', { sessionId });
  } catch (err) {
    console.error('Failed to ping session:', err);
  }
}

export async function syncCartAnalytics(cartItems: any[], totalAmount: number) {
  const sessionId = getSessionId();
  try {
    await api.post('/analytics/cart', { sessionId, cartItems, totalAmount });
  } catch (err) {
    console.error('Failed to sync cart analytics:', err);
  }
}

export function initAnalytics() {
  // Ping immediately
  pingSession();
  
  // Heartbeat every 30 seconds
  const interval = setInterval(() => {
    pingSession();
  }, 30000);

  return () => clearInterval(interval);
}
