import { connect } from 'cloudflare:sockets';

// ─── Protocol Constants & Utilities (from Turn.js) ───

const MAGIC = new Uint8Array([0x21, 0x12, 0xA4, 0x42]);
const MT = { AQ: 0x003, AO: 0x103, AE: 0x113, PQ: 0x008, PO: 0x108, CQ: 0x00A, CO: 0x10A, BQ: 0x00B, BO: 0x10B };
const AT = { USER: 0x006, MI: 0x008, ERR: 0x009, PEER: 0x012, REALM: 0x014, NONCE: 0x015, TRANSPORT: 0x019, CONNID: 0x02A };
const dec = new TextDecoder(), enc = s => new TextEncoder().encode(s);

const cat = (...a) => { const r = new Uint8Array(a.reduce((s, x) => s + x.length, 0)); a.reduce((o, x) => (r.set(x, o), o + x.length), 0); return r; };
const stunAttr = (t, v) => { const b = new Uint8Array(4 + v.length + (4 - v.length % 4) % 4), d = new DataView(b.buffer); d.setUint16(0, t); d.setUint16(2, v.length); b.set(v, 4); return b; };
const stunMsg = (t, tid, a) => { const bd = cat(...a), h = new Uint8Array(20), d = new DataView(h.buffer); d.setUint16(0, t); d.setUint16(2, bd.length); h.set(MAGIC, 4); h.set(tid, 8); return cat(h, bd); };
const xorPeer = (ip, port) => { const b = new Uint8Array(8); b[1] = 1; new DataView(b.buffer).setUint16(2, port ^ 0x2112); ip.split('.').forEach((v, i) => b[4 + i] = +v ^ MAGIC[i]); return b; };

const parseStun = d => {
  if (d.length < 20 || MAGIC.some((v, i) => d[4 + i] !== v)) return null;
  const dv = new DataView(d.buffer, d.byteOffset, d.byteLength), ml = dv.getUint16(2), attrs = {};
  for (let o = 20; o + 4 <= 20 + ml;) { const t = dv.getUint16(o), l = dv.getUint16(o + 2); if (o + 4 + l > d.length) break; attrs[t] = d.slice(o + 4, o + 4 + l); o += 4 + l + (4 - l % 4) % 4; }
  return { type: dv.getUint16(0), attrs };
};

const parseErr = d => d?.length >= 4 ? (d[2] & 7) * 100 + d[3] : 0;

const addIntegrity = async (m, key) => {
  const c = new Uint8Array(m), d = new DataView(c.buffer);
  d.setUint16(2, d.getUint16(2) + 24);
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  return cat(c, stunAttr(AT.MI, new Uint8Array(await crypto.subtle.sign('HMAC', k, c))));
};

const readStun = async (rd, buf) => {
  let b = buf ?? new Uint8Array(0);
  const pull = async () => { const { done, value } = await rd.read(); if (done) throw 0; b = cat(b, new Uint8Array(value)); };
  try {
    while (b.length < 20) await pull();
    const n = 20 + (b[2] << 8 | b[3]);
    while (b.length < n) await pull();
    return [parseStun(b.subarray(0, n)), b.length > n ? b.subarray(n) : null];
  } catch { return [null, null]; }
};

const md5 = async s => new Uint8Array(await crypto.subtle.digest('MD5', enc(s)));
const resolveIP = async h => /^\d+\.\d+\.\d+\.\d+$/.test(h) ? h : (await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(h)}&type=A`, { headers: { Accept: 'application/dns-json' } }).then(r => r.json()).catch(() => ({}))).Answer?.find(a => a.type === 1)?.data ?? null;

// ─── URL Parser ───

const parseTurnUrl = url => {
  let s = decodeURIComponent(url.trim()).replace(/^turn:\/\//i, '');
  const at = s.lastIndexOf('@');
  let user = '', pass = '';
  if (at >= 0) {
    const cred = s.slice(0, at);
    s = s.slice(at + 1);
    const ci = cred.indexOf(':');
    user = ci >= 0 ? cred.slice(0, ci) : cred;
    pass = ci >= 0 ? cred.slice(ci + 1) : '';
  }
  const lc = s.lastIndexOf(':');
  if (lc < 0) return null;
  const host = s.slice(0, lc), port = parseInt(s.slice(lc + 1));
  return host && port ? { host, port, user, pass } : null;
};

// ─── TURN Check Function ───

const checkTurn = async (server, targetIp, targetPort, timeout) => {
  const start = Date.now();
  const result = { server, ok: false, step: '', error: '', latency: 0 };
  const parsed = parseTurnUrl(server);
  if (!parsed) { result.error = 'Invalid URL'; return result; }

  const { host, port, user, pass } = parsed;
  let ctrl = null, data = null;
  const close = () => [ctrl, data].forEach(s => { try { s?.close(); } catch {} });

  const task = (async () => {
        // Step 1: TCP connect
        result.step = 'tcp-connect';
        ctrl = connect({ hostname: host, port });
        await ctrl.opened;

        const cw = ctrl.writable.getWriter(), cr = ctrl.readable.getReader();
        const tid = () => crypto.getRandomValues(new Uint8Array(12));
        const tp = new Uint8Array([6, 0, 0, 0]);

        // Step 2: Allocate (no auth)
        result.step = 'allocate-request';
        await cw.write(stunMsg(MT.AQ, tid(), [stunAttr(AT.TRANSPORT, tp)]));
        let [r, ex] = await readStun(cr);
        if (!r) throw new Error('No response');

        let key = null, aa = [];
        const sign = m => key ? addIntegrity(m, key) : m;
        const peer = stunAttr(AT.PEER, xorPeer(targetIp, targetPort));

        if (r.type === MT.AE && user && parseErr(r.attrs[AT.ERR]) === 401) {
          // Step 3: Auth challenge → compute credentials
          result.step = 'auth';
          const realm = dec.decode(r.attrs[AT.REALM] ?? new Uint8Array(0));
          const nonce = r.attrs[AT.NONCE] ?? new Uint8Array(0);
          key = await md5(user + ':' + realm + ':' + pass);
          aa = [stunAttr(AT.USER, enc(user)), stunAttr(AT.REALM, enc(realm)), stunAttr(AT.NONCE, nonce)];

          // Step 4: Re-send Allocate + Permission + Connect with auth
          result.step = 'allocate-auth';
          const [am, pm, cm] = await Promise.all([
            sign(stunMsg(MT.AQ, tid(), [stunAttr(AT.TRANSPORT, tp), ...aa])),
            sign(stunMsg(MT.PQ, tid(), [peer, ...aa])),
            sign(stunMsg(MT.CQ, tid(), [peer, ...aa]))
          ]);
          await cw.write(cat(am, pm, cm));
          data = connect({ hostname: host, port });

          [r, ex] = await readStun(cr, ex);
          if (r?.type !== MT.AO) throw new Error('Allocate failed (0x' + (r?.type ?? 0).toString(16) + ')');
        } else if (r.type === MT.AO) {
          // No auth needed
          const [pm, cm] = await Promise.all([
            sign(stunMsg(MT.PQ, tid(), [peer, ...aa])),
            sign(stunMsg(MT.CQ, tid(), [peer, ...aa]))
          ]);
          await cw.write(cat(pm, cm));
          data = connect({ hostname: host, port });
        } else {
          throw new Error('Unexpected (0x' + r.type.toString(16) + ')');
        }

        // Step 5: Allocate success
        result.step = 'allocate-ok';

        // Step 6: Permission
        [r, ex] = await readStun(cr, ex);
        if (r?.type !== MT.PO) throw new Error('Permission failed (0x' + (r?.type ?? 0).toString(16) + ')');
        result.step = 'permission-ok';

        // Step 7: Connect
        [r, ex] = await readStun(cr, ex);
        if (r?.type !== MT.CO || !r.attrs[AT.CONNID]) throw new Error('Connect failed (0x' + (r?.type ?? 0).toString(16) + ')');
        result.step = 'connect-ok';

        // Step 8: ConnectionBind
        await data.opened;
        const dw = data.writable.getWriter(), dr = data.readable.getReader();
        await dw.write(await sign(stunMsg(MT.BQ, tid(), [stunAttr(AT.CONNID, r.attrs[AT.CONNID]), ...aa])));
        const [br, httpExtra] = await readStun(dr);
        if (br?.type !== MT.BO) throw new Error('Bind failed (0x' + (br?.type ?? 0).toString(16) + ')');

        result.step = 'bind-ok';
        result.ok = true;

        // Step 9: Detect exit IP through TURN relay
        try {
          result.step = 'ip-detect';
          await dw.write(enc('GET /json?fields=status,query,country,countryCode,city,isp,org,as,proxy,hosting HTTP/1.1\r\nHost: ip-api.com\r\nConnection: close\r\n\r\n'));
          let buf = httpExtra ? dec.decode(httpExtra) : '';
          for (let i = 0; i < 10; i++) {
            const { done: eof, value: chunk } = await dr.read();
            if (eof) break;
            buf += dec.decode(new Uint8Array(chunk), { stream: true });
            const hi = buf.indexOf('\r\n\r\n');
            if (hi < 0) continue;
            try {
              const info = JSON.parse(buf.slice(hi + 4));
              if (info.status === 'success') {
                result.exitIp = info.query;
                result.geo = (info.country || '') + (info.city ? ', ' + info.city : '');
                result.isp = info.isp || info.org || '';
                result.risk = info.proxy ? 'High' : info.hosting ? 'Medium' : 'Low';
              }
              break;
            } catch { /* JSON incomplete, keep reading */ }
          }
        } catch { /* IP detection failed, TURN still ok */ }
      })();

  try {
    await Promise.race([
      new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout')), timeout)),
      task
    ]);
  } catch (e) {
    result.error = e.message || String(e);
  } finally {
    close();
    task.catch(() => {}); // suppress unhandled rejection if timeout won the race
    result.latency = Date.now() - start;
  }
  return result;
};

// ─── Worker Entry ───

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
    if (req.method === 'POST' && url.pathname === '/check') return handleCheck(req, ctx);
    return new Response(HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
};

// ─── SSE Check Handler ───

const handleCheck = async (req, ctx) => {
  const body = await req.json();
  const servers = body.servers || [];
  const timeoutSec = body.timeout || 10;
  const targetIp = await resolveIP('ip-api.com');
  if (!targetIp) {
    return new Response(JSON.stringify({ error: 'Cannot resolve ip-api.com' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }
  const targetPort = 80;
  const timeoutMs = timeoutSec * 1000;
  const maxConcurrency = 5;

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const te = new TextEncoder();
  const send = async data => writer.write(te.encode('data: ' + JSON.stringify(data) + '\n\n'));

  const work = async () => {
    let active = 0;
    const queue = [];
    const acquire = () => active < maxConcurrency ? (active++, Promise.resolve()) : new Promise(r => queue.push(r));
    const release = () => { active--; queue.length ? (active++, queue.shift()()) : null; };

    const tasks = servers.map(async (server, index) => {
      await acquire();
      try {
        await send({ index, status: 'checking' });
        const result = await checkTurn(server, targetIp, targetPort, timeoutMs);
        result.index = index;
        await send(result);
      } catch (e) {
        await send({ index, server, ok: false, step: '', error: e.message, latency: 0 });
      } finally {
        release();
      }
    });

    await Promise.all(tasks);
    try { await send({ done: true }); } catch {}
    try { await writer.close(); } catch {}
  };

  ctx.waitUntil(work());

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
  });
};

// ─── HTML Frontend ───

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TURN Server Checker</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f7fa;color:#333;padding:20px;max-width:1200px;margin:0 auto}
h1{font-size:1.5rem;margin-bottom:16px;color:#1a1a2e}
.card{background:#fff;border-radius:8px;padding:20px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
label{display:block;font-weight:600;margin-bottom:6px;font-size:.9rem}
textarea{width:100%;height:150px;border:1px solid #ddd;border-radius:6px;padding:10px;font-family:monospace;font-size:13px;resize:vertical}
textarea:focus,input:focus{outline:none;border-color:#4361ee}
.row{display:flex;gap:12px;margin-top:12px;align-items:flex-end}
.row .field{flex:1}
.row .field input{width:100%;border:1px solid #ddd;border-radius:6px;padding:8px 10px;font-size:14px}
.btns{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap}
button{padding:8px 20px;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-weight:600;transition:opacity .2s}
button:hover{opacity:.85}
button:disabled{opacity:.5;cursor:not-allowed}
.btn-primary{background:#4361ee;color:#fff}
.btn-danger{background:#e63946;color:#fff}
.btn-success{background:#2a9d8f;color:#fff}
.btn-outline{background:#fff;color:#333;border:1px solid #ddd}
.progress{font-size:14px;color:#666;margin-bottom:12px}
.stats span{font-weight:600}
.pass{color:#2a9d8f}
.fail{color:#e63946}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:10px 8px;border-bottom:2px solid #eee;font-weight:600;color:#666;white-space:nowrap}
td{padding:8px;border-bottom:1px solid #f0f0f0;word-break:break-all}
tr:hover{background:#f8f9fa}
.st{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600}
.st-ok{background:#d4edda;color:#155724}
.st-fail{background:#f8d7da;color:#721c24}
.st-wait{background:#e2e3e5;color:#6c757d}
.st-run{background:#fff3cd;color:#856404}
.rk{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600}
.rk-low{background:#d4edda;color:#155724}
.rk-med{background:#fff3cd;color:#856404}
.rk-high{background:#f8d7da;color:#721c24}
.mono{font-family:monospace;font-size:12px}
.empty{text-align:center;padding:40px;color:#999}
</style>
</head>
<body>
<h1>TURN Server Checker</h1>
<div class="card">
  <label>TURN 服务器列表（每行一个）</label>
  <textarea id="servers" placeholder="host:port&#10;username:password@host:port"></textarea>
  <div class="row">
    <div class="field"><label>超时（秒）</label><input id="timeout" type="number" value="10" min="3" max="30"></div>
  </div>
  <div class="btns">
    <button id="btnStart" class="btn-primary" onclick="start()">开始校验</button>
    <button id="btnStop" class="btn-danger" onclick="stop()" disabled>停止</button>
    <button id="btnExport" class="btn-outline" onclick="exp()" disabled>导出 CSV</button>
    <button id="btnCopy" class="btn-success" onclick="copy()" disabled>复制可用</button>
  </div>
</div>
<div class="card">
  <div class="progress" id="prog" style="display:none">
    进度: <span id="pD">0</span>/<span id="pT">0</span>
    &nbsp;|&nbsp; <span class="pass">通过: <span id="pP">0</span></span>
    &nbsp;|&nbsp; <span class="fail">失败: <span id="pF">0</span></span>
  </div>
  <div id="tableWrap" style="display:none;overflow-x:auto">
    <table><thead><tr><th>#</th><th>服务器</th><th>状态</th><th>出口IP</th><th>归属地</th><th>风险</th><th>耗时</th><th>错误</th></tr></thead><tbody id="tb"></tbody></table>
  </div>
  <div id="empty" class="empty">输入 TURN 服务器列表后点击「开始校验」</div>
</div>
<script>
var ac=null,results=[];
function esc(s){var d=document.createElement('div');d.textContent=s||'';return d.innerHTML}
function start(){
  var text=document.getElementById('servers').value.trim();
  if(!text)return alert('请输入服务器列表');
  var svrs=text.split('\\n').map(function(s){return s.trim()}).filter(Boolean);
  if(!svrs.length)return alert('请输入服务器列表');
  var timeout=parseInt(document.getElementById('timeout').value)||10;
  results=[];
  var tb=document.getElementById('tb');
  tb.innerHTML='';
  document.getElementById('tableWrap').style.display='';
  document.getElementById('empty').style.display='none';
  document.getElementById('prog').style.display='';
  document.getElementById('pD').textContent='0';
  document.getElementById('pT').textContent=svrs.length;
  document.getElementById('pP').textContent='0';
  document.getElementById('pF').textContent='0';
  for(var i=0;i<svrs.length;i++){
    var tr=document.createElement('tr');
    tr.id='r'+i;
    tr.innerHTML='<td>'+(i+1)+'</td><td class="mono">'+esc(svrs[i])+'</td><td><span class="st st-wait">等待中</span></td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>';
    tb.appendChild(tr);
  }
  document.getElementById('btnStart').disabled=true;
  document.getElementById('btnStop').disabled=false;
  document.getElementById('btnExport').disabled=true;
  document.getElementById('btnCopy').disabled=true;
  ac=new AbortController();
  var done=0,pass=0,fail=0;
  fetch('/check',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({servers:svrs,timeout:timeout}),
    signal:ac.signal
  }).then(function(res){
    if(!res.ok)return res.json().then(function(j){alert(j.error||'Request failed')});
    var reader=res.body.getReader();
    var decoder=new TextDecoder();
    var buf='';
    function pump(){
      return reader.read().then(function(r){
        if(r.done)return;
        buf+=decoder.decode(r.value,{stream:true});
        var parts=buf.split('\\n\\n');
        buf=parts.pop();
        for(var i=0;i<parts.length;i++){
          var lines=parts[i].split('\\n');
          for(var j=0;j<lines.length;j++){
            if(lines[j].indexOf('data: ')!==0)continue;
            var d=JSON.parse(lines[j].slice(6));
            if(d.done)continue;
            if(d.status==='checking'){
              var tr=document.getElementById('r'+d.index);
              if(tr)tr.cells[2].innerHTML='<span class="st st-run">检测中</span>';
              continue;
            }
            results.push(d);
            done++;
            if(d.ok)pass++;else fail++;
            document.getElementById('pD').textContent=done;
            document.getElementById('pP').textContent=pass;
            document.getElementById('pF').textContent=fail;
            var tr=document.getElementById('r'+d.index);
            if(tr){
              var cls=d.ok?'st-ok':'st-fail';
              var lb=d.ok?'通过':'失败';
              var rk=d.risk||'';
              var rkCls=rk==='Low'?'rk-low':rk==='Medium'?'rk-med':rk==='High'?'rk-high':'';
              var rkLb=rk==='Low'?'低':rk==='Medium'?'中':rk==='High'?'高':'';
              tr.innerHTML='<td>'+(d.index+1)+'</td><td class="mono">'+esc(d.server)+'</td><td><span class="st '+cls+'">'+lb+'</span></td><td class="mono">'+esc(d.exitIp||'')+'</td><td>'+esc(d.geo||'')+'</td><td>'+(rkLb?'<span class="rk '+rkCls+'">'+rkLb+'</span>':'')+'</td><td>'+d.latency+'ms</td><td class="mono">'+esc(d.error||d.step||'')+'</td>';
            }
          }
        }
        return pump();
      });
    }
    return pump();
  }).catch(function(e){
    if(e.name!=='AbortError')console.error(e);
  }).finally(function(){
    document.getElementById('btnStart').disabled=false;
    document.getElementById('btnStop').disabled=true;
    document.getElementById('btnExport').disabled=false;
    document.getElementById('btnCopy').disabled=false;
    ac=null;
  });
}
function stop(){if(ac)ac.abort()}
function exp(){
  if(!results.length)return;
  var csv='Server,OK,ExitIP,Geo,ISP,Risk,Latency(ms),Error\\n';
  for(var i=0;i<results.length;i++){
    var r=results[i];
    csv+='"'+r.server+'",'+r.ok+',"'+(r.exitIp||'')+'","'+(r.geo||'')+'","'+(r.isp||'')+'","'+(r.risk||'')+'",'+r.latency+',"'+(r.error||'').replace(/"/g,'""')+'"\\n';
  }
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download='turn-check-results.csv';
  a.click();
}
function copy(){
  var ok=[];
  for(var i=0;i<results.length;i++)if(results[i].ok)ok.push(results[i].server);
  if(!ok.length)return alert('没有可用的服务器');
  navigator.clipboard.writeText(ok.join('\\n')).then(function(){alert('已复制 '+ok.length+' 个可用服务器')});
}
</script>
</body>
</html>`;
