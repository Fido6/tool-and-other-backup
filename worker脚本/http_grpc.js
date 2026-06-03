// ═══════════════════════════════════════════════════════════════════
// HTTP gRPC over Cloudflare Workers (调试版)
// 适用于 xray-core HTTP 协议 + gRPC 传输，需要绑定域名
// ═══════════════════════════════════════════════════════════════════

const CFG = {
  ServiceName: 'xiG5zuUuDn5Ss6g6jj3d5o8OKlR7b5AY', //这里必须填写东西，用作鉴权，推荐使用密码生成器，尽量不要使用特殊字符，否则就等着1101吧
  GRPCMODE: 'gun', //gun or multi
  PXIP: 'sg.wogg.us.kg', //反代IP
  //上面3行按需更改，下面的不用改，前5行建议部署时删掉
  TARGET: '', // 不填写任何东西
  AUTH_TOKEN: '', //这里不要填任何东西
  chunk: 64 * 1024,
  dnPack: 32 * 1024,
  dnTail: 512,
  dnMs: 0,
  upPack: 16 * 1024,
  upQMax: 256 * 1024,
  concur: 4,
};

const dec = new TextDecoder();
const enc = new TextEncoder();
const 取首个值 = v => Array.isArray(v) ? v[0] : v;

// ── 辅助：将 Uint8Array 转为十六进制字符串 ──
function toHex(bytes, maxLen = 64) {
  const slice = bytes.length > maxLen ? bytes.subarray(0, maxLen) : bytes;
  return Array.from(slice).map(b => b.toString(16).padStart(2, '0')).join(' ');
}

// ═══════════════════════════════════════════════════════════════════
// 鉴权
// ═══════════════════════════════════════════════════════════════════

function 路径鉴权(request, env) {
  const url = new URL(request.url);
  const seg = url.pathname.split('/').filter(Boolean);
  const cfgServiceName = 取首个值(env?.ServiceName) ?? CFG.ServiceName;
  const cfgGrpcMode = ((取首个值(env?.GRPCMODE) ?? CFG.GRPCMODE) || 'gun').toString().toLowerCase();
  const expectedTail = cfgGrpcMode === 'multi' ? 'TunMulti' : 'Tun';
  const expectedServiceName = cfgServiceName || url.host;
  if (seg.length < 2) return 0;
  if (seg[seg.length - 2] !== expectedServiceName) return 0;
  if (seg[seg.length - 1] !== expectedTail) return 0;
  return 1;
}

function 验证Token(request, env) {
  const cfgToken = 取首个值(env?.AUTH_TOKEN) ?? CFG.AUTH_TOKEN;
  if (!cfgToken) return true;
  const url = new URL(request.url);
  if (url.searchParams.get('token') === cfgToken) return true;
  if (request.headers.get('authorization') === `Bearer ${cfgToken}`) return true;
  return false;
}

// ═══════════════════════════════════════════════════════════════════
// 地址解析
// ═══════════════════════════════════════════════════════════════════

async function 解析地址端口(proxyIP) {
  proxyIP = proxyIP.toLowerCase();
  let 地址 = proxyIP, 端口 = 443;
  if (proxyIP.includes(']:')) {
    const parts = proxyIP.split(']:');
    地址 = parts[0] + ']';
    端口 = parseInt(parts[1], 10) || 端口;
  } else if (proxyIP.includes(':') && !proxyIP.startsWith('[')) {
    const colonIndex = proxyIP.lastIndexOf(':');
    地址 = proxyIP.slice(0, colonIndex);
    端口 = parseInt(proxyIP.slice(colonIndex + 1), 10) || 端口;
  }
  return [地址, 端口];
}

// ═══════════════════════════════════════════════════════════════════
// gRPC / Protobuf 编解码
// ═══════════════════════════════════════════════════════════════════

const makeGrpcFrame = data => {
  const len = data.length;
  const frame = new Uint8Array(5 + len);
  frame[0] = 0;
  frame[1] = (len >>> 24) & 0xFF;
  frame[2] = (len >>> 16) & 0xFF;
  frame[3] = (len >>> 8) & 0xFF;
  frame[4] = len & 0xFF;
  frame.set(data, 5);
  return frame;
};

const makeProtobufGrpcFrame = data => {
  const len = data.length;
  const varint = [];
  let t = len;
  while (t > 127) { varint.push((t & 0x7F) | 0x80); t >>>= 7; }
  varint.push(t);
  const pb = new Uint8Array([0x0A, ...varint]);
  const out = new Uint8Array(pb.length + len);
  out.set(pb);
  out.set(data, pb.length);
  return makeGrpcFrame(out);
};

const stripProtobufHeader = data => {
  if (data[0] !== 0x0A) return data;
  let p = 1;
  while (data[p++] & 0x80);
  return data.slice(p);
};

// ═══════════════════════════════════════════════════════════════════
// Ring Buffer
// ═══════════════════════════════════════════════════════════════════

const mkRingBuf = (cap = 256 * 1024) => {
  const buf = new Uint8Array(cap);
  let w = 0, r = 0, len = 0;
  return {
    get length() { return len; },
    ensure(n) { if (len + n > cap) this.compact(); return len + n <= cap; },
    compact() { if (!r) return; if (len) buf.copyWithin(0, r, r + len); r = 0; w = len; },
    append(u) {
      const n = u.byteLength;
      if (!n) return;
      if (!this.ensure(n)) { console.error('[RingBuf] 数据超过缓冲区容量:', n, 'vs', cap); return; }
      const tail = cap - w;
      if (n <= tail) { buf.set(u, w); }
      else { buf.set(u.subarray(0, tail), w); buf.set(u.subarray(tail), 0); }
      w = (w + n) % cap; len += n;
    },
    peek(n) {
      if (n > len) return null;
      if (r + n <= cap) return buf.subarray(r, r + n);
      const out = new Uint8Array(n);
      const tail = cap - r;
      out.set(buf.subarray(r, cap), 0);
      out.set(buf.subarray(0, n - tail), tail);
      return out;
    },
    skip(n) { r = (r + n) % cap; len -= n; },
    drain() { r = 0; w = 0; len = 0; },
  };
};

// ═══════════════════════════════════════════════════════════════════
// 下行 gRPC 帧聚合器
// ═══════════════════════════════════════════════════════════════════

const mkGrpcDn = writer => {
  const cap = CFG.dnPack, tail = CFG.dnTail, low = Math.max(4096, tail << 3);
  let pb = new Uint8Array(cap), p = 0, tp = 0, mq = 0, gen = 0, qk = 0, qr = 0;
  const reap = async () => {
    tp && clearTimeout(tp); tp = 0; mq = 0;
    if (!p) return;
    const out = pb.subarray(0, p).slice();
    pb = new Uint8Array(cap); p = 0; qr = 0;
    await writer.write(makeProtobufGrpcFrame(out));
  };
  const ripen = () => {
    if (tp || mq) return; mq = 1; qk = gen;
    queueMicrotask(() => {
      mq = 0;
      if (!p || tp) return;
      if (cap - p < tail) return void reap();
      tp = setTimeout(() => {
        tp = 0;
        if (!p) return;
        if (cap - p < tail) return void reap();
        if (qr < 2 && (gen !== qk || p < low)) { qr++; qk = gen; return ripen(); }
        void reap();
      }, Math.max(CFG.dnMs, 1));
    });
  };
  return {
    async send(u) {
      let o = 0, n = u?.byteLength || 0;
      if (!n) return;
      while (o < n) {
        if (!p && n - o >= cap) {
          const m = Math.min(cap, n - o);
          await writer.write(makeProtobufGrpcFrame(o || m !== n ? u.subarray(o, o + m) : u));
          o += m; continue;
        }
        const m = Math.min(cap - p, n - o);
        pb.set(u.subarray(o, o + m), p); p += m; o += m; gen++;
        if (p === cap || cap - p < tail) await reap(); else ripen();
      }
    },
    reap,
  };
};

// ═══════════════════════════════════════════════════════════════════
// 从目标读取数据 → gRPC 帧 → 客户端
// ═══════════════════════════════════════════════════════════════════

const pipeToClientByob = async (readable, writer) => {
  const r = readable.getReader({ mode: 'byob' });
  const tx = mkGrpcDn(writer);
  let buf = new ArrayBuffer(CFG.chunk);
  try {
    for (;;) {
      const { done, value: v } = await r.read(new Uint8Array(buf, 0, CFG.chunk));
      if (done) break;
      if (!v?.byteLength) continue;
      console.log('[下行] 从目标收到', v.byteLength, '字节');
      if (v.byteLength >= (CFG.chunk >> 1)) {
        await tx.reap();
        await writer.write(makeProtobufGrpcFrame(v));
        buf = new ArrayBuffer(CFG.chunk);
      } else {
        await tx.send(v.slice());
        buf = v.buffer;
      }
    }
    await tx.reap();
    console.log('[下行] 目标连接关闭');
  } catch (e) {
    console.error('[下行异常]', e?.message || e);
  } finally {
    try { await tx.reap(); } catch {}
    try { r.releaseLock(); } catch {}
  }
};

// ═══════════════════════════════════════════════════════════════════
// 并发拨号（带 fallback）
// ═══════════════════════════════════════════════════════════════════

const sprout = async (f, h, p) => {
  console.log('[拨号] f.connect({ hostname:', h, ', port:', p, '})');
  try {
    const s = f.connect({ hostname: h, port: p });
    console.log('[拨号] 等待 socket.opened...');
    const opened = await s.opened;
    console.log('[拨号] socket 已打开');
    return s;
  } catch (e) {
    console.error('[拨号] f.connect 失败:', e?.message || e);
    throw e;
  }
};

// ── 备选方案：使用 cloudflare:sockets API ──
const sproutSockets = async (h, p) => {
  console.log('[拨号-sockets] 尝试 cloudflare:sockets connect:', h, p);
  try {
    const { connect } = await import('cloudflare:sockets');
    const socket = connect({ hostname: h, port: p, secureTransport: 'off' });
    console.log('[拨号-sockets] 等待 socket.opened...');
    await socket.opened;
    console.log('[拨号-sockets] socket 已打开');
    return socket;
  } catch (e) {
    console.error('[拨号-sockets] 失败:', e?.message || e);
    throw e;
  }
};

const raceSprout = (f, h, p) => {
  if (!f?.connect) return Promise.reject(new Error('fetcher.connect unavailable'));
  if (CFG.concur <= 1) return sprout(f, h, p);
  const ts = Array(CFG.concur).fill().map(() => sprout(f, h, p));
  return Promise.any(ts).then(w => {
    ts.forEach(t => t.then(s => s !== w && s.close(), () => {}));
    return w;
  });
};

const connectWithFallback = async (fetcher, host, port, proxyIP) => {
  // 方案 1：尝试直接连接（通过 fetcher.connect）
  try {
    console.log('[连接] 尝试直连:', host, port);
    return await raceSprout(fetcher, host, port);
  } catch (e1) {
    console.log('[连接] 直连失败:', e1?.message);
  }
  
  // 方案 2：尝试 cloudflare:sockets 直连
  try {
    console.log('[连接] 尝试 sockets 直连:', host, port);
    return await sproutSockets(host, port);
  } catch (e2) {
    console.log('[连接] sockets 直连失败:', e2?.message);
  }
  
  // 方案 3：通过 proxy IP 中转（解决 CDN 网站无法直连的问题）
  if (proxyIP) {
    const [addr, p] = await 解析地址端口(proxyIP);
    console.log('[连接] 通过 proxy IP 连接:', addr, p, '-> 目标:', host + ':' + port);
    
    // 尝试 fetcher.connect 到 proxy IP
    try {
      return await raceSprout(fetcher, addr, p);
    } catch (e3) {
      console.log('[连接] proxy fetcher.connect 失败:', e3?.message);
    }
    
    // 尝试 cloudflare:sockets 到 proxy IP
    try {
      return await sproutSockets(addr, p);
    } catch (e4) {
      console.log('[连接] proxy sockets 失败:', e4?.message);
    }
  }
  
  throw new Error(`所有连接方式都失败: 直连=${e1?.message}, proxy=${proxyIP || '未配置'}`);
};

// ═══════════════════════════════════════════════════════════════════
// HTTP 请求解析
// ═══════════════════════════════════════════════════════════════════

function parseHttpRequest(data) {
  const text = dec.decode(data);
  
  const connectMatch = text.match(/^CONNECT\s+([^\s:]+):(\d+)\s+HTTP\/[\d.]+\r?\n/i);
  if (connectMatch) {
    const headerEnd = text.indexOf('\r\n\r\n');
    console.log('[HTTP] 解析到 CONNECT:', connectMatch[1] + ':' + connectMatch[2]);
    return {
      type: 'CONNECT',
      host: connectMatch[1],
      port: parseInt(connectMatch[2], 10),
      headerEnd: headerEnd >= 0 ? headerEnd + 4 : -1,
    };
  }
  
  const httpMatch = text.match(/^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH)\s+https?:\/\/([^/\s:]+)(?::(\d+))?(\/[^\s]*)\s+HTTP\/[\d.]+\r?\n/i);
  if (httpMatch) {
    const headerEnd = text.indexOf('\r\n\r\n');
    console.log('[HTTP] 解析到', httpMatch[1], httpMatch[2]);
    return {
      type: 'HTTP',
      method: httpMatch[1],
      host: httpMatch[2],
      port: parseInt(httpMatch[3] || '80', 10),
      headerEnd: headerEnd >= 0 ? headerEnd + 4 : -1,
    };
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// 主处理函数：gRPC 双向流
// ═══════════════════════════════════════════════════════════════════

async function processStream(request, clientReader, responseWriter, env) {
  const fetcher = request.fetcher;
  if (!fetcher?.connect) throw new Error('request.fetcher.connect unavailable');

  const ring = mkRingBuf(256 * 1024);
  let socket = null, writer = null, pump = null, closed = false;
  let httpBuf = new Uint8Array(0); // 用于累积 HTTP 请求数据

  const cfgTarget = (取首个值(env?.TARGET) ?? CFG.TARGET) || '';
  const cfgProxyIP = (取首个值(env?.PROXY_IP) ?? CFG.PXIP) || '';
  console.log('[配置] TARGET:', cfgTarget || '(动态解析)', 'PROXY_IP:', cfgProxyIP || '(无)');

  const closeAll = async () => {
    if (closed) return; closed = true;
    ring.drain();
    try { writer?.releaseLock(); } catch {}
    try { socket?.close(); } catch {}
    try { await responseWriter.close(); } catch {}
  };

  const connectAndForward = async (host, port, initialData) => {
    console.log('[转发] 连接目标:', host + ':' + port, '初始数据:', initialData?.byteLength || 0, '字节');
    socket = await connectWithFallback(fetcher, host, port, cfgProxyIP);
    console.log('[转发] 目标连接成功');
    writer = socket.writable.getWriter();
    
    // 发送 HTTP 200 响应（xray-core HTTP 协议需要此响应）
    const http200 = enc.encode('HTTP/1.1 200 Connection Established\r\n\r\n');
    await responseWriter.write(makeProtobufGrpcFrame(http200));
    console.log('[转发] 已发送 HTTP 200 响应');
    
    // 启动下泵：目标 → gRPC → 客户端
    pump = pipeToClientByob(socket.readable, responseWriter).catch(() => {});
    
    // 发送残留初始数据（CONNECT 之后的数据）
    if (initialData?.byteLength) {
      console.log('[转发] 发送初始数据:', initialData.byteLength, '字节');
      await writer.write(initialData);
    }
  };

  try {
    for (;;) {
      const { done, value } = await clientReader.read();
      if (done || closed) break;
      
      console.log('[上行] 收到原始数据:', value.byteLength, '字节');
      console.log('[上行] 原始 hex (前 128 字节):', toHex(value, 128));
      
      ring.append(value);

      let frameCount = 0;
      for (;;) {
        if (ring.length < 5) {
          console.log('[解析] 数据不足 5 字节，等待更多数据，当前:', ring.length);
          break;
        }
        const hdr = ring.peek(5);
        console.log('[解析] gRPC 帧头:', toHex(hdr));
        
        // 检查 gRPC 帧头是否有效
        const compressionFlag = hdr[0];
        const grpcLen = ((hdr[1] << 24) >>> 0) | (hdr[2] << 16) | (hdr[3] << 8) | hdr[4];
        
        console.log('[解析] compression:', compressionFlag, 'grpcLen:', grpcLen, 'ring剩余:', ring.length);
        
        if (grpcLen > 1024 * 1024) { // 超过 1MB 明显异常
          console.error('[解析] gRPC 帧长度异常:', grpcLen, '，可能是数据格式不匹配');
          console.error('[解析] 帧头字节:', Array.from(hdr).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
          // 尝试以不同偏移量解析
          console.log('[解析] 尝试偏移 1 字节:', toHex(ring.peek(Math.min(6, ring.length)), 6));
          console.log('[解析] 尝试偏移 2 字节:', toHex(ring.peek(Math.min(7, ring.length)).subarray(1), 6));
          
          // 打印更多原始数据帮助调试
          const moreData = ring.peek(Math.min(64, ring.length));
          console.log('[解析] 更多原始数据:', toHex(moreData, 64));
          console.log('[解析] 尝试作为文本:', dec.decode(moreData).replace(/[^\x20-\x7E]/g, '.'));
          
          await closeAll();
          return;
        }
        
        if (ring.length < 5 + grpcLen) {
          console.log('[解析] 帧数据不足，需要', 5 + grpcLen, '当前:', ring.length, '，等待');
          break;
        }
        
        const grpcData = ring.peek(5 + grpcLen);
        ring.skip(5 + grpcLen);
        
        console.log('[解析] 完整帧 hex (前 64 字节):', toHex(grpcData, 64));
        
        // 剥离 Protobuf Hunk 头（始终剥离，不管 socket 是否已连接）
        const pureData = stripProtobufHeader(grpcData.subarray(5));
        
        console.log('[解析] 纯数据长度:', pureData.byteLength, '前 32 字节:', toHex(pureData, 32));
        // 尝试将纯数据作为文本显示
        const textPreview = dec.decode(pureData.subarray(0, Math.min(200, pureData.byteLength)));
        console.log('[解析] 纯数据文本预览:', textPreview.replace(/[^\x20-\x7E]/g, '.'));

        if (!socket) {
          if (cfgTarget) {
            // ── 固定目标模式 ──
            const [host, port] = cfgTarget.includes(':') ?
              [cfgTarget.split(':')[0], parseInt(cfgTarget.split(':')[1], 10)] :
              [cfgTarget, 443];
            await connectAndForward(host, port, pureData);
          } else {
            // ── HTTP 请求解析模式 ──
            // 累积数据到独立缓冲区（不放回 ring buffer）
            const newBuf = new Uint8Array(httpBuf.length + pureData.length);
            newBuf.set(httpBuf);
            newBuf.set(pureData, httpBuf.length);
            httpBuf = newBuf;
            
            console.log('[HTTP] 累积数据:', httpBuf.byteLength, '字节');
            
            const parsed = parseHttpRequest(httpBuf);
            if (parsed && parsed.headerEnd >= 0) {
              // 解析成功，提取 HTTP 头之后的残留数据
              const remaining = httpBuf.slice(parsed.headerEnd);
              httpBuf = new Uint8Array(0);
              await connectAndForward(parsed.host, parsed.port, remaining);
            } else if (httpBuf.byteLength > 16384) {
              console.error('[协议错误] 前 16KB 数据中未找到有效的 HTTP 请求头');
              console.error('[协议错误] 数据预览:', dec.decode(httpBuf.subarray(0, Math.min(500, httpBuf.byteLength))).replace(/[^\x20-\x7E]/g, '.'));
              await closeAll(); break;
            } else {
              console.log('[解析] HTTP 头未完整，已累积', httpBuf.byteLength, '字节，等待更多数据');
            }
          }
        } else {
          await writer.write(pureData);
        }

        if (++frameCount % 4 === 0) await Promise.resolve();
      }
    }
    if (pump) await pump;
  } catch (e) {
    console.error('[流异常]', e?.message || e);
    console.error('[流异常] 堆栈:', e?.stack);
  } finally {
    await closeAll();
    try { clientReader.releaseLock(); } catch {}
  }
}

// ═══════════════════════════════════════════════════════════════════
// Worker 入口
// ═══════════════════════════════════════════════════════════════════

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const contentType = request.headers.get('content-type') || '';
    
    console.log('[请求]', request.method, url.pathname, 'Content-Type:', contentType);
    console.log('[请求] Headers:', JSON.stringify(Object.fromEntries(request.headers.entries())));
    
    if (request.method !== 'POST' || !contentType.startsWith('application/grpc')) {
      return new Response('草你妈给你脸了是吧，看看这里看看那里，你他妈没有是吧', { status: 500 });
    }
    if (!路径鉴权(request, env)) {
      return new Response('114514', { status: 403 });
    }
    if (!验证Token(request, env)) {
      return new Response('1919810', { status: 403 });
    }

    const { readable, writable } = new TransformStream();
    const responseWriter = writable.getWriter();

    processStream(request, request.body.getReader(), responseWriter, env).catch(async e => {
      console.error('[流异常]', e?.message || e);
      try { await responseWriter.close(); } catch {}
    });

    return new Response(readable, {
      status: 200,
      headers: {
        'Content-Type': 'application/grpc',
        'grpc-status': '0',
        'grpc-message': '',
        'Trailer': 'grpc-status, grpc-message',
      },
    });
  },
};
