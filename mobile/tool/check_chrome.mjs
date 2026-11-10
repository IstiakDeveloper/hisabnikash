import fs from 'node:fs/promises';

// Inspect only this app's tab, using the Chrome port supplied on the command line.
const port = process.argv[2];
const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const tab = tabs.find(t => t.type === 'page' && t.url.startsWith('http://127.0.0.1:53741/'));
if (!tab) throw new Error('The app tab was not found');
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let nextId = 0;
const pending = new Map();
socket.onmessage = event => {
  const response = JSON.parse(event.data);
  if (pending.has(response.id)) {
    const { resolve, reject } = pending.get(response.id);
    pending.delete(response.id);
    if (response.error) reject(new Error(JSON.stringify(response.error))); else resolve(response.result);
  }
};
function command(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, {resolve, reject});
    socket.send(JSON.stringify({id, method, params}));
  });
}
try {
  const result = await command('Runtime.evaluate', { expression: 'document.body.innerText', returnByValue: true });
  console.log(JSON.stringify({url: tab.url, title: tab.title, text: result.result.value?.slice(0, 3000)}));
  const screenshot = await command('Page.captureScreenshot', {format: 'png'});
  await fs.mkdir('artifacts', {recursive: true});
  await fs.writeFile('artifacts/chrome.png', Buffer.from(screenshot.data, 'base64'));
} finally { socket.close(); }
