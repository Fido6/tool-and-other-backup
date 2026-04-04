import { connect } from 'cloudflare:sockets';

// --- 核心配置 ---
let 驿站鸿雁 = 'sg.wogg.us.kg';
let 云中锦书 = 'x888x888-8888-8888-8888-x888x888x888';
let 幽径 = 'mysssub'; 

function 举杯停箸(socket) {
    try { 
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CLOSING) {
            socket.close(); 
        }
    } catch (error) {} 
}

function 锦瑟无端(b64Str) {
    if (!b64Str) return { error: null };
    try { 
        const binaryString = atob(b64Str.replace(/-/g, '+').replace(/_/g, '/'));
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return { earlyData: bytes.buffer, error: null }; 
    } catch (error) { 
        return { error }; 
    }
}

function 辨识驿站(serverStr) {
    if (!serverStr) return null;
    serverStr = serverStr.trim();
    if (serverStr.startsWith('socks://') || serverStr.startsWith('socks5://')) {
        const urlStr = serverStr.replace(/^socks:\/\//, 'socks5://');
        try {
            const url = new URL(urlStr);
            return {
                type: 'socks5',
                host: url.hostname,
                port: parseInt(url.port) || 1080,
                username: url.username ? decodeURIComponent(url.username) : '',
                password: url.password ? decodeURIComponent(url.password) : ''
            };
        } catch (e) { return null; }
    }
    if (serverStr.startsWith('http://') || serverStr.startsWith('https://')) {
        try {
            const url = new URL(serverStr);
            return {
                type: 'http',
                host: url.hostname,
                port: parseInt(url.port) || (serverStr.startsWith('https://') ? 443 : 80),
                username: url.username ? decodeURIComponent(url.username) : '',
                password: url.password ? decodeURIComponent(url.password) : ''
            };
        } catch (e) { return null; }
    }
    return { type: 'direct', host: serverStr, port: 443 };
}

async function 处理飞鸽传书(request, 远方驿站) {
    const wssPair = new WebSocketPair();
    const [clientSock, serverSock] = Object.values(wssPair);
    serverSock.accept();
    let 远端连理 = { socket: null };
    let 问卜 = false;
    const earlyData = request.headers.get('sec-websocket-protocol') || '';
    const 溪流 = 听风(serverSock, earlyData);
    
    溪流.pipeTo(new WritableStream({
        async write(chunk) {
            if (问卜) return await 泛舟(chunk, serverSock, null);
            if (远端连理.socket) {
                const writer = 远端连理.socket.writable.getWriter();
                await writer.write(chunk);
                writer.releaseLock();
                return;
            }
            const { hasError, addressType, port, hostname, rawIndex } = 拆解密信(chunk);
            if (hasError) return;

            if (addressType === 2) { 
                if (port === 53) 问卜 = true;
                else return;
            }
            const rawData = chunk.slice(rawIndex);
            if (问卜) return 泛舟(rawData, serverSock, null);
            await 共话桑麻(hostname, port, rawData, serverSock, null, 远端连理, 远方驿站);
        },
    })).catch(() => {});
    
    return new Response(null, { status: 101, webSocket: clientSock });
}

function 拆解密信(chunk) {
    if (chunk.byteLength < 7) return { hasError: true };
    try {
        const view = new Uint8Array(chunk);
        const addressType = view[0];
        let addrIdx = 1, addrLen = 0, addrValIdx = addrIdx, hostname = '';
        switch (addressType) {
            case 1: 
                addrLen = 4; 
                hostname = new Uint8Array(chunk.slice(addrValIdx, addrValIdx + addrLen)).join('.'); 
                addrValIdx += addrLen;
                break;
            case 3: 
                addrLen = view[addrIdx];
                addrValIdx += 1; 
                hostname = new TextDecoder().decode(chunk.slice(addrValIdx, addrValIdx + addrLen)); 
                addrValIdx += addrLen;
                break;
            case 4: 
                addrLen = 16; 
                hostname = "IPv6_Address"; 
                addrValIdx += addrLen;
                break;
            default: return { hasError: true };
        }
        const port = new DataView(chunk.slice(addrValIdx, addrValIdx + 2)).getUint16(0);
        return { hasError: false, addressType, port, hostname, rawIndex: addrValIdx + 2 };
    } catch (e) { return { hasError: true }; }
}

async function 共话桑麻(终点, 终点门扉, 初始之物, ws, respHeader, 远端连理, 远方驿站) {
    let 驿站策略 = 辨识驿站(远方驿站 || 驿站鸿雁);
    const remoteSock = connect({ hostname: 终点, port: 终点门扉 });
    远端连理.socket = remoteSock;
    const writer = remoteSock.writable.getWriter();
    await writer.write(初始之物);
    writer.releaseLock();
    
    remoteSock.closed.catch(() => {}).finally(() => 举杯停箸(ws));
    高山流水(remoteSock, ws, respHeader);
}

function 听风(socket, earlyDataHeader) {
    let 已散 = false;
    return new ReadableStream({
        start(controller) {
            socket.addEventListener('message', (event) => { if (!已散) controller.enqueue(event.data); });
            socket.addEventListener('close', () => { if (!已散) { 举杯停箸(socket); controller.close(); } });
            socket.addEventListener('error', (err) => controller.error(err));
            const { earlyData } = 锦瑟无端(earlyDataHeader);
            if (earlyData) controller.enqueue(earlyData);
        },
        cancel() { 已散 = true; 举杯停箸(socket); }
    });
}

async function 高山流水(remoteSocket, webSocket, headerData) {
    let header = headerData;
    await remoteSocket.readable.pipeTo(
        new WritableStream({
            async write(chunk, controller) {
                if (webSocket.readyState !== WebSocket.OPEN) controller.error('closed');
                webSocket.send(chunk); 
            },
        })
    ).catch(() => { 举杯停箸(webSocket); });
}

async function 泛舟(udpChunk, webSocket, respHeader) {
    try {
        const tcpSocket = connect({ hostname: '8.8.4.4', port: 53 });
        const writer = tcpSocket.writable.getWriter();
        await writer.write(udpChunk);
        writer.releaseLock();
        await tcpSocket.readable.pipeTo(new WritableStream({
            async write(chunk) {
                if (webSocket.readyState === WebSocket.OPEN) webSocket.send(chunk);
            },
        }));
    } catch (e) {}
}

export default {
    async fetch(request) {
        const url = new URL(request.url);
        if (request.headers.get('Upgrade') === 'websocket') {
            if (url.pathname.toLowerCase().startsWith(`/${幽径.toLowerCase()}`)) {
                return await 处理飞鸽传书(request, url.searchParams.get('status'));
            }
        }
        return new Response('Silence is Golden', { status: 404 });
    },
};