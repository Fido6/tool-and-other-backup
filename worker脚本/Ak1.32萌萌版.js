// 这里的魔法印记依然是小熊的秘密
const 这里的草莓味魔法口令 = 'x888x888-8888-8888-8888-x888x888x888';
import { connect } from 'cloudflare:sockets';

let 远方的星星坐标 = 'sg.wogg.us.kg', 
    开启点点连接 = null, 
    全宇宙点点模式 = false, 
    点点通行证 = '', 
    解析后的点点地图 = {};

//////////////////////////////////////////////////////////////////////////魔法参数////////////////////////////////////////////////////////////////////////
const 最大排队等候 = 2097152, 心跳节拍 = 15000, 走神超时 = 8000, 最大走神次数 = 12, 最大复活次数 = 24;

//////////////////////////////////////////////////////////////////////////主要架构////////////////////////////////////////////////////////////////////////
const 编织魔法印记 = (a, i) => Array.from(a.slice(i, i + 16)).map(n => n.toString(16).padStart(2, '0')).join('').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');

const 拆开传送包裹 = b => {
  const 寻找门牌号索引 = 18 + b[17] + 1, 门牌号 = (b[寻找门牌号索引] << 8) | b[寻找门牌号索引 + 1], 它是哪种小动物 = b[寻找门牌号索引 + 2]; 
  let 坐标起始位 = 寻找门牌号索引 + 3, 最终坐标, 长度;
  switch (它是哪种小动物) {
    case 1: 长度 = 4; 最终坐标 = b.slice(坐标起始位, 坐标起始位 + 长度).join('.'); break;
    case 2: 长度 = b[坐标起始位++]; 最终坐标 = new TextDecoder().decode(b.slice(坐标起始位, 坐标起始位 + 长度)); break;
    case 3: 长度 = 16; 最终坐标 = `[${Array.from({ length: 8 }, (_, i) => ((b[坐标起始位 + i * 2] << 8) | b[坐标起始位 + i * 2 + 1]).toString(16)).join(':')}]`; break;
    default: throw new Error('魔法阵画错啦');
  } return { host: 最终坐标, port: 门牌号, payload: b.slice(坐标起始位 + 长度) };
};

class 魔法储物箱 {
  constructor() { this.盒子 = new ArrayBuffer(16384); this.指针 = 0; this.空位 = []; this.上限 = 8; this.超级大盒子 = false; }
  拿走 = s => {
    if (s <= 4096 && s <= 16384 - this.指针) { const v = new Uint8Array(this.盒子, this.指针, s); this.指针 += s; return v; } const r = this.空位.pop();
    if (r && r.byteLength >= s) return new Uint8Array(r.buffer, 0, s); return new Uint8Array(s);
  };
  放回 = b => {
    if (b.buffer === this.盒子) { this.指针 = Math.max(0, this.指针 - b.length); return; }
    if (this.空位.length < this.上限 && b.byteLength >= 1024) this.空位.push(b);
  }; 开启特大号 = () => { this.超级大盒子 = true; }; 打扫干净 = () => { this.指针 = 0; this.空位.length = 0; this.超级大盒子 = false; };
}

export default {
  async fetch(小饼干请求) {
    远方的星星坐标 = 远方的星星坐标 ? 远方的星星坐标 : 小饼干请求.cf.colo + '.PrOxYip.CmLiuSsSs.nEt';
    if (小饼干请求.headers.get('Upgrade') !== 'websocket') return new Response('欢迎来到魔法森林！', { status: 200 });
    await 寻找魔法参数(小饼干请求);
    const { 0: 客户端, 1: 这里的出口 } = new WebSocketPair(); 这里的出口.accept(); 开始变魔法(这里的出口);
    return new Response(null, { status: 101, webSocket: 客户端 });
  }
};

const 开始变魔法 = 这里的出口 => {
  const 储物箱 = new 魔法储物箱(); 
  let 魔法管道, 正在写, 正在读, 目的地信息, 是不是第一次见面 = true, 搬运总数 = 0, 走神了多少次 = 0, 复活了多少次 = 0;
  let 上次动弹时间 = Date.now(), 正在变魔法 = false, 正在朗读 = false; 
  const 闹钟 = {}, 排队篮子 = [];
  let 篮子里糖果重量 = 0, 魔法评分 = 1.0, 上次检查时间 = Date.now(), 上次搬运量 = 0, 成功次数 = 0, 失败次数 = 0;
  let 统计表 = { 总量: 0, 次数: 0, 大包: 0, 窗口: 0, 时间: Date.now() }; 
  let 搬运模式 = '智能', 平均重量 = 0, 历史速率 = [];

  const 切换心情 = s => {
    统计表.总量 += s; 统计表.次数++; if (s > 8192) 统计表.大包++; 平均重量 = 平均重量 * 0.9 + s * 0.1; const 现时 = Date.now();
    if (现时 - 统计表.时间 > 1000) {
      const 速率 = 统计表.窗口; 历史速率.push(速率); if (历史速率.length > 5) 历史速率.shift(); 统计表.窗口 = s; 统计表.时间 = 现时;
      const 平均速率 = 历史速率.reduce((a, b) => a + b, 0) / 历史速率.length;
      if (统计表.次数 >= 20) {
        if (平均速率 < 8388608 || 平均重量 < 4096) { if (搬运模式 !== '缓冲') { 搬运模式 = '缓冲'; 储物箱.开启特大号(); } }
        else if (平均速率 > 16777216 && 平均重量 > 12288) { if (搬运模式 !== '直达') 搬运模式 = '直达'; }
        else { if (搬运模式 !== '智能') 搬运模式 = '智能'; }
      }
    } else { 统计表.窗口 += s; }
  };

  const 搬运循环 = async () => {
    if (正在朗读) return; 正在朗读 = true; let 一小车 = [], 车内重量 = 0, 倒计时 = null;
    const 卸货 = () => {
      if (!车内重量) return; const 大礼包 = new Uint8Array(车内重量); let 偏移 = 0;
      for (const 小糖果 of 一小车) { 大礼包.set(小糖果, 偏移); 偏移 += 小糖果.length; }
      if (这里的出口.readyState === 1) 这里的出口.send(大礼包);
      一小车 = []; 车内重量 = 0; if (倒计时) { clearTimeout(倒计时); 倒计时 = null; }
    };
    try {
      while (true) {
        if (篮子里糖果重量 > 最大排队等候) { await new Promise(res => setTimeout(res, 100)); continue; }
        const { done, value: v } = await 正在读.read();
        if (v?.length) {
          搬运总数 += v.length; 上次动弹时间 = Date.now(); 走神了多少次 = 0; 切换心情(v.length); const 现在 = Date.now();
          if (现在 - 上次检查时间 > 5000) {
            const 时间差 = 现在 - 上次检查时间, 搬运量 = 搬运总数 - 上次搬运量, 效率 = 搬运量 / 时间差;
            if (效率 > 500) 魔法评分 = Math.min(1.0, 魔法评分 + 0.05);
            else if (效率 < 50) 魔法评分 = Math.max(0.1, 魔法评分 - 0.05);
            上次检查时间 = 现在; 上次搬运量 = 搬运总数;
          }
          if (搬运模式 === '缓冲') {
            if (v.length < 16384) {
              一小车.push(v); 车内重量 += v.length;
              if (车内重量 >= 65536) 卸货();
              else if (!倒计时) 倒计时 = setTimeout(卸货, 平均重量 > 8192 ? 8 : 25);
            } else { 卸货(); if (这里的出口.readyState === 1) 这里的出口.send(v); }
          } else if (搬运模式 === '直达') { 卸货(); if (这里的出口.readyState === 1) 这里的出口.send(v); }
          else if (搬运模式 === '智能') {
            if (v.length < 8192) {
              一小车.push(v); 车内重量 += v.length;
              if (车内重量 >= 49152) 卸货();
              else if (!倒计时) 倒计时 = setTimeout(卸货, 12);
            } else { 卸货(); if (这里的出口.readyState === 1) 这里的出口.send(v); }
          }
        } if (done) { 卸货(); 正在朗读 = false; 重新召唤(); break; }
      }
    } catch (e) { 卸货(); if (倒计时) clearTimeout(倒计时); 正在朗读 = false; 失败次数++; 重新召唤(); }
  };

  const 召唤成功 = async sp => {
    try {
      魔法管道 = await sp; await 魔法管道.opened; 正在写 = 魔法管道.writable.getWriter(); 正在读 = 魔法管道.readable.getReader(); 
      const 之前剩下的 = 排队篮子.splice(0, 10);
      for (const 糖果 of 之前剩下的) { await 正在写.write(糖果); 篮子里糖果重量 -= 糖果.length; 储物箱.放回(糖果); }
      正在变魔法 = false; 复活了多少次 = 0; 魔法评分 = Math.min(1.0, 魔法评分 + 0.15); 成功次数++; 上次动弹时间 = Date.now(); 搬运循环();
    } catch (e) { 正在变魔法 = false; 失败次数++; 魔法评分 = Math.max(0.1, 魔法评分 - 0.2); 重新召唤(); }
  };

  const 重新召唤 = async () => {
    if (!目的地信息 || 这里的出口.readyState !== 1) { 彻底大扫除(); 这里的出口.close(1011, '魔法断掉啦'); return; }
    if (复活了多少次 >= 最大复活次数) { 彻底大扫除(); 这里的出口.close(1011, '太累啦，召唤不动了'); return; }
    if (魔法评分 < 0.3 && 复活了多少次 > 5 && Math.random() > 0.6) { 彻底大扫除(); 这里的出口.close(1011, '网络太坏啦'); return; }
    if (正在变魔法) return; 复活了多少次++; let 等待时间 = Math.min(50 * Math.pow(1.5, 复活了多少次 - 1), 3000);
    等待时间 *= (1.5 - 魔法评分 * 0.5); 等待时间 += (Math.random() - 0.5) * 等待时间 * 0.2; 等待时间 = Math.max(50, Math.floor(等待时间));
    try {
      打扫旧管道();
      if (篮子里糖果重量 > 最大排队等候 * 2) {
        while (篮子里糖果重量 > 最大排队等候 && 排队篮子.length > 5) { const 丢掉 = 排队篮子.shift(); 篮子里糖果重量 -= 丢掉.length; 储物箱.放回(丢掉); }
      }
      await new Promise(res => setTimeout(res, 等待时间)); 正在变魔法 = true;
      魔法管道 = connect({ hostname: 目的地信息.host, port: 目的地信息.port }); await 魔法管道.opened;
      正在写 = 魔法管道.writable.getWriter(); 正在读 = 魔法管道.readable.getReader(); 
      const 之前剩下的 = 排队篮子.splice(0, 10);
      for (const 糖果 of 之前剩下的) { await 正在写.write(糖果); 篮子里糖果重量 -= 糖果.length; 储物箱.放回(糖果); }
      正在变魔法 = false; 复活了多少次 = 0; 魔法评分 = Math.min(1.0, 魔法评分 + 0.15); 成功次数++; 走神了多少次 = 0; 上次动弹时间 = Date.now(); 搬运循环();
    } catch (e) {
      正在变魔法 = false; 失败次数++; 魔法评分 = Math.max(0.1, 魔法评分 - 0.2);
      if (复活了多少次 < 最大复活次数 && 这里的出口.readyState === 1) setTimeout(重新召唤, 500);
      else { 彻底大扫除(); 这里的出口.close(1011, '能量耗尽啦'); }
    }
  };

  const 开启魔法闹钟 = () => {
    闹钟.心跳 = setInterval(async () => {
      if (!正在变魔法 && 正在写 && Date.now() - 上次动弹时间 > 心跳节拍) { try { await 正在写.write(new Uint8Array(0)); 上次动弹时间 = Date.now(); } catch (e) { 重新召唤(); } }
    }, 心跳节拍 / 3);
    闹钟.监督 = setInterval(() => {
      if (!正在变魔法 && 统计表.总量 > 0 && Date.now() - 上次动弹时间 > 走神超时) {
        走神了多少次++;
        if (走神了多少次 >= 最大走神次数) {
          if (复活了多少次 < 最大复活次数) { 走神了多少次 = 0; 重新召唤(); }
          else { 彻底大扫除(); 这里的出口.close(1011, '睡着了叫不醒'); }
        }
      }
    }, 走神超时 / 2);
  };

  const 打扫旧管道 = () => { 正在朗读 = false; try { 正在写?.releaseLock(); 正在读?.releaseLock(); 魔法管道?.close(); } catch { } };
  const 彻底大扫除 = () => {
    Object.values(闹钟).forEach(clearInterval); 打扫旧管道();
    while (排队篮子.length) 储物箱.放回(排队篮子.shift());
    篮子里糖果重量 = 0; 统计表 = { 总量: 0, 次数: 0, 大包: 0, 窗口: 0, 时间: Date.now() };
    搬运模式 = '智能'; 平均重量 = 0; 历史速率 = []; 储物箱.打扫干净();
  };

  这里的出口.addEventListener('message', async e => {
    try {
      if (是不是第一次见面) {
        是不是第一次见面 = false; const b = new Uint8Array(e.data);
        这里的出口.send(new Uint8Array([b[0], 0]));
        if (这里的草莓味魔法口令 && 编织魔法印记(b, 1) !== 这里的草莓味魔法口令) throw new Error('口令不对哦');
        const { host, port, payload } = 拆开传送包裹(b); 
        if (host.includes(atob('c3BlZWQuY2xvdWRmbGFyZS5jb20='))) throw new Error('这里不能进'); 
        目的地信息 = { host, port }; 正在变魔法 = true;
        let 魔法使者;
        if (开启点点连接 == 'socks5' && 全宇宙点点模式) {
          魔法使者 = await 点点传送(host, port);
        } else if (开启点点连接 == 'http' && 全宇宙点点模式) {
          魔法使者 = await 甜点传送(host, port);
        } else {
          try {
            魔法使者 = connect({ hostname: host, port });
            await 魔法使者.opened;
          } catch {
            if (开启点点连接 == 'socks5') {
              魔法使者 = await 点点传送(host, port);
            } else if (开启点点连接 == 'http') {
              魔法使者 = await 甜点传送(host, port);
            } else {
              const [备用坐标, 备用门牌] = await 整理地址(远方的星星坐标);
              魔法使者 = connect({ hostname: 备用坐标, port: 备用门牌 });
            }
          }
        }
        await 魔法使者.opened;
        if (payload.length) { const 临时盒子 = 储物箱.拿走(payload.length); 临时盒子.set(payload); 排队篮子.push(临时盒子); 篮子里糖果重量 += 临时盒子.length; } 
        开启魔法闹钟(); 召唤成功(魔法使者);
      } else {
        上次动弹时间 = Date.now();
        if (正在变魔法 || !正在写) { const 临时盒子 = 储物箱.拿走(e.data.byteLength); 临时盒子.set(new Uint8Array(e.data)); 排队篮子.push(临时盒子); 篮子里糖果重量 += 临时盒子.length; }
        else { await 正在写.write(e.data); }
      }
    } catch (err) { 彻底大扫除(); 这里的出口.close(1006, '变法失败啦'); }
  }); 
  这里的出口.addEventListener('close', 彻底大扫除); 
  这里的出口.addEventListener('error', 彻底大扫除);
};

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
  const 这里的笔 = 魔法管道.writable.getWriter();
  try {
    await 这里的笔.write(new TextEncoder().encode(申请令));
  } catch (err) {
    throw new Error(`甜点送不到: ${err.message}`);
  } finally {
    这里的笔.releaseLock();
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
        if (!抬头.startsWith('HTTP/1.1 200') && !抬头.startsWith('HTTP/1.0 200')) {
          throw new Error(`甜点被拒绝了: ${抬头.split('\r\n')[0]}`);
        }
        if (结尾位 < 盘子.length) {
          const 剩下的点心 = 盘子.slice(结尾位);
          const { readable, writable } = new TransformStream();
          new ReadableStream({ start(c) { c.enqueue(剩下的点心); } }).pipeTo(writable).catch(() => { });
          魔法管道.readable = readable;
        }
        break;
      }
    }
  } catch (err) {
    throw new Error(`尝甜点失败: ${err.message}`);
  } finally {
    这里的书.releaseLock();
  }
  return 魔法管道;
}

async function 点点传送(目标地, 目标门牌) {
  const { username, password, hostname, port } = 解析后的点点地图;
  const 魔法管道 = connect({ hostname, port });
  await 魔法管道.opened;
  const 笔 = 魔法管道.writable.getWriter();
  const 书 = 魔法管道.readable.getReader();
  await 笔.write(new Uint8Array([5, 2, 0, 2]));
  const 认证 = (await 书.read()).value;
  if (认证[1] === 2 && username) {
    const u = new TextEncoder().encode(username);
    const p = new TextEncoder().encode(password);
    await 笔.write(new Uint8Array([1, u.length, ...u, p.length, ...p]));
    await 书.read();
  }
  const d = new TextEncoder().encode(目标地);
  await 笔.write(new Uint8Array([5, 1, 0, 3, d.length, ...d, 目标门牌 >> 8, 目标门牌 & 0xff]));
  await 书.read();
  笔.releaseLock();
  书.releaseLock();
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
    const p = searchParams.get('proxyip');
    远方的星星坐标 = p.includes(',') ? p.split(',')[Math.floor(Math.random() * p.split(',').length)] : p;
    return;
  } else if (匹配结果) {
    const p = 匹配结果[1] === 'proxyip.' ? `proxyip.${匹配结果[2]}` : 匹配结果[2];
    远方的星星坐标 = p.includes(',') ? p.split(',')[Math.floor(Math.random() * p.split(',').length)] : p;
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