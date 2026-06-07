import { connect } from 'cloudflare:sockets';
/**
 * Media Stream Configuration,stream-one (HTTP CONNECT mode)
 */
const SETTINGS = {
    DEFAULT_ORIGIN: 'example.com',//反代example.com
    DEFAULT_ENTRY: '/path',
    DEFAULT_REP: 'sjc.o00o.ooo', //反代ip
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
    static async processHeader(request, trace) {
        const reader = request.body.getReader({ mode: 'byob' });

        // 读取数据
        let { value, done } = await reader.readAtLeast(8, new Uint8Array(SETTINGS.CHUNK_SIZE));
        if (done) throw new Error('DATA_SHORT');

        const textDecoder = new TextDecoder();
        const rawText = textDecoder.decode(value.slice(0, Math.min(256, value.length)));
        trace.info(`RAW_DATA | Length: ${value.length} | Text: ${rawText.replace(/\r?\n/g, '\\n')}`);

        // 解析 HTTP CONNECT 格式
        const text = textDecoder.decode(value);

        // 查找 HTTP 请求行结束符
        const headerEnd = text.indexOf('\r\n');
        if (headerEnd === -1) throw new Error('INVALID_HTTP_FORMAT');

        const requestLine = text.substring(0, headerEnd);
        trace.info(`REQUEST_LINE: ${requestLine}`);

        // 解析 CONNECT host:port HTTP/x.x
        const connectMatch = requestLine.match(/^CONNECT\s+([^\s:]+):(\d+)\s+HTTP/i);
        if (!connectMatch) throw new Error('NOT_CONNECT_METHOD');

        const host = connectMatch[1];
        const port = parseInt(connectMatch[2], 10);

        // 找到完整的 HTTP 头部结束位置（\r\n\r\n）
        const fullText = textDecoder.decode(value);
        const bodyStart = fullText.indexOf('\r\n\r\n');
        if (bodyStart === -1) throw new Error('HEADERS_INCOMPLETE');

        const headerSize = bodyStart + 4;
        trace.info(`PARSE | host: ${host} | port: ${port} | headerSize: ${headerSize}`);

        // 剩余数据作为缓存（CONNECT 头之后可能紧跟 TLS ClientHello 等数据）
        const cache = value.slice(headerSize);

        return { h: host, p: port, cache, reader };
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

    // 客户端 → 目标服务器
    const upstream = async () => {
        try {
            // 发送缓存数据（CONNECT 头之后的剩余数据）
            if (session.cache.length > 0) await writer.write(session.cache);
            // 继续读取客户端数据并转发
            while (true) {
                const { value, done } = await session.reader.read(new Uint8Array(SETTINGS.CHUNK_SIZE));
                if (value) await writer.write(value);
                if (done) break;
            }
        } catch (e) {} finally { try { await writer.close(); } catch (e) {} }
    };

    // TransformStream：将目标服务器的数据转发给客户端
    const ts = new TransformStream({
        transform(chunk, c) { c.enqueue(chunk); }
    }, { highWaterMark: SETTINGS.CHUNK_SIZE });

    // 目标服务器 → 客户端
    const downstream = conn.readable.pipeTo(ts.writable);

    // 合并 200 响应头和目标数据流
    const connectResponse = new TextEncoder().encode('HTTP/1.1 200 Connection Established\r\n\r\n');
    const responseStream = (async function* () {
        yield connectResponse;
        const reader = ts.readable.getReader();
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            yield value;
        }
    })();

    return { stream: responseStream, all: Promise.all([upstream(), downstream]) };
}

export default {
    async fetch(request, env, ctx) {
        const trace = new Trace(env.LOG_LEVEL || 'info');
        const url = new URL(request.url);
        const entryPath = env.PROXY_PATH || SETTINGS.DEFAULT_ENTRY;
        const clientIP = request.headers.get('cf-connecting-ip') || 'unknown';

        // --- 模糊路径匹配 ---
        const isProxyPath = url.pathname === entryPath || url.pathname.startsWith(entryPath + '/');

        if (request.method !== 'POST' || !isProxyPath) {
            return fetchOrigin(request, env);
        }

        try {
            const gateway = (env.PROXY && env.PROXY.length > 0) ? env.PROXY : SETTINGS.DEFAULT_REP;
            const session = await DataProcessor.processHeader(request, trace);

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
                    'Content-Type': 'application/vnd.ms-powerpoint',
                    'Cache-Control': 'no-store, no-cache',
                    'Connection': 'keep-alive',
                    'Transfer-Encoding': 'chunked'
                }
            });
        } catch (err) {
            trace.error(`AUTH_FAIL | IP: ${clientIP} | Path: ${url.pathname} | Reason: ${err.message}`, err.stack);
            return fetchOrigin(request, env);
        }
    }
};
