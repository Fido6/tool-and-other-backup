const CFG = { chunk: 64 * 1024, dnPack: 32 * 1024, dnTail: 512, dnQr: 4, upPack: 20 * 1024, maxED: 8 * 1024, concur: 4, dproxy: 'ProxyIP.CMLiussss.net' };
export default { fetch: (req, env) => req.headers.get('Upgrade')?.toLowerCase() === 'websocket' ? ws(req, env) : new Response('Hello world!') };
const dec = new TextDecoder(), enc = new TextEncoder();
const sprout = (f, h, p, opts, s = f.connect({ hostname: h, port: p }, opts)) => s.opened.then(() => s);
const raceSprout = (f, h, p, opts) => { if (!f?.connect) return Promise.reject(new Error('connect unavailable')); if (CFG.concur <= 1) return sprout(f, h, p, opts); const ts = Array(CFG.concur).fill().map(() => sprout(f, h, p, opts)); return Promise.any(ts).then(w => { ts.forEach(t => t.then(s => s !== w && s.close(), () => {})); return w; }); };
const relay = c => {
  const maxScan = Math.min(c.length - 3, 8192);
  let headerEnd = -1;
  for (let i = 0; i < maxScan; i++) {
    if (c[i] === 13 && c[i + 1] === 10 && c[i + 2] === 13 && c[i + 3] === 10) {
      headerEnd = i;
      break;
    }
  }
  if (headerEnd === -1) return null;
  const headerStr = dec.decode(c.subarray(0, headerEnd));
  const line1 = headerStr.split('\r\n')[0];
  const parts = line1.split(' ');
  if (parts.length < 2) return null;
  const method = parts[0].toUpperCase();
  const rawTarget = parts[1];
  let host = '', port = 80, isConnect = false;
  if (method === 'CONNECT') {
    isConnect = true;
    const t = pTarget(rawTarget, 443);
    host = t.host; port = t.port;
  } else {
    if (rawTarget.startsWith('http://') || rawTarget.startsWith('https://')) {
      const u = new URL(rawTarget);
      host = u.hostname;
      port = parseInt(u.port) || (rawTarget.startsWith('https://') ? 443 : 80);
    } else {
      const hostMatch = headerStr.match(/\r\nHost:\s*([^\r\n]+)/i);
      if (hostMatch) {
        const t = pTarget(hostMatch[1].trim(), 80);
        host = t.host; port = t.port;
      }
    }
  }
  if (!host) return null;
  return { host, port, isConnect, dataOffset: isConnect ? headerEnd + 4 : 0 };
};
const mkK = (cap, cpy = 0) => { let q = [], h = 0, b = 0, buf = null;
  const e = () => h >= q.length, trim = () => { h > 32 && h * 2 >= q.length && (q = q.slice(h), h = 0); }, clear = () => { q = []; h = 0; b = 0; };
  const take = () => { if (e()) return null; const d = q[h]; q[h++] = undefined; b -= d.byteLength; trim(); return d; };
  const sow = d => { const n = d?.byteLength || 0; return !n || (q.push(d), b += n, 1); };
  const pack = d => { d ||= take(); if (!d || e()) return [d, 0];
    let n = d.byteLength, j = h; while (j < q.length) { const x = q[j], nn = n + x.byteLength; if (nn > cap) break; n = nn; j++; }
    if (j === h) return [d, 0]; const out = buf ||= new Uint8Array(cap); out.set(d);
    for (let o = d.byteLength; h < j;) { const x = q[h]; q[h++] = undefined; b -= x.byteLength; out.set(x, o); o += x.byteLength; }
    trim(); const u = out.subarray(0, n); return [cpy ? u.slice() : u, 1]; };
  return { e, get b() { return b; }, clear, take, sow, pack }; };
const mkQ = cap => { const k = mkK(cap); return { get empty() { return k.e(); }, clear: k.clear, sow: k.sow, bundle: d => k.pack(d) }; };
const mkDn = w => { const cap = CFG.dnPack, tail = CFG.dnTail, low = Math.max(4096, tail * 12), k = mkK(cap, 1); let tp = 0, gen = 0, qk = 0, qr = 0;
  const reap = () => { tp && clearTimeout(tp); tp = 0; qr = 0; for (;;) { const [u] = k.pack(); if (!u) break; w.send(u); } };
  const ripen = () => { if (k.e() || tp) return; if (k.b >= cap || cap - k.b < tail) return reap(); tp = setTimeout(() => {
    tp = 0; if (k.e()) return; if (k.b >= cap || cap - k.b < tail) return reap();
    if (qr < CFG.dnQr && (gen !== qk || k.b < low)) { qr++; qk = gen; return ripen(); } reap(); }, 1); };
  return { send(u) { let o = 0, n = u?.byteLength || 0; if (!n) return; while (o < n) { const m = Math.min(cap - k.b, n - o); if (!m) { reap(); continue; }
      k.sow(o || m !== n ? u.subarray(o, o + m) : u); gen++; o += m; if (k.b >= cap || cap - k.b < tail) reap(); else ripen(); } }, reap }; };
const mill = async (rd, w) => { const r = rd.getReader({ mode: 'byob' }), tx = mkDn(w); let buf = new ArrayBuffer(CFG.chunk);
  try { for (;;) { const { done, value: v } = await r.read(new Uint8Array(buf, 0, CFG.chunk)); if (done) break; if (!v?.byteLength) continue; if (v.byteLength >= (CFG.chunk >> 1)) tx.reap(), w.send(v), buf = new ArrayBuffer(CFG.chunk); else tx.send(v.slice()), buf = v.buffer; } tx.reap(); } catch {} finally { try { tx.reap(); } catch {} try { r.releaseLock(); } catch {} } };
// ---- 反代链式协议：路径 target 解析（host/port/user/pass，支持 IPv6 [::]） ----
const pTarget = (raw, defPort) => { let user = '', pass = '', rest = raw; const at = raw.indexOf('@'); if (at > -1) { const cred = raw.slice(0, at); rest = raw.slice(at + 1); const ci = cred.indexOf(':'); if (ci > -1) { user = cred.slice(0, ci); pass = cred.slice(ci + 1); } else user = cred; } let host, port = defPort; if (rest.startsWith('[')) { const e = rest.indexOf(']'); host = rest.slice(1, e); const tail = rest.slice(e + 1); if (tail.startsWith(':')) port = parseInt(tail.slice(1)) || defPort; } else { const ci = rest.lastIndexOf(':'); if (ci > -1) { host = rest.slice(0, ci); port = parseInt(rest.slice(ci + 1)) || defPort; } else host = rest; } return { user, pass, host, port }; };
const v6b = host => { const dc = host.indexOf('::'); let head = [], tail = []; if (dc > -1) { const l = host.slice(0, dc), r = host.slice(dc + 2); head = l ? l.split(':') : []; tail = r ? r.split(':') : []; } else head = host.split(':'); const miss = 8 - (head.length + tail.length); const g = [...head, ...Array(Math.max(0, miss)).fill('0'), ...tail]; const out = new Uint8Array(16); for (let i = 0; i < 8; i++) { const v = parseInt(g[i] || '0', 16) || 0; out[i * 2] = (v >> 8) & 0xFF; out[i * 2 + 1] = v & 0xFF; } return out; };
const mkRB = reader => { let buf = new Uint8Array(0); const fill = async () => { const { value, done } = await reader.read(); if (done) throw new Error('proxy closed'); const n = new Uint8Array(buf.byteLength + value.byteLength); n.set(buf); n.set(value, buf.byteLength); buf = n; }; return { need: async n => { while (buf.byteLength < n) await fill(); const out = buf.subarray(0, n); buf = buf.subarray(n); return out; }, get rest() { return buf; } }; };
// SOCKS5 握手（RFC 1928/1929）：返回握手后残留在缓冲区里、已属于目标数据流的字节
const doSocks5 = async (sock, user, pass, host, port) => {
  const w = sock.writable.getWriter(), hr = sock.readable.getReader(), rb = mkRB(hr), enc = new TextEncoder();
  const methods = user ? [0x00, 0x02] : [0x00];
  await w.write(new Uint8Array([0x05, methods.length, ...methods]));
  const greet = await rb.need(2); if (greet[0] !== 0x05) throw new Error('socks5 bad version');
  if (greet[1] === 0x02) { if (!user) throw new Error('socks5 auth required'); const ub = enc.encode(user), pb = enc.encode(pass); await w.write(new Uint8Array([0x01, ub.byteLength, ...ub, pb.byteLength, ...pb])); const ar = await rb.need(2); if (ar[1] !== 0x00) throw new Error('socks5 auth failed'); }
  else if (greet[1] !== 0x00) throw new Error('socks5 no acceptable method');
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(host), isV6 = !ipv4 && host.includes(':'); let atyp, ab;
  if (ipv4) { atyp = 0x01; ab = new Uint8Array(host.split('.').map(Number)); }
  else if (isV6) { atyp = 0x04; ab = v6b(host.startsWith('[') ? host.slice(1, -1) : host); }
  else { atyp = 0x03; const hb = enc.encode(host); ab = new Uint8Array(1 + hb.byteLength); ab[0] = hb.byteLength; ab.set(hb, 1); }
  const req = new Uint8Array(4 + ab.byteLength + 2); req.set([0x05, 0x01, 0x00, atyp]); req.set(ab, 4); req[req.byteLength - 2] = (port >> 8) & 0xFF; req[req.byteLength - 1] = port & 0xFF;
  await w.write(req);
  const head = await rb.need(4); if (head[1] !== 0x00) throw new Error('socks5 connect failed ' + head[1]);
  const ratyp = head[3]; const alen = ratyp === 0x01 ? 4 : ratyp === 0x04 ? 16 : ratyp === 0x03 ? (await rb.need(1))[0] : 0;
  await rb.need(alen + 2); const leftover = rb.rest.slice(); w.releaseLock(); hr.releaseLock(); return leftover; };
// HTTP(S) CONNECT 隧道；https 模式下 sock 本身已是 TLS（见 chainConnect 的 secureTransport）
const doHttpConnect = async (sock, user, pass, host, port) => {
  const w = sock.writable.getWriter(), hr = sock.readable.getReader(), rb = mkRB(hr), enc = new TextEncoder(), dec = new TextDecoder();
  const hh = host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
  let req = `CONNECT ${hh}:${port} HTTP/1.1\r\nHost: ${hh}:${port}\r\nProxy-Connection: Keep-Alive\r\n`;
  if (user) req += `Proxy-Authorization: Basic ${btoa(`${user}:${pass}`)}\r\n`; req += '\r\n';
  await w.write(enc.encode(req));
  let head = new Uint8Array(0);
  for (;;) { const b = await rb.need(1); const n = new Uint8Array(head.byteLength + 1); n.set(head); n.set(b, head.byteLength); head = n; if (head.byteLength >= 4 && head[head.byteLength - 4] === 13 && head[head.byteLength - 3] === 10 && head[head.byteLength - 2] === 13 && head[head.byteLength - 1] === 10) break; if (head.byteLength > 8192) throw new Error('http proxy header too large'); }
  const statusLine = dec.decode(head).split('\r\n')[0]; if (!/\s2\d\d(\s|$)/.test(statusLine)) throw new Error('http proxy: ' + statusLine);
  const leftover = rb.rest.slice(); w.releaseLock(); hr.releaseLock(); return leftover; };
// 反代协议分发：socks5/http/https 走真实握手；turn/sstp 无法在纯 TCP relay 里做真实协议协商，按裸转发处理（同 PROXYIP 机制，非真协议实现）
const chainConnect = async (fetcher, chain, host, port) => {
  if (chain.proto === 'socks5') { const sock = await raceSprout(fetcher, chain.host, chain.port); const leftover = await doSocks5(sock, chain.user, chain.pass, host, port); return { sock, leftover }; }
  if (chain.proto === 'http' || chain.proto === 'https') { const sock = await raceSprout(fetcher, chain.host, chain.port, chain.proto === 'https' ? { secureTransport: 'on' } : undefined); const leftover = await doHttpConnect(sock, chain.user, chain.pass, host, port); return { sock, leftover }; }
  const sock = await raceSprout(fetcher, chain.host, chain.port); return { sock, leftover: null }; };
const ws = async (req, env) => {
  const _url = new URL(req.url);

  
  const pathToken = (env?.WS_PATH_TOKEN || 'token').trim().replace(/^\/+/, '');

  
  const pathSegments = _url.pathname.split('/').filter(Boolean);
  if (!pathSegments.length || pathSegments[0] !== pathToken) {
    return new Response('Forbidden', { status: 403 });
  }
  const [client, server] = Object.values(new WebSocketPair()); server.accept({ allowHalfOpen: true }); server.binaryType = 'arraybuffer'; const fetcher = req.fetcher;
  const edStr = req.headers.get('sec-websocket-protocol'); const _edMax = _url.searchParams.has('ed') ? (parseInt(_url.searchParams.get('ed')) || 0) : CFG.maxED; const ed = edStr && _edMax > 0 && edStr.length <= _edMax * 4 / 3 + 4 ? /** @type {*} */ (Uint8Array).fromBase64(edStr, { alphabet: 'base64url' }) : null; let curW = null, sock = null, closed = false, busy = false;
  const uq = mkQ(CFG.upPack);
  const wither = () => { if (closed) return; closed = true; uq.clear(); try { curW?.releaseLock(); } catch {} try { sock?.close(); } catch {} try { server.close(); } catch {} };
  const toU8 = d => d instanceof Uint8Array ? d : ArrayBuffer.isView(d) ? new Uint8Array(d.buffer, d.byteOffset, d.byteLength) : new Uint8Array(d);
  const sow = d => { const u = toU8(d), n = u.byteLength; if (!n) return 1; if (uq.sow(u)) return 1; wither(); return 0; };
  // 路径反代模式：/socks5=、/http=、/https=、/turn=、/sstp=（失败降级）或 xxx://（全局，不走直连）
  const _cm = _url.pathname.match(/\/(socks5|https|http|turn|sstp)(=|:\/\/)([^/?#]+)/i);
  const _defPort = { socks5: 1080, http: 80, https: 443, turn: 3478, sstp: 443 };
  const chain = _cm ? (t => ({ proto: _cm[1].toLowerCase(), global: _cm[2] === '://', ...t }))(pTarget(_cm[3], _defPort[_cm[1].toLowerCase()])) : null;
  // PROXYIP：路径 > env 变量 > 默认兜底域名；始终是「直连优先，失败降级」
  const _pathPxyRaw = chain ? '' : (_url.pathname.match(/\/proxyip=([^/?#]+)/i)?.[1] || '');
  const proxyList = (_pathPxyRaw || (env?.PROXYIP || '') || CFG.dproxy).trim().split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
  const pickProxy = () => { if (!proxyList.length) return null; const raw = proxyList[Math.floor(Math.random() * proxyList.length)]; if (raw.startsWith('[')) { const e = raw.indexOf(']'); if (e > 0) { const h = raw.slice(1, e), ps = raw.slice(e + 1), p = ps.startsWith(':') ? parseInt(ps.slice(1)) : NaN; return { h, p: p > 0 && p < 65536 ? p : null }; } } const i = raw.lastIndexOf(':'); if (i > 0) { const p = parseInt(raw.slice(i + 1)); if (p > 0 && p < 65536) return { h: raw.slice(0, i), p }; } return { h: raw, p: null }; };
  const thresh = async () => { if (busy || closed) return; busy = true; try { for (;;) {
    if (closed) break; if (!sock) { const [d] = uq.bundle(); if (!d) break; const r = relay(d); if (!r) throw wither(); if (r.isConnect) server.send(enc.encode('HTTP/1.1 200 Connection Established\r\n\r\n')); const host = r.host, port = r.port, payload = d.subarray(r.dataOffset); let leftover = null;
      if (chain) { if (chain.global) { const res = await chainConnect(fetcher, chain, host, port); sock = res.sock; leftover = res.leftover; } else { sock = await raceSprout(fetcher, host, port).catch(async () => { const res = await chainConnect(fetcher, chain, host, port); leftover = res.leftover; return res.sock; }); } }
      else { sock = await raceSprout(fetcher, host, port).catch(async () => { const pxy = pickProxy(); if (!pxy) throw new Error('direct failed'); return raceSprout(fetcher, pxy.h, pxy.p || port); }); }
      if (!sock) throw wither(); curW = sock.writable.getWriter(); if (leftover && leftover.byteLength) server.send(leftover); const [first] = uq.bundle(payload); first?.byteLength && await curW.write(first); mill(sock.readable, server).finally(() => wither()); continue; }
    const [d] = uq.bundle(); if (!d) break; await curW.write(d);
  } } catch { wither(); } finally { busy = false; !uq.empty && !closed && thresh(); } };
  if (ed && sow(ed)) thresh();
  server.addEventListener('message', e => { closed || (sow(e.data) && thresh()); });
  server.addEventListener('close', () => wither()); server.addEventListener('error', () => wither());
  return new Response(null, { status: 101, webSocket: client, headers: { 'Sec-WebSocket-Extensions': '' } }); };
