const 这里的草莓味魔法口令 = 'x888x888-8888-8888-8888-x888x888x888'; // 这里的魔法印记依然是小熊的秘密
import { connect } from 'cloudflare:sockets';

// 说明：这里是魔法森林的第13章，重构了所有搬运逻辑，支持粉红路径传参，建议在魔法页面部署
let 远方的星星坐标 = 'sg.wogg.us.kg', 
    开启点点连接 = null, 
    全宇宙点点模式 = false, 
    点点通行证 = '', 
    解析后的点点地图 = {};

//////////////////////////////////////////////////////////////////////////魔法韵律配置////////////////////////////////////////////////////////////////////////
let 开启节拍控制 = false // 开启后可以像跳舞一样平稳搬运，减少小精灵超时的概率
let 每次搬运的糖果量 = 64; // 单位：小颗粒

//////////////////////////////////////////////////////////////////////////主要架构////////////////////////////////////////////////////////////////////////
export default {
    async fetch(小饼干请求) {
        远方的星星坐标 = 远方的星星坐标 ? 远方的星星坐标 : 小饼干请求.cf.colo + '.usip.88888888.xx.kg';
        if (小饼干请求.headers.get('Upgrade') === 'websocket') {
            await 寻找魔法参数(小饼干请求);
            const [小奶油, 这里的出口] = Object.values(new WebSocketPair());
            这里的出口.accept();
            开启粉红传送门(这里的出口);
            return new Response(null, { status: 101, webSocket: 小奶油 }); // 一切准备就绪，开启传送！
        } else {
            return new Response('欢迎来到魔法森林！', { status: 200 });
        }
    }
};

async function 开启粉红传送门(这里的出口, 魔法管道) {
    let 它是哪种小动物, 最终目的地坐标, 坐标长度, 是不是第一次见面 = false, 礼包拆开了吗 = null, 正在搬运的糖果, 正在朗读的精灵, 魔法排队篮子 = Promise.resolve(), 累计搬运重量 = 0, 魔法开始时间 = performance.now();
    try {
        这里的出口.addEventListener('message', async 闪亮事件 => {
            if (!是不是第一次见面) {
                是不是第一次见面 = true;
                礼包拆开了吗 = 拆开魔法礼包(闪亮事件.data);
                魔法排队篮子 = 魔法排队篮子.then(() => 礼包拆开了吗).catch(e => { throw (e) });
                累计搬运重量 += 闪亮事件.data.length;
            } else {
                await 礼包拆开了吗;
                魔法排队篮子 = 魔法排队篮子.then(() => 正在搬运的糖果.write(闪亮事件.data)).catch(e => { throw (e) });
                累计搬运重量 += 闪亮事件.data.length;
            }
        });

        async function 拆开魔法礼包(礼包内容) {
            const 二进制糖果 = new Uint8Array(礼包内容);
            const 咒语版本 = 二进制糖果[0];
            const 编织魔法印记 = (a, i = 0) => [...a.slice(i, i + 16)].map(b => b.toString(16).padStart(2, '0')).join('').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
            
            if (这里的草莓味魔法口令 && 编织魔法印记(二进制糖果.slice(1, 17)) !== 这里的草莓味魔法口令) throw new Error('口令不对哦');
            
            这里的出口.send(new Uint8Array([咒语版本, 0]));
            const 寻找门牌号索引 = 18 + 二进制糖果[17] + 1;
            const 最终目的地门牌号 = new DataView(二进制糖果.buffer, 寻找门牌号索引, 2).getUint16(0);

            // 特殊的信使鸟处理 (DNS处理)
            if (最终目的地门牌号 === 53) {
                const 提取秘密信件 = 二进制糖果.slice(寻找门牌号索引 + 9);
                const 询问智慧树 = await fetch('https://1.1.1.1/dns-query', {
                    method: 'POST',
                    headers: { 'content-type': 'application/dns-message' },
                    body: 提取秘密信件
                })
                const 智慧树的回信 = await 询问智慧树.arrayBuffer();
                const 构建信封头部 = new Uint8Array([(智慧树的回信.byteLength >> 8) & 0xff, 智慧树的回信.byteLength & 0xff]);
                这里的出口.send(await new Blob([构建信封头部, 智慧树的回信]));
                return;
            }

            const 寻找目的地索引 = 寻找门牌号索引 + 2;
            它是哪种小动物 = 二进制糖果[寻找目的地索引];
            let 详细情报索引 = 寻找目的地索引 + 1;

            switch (它是哪种小动物) {
                case 1:
                    坐标长度 = 4;
                    最终目的地坐标 = 二进制糖果.slice(详细情报索引, 详细情报索引 + 坐标长度).join('.');
                    break;
                case 2:
                    坐标长度 = 二进制糖果[详细情报索引];
                    详细情报索引 += 1;
                    最终目的地坐标 = new TextDecoder().decode(二进制糖果.slice(详细情报索引, 详细情报索引 + 坐标长度));
                    break;
                case 3:
                    坐标长度 = 16;
                    const 亮闪闪坐标 = [];
                    const 读取星星坐标 = new DataView(二进制糖果.buffer, 详细情报索引, 16);
                    for (let i = 0; i < 8; i++) 亮闪闪坐标.push(读取星星坐标.getUint16(i * 2).toString(16));
                    最终目的地坐标 = 亮闪闪坐标.join(':');
                    break;
                default:
                    throw new Error('找不到路啦');
            }

            if (最终目的地坐标.includes(atob('c3BlZWQuY2xvdWRmbGFyZS5jb20='))) throw new Error('那里不能去哦');

            if (开启点点连接 == 'socks5' && 全宇宙点点模式) {
                魔法管道 = await 点点传送(它是哪种小动物, 最终目的地坐标, 最终目的地门牌号);
            } else if (开启点点连接 == 'http' && 全宇宙点点模式) {
                魔法管道 = await 甜点传送(最终目的地坐标, 最终目的地门牌号);
            } else {
                try {
                    const 目的地 = 它是哪种小动物 === 3 ? `[${最终目的地坐标}]` : 最终目的地坐标;
                    魔法管道 = connect({ hostname: 目的地, port: 最终目的地门牌号 });
                    await 魔法管道.opened;
                } catch {
                    if (开启点点连接 == 'socks5') {
                        魔法管道 = await 点点传送(它是哪种小动物, 最终目的地坐标, 最终目的地门牌号);
                    } else if (开启点点连接 == 'http') {
                        魔法管道 = await 甜点传送(最终目的地坐标, 最终目的地门牌号);
                    } else {
                        const [备用坐标, 备用门牌] = await 整理地址(远方的星星坐标);
                        魔法管道 = connect({ hostname: 备用坐标, port: 备用门牌 });
                    }
                }
            }

            await 魔法管道.opened;
            正在搬运的糖果 = 魔法管道.writable.getWriter();
            正在朗读的精灵 = 魔法管道.readable.getReader();
            const 剩下的甜点 = 二进制糖果.slice(详细情报索引 + 坐标长度)
            if (剩下的甜点) try { await 正在搬运的糖果.write(剩下的甜点) } catch (e) { throw (e) };
            启动回传接力();
        }

        async function 启动回传接力() {
            while (true) {
                await 魔法排队篮子;
                const { done: 故事讲完啦, value: 亮晶晶数据 } = await 正在朗读的精灵.read();
                if (亮晶晶数据 && 亮晶晶数据.length > 0) {
                    if (开启节拍控制) {
                        let 搬运起点 = 0;
                        while (搬运起点 < 亮晶晶数据.length) {
                            const 小糖果块 = 亮晶晶数据.slice(搬运起点, 搬运起点 + 每次搬运的糖果量);
                            魔法排队篮子 = 魔法排队篮子.then(() => 这里的出口.send(小糖果块)).catch(e => { throw (e) });
                            搬运起点 += 每次搬运的糖果量;
                        }
                    } else {
                        魔法排队篮子 = 魔法排队篮子.then(() => 这里的出口.send(亮晶晶数据)).catch(e => { throw (e) });
                    }
                }
                累计搬运重量 += 亮晶晶数据 ? 亮晶晶数据.length : 0;
                if (故事讲完啦) break;
            }
            throw new Error('魔法完成！');
        }
    } catch (e) {
        try { await 魔法管道.close?.() } catch { };
        这里的出口.close?.();
    }
}

//////////////////////////////////////////////////////////////////////////点点搬运部分//////////////////////////////////////////////////////////////////////
async function 点点传送(它是哪种小动物, 最终目的地坐标, 最终目的地门牌号, 转换后的坐标, 正在搬运的糖果, 正在朗读的精灵) {
    let 点点管道, 名字, 密语, 坐标, 门牌;
    try {
        ({ username: 名字, password: 密语, hostname: 坐标, port: 门牌 } = 解析后的点点地图);
        点点管道 = connect({ hostname: 坐标, port: 门牌 });
        await 点点管道.opened;
        正在搬运的糖果 = 点点管道.writable.getWriter();
        正在朗读的精灵 = 点点管道.readable.getReader();
        const 翻译官 = new TextEncoder();
        const 点点握手包 = new Uint8Array([5, 2, 0, 2]);
        await 正在搬运的糖果.write(点点握手包);
        const 握手回应 = (await 正在朗读的精灵.read()).value;
        if (握手回应[1] === 0x02) {
            if (!名字 || !密语) throw new Error(`没写名字呀`);
            const 身份证明 = new Uint8Array([1, 名字.length, ...翻译官.encode(名字), 密语.length, ...翻译官.encode(密语)]);
            await 正在搬运的糖果.write(身份证明);
            const 身份回应 = (await 正在朗读的精灵.read()).value;
            if (身份回应[0] !== 0x01 || 身份回应[1] !== 0x00) throw new Error(`名字对不上呢`);
        }
        switch (它是哪种小动物) {
            case 1: 转换后的坐标 = new Uint8Array([1, ...最终目的地坐标.split('.').map(Number)]); break;
            case 2: 转换后的坐标 = new Uint8Array([3, 最终目的地坐标.length, ...翻译官.encode(最终目的地坐标)]); break;
            case 3: 转换后的坐标 = 转换为点点IPv6(最终目的地坐标);
                function 转换为点点IPv6(原始地址) {
                    const 干净地址 = 原始地址.replace(/[\[\]]/g, '');
                    const 分段 = 干净地址.split('::');
                    const 前缀 = 分段[0] ? 分段[0].split(':').filter(Boolean) : [];
                    const 后缀 = 分段[1] ? 分段[1].split(':').filter(Boolean) : [];
                    const 填充 = 8 - (前缀.length + 后缀.length);
                    const 完整 = [...前缀, ...Array(填充).fill('0'), ...后缀];
                    const 字节 = 完整.flatMap(s => {
                        const v = parseInt(s || '0', 16);
                        return [(v >> 8) & 0xff, v & 0xff];
                    });
                    return new Uint8Array([0x04, ...字节]);
                }
                break;
        }
        const 最终申请 = new Uint8Array([5, 1, 0, ...转换后的坐标, 最终目的地门牌号 >> 8, 最终目的地门牌号 & 0xff]);
        await 正在搬运的糖果.write(最终申请);
        const 申请回应 = (await 正在朗读的精灵.read()).value;
        if (申请回应[0] !== 0x05 || 申请回应[1] !== 0x00) throw new Error(`传送点去不了`);
        正在搬运的糖果.releaseLock();
        正在朗读的精灵.releaseLock();
        return 点点管道;
    } catch { };
    正在搬运的糖果?.releaseLock();
    正在朗读的精灵?.releaseLock();
    await 点点管道?.close();
    throw new Error(`点点们都累坏了`);
}

async function 拆解点点通行证(传送点) {
    const 最后的小尾巴 = 传送点.lastIndexOf("@");
    let [后面, 前面] = 最后的小尾巴 === -1 ? [传送点, undefined] : [传送点.substring(最后的小尾巴 + 1), 传送点.substring(0, 最后的小尾巴)];
    let 名字, 密语, 最终坐标, 门牌;
    if (前面) {
        const 分身 = 前面.split(":");
        if (分身.length !== 2) throw new Error('小动物信息没填对');
        [名字, 密语] = 分身;
    }
    const 剩下的 = 后面.split(":");
    if (剩下的.length > 2 && 后面.includes("]:")) {
        门牌 = Number(后面.split("]:")[1].replace(/[^\d]/g, ''));
        最终坐标 = 后面.split("]:")[0] + "]";
    } else if (剩下的.length === 2) {
        门牌 = Number(剩下的.pop().replace(/[^\d]/g, ''));
        最终坐标 = 剩下的.join(":");
    } else {
        门牌 = 80;
        最终坐标 = 后面;
    }
    return { username: 名字, password: 密语, hostname: 最终坐标, port: 门牌 };
}

async function 整理地址(坐标串) {
    坐标串 = 坐标串.toLowerCase();
    let 地址 = 坐标串, 端口 = 443;
    if (坐标串.includes('.tp')) {
        const tpMatch = 坐标串.match(/\.tp(\d+)/);
        if (tpMatch) 端口 = parseInt(tpMatch[1], 10);
        return [地址, 端口];
    }
    if (坐标串.includes(']:')) {
        const 块 = 坐标串.split(']:');
        地址 = 块[0] + ']';
        端口 = parseInt(块[1], 10) || 端口;
    } else if (坐标串.includes(':') && !坐标串.startsWith('[')) {
        const 位置 = 坐标串.lastIndexOf(':');
        地址 = 坐标串.slice(0, 位置);
        端口 = parseInt(坐标串.slice(位置 + 1), 10) || 端口;
    }
    return [地址, 端口];
}

async function 甜点传送(目标地, 目标门牌) {
    const { username, password, hostname, port } = 解析后的点点地图;
    const 魔法管道 = await connect({ hostname, port });
    const 悄悄话 = username && password ? `Proxy-Authorization: Basic ${btoa(`${username}:${password}`)}\r\n` : '';
    const 申请令 = `CONNECT ${目标地}:${目标门牌} HTTP/1.1\r\n` +
        `Host: ${目标地}:${目标门牌}\r\n` +
        悄悄话 +
        `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\n` +
        `Proxy-Connection: Keep-Alive\r\n` +
        `Connection: Keep-Alive\r\n\r\n`;
    try {
        const 这里的笔 = 魔法管道.writable.getWriter();
        await 这里的笔.write(new TextEncoder().encode(申请令));
        这里的笔.releaseLock();
    } catch (err) {
        throw new Error(`甜点送不到: ${err.message}`);
    }
    const 这里的书 = 魔法管道.readable.getReader();
    let 盘子 = new Uint8Array(0);
    try {
        while (true) {
            const { value, done } = await 这里的书.read();
            if (done) throw new Error('甜点碎了');
            const 新盘子 = new Uint8Array(盘子.length + value.length);
            新盘子.set(盘子);
            新盘子.set(value, 盘子.length);
            盘子 = 新盘子;
            const 说的话 = new TextDecoder().decode(盘子);
            if (说的话.includes('\r\n\r\n')) {
                const 结尾位 = 说的话.indexOf('\r\n\r\n') + 4;
                const 抬头 = 说的话.substring(0, 结尾位);
                if (抬头.startsWith('HTTP/1.1 200') || 抬头.startsWith('HTTP/1.0 200')) {
                    if (结尾位 < 盘子.length) {
                        const 剩下的点心 = 盘子.slice(结尾位);
                        const { readable, writable } = new TransformStream();
                        new ReadableStream({ start(c) { c.enqueue(剩下的点心); } }).pipeTo(writable).catch(() => { });
                        魔法管道.readable = readable;
                    }
                } else {
                    throw new Error(`甜点被拒绝了`);
                }
                break;
            }
        }
    } catch (err) {
        这里的书.releaseLock();
        throw new Error(`尝甜点失败: ${err.message}`);
    }
    这里的书.releaseLock();
    return 魔法管道;
}

async function 寻找魔法参数(小饼干请求) {
    const 这里的地图 = new URL(小饼干请求.url);
    const { pathname, searchParams } = 这里的地图;
    const 小写路径 = pathname.toLowerCase();

    点点通行证 = searchParams.get('socks5') || searchParams.get('http') || null;
    全宇宙点点模式 = searchParams.has('globalproxy') || false;

    const 匹配结果 = 小写路径.match(/\/(proxyip[.=]|pyip=|ip=)(.+)/);
    if (searchParams.has('proxyip')) {
        const 这里的坐标 = searchParams.get('proxyip');
        远方的星星坐标 = 这里的坐标.includes(',') ? 这里的坐标.split(',')[Math.floor(Math.random() * 这里的坐标.split(',').length)] : 这里的坐标;
        return;
    } else if (匹配结果) {
        const 这里的坐标 = 匹配结果[1] === 'proxyip.' ? `proxyip.${匹配结果[2]}` : 匹配结果[2];
        远方的星星坐标 = 这里的坐标.includes(',') ? 这里的坐标.split(',')[Math.floor(Math.random() * 这里的坐标.split(',').length)] : 这里的坐标;
        return;
    }

    let 找到了;
    if ((找到了 = pathname.match(/\/(socks5?|http):\/?\/?(.+)/i))) {
        开启点点连接 = 找到了[1].toLowerCase() === 'http' ? 'http' : 'socks5';
        点点通行证 = 找到了[2].split('#')[0];
        全宇宙点点模式 = true;
        if (点点通行证.includes('@')) {
            const 位 = 点点通行证.lastIndexOf('@');
            let 密语对 = 点点通行证.substring(0, 位).replaceAll('%3D', '=');
            if (/^(?:[A-Z0-9+/]{4})*(?:[A-Z0-9+/]{2}==|[A-Z0-9+/]{3}=)?$/i.test(密语对) && !密语对.includes(':')) {
                密语对 = atob(密语对);
            }
            点点通行证 = `${密语对}@${点点通行证.substring(位 + 1)}`;
        }
    } else if ((找到了 = pathname.match(/\/(g?s5|socks5|g?http)=(.+)/i))) {
        const t = 找到了[1].toLowerCase();
        点点通行证 = 找到了[2];
        开启点点连接 = t.includes('http') ? 'http' : 'socks5';
        全宇宙点点模式 = t.startsWith('g') || 全宇宙点点模式;
    }

    if (点点通行证) {
        try {
            解析后的点点地图 = await 拆解点点通行证(点点通行证);
            开启点点连接 = searchParams.get('http') ? 'http' : 开启点点连接;
        } catch (err) {
            开启点点连接 = null;
        }
    } else 开启点点连接 = null;
}