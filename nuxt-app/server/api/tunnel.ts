import { defineEventHandler, getQuery, readBody } from 'h3';
import { getRelayUrl, setGymConfig, signCamSession, getRelaySecretKey } from '../utils/config';

export default defineEventHandler(async (event) => {
  const method = event.node.req.method;
  const query = getQuery(event);
  let session = typeof query?.session === 'string' && query.session.trim() ? query.session.trim() : null;

  if (method === 'POST') {
    const body = await readBody(event).catch(() => ({}));
    if (body?.session && !session) {
      session = String(body.session).trim();
    }
    if (body?.action === 'set_relay' && typeof body.relayUrl === 'string') {
      setGymConfig('relay_url', body.relayUrl.trim());
    } else if (body?.action === 'clear_relay') {
      setGymConfig('relay_url', '');
    }
  }

  const exp = session ? Date.now() + 5 * 60 * 1000 : null;
  const sig = session && exp ? signCamSession(session, exp) : null;
  const secretKey = getRelaySecretKey();
  const relayUrl = getRelayUrl();

  return {
    url: relayUrl,
    relayUrl,
    mode: 'relay',
    exp,
    sig,
    secretKey,
  };
});

