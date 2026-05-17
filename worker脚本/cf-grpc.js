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
// 回程（上游->客户端）聚合阈值：越大越省 CPU/分配次数，但单帧延迟与内存占用略升。
// 对 fast.com / 大文件下载，建议 64KB~256KB。
const COALESCE_CHUNK_SIZE = 128 * 1024;
// 可选：允许在低流量时尽快 flush，避免一直攒着不发（单位 ms）
const COALESCE_MAX_DELAY_MS = 8;
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
    // 保护：过多/过长规则会显著增加 CPU（尤其在你频繁断线重连/续传时）
    const MAX_RULES = 2000;
    const MAX_LINE_LENGTH = 256;
    const regexes = text.split('\n').slice(0, MAX_RULES).map(line => {
      const c = line.indexOf('#');
      const p = (c !== -1 ? line.substring(0, c) : line).trim();
      if (!p) return null;
      if (p.length > MAX_LINE_LENGTH) return null;
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
  let pipePromise = null;

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
            // 不等待：后台把上游数据持续回写给客户端
            pipePromise = pipeToClient(reader, responseWriter);
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

    // 客户端上行结束（常见于下载/断点续传：请求发送完就 half-close），
    // 此时不要立刻 cleanup 关闭下行；只关闭写方向，让上游继续把数据发完。
    try { await writer?.close(); } catch(e) {}

    // 等待回程转发结束（上游结束或出错）
    if (pipePromise) {
      try { await pipePromise; } catch(e) {}
    }
  } catch (e) {
    // 首帧阶段（pipePromise 尚未启动）发生错误时，必须 close responseWriter，
    // 否则 TransformStream 会悬挂，触发 Workers "code had hung"。
    if (!pipePromise) {
      try { await responseWriter.close(); } catch(_) {}
    }
    throw e;
  } finally {
    cleanup(socket, writer, reader, responseWriter);
  }
}

function stripPb(d) {
  if (d.length === 0 || d[0] !== 0x0A) return d;
  let p = 1; while (p < d.length && (d[p++] & 0x80));
  return d.subarray(p);
}

// 将上游返回数据聚合后再打包成 gRPC frame，显著减少 frame 构造次数与内存分配。
async function pipeToClient(r, w) {
  let buf = new Uint8Array(COALESCE_CHUNK_SIZE);
  let used = 0;

  async function flush() {
    if (used === 0) return;
    const out = buf.subarray(0, used);
    used = 0;
    // 重新分配新 buffer，避免 subarray 共享底层导致覆盖
    buf = new Uint8Array(COALESCE_CHUNK_SIZE);
    await w.write(makeProtobufGrpcFrame(out));
  }

  // 单飞 read + 超时 flush：保证同一时间只有一个 r.read() 在飞行中，避免并发 read() 导致卡死。
  function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
  let pendingRead = null;

  try {
    while (true) {
      if (!pendingRead) pendingRead = r.read();
      const timeoutPromise = (used > 0) ? sleep(COALESCE_MAX_DELAY_MS).then(() => ({ timeout: true })) : null;
      const res = timeoutPromise ? await Promise.race([pendingRead, timeoutPromise]) : await pendingRead;

      if (res && res.timeout) {
        await flush();
        // 注意：pendingRead 仍在进行中，不能启动新的 read
        continue;
      }

      // pendingRead 已完成
      pendingRead = null;
      const { done, value } = res;
      if (done) break;

      // 大块直接写出，减少额外拷贝
      if (value.length >= COALESCE_CHUNK_SIZE) {
        await flush();
        await w.write(makeProtobufGrpcFrame(value));
        continue;
      }

      if (used + value.length > buf.length) {
        await flush();
      }

      buf.set(value, used);
      used += value.length;

      if (used >= COALESCE_CHUNK_SIZE) {
        await flush();
      }
    }

    await flush();
  } catch (e) {
  } finally {
    try { await w.close(); } catch(e) {}
  }
}

function cleanup(s, w, r, rw) {
  // responseWriter 的 close 由 pipeToClient 负责（避免上行结束导致过早关闭响应流）
  try { w?.releaseLock(); } catch(e) {}
  try { r?.releaseLock(); } catch(e) {}
  try { s?.close(); } catch(e) {}
  // 不主动 rw.close()
}
