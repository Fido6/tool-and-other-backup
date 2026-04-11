import { connect } from 'cloudflare:sockets';
/**
 * Media Stream Configuration,stream-one
 */
const SETTINGS = {
    DEFAULT_KEY: '00000000-8888-8888-8888-000000000000',//UUID 
    DEFAULT_ORIGIN: 'example.com',//反代example.com
    DEFAULT_ENTRY: '/path',
    DEFAULT_REP: '', //反代ip
    CHUNK_SIZE: 16 * 1024,
};

class Trace {
    constructor(level = 'info') {
        this.level = level;
        this.id = Math.floor(Math.random() * 90000) + 10000;
    }
    log(prefix, ...args) {
        if (this.level === 'none') return;
        console.log(`${new Date().toISOString()} [${prefix}] (${this.id}):`, ...args);
    }
    info(...args) { if (['debug', 'info'].includes(this.level)) this.log('INFO', ...args); }
    error(...args) { if (['debug', 'info', 'error'].includes(this.level)) this.log('ERR ', ...args); }
}

async function fetchOrigin(request, env) {
    const target = env.SITENAME || SETTINGS.DEFAULT_ORIGIN;
    const url = new URL(request.url);
    const options = { method: request.method, headers: request.headers, redirect: 'follow' };
    if (request.body && !request.bodyUsed) options.body = request.body;
    try {
        const res = await fetch(`https://${target}${url.pathname}${url.search}`, options);
        return new Response(res.body, res);
    } catch (e) {
        return new Response('Service Unavailable', { status: 503 });
    }
}

class DataProcessor {
    static async processHeader(stream, secret) {
        const reader = stream.getReader({ mode: 'byob' });
        const keyArr = secret.replace(/-/g, '').match(/.{2}/g).map(byte => parseInt(byte, 16));
        
        let { value, done } = await reader.readAtLeast(24, new Uint8Array(SETTINGS.CHUNK_SIZE));
        if (done) throw new Error('DATA_SHORT');

        // UUID 校验 (Version 在 value[0], UUID 在 1-17)
        for (let i = 0; i < 16; i++) if (value[i+1] !== keyArr[i]) throw new Error('AUTH_FAIL');

        const oLen = value[17];
        const p = (value[18 + oLen + 1] << 8) + value[18 + oLen + 2];
        const at = value[18 + oLen + 3];
        let host = '', offset = 18 + oLen + 4;

        if (at === 1) { host = value.slice(offset, offset + 4).join('.'); offset += 4; }
        else if (at === 2) {
            const l = value[offset++];
            if (value.length < offset + l) {
                const { value: nV, done: nD } = await reader.readAtLeast(offset + l - value.length, new Uint8Array(offset + l - value.length));
                if (nD) throw new Error('DOMAIN_INC');
                const c = new Uint8Array(value.length + nV.length); c.set(value); c.set(nV, value.length); value = c;
            }
            host = new TextDecoder().decode(value.slice(offset, offset + l)); offset += l;
        } else if (at === 3) {
            host = value.slice(offset, offset + 16).reduce((s, b, i, a) => (i % 2 ? s.concat(((a[i - 1] << 8) + b).toString(16)) : s), []).join(':'); offset += 16;
        }

        return { h: host, p: p, v: value[0], cache: value.slice(offset), reader };
    }
}

async function establish(session, log, gateway) {
    const directHost = session.h;
    const tryConn = async (h) => { const c = connect({ hostname: h, port: session.p }); await c.opened; return c; };

    let conn, isGateway = false;
    try {
        conn = await tryConn(directHost);
    } catch (e) {
        const msg = e.message.toLowerCase();
        if ((msg.includes('fetch') || msg.includes('orange')) && gateway) {
            log.info(`O2O Limit: ${directHost}. Retrying via Gateway: ${gateway}`);
            conn = await tryConn(gateway);
            isGateway = true;
        } else throw e;
    }

    log.info(`SYNC_OK | ${directHost}:${session.p} | ${isGateway ? 'VIA_GW' : 'DIRECT'}`);

    const writer = conn.writable.getWriter();
    const upstream = async () => {
        try {
            if (session.cache.length > 0) await writer.write(session.cache);
            while (true) {
                const { value, done } = await session.reader.read(new Uint8Array(SETTINGS.CHUNK_SIZE));
                if (value) await writer.write(value);
                if (done) break;
            }
        } catch (e) {} finally { try { await writer.close(); } catch (e) {} }
    };

    const ts = new TransformStream({
        start(c) { c.enqueue(new Uint8Array([session.v, 0])); },
        transform(chunk, c) { c.enqueue(chunk); }
    }, { highWaterMark: SETTINGS.CHUNK_SIZE });

    return { stream: ts.readable, all: Promise.all([upstream(), conn.readable.pipeTo(ts.writable)]) };
}

export default {
    async fetch(request, env, ctx) {
        const trace = new Trace(env.LOG_LEVEL || 'info');
        const url = new URL(request.url);
        const entryPath = env.PROXY_PATH || SETTINGS.DEFAULT_ENTRY;
        const clientIP = request.headers.get('cf-connecting-ip') || 'unknown';
        
        // --- 修复点：恢复模糊路径匹配 ---
        const isProxyPath = url.pathname === entryPath || url.pathname.startsWith(entryPath + '/');

        if (request.method !== 'POST' || !isProxyPath) {
            return fetchOrigin(request, env);
        }

        try {
            const gateway = (env.PROXY && env.PROXY.length > 0) ? env.PROXY : SETTINGS.DEFAULT_REP;
            const session = await DataProcessor.processHeader(request.body, env.UUID || SETTINGS.DEFAULT_KEY);
            
            trace.info(`AUTH_OK | IP: ${clientIP} | Target: ${session.h}:${session.p}`);
            
            const { stream, all } = await establish(session, trace, gateway);
            
            ctx.waitUntil(all.catch(e => {
                const m = e.message.toLowerCase();
                if (!(m.includes('closed') || m.includes('disconnected') || m.includes('reset'))) {
                    trace.error(`TRANS_ERR | IP: ${clientIP} | Msg: ${e.message}`);
                }
            }));

            return new Response(stream, {
                status: 200,
                headers: {
                    'Content-Type': 'video/mp4',
                    'Cache-Control': 'no-store, no-cache',
                    'Connection': 'keep-alive',
                    'Transfer-Encoding': 'chunked'
                }
            });
        } catch (err) {
            trace.error(`AUTH_FAIL | IP: ${clientIP} | Path: ${url.pathname} | Reason: ${err.message}`);
            return fetchOrigin(request, env);
        }
    }
};