export async function readPrepareStream(response: Response, onProgress: (message: string) => void) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('This browser cannot read progress updates. Please use a current browser.');
  const decoder = new TextDecoder();
  let buffer = '';
  let result: any;
  const parse = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.type === 'progress') onProgress(event.message);
    if (event.type === 'error') throw new Error(typeof event.message === 'string' ? event.message : 'Could not prepare your plan.');
    if (event.type === 'result') result = event.data;
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        parse(buffer.slice(0, newline)); buffer = buffer.slice(newline + 1);
      }
      if (done) break;
    }
    parse(buffer);
    if (!result) throw new Error('The connection ended before your plan was ready. Please try again.');
    return result;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
