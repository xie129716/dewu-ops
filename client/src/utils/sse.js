/**
 * Consume a Server-Sent Events stream from a POST endpoint.
 * @param {string} url - API path (e.g., '/recognize/stream') or full URL
 * @param {object} body - JSON request body
 * @param {function} onChunk - Called with each parsed data event
 */
export async function consumeSSE(url, body, onChunk) {
  const token = localStorage.getItem('dewu_token');
  const base = import.meta.env.VITE_API_BASE || '/api';
  const fullUrl = url.startsWith('http') ? url : `${base}${url}`;

  const resp = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(err.error || '请求失败');
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trimEnd();
      buffer = buffer.slice(idx + 1);
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) throw new Error(parsed.error);
          onChunk(parsed);
        } catch (e) {
          if (e.message !== 'Unexpected end of JSON input') throw e;
        }
      }
    }
  }
}
