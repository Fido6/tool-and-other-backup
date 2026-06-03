// gRPC VLESS over Cloudflare Workers
// 主线对齐 GrainTCP：request.fetcher.connect()、并发拨号、上传合包、下载 grain 聚合、BYOB 转发

const CFG = {
  UUID: '2523c510-9ff0-415b-9582-93949bfae7e3',//自己更换
  ServiceName: '',//随便填一个英文+数字混合，不能包含其他字符，留空的话客户端写自定义域名或worker域名
  GRPCMODE: 'Gun', // 二选一,'Gun'(默认值)或者Multi
  反代IP: 'sg.wogg.us.kg',//有能力自己更换
  chunk: 64 * 1024,
  dnPack: 32 * 1024,
  dnTail: 512,
  dnMs: 0,
  upPack: 16 * 1024,
  upQMax: 256 * 1024,
  concur: 4,
};

const dec = new TextDecoder();

const buildUUID = (a, i) => Array.from(a.slice(i, i + 16))
  .map(n => n.toString(16).padStart(2, '0'))
  .join('')
  .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');

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

async function 反代参数获取(request, 当前反代IP) {
  const url = new URL(request.url);
  const { searchParams } = url;
  if (searchParams.has('proxyip')) {
    const 查询IP = searchParams.get('proxyip');
    return 查询IP.includes(',') ? 查询IP.split(',')[Math.floor(Math.random() * 查询IP.split(',').length)] : 查询IP;
  }
  return 当前反代IP ? 当前反代IP : request.cf.colo + '.PrOxYip.CmLiuSsSs.nEt';
}

const 取首个值 = v => Array.isArray(v) ? v[0] : v;

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

const extractVlsFromProtobuf = rawPayload => {
  let ptr = 0;
  if (rawPayload[ptr] !== 0x0A) return null;
  ptr++;
  let len = 0, shift = 0;
  for (;;) {
    const b = rawPayload[ptr++];
    len |= (b & 0x7F) << shift;
    if (!(b & 0x80)) break;
    shift += 7;
  }
  const start = ptr;
  const version = rawPayload[start];
  const clientUUID = buildUUID(rawPayload, start + 1);
  const addonLen = rawPayload[start + 17];
  const o1 = start + 18 + addonLen;
  const cmd = rawPayload[o1];
  const p = (rawPayload[o1 + 1] << 8) | rawPayload[o1 + 2];
  const t = rawPayload[o1 + 3];
  let o2 = o1 + 4, h, l;
  switch (t) {
    case 1:
      l = 4;
      h = rawPayload.slice(o2, o2 + l).join('.');
      break;
    case 2:
      l = rawPayload[o2++];
      h = dec.decode(rawPayload.slice(o2, o2 + l));
      break;
    case 3:
      l = 16;
      h = `[${Array.from({ length: 8 }, (_, i) => ((rawPayload[o2 + i * 2] << 8) | rawPayload[o2 + i * 2 + 1]).toString(16)).join(':')}]`;
      break;
    default:
      throw new Error(`[地址解析] 未知类型 ${t}`);
  }
  return {
    host: h,
    port: p,
    cmd,
    vlsPayload: rawPayload.slice(o2 + l),
    version,
    clientUUID,
  };
};

const stripProtobufHeader = data => {
  if (data[0] !== 0x0A) return data;
  let p = 1;
  while (data[p++] & 0x80);
  return data.slice(p);
};

// ── Ring buffer：替代 concatBuffer，避免每次 read 都分配新 Uint8Array ──
const mkRingBuf = (cap = 256 * 1024) => {
  const buf = new Uint8Array(cap);
  let w = 0, r = 0, len = 0;
  return {
    get length() { return len; },
    get remain() { return cap - len; },
    ensure(n) { if (len + n > cap) this.compact(); return len + n <= cap; },
    compact() {
      if (!r) return;
      if (len) buf.copyWithin(0, r, r + len);
      r = 0; w = len;
    },
    append(u) {
      const n = u.byteLength;
      if (!n) return;
      if (!this.ensure(n)) this.compact();
      const tail = cap - w;
      if (n <= tail) {
        buf.set(u, w);
      } else {
        buf.set(u.subarray(0, tail), w);
        buf.set(u.subarray(tail), 0);
      }
      w = (w + n) % cap;
      len += n;
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
  let tempLen = len;
  while (tempLen > 127) {
    varint.push((tempLen & 0x7F) | 0x80);
    tempLen >>>= 7;
  }
  varint.push(tempLen);
  const pbHeader = new Uint8Array([0x0A, ...varint]);
  const totalPayload = new Uint8Array(pbHeader.length + data.length);
  totalPayload.set(pbHeader);
  totalPayload.set(data, pbHeader.length);
  return makeGrpcFrame(totalPayload);
};

const sprout = (f, h, p, s = f.connect({ hostname: h, port: p })) => s.opened.then(() => s);

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
  try {
    return await raceSprout(fetcher, host, port);
  } catch {
    const [反代IP地址, 反代IP端口] = await 解析地址端口(proxyIP);
    return raceSprout(fetcher, 反代IP地址, 反代IP端口);
  }
};

const mkQ = (cap, qCap = cap, itemsMax = Math.max(1, qCap >> 8)) => {
  let q = [], h = 0, qB = 0, buf = null;
  const trim = () => { h > 32 && h * 2 >= q.length && (q = q.slice(h), h = 0); };
  const take = () => {
    if (h >= q.length) return null;
    const d = q[h];
    q[h++] = undefined;
    qB -= d.byteLength;
    trim();
    return d;
  };
  return {
    get bytes() { return qB; },
    get size() { return q.length - h; },
    get empty() { return h >= q.length; },
    clear() { q = []; h = 0; qB = 0; },
    sow(d) {
      const n = d?.byteLength || 0;
      if (!n) return 1;
      if (qB + n > qCap || q.length - h >= itemsMax) return 0;
      q.push(d);
      qB += n;
      return 1;
    },
    bundle(d) {
      d ||= take();
      if (!d || h >= q.length || d.byteLength >= cap) return [d, 0];
      let n = d.byteLength, e = h;
      while (e < q.length) {
        const x = q[e], nn = n + x.byteLength;
        if (nn > cap) break;
        n = nn;
        e++;
      }
      if (e === h) return [d, 0];
      const out = buf ||= new Uint8Array(cap);
      out.set(d);
      for (let o = d.byteLength; h < e;) {
        const x = q[h];
        q[h++] = undefined;
        qB -= x.byteLength;
        out.set(x, o);
        o += x.byteLength;
      }
      trim();
      return [out.subarray(0, n), 1];
    },
  };
};

const mkGrpcDn = writer => {
  const cap = CFG.dnPack, tail = CFG.dnTail, low = Math.max(4096, tail << 3);
  let pb = new Uint8Array(cap), p = 0, tp = 0, mq = 0, gen = 0, qk = 0, qr = 0;
  const reap = async () => {
    tp && clearTimeout(tp);
    tp = 0;
    mq = 0;
    if (!p) return;
    const out = pb.subarray(0, p).slice();
    pb = new Uint8Array(cap);
    p = 0;
    qr = 0;
    await writer.write(makeProtobufGrpcFrame(out));
  };
  const ripen = () => {
    if (tp || mq) return;
    mq = 1;
    qk = gen;
    queueMicrotask(() => {
      mq = 0;
      if (!p || tp) return;
      if (cap - p < tail) return void reap();
      tp = setTimeout(() => {
        tp = 0;
        if (!p) return;
        if (cap - p < tail) return void reap();
        if (qr < 2 && (gen !== qk || p < low)) {
          qr++;
          qk = gen;
          return ripen();
        }
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
          const v = o || m !== n ? u.subarray(o, o + m) : u;
          await writer.write(makeProtobufGrpcFrame(v));
          o += m;
          continue;
        }
        const m = Math.min(cap - p, n - o);
        pb.set(u.subarray(o, o + m), p);
        p += m;
        o += m;
        gen++;
        if (p === cap || cap - p < tail) await reap();
        else ripen();
      }
    },
    reap,
  };
};

const pipeToClientByob = async (readable, writer) => {
  const r = readable.getReader({ mode: 'byob' });
  const tx = mkGrpcDn(writer);
  let buf = new ArrayBuffer(CFG.chunk);
  try {
    for (;;) {
      const { done, value: v } = await r.read(new Uint8Array(buf, 0, CFG.chunk));
      if (done) break;
      if (!v?.byteLength) continue;
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
  } catch {
  } finally {
    try { await tx.reap(); } catch {}
    try { r.releaseLock(); } catch {}
  }
};

async function processStream(request, clientReader, responseWriter, proxyIP) {
  const fetcher = request.fetcher;
  if (!fetcher?.connect) throw new Error('request.fetcher.connect unavailable');

  const ring = mkRingBuf(256 * 1024);
  let socket = null, writer = null, pump = null, closed = false, busy = false;
  const uq = mkQ(CFG.upPack, CFG.upQMax, CFG.upQMax >> 8);

  const closeAll = async (forceCloseResponse = false) => {
    if (closed) return;
    closed = true;
    uq.clear();
    ring.drain();
    try { writer?.releaseLock(); } catch {}
    try { socket?.close(); } catch {}
    try { await responseWriter.close(); } catch {}
  };

  const sow = d => {
    const u = d instanceof Uint8Array ? d : new Uint8Array(d);
    if (!u.byteLength) return 1;
    if (uq.sow(u)) return 1;
    void closeAll(true);
    return 0;
  };

  const thresh = async () => {
    if (busy || closed) return;
    busy = true;
    try {
      for (;;) {
        if (closed) break;
        if (!socket) {
          const [d] = uq.bundle();
          if (!d) break;
          const parsed = extractVlsFromProtobuf(d);
          if (!parsed) throw new Error('invalid first grpc frame');
          const { host, port, vlsPayload, version, clientUUID } = parsed;
          if (clientUUID !== CFG.UUID) throw new Error(`Invalid UUID: ${clientUUID}`);
          socket = await connectWithFallback(fetcher, host, port, proxyIP);
          writer = socket.writable.getWriter();
          await responseWriter.write(makeProtobufGrpcFrame(new Uint8Array([version, 0])));
          pump = pipeToClientByob(socket.readable, responseWriter).catch(() => {});
          const [first] = uq.bundle(vlsPayload);
          if (first?.byteLength) await writer.write(first);
          continue;
        }
        const [d] = uq.bundle();
        if (!d) break;
        await writer.write(d);
      }
    } catch (e) {
      console.error('[流异常]', e?.message || e);
      await closeAll(true);
    } finally {
      busy = false;
      !uq.empty && !closed && queueMicrotask(thresh);
    }
  };

  try {
    for (;;) {
      const { done, value } = await clientReader.read();
      if (done) break;
      if (closed) break;
      ring.append(value);
      let frameCount = 0;
      for (;;) {
        if (ring.length < 5) break;
        const hdr = ring.peek(5);
        const grpcLen = ((hdr[1] << 24) >>> 0) | (hdr[2] << 16) | (hdr[3] << 8) | hdr[4];
        if (ring.length < 5 + grpcLen) break;
        const grpcData = ring.peek(5 + grpcLen);
        ring.skip(5 + grpcLen);
        const pureData = socket ? stripProtobufHeader(grpcData.subarray(5)) : grpcData.subarray(5);
        if (!sow(pureData)) break;
        await thresh();
        if (++frameCount % 4 === 0) await Promise.resolve();
      }
    }
    await pump;
  } catch (e) {
    console.error('[致命错误]', e?.message || e);
  } finally {
    await closeAll(true);
    try { clientReader.releaseLock(); } catch {}
  }
}

export default {
  async fetch(request, env) {
    const contentType = request.headers.get('content-type') || '';
    if (request.method !== 'POST' || !contentType.startsWith('application/grpc')) {
      return new Response('Not Found', { status: 404 });
    }
    if (!路径鉴权(request, env)) {
      return new Response('Forbidden', { status: 403 });
    }
    const 当前反代IP = await 反代参数获取(request, 取首个值(env?.反代IP) ?? CFG.反代IP);
    const { readable, writable } = new TransformStream();
    const responseWriter = writable.getWriter();
    processStream(request, request.body.getReader(), responseWriter, 当前反代IP).catch(async e => {
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

