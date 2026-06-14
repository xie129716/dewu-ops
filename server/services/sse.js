/**
 * Initialize SSE response headers and return a write helper.
 */
function initSSE(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
}

/**
 * Pipe an async iterable stream to SSE, accumulating fullText.
 * @param {object} res - Express response
 * @param {AsyncIterable} stream - OpenAI-style chat completion stream
 * @param {object} opts
 * @param {string} opts.event - SSE event name
 * @returns {string} fullText
 */
async function streamToSSE(res, stream) {
  let fullText = '';
  for await (const chunk of stream) {
    const content = chunk.choices?.[0]?.delta?.content || '';
    if (content) {
      fullText += content;
      res.write(`data: ${JSON.stringify({ content, fullText })}\n\n`);
    }
  }
  return fullText;
}

/**
 * Handle error in SSE context — sends JSON 500 if headers not sent,
 * otherwise writes error as SSE data event.
 */
function sseError(res, err) {
  if (!res.headersSent) {
    res.status(500).json({ error: err.message });
  } else {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}

module.exports = { initSSE, streamToSSE, sseError };
