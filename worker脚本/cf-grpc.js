import { connect } from 'cloudflare:sockets';

// 1. 【核心配置】
const UUID = "58888888-8888-8888-8888-588888888888";
let 反代IP = 'sg.wogg.us.kg';

// 2. 【黑名单配置】
// 是否开启外部黑名单开关true或者false，设置为true则只使用链接里的规则，设置为false则只使用BLACKLIST硬编码
const ENABLE_EXTERNAL_BLACKLIST = true;
// 外部黑名单url地址，支持正则，格式参考下面的链接，不支持adblock语法
const EXTERNAL_URL = 'https://raw.githubusercontent.com/Pideo1/bbbfg/refs/heads/main/blacklist.txt'; 
const BLACKLIST = [
  'ads.google.com',
  'e.qq.com',
  'doubleclick.net',
  'analytics.google.com'
];

const MAX_GRPC_FRAME_SIZE = 4 * 1024 * 1024;
let cachedExternalBlacklist = null;
let lastFetchTime = 0;
const CACHE_TTL = 3600 * 1000;

// ✅ 获取并解析外部黑名单
async function getExternalBlacklist() {
  const now = Date.now();
  if (cachedExternalBlacklist && (now - lastFetchTime < CACHE_TTL)) return cachedExternalBlacklist;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(EXTERNAL_URL, { 
      signal: controller.signal,
      headers: { 'User-Agent': 'Cloudflare-Worker-Proxy' }
    });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    const regexes = text.split('\n').map(line => {
      const c = line.indexOf('#');
      const p = (c !== -1 ? line.substring(0, c) : line).trim();
      if (!p) return null;
      try { return new RegExp(p, 'i'); } catch (e) { return null; }
    }).filter(r => r !== null);
    cachedExternalBlacklist = regexes;
    lastFetchTime = now;
    return cachedExternalBlacklist;
  } catch (e) {
    return cachedExternalBlacklist || [];
  }
}

// ✅ 检查域名是否在黑名单中
function isBlacklisted(host, externalList) {
  const h = host.toLowerCase();
  if (ENABLE_EXTERNAL_BLACKLIST) {
    return externalList?.some(r => r.test(h)) || false;
  }
  return BLACKLIST.some(b => h === b.toLowerCase() || h.endsWith('.' + b.toLowerCase()));
}

// ✅ 优化后的 gRPC 帧构建 (单次分配，极低 CPU 消耗)
function makeProtobufGrpcFrame(data) {
  const len = data.length;
  let varint = [], tempLen = len;
  while (tempLen > 127) {
    varint.push((tempLen & 0x7F) | 0x80);
    tempLen >>>= 7;
  }
  varint.push(tempLen);
  
  const totalPayloadLen = 1 + varint.length + len; // 0x0A + varint + data
  const frame = new Uint8Array(5 + totalPayloadLen);
  
  // gRPC Header
  frame[0] = 0;
  frame[1] = (totalPayloadLen >>> 24) & 0xFF;
  frame[2] = (totalPayloadLen >>> 16) & 0xFF;
  frame[3] = (totalPayloadLen >>> 8) & 0xFF;
  frame[4] = totalPayloadLen & 0xFF;
  
  // Protobuf
  frame[5] = 0x0A;
  frame.set(varint, 6);
  frame.set(data, 6 + varint.length);
  return frame;
}

const buildUUID = (a, i) => Array.from(a.slice(i, i + 16)).map(n => n.toString(16).padStart(2, '0')).join('').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');

async function 解析地址端口(pIP) {
  const p = pIP.toLowerCase();
  let a = p, pt = 443;
  if (p.includes('.tp')) pt = parseInt(p.match(/\.tp(\d+)/)?.[1] || 443);
  else if (p.includes(']:')) { const s = p.split(']:'); a = s[0] + ']'; pt = parseInt(s[1]) || 443; }
  else if (p.includes(':') && !p.startsWith('[')) { const c = p.lastIndexOf(':'); a = p.slice(0, c); pt = parseInt(p.slice(c + 1)) || 443; }
  return [a, pt];
}

async function 反代参数获取(req, cur) {
  const url = new URL(req.url);
  if (url.searchParams.has('proxyip')) return url.searchParams.get('proxyip');
  return cur;
}

const extractVlessInfo = (raw) => {
  try {
    let ptr = 0;
    if (raw[ptr++] !== 0x0A) return null;
    let len = 0, shift = 0;
    while (ptr < raw.length) {
      let b = raw[ptr++];
      len |= (b & 0x7F) << shift;
      if (!(b & 0x80)) break;
      shift += 7;
    }
    const start = ptr;
    const version = raw[start];
    const clientUUID = buildUUID(raw, start + 1);
    const addonLen = raw[start + 17];
    const o1 = start + 18 + addonLen;
    const p = (raw[o1 + 1] << 8) | raw[o1 + 2], t = raw[o1 + 3];
    let o2 = o1 + 4, h, l;
    if (t === 1) { h = raw.slice(o2, o2 + 4).join('.'); l = 4; }
    else if (t === 2) { l = raw[o2++]; h = new TextDecoder().decode(raw.slice(o2, o2 + l)); }
    else if (t === 3) { h = 'ipv6-address'; l = 16; } // 简化提取
    return { host: h, port: p, payload: raw.subarray(o2 + l), version, clientUUID };
  } catch (e) { return null; }
};

export default {
  async fetch(request) {
    const ct = request.headers.get('content-type') || '';
    if (request.method !== 'POST' || !ct.startsWith('application/grpc')) return new Response('Not Found', { status: 404 });
    const ext = ENABLE_EXTERNAL_BLACKLIST ? await getExternalBlacklist() : null;
    const pip = await 反代参数获取(request, 反代IP);
    const { readable, writable } = new TransformStream();
    processStream(request.body.getReader(), writable.getWriter(), pip, ext).catch(e => console.error(`[流处理异常]`, e.message));
    return new Response(readable, { status: 200, headers: { 'Content-Type': 'application/grpc', 'grpc-status': '0' } });
  }
};

async function processStream(clientReader, responseWriter, proxyIP, externalList) {
  let leftover = null;
  let socket, writer, reader, isFirst = true;

  try {
    while (true) {
      const { done, value } = await clientReader.read();
      if (done) break;

      let buffer;
      if (leftover && leftover.length > 0) {
        buffer = new Uint8Array(leftover.length + value.length);
        buffer.set(leftover);
        buffer.set(value, leftover.length);
      } else {
        buffer = value;
      }

      let pos = 0;
      while (buffer.length - pos >= 5) {
        const grpcLen = ((buffer[pos+1] << 24) >>> 0) | (buffer[pos+2] << 16) | (buffer[pos+3] << 8) | buffer[pos+4];
        if (grpcLen > MAX_GRPC_FRAME_SIZE) throw new Error(`帧过大: ${grpcLen}`);

        if (buffer.length - pos >= 5 + grpcLen) {
          const grpcData = buffer.subarray(pos + 5, pos + 5 + grpcLen);
          if (isFirst) {
            isFirst = false;
            const info = extractVlessInfo(grpcData);
            if (!info) throw new Error('无效负载');
            if (info.clientUUID !== UUID) {
              console.error(`[鉴权失败] 客户端 UUID: ${info.clientUUID} 不匹配！`);
              throw new Error('鉴权验证失败');
            }
            if (isBlacklisted(info.host, externalList)) {
              console.warn(`[拦截] 命中黑名单规则: ${info.host}`);
              throw new Error(`Access denied to: ${info.host}`);
            }
            console.log(`[连接] 目标: ${info.host}:${info.port}`);
            try {
              socket = connect({ hostname: info.host, port: info.port });
              await socket.opened;
            } catch {
              const [ah, ap] = await 解析地址端口(proxyIP);
              socket = connect({ hostname: ah, port: ap });
              await socket.opened;
            }
            writer = socket.writable.getWriter();
            reader = socket.readable.getReader();
            await responseWriter.write(makeProtobufGrpcFrame(new Uint8Array([info.version, 0])));
            pipeToClient(reader, responseWriter);
            if (info.payload.length > 0) await writer.write(info.payload);
          } else {
            const pure = stripPb(grpcData);
            if (writer) await writer.write(pure);
          }
          pos += 5 + grpcLen;
        } else break;
      }
      leftover = buffer.subarray(pos);
    }
  } finally {
    cleanup(socket, writer, reader, responseWriter);
  }
}

function stripPb(d) {
  if (d.length === 0 || d[0] !== 0x0A) return d;
  let p = 1; while (p < d.length && (d[p++] & 0x80));
  return d.subarray(p);
}

async function pipeToClient(r, w) {
  try {
    while (true) {
      const { done, value } = await r.read();
      if (done) break;
      await w.write(makeProtobufGrpcFrame(value));
    }
  } catch (e) {
  } finally {
    try { await w.close(); } catch(e) {}
  }
}

function cleanup(s, w, r, rw) {
  try { w?.releaseLock(); r?.releaseLock(); s?.close(); } catch(e) {}
  try { rw.close(); } catch(e) {}
}