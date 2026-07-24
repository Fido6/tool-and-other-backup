/**
 * Cloudflare Worker Socket Proxy (Standalone Production Edition)
 * 
 * 机制解答：
 * 为什么 GrainTCP / cf_grpc-graintcp 也是用 fetcher.connect 出站却不报错？
 * 1. 【目标域名直连】：客户端真正访问的目标（如 google.com:443、github.com:443、或非-CF VPS）
 *    出站时，fetcher.connect({ hostname: "google.com", port: 443 }) 是 100% 允许且正常工作的。
 * 2. 【自动降级中转】：当目标是 Cloudflare 节点的 IP/域名 时，fetcher.connect 直连会被 Cloudflare 阻止。
 *    此时 connectWithFallback 函数捕捉到错误，自动降级切换到 PROXYIP (反代中转节点)。
 */

// 配置项：如果设置了 PROXY_IP，直连失败或遇到 CF 节点时会自动降级中转
const CONFIG = {
  AUTH_PATH: '/proxy',
  // 可以填入有效的第三方中转代理 IP (注意：不能填 Cloudflare CDN 优选 IP)
  PROXY_IP: 'ProxyIP.CMLiussss.net',
  PROXY_PORT: 443,
  CONCURRENCY: 1, // 竞速连接并发数
};

// 识别 Cloudflare 官方 IP 和域名范围
function isCloudflareIP(hostname) {
  if (!hostname) return false;
  const h = hostname.toLowerCase().trim();
  const cfIpRanges = [
    /^104\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^172\.(6[4-9]|7[0-1])\./,
    /^162\.15[8-9]\./,
    /^108\.162\.(19[2-9]|2[0-5][0-9])\./,
    /^198\.41\.(12[8-9]|1[3-9][0-9]|2[0-5][0-9])\./,
    /^188\.114\.(9[6-9]|1[0-1][0-9])\./,
    /^103\.21\.(24[4-7])\./,
  ];
  if (cfIpRanges.some((r) => r.test(h))) return true;
  if (h === '1.1.1.1' || h === '1.0.0.1') return true;
  if (h.endsWith('.workers.dev') || h.endsWith('.pages.dev') || h.endsWith('.cloudflare.com')) return true;
  return false;
}

// 单次 Socket 连接建立
const sprout = async (fetcher, host, port) => {
  if (isCloudflareIP(host)) {
    throw new Error(`Target ${host} is inside Cloudflare CDN network. Direct connect prohibited.`);
  }
  const socket = fetcher.connect({ hostname: host, port });
  await socket.opened;
  return socket;
};

// 多并发竞速连接（借鉴 GrainTCP raceSprout）
const raceSprout = (fetcher, host, port, concur = CONFIG.CONCURRENCY) => {
  if (!fetcher?.connect) return Promise.reject(new Error('fetcher.connect unavailable'));
  if (concur <= 1) return sprout(fetcher, host, port);
  const tasks = Array(concur).fill().map(() => sprout(fetcher, host, port));
  return Promise.any(tasks).then((winner) => {
    tasks.forEach((t) => t.then((s) => s !== winner && s.close(), () => {}));
    return winner;
  });
};

// 关键函数：带中转降级的 Socket 连接器（与 cf_grpc-graintcp.js 机制一致）
const connectWithFallback = async (fetcher, host, port, proxyIP) => {
  try {
    // 1. 优先尝试直连真正的目标（例如 google.com / github.com / 外部 VPS）
    return await raceSprout(fetcher, host, port);
  } catch (err) {
    // 2. 如果直连失败（例如目标是 Cloudflare 节点），回退到中转代理
    if (!proxyIP || isCloudflareIP(proxyIP)) {
      throw new Error(`Direct connect to ${host}:${port} failed (${err.message}), and no valid external proxyIP is configured.`);
    }
    console.log(`[Fallback] Direct connect to ${host}:${port} failed. Routing through ProxyIP: ${proxyIP}`);
    return raceSprout(fetcher, proxyIP, CONFIG.PROXY_PORT);
  }
};

export default {
  async fetch(req, env, ctx) {
    const authPath = env.AUTH_PATH || CONFIG.AUTH_PATH;
    const proxyIP = env.PROXY_IP || CONFIG.PROXY_IP;

    // WebSocket 握手检查
    if (req.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Worker TCP Proxy Active', { status: 200 });
    }

    const url = new URL(req.url);
    if (url.pathname !== authPath) {
      return new Response('Unauthorized Path', { status: 403 });
    }

    const [client, ws] = Object.values(new WebSocketPair());
    ws.accept();

    let remoteSocket = null;
    let isConnected = false;

    ws.addEventListener('message', async (event) => {
      if (isConnected && remoteSocket) {
        // 已建立 Socket 管道，持续转发数据
        try {
          const writer = remoteSocket.writable.getWriter();
          const data = event.data instanceof ArrayBuffer ? new Uint8Array(event.data) : new TextEncoder().encode(event.data);
          await writer.write(data);
          writer.releaseLock();
        } catch (e) {
          console.error('[Remote Write Error]', e);
          ws.close(1011, 'Remote write error');
        }
        return;
      }

      // 尚未建立 Socket：解析首帧 Target 地址
      try {
        const data = event.data instanceof ArrayBuffer ? new Uint8Array(event.data) : new TextEncoder().encode(event.data);
        const text = new TextDecoder().decode(data);
        
        // 简单 HTTP / CONNECT 报文解析提取目标 host & port
        let host = '';
        let port = 80;
        const firstLine = text.split('\r\n')[0] || '';
        const match = firstLine.match(/^([A-Z]+)\s+([^\s]+)\s+HTTP/i);

        if (match) {
          const method = match[1].toUpperCase();
          const target = match[2];
          if (method === 'CONNECT') {
            const parts = target.split(':');
            host = parts[0];
            port = parseInt(parts[1] || '443', 10);
          } else {
            const hostMatch = text.match(/\r\nHost:\s*([^\r\n]+)/i);
            if (hostMatch) {
              const parts = hostMatch[1].trim().split(':');
              host = parts[0];
              port = parseInt(parts[1] || '80', 10);
            }
          }
        }

        if (!host) {
          // 若不是标准 HTTP，降级兜底目标
          host = '1.1.1.1';
          port = 443;
        }

        // 调用带降级中转的连接函数
        remoteSocket = await connectWithFallback(req.fetcher, host, port, proxyIP);
        isConnected = true;

        if (firstLine.startsWith('CONNECT')) {
          ws.send('HTTP/1.1 200 Connection Established\r\n\r\n');
        }

        // 将远程 Socket 读取的数据 Pipe 给 WebSocket 客户端
        remoteSocket.readable.pipeTo(
          new WritableStream({
            write(chunk) {
              if (ws.readyState === 1) ws.send(chunk);
            },
            close() {
              ws.close(1000, 'Remote closed');
            },
            abort() {
              ws.close(1011, 'Remote aborted');
            }
          })
        ).catch(() => {});

      } catch (err) {
        console.error('[Connection Error]', err.message);
        ws.close(1011, err.message);
      }
    });

    ws.addEventListener('close', () => {
      try { remoteSocket?.close(); } catch {}
    });

    return new Response(null, { status: 101, webSocket: client });
  }
};
