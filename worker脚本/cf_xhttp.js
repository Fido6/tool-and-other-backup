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
    write(prefix, ...args) {
        if (this.level === 'none') return;
        const ts = new Date().toISOString();
        console.log(`${ts} [${prefix}] (${this.id}):`, ...args);
    }
    debug(...args) { if (this.level === 'debug') this.write('DBUG', ...args); }
    info(...args) { if (['debug', 'info'].includes(this.level)) this.write('INFO', ...args); }
    error(...args) { if (['debug', 'info', 'error'].includes(this.level)) this.write('ERR ', ...args); }
}

async function fetchOrigin(request, env) {
    const target = env.SITENAME || SETTINGS.DEFAULT_ORIGIN;
    const url = new URL(request.url);
    const fetchOptions = {
        method: request.method,
        headers: request.headers,
        redirect: 'follow'
    };
    if (request.body && !request.bodyUsed) {
        fetchOptions.body = request.body;
    }
    try {
        const res = await fetch(`https://${target}${url.pathname}${url.search}`, fetchOptions);
        return new Response(res.body, res);
    } catch (e) {
        return new Response('Service Unavailable', { status: 503 });
    }
}

class DataProcessor {
    static decodeKey(key) {
        const raw = key.replace(/-/g, '');
        const out = [];
        for (let i = 0; i < 16; i++) out.push(parseInt(raw.substr(i * 2, 2), 16));
        return out;
    }
    static verify(input, target) {
        for (let i = 0; i < 16; i++) if (input[i] !== target[i]) return false;
        return true;
    }
    static async processHeader(stream, secret, log) {
        const reader = stream.getReader({ mode: 'byob' });
        const keyArr = this.decodeKey(secret);
        let { value, done } = await reader.readAtLeast(24, new Uint8Array(SETTINGS.CHUNK_SIZE));
        if (done) throw new Error('DATA_SHORT');
        const ver = value[0];
        const sid = value.slice(1, 17);
        if (!this.verify(sid, keyArr)) throw new Error('AUTH_INVALID_KEY');
        const oLen = value[17];
        const cmd = value[18 + oLen];
        if (cmd !== 1 && cmd !== 2) throw new Error(`CMD_UNSUPPORTED_${cmd}`);
        const p = (value[18 + oLen + 1] << 8) + value[18 + oLen + 2];
        const at = value[18 + oLen + 3];
        let host = '';
        let offset = 18 + oLen + 4;
        if (at === 1) {
            host = value.slice(offset, offset + 4).join('.');
            offset += 4;
        } else if (at === 2) {
            const domainLen = value[offset];
            offset += 1;
            if (value.length < offset + domainLen) {
                const remain = offset + domainLen - value.length;
                const { value: nextValue, done: nextDone } = await reader.readAtLeast(remain, new Uint8Array(remain));
                if (nextDone) throw new Error('DOMAIN_INCOMPLETE');
                const combined = new Uint8Array(value.length + nextValue.length);
                combined.set(value);
                combined.set(nextValue, value.length);
                value = combined;
            }
            host = new TextDecoder().decode(value.slice(offset, offset + domainLen));
            offset += domainLen;
        } else if (at === 3) {
            if (value.length < offset + 16) {
                const remain = offset + 16 - value.length;
                const { value: nextValue, done: nextDone } = await reader.readAtLeast(remain, new Uint8Array(remain));
                if (nextDone) throw new Error('IPV6_INCOMPLETE');
                const combined = new Uint8Array(value.length + nextValue.length);
                combined.set(value);
                combined.set(nextValue, value.length);
                value = combined;
            }
            host = value.slice(offset, offset + 16).reduce((s, b, i, a) => (i % 2 ? s.concat(((a[i - 1] << 8) + b).toString(16)) : s), []).join(':');
            offset += 16;
        }
        if (cmd === 2) log.info(`UDP_REQ | Target: ${host}:${p}`);
        return { h: host, p: p, v: ver, cache: value.slice(offset), reader };
    }
}

/**
 * Core Transport Engine (Enhanced with O2O Fallback)
 */
async function establish(session, log, gateway) {
    const directHost = session.h;
    const remotePort = session.p;

    let conn;
    let usedGateway = false;

    const tryConnect = async (host) => {
        const c = connect({ hostname: host, port: remotePort });
        await c.opened;
        return c;
    };

    try {
        // 1. 优先尝试直连
        conn = await tryConnect(directHost);
    } catch (e) {
        const errorMsg = e.message.toLowerCase();
        const isO2OError = errorMsg.includes('fetch') || errorMsg.includes('orange-to-orange');

        // 关键修复：确保 gateway 确实有值（非空字符串）
        if (isO2OError && gateway && gateway.length > 0) {
            log.info(`O2O Limit for ${directHost}. Retrying via Gateway: ${gateway}`);
            try {
                conn = await tryConnect(gateway);
                usedGateway = true;
            } catch (ge) {
                throw new Error(`Gateway [${gateway}] failed: ${ge.message}`);
            }
        } else if (isO2OError) {
            // 如果走到这里，说明 gateway 为空
            log.error(`!!! O2O LIMIT !!! Target ${directHost} is on Cloudflare. No PROXY set.`);
            throw e;
        } else {
            throw e;
        }
    }

    log.info(`SYNC_OK | Target: ${directHost}:${remotePort} | ${usedGateway ? 'VIA_GATEWAY' : 'DIRECT'}`);

    const writer = conn.writable.getWriter();
    const upstream = async () => {
        try {
            if (session.cache.length > 0) await writer.write(session.cache);
            let finished = false;
            while (!finished) {
                const { value, done } = await session.reader.read(new Uint8Array(SETTINGS.CHUNK_SIZE));
                if (value) await writer.write(value);
                finished = done;
            }
        } catch (e) { } finally {
            try { await writer.close(); } catch (e) { }
        }
    };

    const ts = new TransformStream({
        start(c) { c.enqueue(new Uint8Array([session.v, 0])); },
        transform(chunk, c) { c.enqueue(chunk); }
    }, { highWaterMark: SETTINGS.CHUNK_SIZE });

    const downstream = conn.readable.pipeTo(ts.writable);

    return { stream: ts.readable, all: Promise.all([upstream(), downstream]) };
}

export default {
    async fetch(request, env, ctx) {
        const trace = new Trace(env.LOG_LEVEL || 'info');
        const url = new URL(request.url);
        const entryPath = env.PROXY_PATH || SETTINGS.DEFAULT_ENTRY;
        const accessKey = env.UUID || SETTINGS.DEFAULT_KEY;
        // 修正点：确保即使 env.PROXY 是空字符串，也能取到 DEFAULT_REP
        const gateway = (env.PROXY && env.PROXY.length > 0) ? env.PROXY : SETTINGS.DEFAULT_REP;
        const clientIP = request.headers.get('cf-connecting-ip') || 'unknown';
        const isProxyPath = url.pathname === entryPath || url.pathname.startsWith(entryPath + '/');

        if (request.method !== 'POST' || !isProxyPath) {
            return fetchOrigin(request, env);
        }

        try {
            const session = await DataProcessor.processHeader(request.body, accessKey, trace);
            trace.info(`AUTH_OK | Client: ${clientIP} | Target: ${session.h}:${session.p}`);
            const { stream, all } = await establish(session, trace, gateway);

            ctx.waitUntil(all.catch(e => {
                const msg = e.message.toLowerCase();
                // 屏蔽掉所有正常的连接关闭日志
                if (msg.includes('disconnected') || msg.includes('closed') || msg.includes('reset')) {
                    return;
                }
                trace.error(`TRANS_ERR | Client: ${clientIP} | Msg: ${e.message}`);
            }));

            return new Response(stream, {
                status: 200,
                headers: {
                    'Content-Type': 'video/mp4',
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Connection': 'keep-alive',
                    'Transfer-Encoding': 'chunked'
                }
            });
        } catch (err) {
            trace.error(`AUTH_FAIL | Client: ${clientIP} | Reason: ${err.message}`);
            return fetchOrigin(request, env);
        }
    }
};