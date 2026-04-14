import { connect } from 'cloudflare:sockets';

// 1. 【核心配置】
const UUID = "58888888-8888-8888-8888-588888888888";
let 反代IP = 'sg.wogg.us.kg';

// 2. 【黑名单配置】
// 是否开启外部黑名单开关true或者false，设置为true则只使用链接里的规则，设置为false则只是用BLACKLIST硬编码
const ENABLE_EXTERNAL_BLACKLIST = true;
// 外部黑名单url地址，支持正则，格式参考下面的链接，不支持adblock语法
const EXTERNAL_URL = 'https://raw.githubusercontent.com/Pideo1/bbbfg/refs/heads/main/blacklist.txt'; 
const BLACKLIST = [
  'ads.google.com',
  'e.qq.com',
  'doubleclick.net',
  'analytics.google.com'
];

// 限制单个 gRPC 帧最大为 4MB
const MAX_GRPC_FRAME_SIZE = 4 * 1024 * 1024;

// --- 外部黑名单缓存变量 ---
let cachedExternalBlacklist = null;
let lastFetchTime = 0;
const CACHE_TTL = 3600 * 1000; // 缓存 1 小时

//获取并解析外部黑名单
async function getExternalBlacklist() {
  const now = Date.now();
  if (cachedExternalBlacklist && (now - lastFetchTime < CACHE_TTL)) {
    return cachedExternalBlacklist;
  }
  
  try {
    console.log(`[外部黑名单] 正在从 ${EXTERNAL_URL} 获取...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
    
    const response = await fetch(EXTERNAL_URL, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error(`HTTP 状态码: ${response.status}`);
    
    const text = await response.text();
    const lines = text.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#')); // 过滤空行和注释
    
    const regexes = lines.map(pattern => {
      try {
        return new RegExp(pattern, 'i');
      } catch (e) {
        console.error(`[正则编译失败] 模式: ${pattern}, 原因: ${e.message}`);
        return null;
      }
    }).filter(r => r !== null);
    
    cachedExternalBlacklist = regexes;
    lastFetchTime = now;
    console.log(`[外部黑名单] 更新成功，包含 ${cachedExternalBlacklist.length} 条正则规则`);
    return cachedExternalBlacklist;
  } catch (e) {
    console.error(`[外部黑名单获取失败]`, e.message);
    return cachedExternalBlacklist || []; // 失败时返回旧缓存或空数组
  }
}

//检查域名是否在黑名单中
function isBlacklisted(host, externalList) {
  const hostLower = host.toLowerCase();
  
  if (ENABLE_EXTERNAL_BLACKLIST) {
    // 使用外部正则表达式列表
    if (externalList && externalList.length > 0) {
      return externalList.some(regex => regex.test(hostLower));
    }
    return false;
  } else {
    // 使用硬编码字符串列表
    return BLACKLIST.some(blocked => {
      const blockedLower = blocked.toLowerCase();
      return hostLower === blockedLower || hostLower.endsWith('.' + blockedLower);
    });
  }
}

//UUID 转换工具函数
const buildUUID = (a, i) => Array.from(a.slice(i, i + 16))
  .map(n => n.toString(16).padStart(2, '0'))
  .join('')
  .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');

//解析地址端口
async function 解析地址端口(proxyIP) {
  proxyIP = proxyIP.toLowerCase();
  let 地址 = proxyIP, 端口 = 443;
  if (proxyIP.includes('.tp')) {
    const tpMatch = proxyIP.match(/\.tp(\d+)/);
    if (tpMatch) 端口 = parseInt(tpMatch[1], 10);
    return [地址, 端口];
  }
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

//动态反代参数获取
async function 反代参数获取(request, 当前反代IP) {
  const url = new URL(request.url);
  const { pathname, searchParams } = url;
  const pathLower = pathname.toLowerCase();
  if (searchParams.has('proxyip')) {
    const 路参IP = searchParams.get('proxyip');
    return 路参IP.includes(',') ? 路参IP.split(',')[Math.floor(Math.random() * 路参IP.split(',').length)] : 路参IP;
  }
  const proxyMatch = pathLower.match(/\/(proxyip[.=]|pyip=|ip=)([^/]+)/);
  if (proxyMatch) {
    const 路参IP = proxyMatch[1] === 'proxyip.' ? `proxyip.${proxyMatch[2]}` : proxyMatch[2];
    return 路参IP.includes(',') ? 路参IP.split(',')[Math.floor(Math.random() * 路参IP.split(',').length)] : 路参IP;
  }
  return 当前反代IP ? 当前反代IP : request.cf.colo + '.PrOxYip.CmLiuSsSs.nEt';
}

//提取 VLESS 信息
const extractVlessFromProtobuf = (rawPayload) => {
  try {
    let ptr = 0;
    if (rawPayload[ptr] !== 0x0A) return null;
    ptr++;
    let len = 0, shift = 0;
    while (ptr < rawPayload.length) {
      let b = rawPayload[ptr++];
      len |= (b & 0x7F) << shift;
      if (!(b & 0x80)) break;
      shift += 7;
    }
    const start = ptr;
    if (start + 17 > rawPayload.length) return null;

    const version = rawPayload[start];
    const clientUUID = buildUUID(rawPayload, start + 1);
    
    const addonLen = rawPayload[start + 17];
    const o1 = start + 18 + addonLen;
    if (o1 + 4 > rawPayload.length) return null;

    const p = (rawPayload[o1 + 1] << 8) | rawPayload[o1 + 2];
    const t = rawPayload[o1 + 3];
    let o2 = o1 + 4, h, l;
    switch (t) {
      case 1: l = 4; if (o2 + l > rawPayload.length) return null; h = rawPayload.slice(o2, o2 + l).join('.'); break;
      case 2: l = rawPayload[o2++]; if (o2 + l > rawPayload.length) return null; h = new TextDecoder().decode(rawPayload.slice(o2, o2 + l)); break;
      case 3: l = 16; if (o2 + l > rawPayload.length) return null; h = `[${Array.from({ length: 8 }, (_, i) => ((rawPayload[o2 + i * 2] << 8) | rawPayload[o2 + i * 2 + 1]).toString(16)).join(':')}]`; break;
      default: return null;
    }
    return { host: h, port: p, vlessPayload: rawPayload.slice(o2 + l), version, clientUUID };
  } catch (e) {
    console.error(`[VLESS解析失败]`, e.message);
    return null;
  }
};

const makeProtobufGrpcFrame = (data) => {
  const len = data.length;
  let varint = [], tempLen = len;
  while (tempLen > 127) {
    varint.push((tempLen & 0x7F) | 0x80);
    tempLen >>>= 7;
  }
  varint.push(tempLen);
  const pbHeader = new Uint8Array([0x0A, ...varint]);
  const totalPayload = new Uint8Array(pbHeader.length + data.length);
  totalPayload.set(pbHeader);
  totalPayload.set(data, pbHeader.length);
  const grpcFrame = new Uint8Array(5 + totalPayload.length);
  grpcFrame[0] = 0;
  grpcFrame[1] = (totalPayload.length >>> 24) & 0xFF;
  grpcFrame[2] = (totalPayload.length >>> 16) & 0xFF;
  grpcFrame[3] = (totalPayload.length >>> 8) & 0xFF;
  grpcFrame[4] = totalPayload.length & 0xFF;
  grpcFrame.set(totalPayload, 5);
  return grpcFrame;
};

export default {
  async fetch(request) {
    try {
      const contentType = request.headers.get('content-type') || '';
      if (request.method !== 'POST' || !contentType.startsWith('application/grpc')) {
        return new Response('Not Found', { status: 404 });
      }

      // 如果开启了外部黑名单，预先获取列表
      let externalList = null;
      if (ENABLE_EXTERNAL_BLACKLIST) {
        externalList = await getExternalBlacklist();
      }

      const 当前反代IP = await 反代参数获取(request, 反代IP);
      const { readable, writable } = new TransformStream();
      const responseWriter = writable.getWriter();
      
      processStream(request.body.getReader(), responseWriter, 当前反代IP, externalList).catch(e => {
        console.error(`[流任务异常]`, e.message);
      });

      return new Response(readable, {
        status: 200,
        headers: { 'Content-Type': 'application/grpc', 'grpc-status': '0' }
      });
    } catch (e) {
      console.error(`[Fetch异常]`, e.message);
      return new Response('Internal Error', { status: 500 });
    }
  }
};

async function processStream(clientReader, responseWriter, proxyIP, externalList) {
  let buffer = new Uint8Array(0);
  let socket = null, writer = null, reader = null, isFirst = true;

  try {
    while (true) {
      const { done, value } = await clientReader.read();
      if (done) break;

      const newBuffer = new Uint8Array(buffer.length + value.length);
      newBuffer.set(buffer);
      newBuffer.set(value, buffer.length);
      buffer = newBuffer;

      while (buffer.length >= 5) {
        const grpcLen = ((buffer[1] << 24) >>> 0) | (buffer[2] << 16) | (buffer[3] << 8) | buffer[4];
        
        if (grpcLen > MAX_GRPC_FRAME_SIZE) {
          throw new Error(`gRPC 帧大小 ${grpcLen} 超过限制`);
        }

        if (buffer.length >= 5 + grpcLen) {
          const grpcData = buffer.subarray(5, 5 + grpcLen);
          
          if (isFirst) {
            isFirst = false;
            const vlessInfo = extractVlessFromProtobuf(grpcData);
            if (!vlessInfo) throw new Error('无效的 VLESS 负载');
            
            const { host, port, vlessPayload, version, clientUUID } = vlessInfo;

            // --- 1. UUID 校验 ---
            if (clientUUID !== UUID) {
              console.error(`[鉴权失败] UUID 不匹配: ${clientUUID}`);
              throw new Error('Invalid UUID');
            }

            // --- 2. 黑名单校验 (支持外部正则) ---
            if (isBlacklisted(host, externalList)) {
              console.warn(`[拦截] 命中黑名单规则: ${host}`);
              throw new Error(`Access denied to blacklisted host: ${host}`);
            }

            console.log(`[连接] 目标: ${host}:${port}`);

            try {
              socket = connect({ hostname: host, port: port });
              await socket.opened;
            } catch (err) {
              const [反代IP地址, 反代IP端口] = await 解析地址端口(proxyIP);
              console.log(`[反代] 回退至 ${反代IP地址}:${反代IP端口}`);
              socket = connect({ hostname: 反代IP地址, port: 反代IP端口 });
              await socket.opened;
            }

            writer = socket.writable.getWriter();
            reader = socket.readable.getReader();
            await responseWriter.write(makeProtobufGrpcFrame(new Uint8Array([version, 0])));
            
            pipeToClient(reader, responseWriter);
            
            if (vlessPayload.length > 0) await writer.write(vlessPayload);
          } else {
            const pureData = stripProtobufHeader(grpcData);
            if (writer) await writer.write(pureData);
          }
          
          buffer = buffer.slice(5 + grpcLen);
        } else {
          break;
        }
      }
    }
  } catch (e) {
    console.error(`[流处理异常]`, e.message);
  } finally {
    cleanup(socket, writer, reader, responseWriter);
  }
}

function stripProtobufHeader(data) {
  if (data.length === 0 || data[0] !== 0x0A) return data;
  let p = 1;
  while (p < data.length && (data[p++] & 0x80));
  return data.slice(p);
}

async function pipeToClient(reader, writer) {
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      await writer.write(makeProtobufGrpcFrame(value));
    }
  } catch (e) {
    console.error(`[转发异常]`, e.message);
  } finally {
    try { await writer.close(); } catch(e) {}
  }
}

function cleanup(s, w, r, rw) {
  try { 
    if (w) w.releaseLock(); 
    if (r) r.releaseLock(); 
    if (s) s.close(); 
  } catch(e) {}
  try { 
    if (rw) rw.close(); 
  } catch(e) {}
}