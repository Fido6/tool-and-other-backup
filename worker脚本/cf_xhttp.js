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
    // DoH 接口
    DOH_SERVER: 'https://dns.quad9.net/dns-query',
    // TCP DNS 兜底服务器 (Quad9)
    TCP_DNS: '9.9.9.9'
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

/**
 * 构建二进制 DNS A 记录查询包 (RFC 1035)
 */
function buildAQuery(hostname) {
    const header = new Uint8Array(12);
    header.set([0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const question = [];
    hostname.split('.').forEach(part => {
        question.push(part.length);
        for (let i = 0; i < part.length; i++) question.push(part.charCodeAt(i));
    });
    question.push(0x00, 0x00, 0x01, 0x00, 0x01);
    const full = new Uint8Array(header.length + question.length);
    full.set(header);
    full.set(question, header.length);
    return full;
}

/**
 * 从二进制响应中提取第一个 IPv4 地址
 */
function parseIP(buffer) {
    try {
        const view = new DataView(buffer.buffer);
        let offset = 12; // 跳过 Header
        while (view.getUint8(offset) !== 0) offset += view.getUint8(offset) + 1;
        offset += 5; // 跳过 Question 的 Type 和 Class
        // 寻找第一个 A 记录 (Type 1)
        for (let i = 0; i < 10; i++) { // 简单遍历前几个资源记录
            if (offset + 12 > buffer.length) break;
            const type = view.getUint16(offset + 2);
            const dataLen = view.getUint16(offset + 10);
            if (type === 1 && dataLen === 4) {
                const ip = [];
                for (let j = 0; j < 4; j++) ip.push(view.getUint8(offset + 12 + j));
                return ip.join('.');
            }
            offset += 12 + dataLen;
        }
    } catch (e) {}
    return null;
}

/**
 * 智能 DNS 解析：DoH -> TCP DNS -> 原域名
 */
async function resolveDNS(hostname, log) {
    if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname) || hostname.includes(':')) return hostname;

    const queryPacket = buildAQuery(hostname);

    // 1. 尝试标准二进制 DoH (RFC 8484)
    try {
        log.info(`DNS_DOH | Querying ${hostname}...`);
        const res = await fetch(SETTINGS.DOH_SERVER, {
            method: 'POST',
            headers: { 'content-type': 'application/dns-message' },
            body: queryPacket
        });
        if (res.ok) {
            const ip = parseIP(new Uint8Array(await res.arrayBuffer()));
            if (ip) { log.info(`DNS_DOH_OK | ${hostname} -> ${ip}`); return ip; }
        }
    } catch (e) { log.error(`DNS_DOH_FAIL | ${e.message}`); }

    // 2. 尝试 DNS over TCP 兜底
    try {
        log.info(`DNS_TCP | Falling back to TCP DNS (${SETTINGS.TCP_DNS})...`);
        const socket = connect({ hostname: SETTINGS.TCP_DNS, port: 53 });
        const writer = socket.writable.getWriter();
        const reader = socket.readable.getReader();

        // TCP DNS 需要 2 字节长度前缀
        const tcpPacket = new Uint8Array(queryPacket.length + 2);
        new DataView(tcpPacket.buffer).setUint16(0, queryPacket.length);
        tcpPacket.set(queryPacket, 2);

        await writer.write(tcpPacket);
        const { value, done } = await reader.read();
        writer.close();
        reader.releaseLock();

        if (!done && value.length > 14) {
            const ip = parseIP(value.slice(2)); // 跳过 2 字节长度前缀
            if (ip) { log.info(`DNS_TCP_OK | ${hostname} -> ${ip}`); return ip; }
        }
    } catch (e) { log.error(`DNS_TCP_FAIL | ${e.message}`); }

    log.error(`DNS_ALL_FAIL | Using default resolution for ${hostname}`);
    return hostname;
}

async function fetchOrigin(request, env) {
    const target = env.SITENAME || SETTINGS.DEFAULT_ORIGIN;
    const url = new URL(request.url);
    const options = { method: request.method, headers: request.headers, redirect: 'follow' };
    if (request.body && !request.bodyUsed) options.body = request.body;
    try {
        const res = await fetch(`https://${target}${url.pathname}${url.search}`, options);
        return new Response(res.body, res);
    } catch (e) { return new Response('Service Unavailable', { status: 503 }); }
}

class DataProcessor {
    static async processHeader(stream, secret) {
        const reader = stream.getReader({ mode: 'byob' });
        const keyArr = secret.replace(/-/g, '').match(/.{2}/g).map(byte => parseInt(byte, 16));
        let { value, done } = await reader.readAtLeast(24, new Uint8Array(SETTINGS.CHUNK_SIZE));
        if (done) throw new Error('DATA_SHORT');
        for (let i = 0; i < 16; i++) if (value[i+1] !== keyArr[i]) throw new Error('AUTH_FAIL');
        const oLen = value[17], p = (value[18 + oLen + 1] << 8) + value[18 + oLen + 2], at = value[18 + oLen + 3];
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
    const hostname = session.h;
    const isBlocked = SETTINGS.BLOCK_LIST.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    if (isBlocked) { log.error(`BLOCK | ${hostname} is blocked.`); throw new Error('BLOCKED'); }

    const resolvedHost = await resolveDNS(hostname, log);
    const tryConn = async (h) => { const c = connect({ hostname: h, port: session.p }); await c.opened; return c; };

    let conn, isGateway = false;
    try {
        conn = await tryConn(resolvedHost);
    } catch (e) {
        const msg = e.message.toLowerCase();
        if ((msg.includes('fetch') || msg.includes('orange')) && gateway) {
            log.info(`O2O Limit: ${hostname}. Retrying via Gateway: ${gateway}`);
            conn = await tryConn(gateway); isGateway = true;
        } else throw e;
    }

    log.info(`SYNC_OK | ${hostname}:${session.p} | ${isGateway ? 'VIA_GW' : 'DIRECT'}`);
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
        const isProxyPath = url.pathname === entryPath || url.pathname.startsWith(entryPath + '/');

        if (request.method !== 'POST' || !isProxyPath) return fetchOrigin(request, env);

        try {
            const gateway = (env.PROXY && env.PROXY.length > 0) ? env.PROXY : SETTINGS.DEFAULT_REP;
            const session = await DataProcessor.processHeader(request.body, env.UUID || SETTINGS.DEFAULT_KEY);
            trace.info(`AUTH_OK | IP: ${clientIP} | Target: ${session.h}:${session.p}`);
            const { stream, all } = await establish(session, trace, gateway);
            ctx.waitUntil(all.catch(e => {
                const m = e.message.toLowerCase();
                if (!(m.includes('closed') || m.includes('disconnected') || m.includes('reset') || m.includes('blocked'))) {
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
            if (err.message !== 'BLOCKED') trace.error(`AUTH_FAIL | IP: ${clientIP} | Reason: ${err.message}`);
            return fetchOrigin(request, env);
        }
    }
};