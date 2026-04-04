import {connect} from 'cloudflare:sockets';

// --- 💖 这里的暗号要记好哦 ---
const 甜心通行证 = 'x888x888-8888-8888-8888-x888x888x888';
//**警告**:trojan使用的sha224密钥计算网址：https://www.lzltool.com/data-sha224
const 魔法核心碎片 = '5543aacf4174cbce13078087e21d9e75cbac7085b6f7498900c93ac3';  //trojan密码
const 小兔子管理员 = 'admin';
const 小兔子口令 = '123456';

// --- ✨ 能量流动的魔法参数 ---
const 星球能量池 = 960 * 1024;
const 魔法爆发阈值 = 58 * 1024 * 1024;
const 旋律小节长度 = 64 * 1024;
const 丝带缓冲警戒 = 88 * 1024;
const 星光闪烁频率 = 20;
const 纯净领域模式 = false;
let 魔法同步强度 = 1;  //works部署建议改为4，SNI部署只能是1

// --- 🌌 梦幻传送站配置 ---
const 传送顺序 = ['socks', 'http', 'nat64'];
const 梦境寻路站 = ['https://cloudflare-dns.com/dns-query', 'https://dns.google/dns-query'];
const 梦境寻路站_NAT = ['https://cloudflare-dns.com/dns-query', 'https://dns.google/resolve'];
const 梦幻坐标站 = {
    EU: 'de.wogg.us.kg', 
    AS: 'tw.wogg.us.kg', 
    JP: 'jp.wogg.us.kg', 
    US: 'us.wogg.us.kg'
};
const 最终梦想点 = 'sg.wogg.us.kg';

const 星座星图 = {
    JP: new Set(['FUK', 'ICN', 'KIX', 'NRT', 'OKA']),
    EU: new Set([
        'ACC', 'ADB', 'ALA', 'ALG', 'AMM', 'AMS', 'ARN', 'ATH', 'BAH', 'BCN', 'BEG', 'BGW', 'BOD', 'BRU', 'BTS', 'BUD', 'CAI',
        'CDG', 'CPH', 'CPT', 'DAR', 'DKR', 'DMM', 'DOH', 'DUB', 'DUR', 'DUS', 'DXB', 'EBB', 'EDI', 'EVN', 'FCO', 'FRA', 'GOT',
        'GVA', 'HAM', 'HEL', 'HRE', 'IST', 'JED', 'JIB', 'JNB', 'KBP', 'KEF', 'KWI', 'LAD', 'LED', 'LHR', 'LIS', 'LOS', 'LUX',
        'LYS', 'MAD', 'MAN', 'MCT', 'MPM', 'MRS', 'MUC', 'MXP', 'NBO', 'OSL', 'OTP', 'PMO', 'PRG', 'RIX', 'RUH', 'RUN', 'SKG',
        'SOF', 'STR', 'TBS', 'TLL', 'TLV', 'TUN', 'VIE', 'VNO', 'WAW', 'ZAG', 'ZRH']),
    AS: new Set([
        'ADL', 'AKL', 'AMD', 'BKK', 'BLR', 'BNE', 'BOM', 'CBR', 'CCU', 'CEB', 'CGK', 'CMB', 'COK', 'DAC', 'DEL', 'HAN', 'HKG',
        'HYD', 'ISB', 'JHB', 'JOG', 'KCH', 'KHH', 'KHI', 'KTM', 'KUL', 'LHE', 'MAA', 'MEL', 'MFM', 'MLE', 'MNL', 'NAG', 'NOU',
        'PAT', 'PBH', 'PER', 'PNH', 'SGN', 'SIN', 'SYD', 'TPE', 'ULN', 'VTE'])
};

const 魔法映射表 = new Map();
for (const [领域, 星点] of Object.entries(星座星图)) {
    for (const 每一颗星 of 星点) 魔法映射表.set(每一颗星, 梦幻坐标站[领域])
}

const 甜心心跳字节 = new Uint8Array(16), 魔法糖果字节 = new Uint8Array(56), 魔法舞步 = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4, 4, 4, 4];
for (let i = 0, c; i < 16; i++) 甜心心跳字节[i] = (((c = 甜心通行证.charCodeAt(i * 2 + 魔法舞步[i])) > 64 ? c + 9 : c) & 0xF) << 4 | (((c = 甜心通行证.charCodeAt(i * 2 + 魔法舞步[i] + 1)) > 64 ? c + 9 : c) & 0xF);
for (let i = 0; i < 56; i++) 魔法糖果字节[i] = 魔法核心碎片.charCodeAt(i);

const [魔法翻译官, 魔法解码官, 咪咪仪式启动, 咪咪仪式请求] = [new TextEncoder(), new TextDecoder(), new Uint8Array([5, 2, 0, 2]), new Uint8Array([5, 0, 0, 1, 0, 0, 0, 0, 0, 0])];
let 咪咪的小篮子, 咪咪的秘密;

const 甜甜的吻200 = 魔法翻译官.encode("HTTP/1.1 200 Connection Established\r\n\r\n"), 害羞的拒绝407 = 魔法翻译官.encode("HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm=\"magic\"\r\n\r\n");

if (小兔子管理员 && 小兔子口令) {
    咪咪的秘密 = 魔法翻译官.encode(btoa(`${小兔子管理员}:${小兔子口令}`));
    const 用户字节 = 魔法翻译官.encode(小兔子管理员), 口令字节 = 魔法翻译官.encode(小兔子口令);
    咪咪的小篮子 = new Uint8Array(3 + 用户字节.length + 口令字节.length);
    咪咪的小篮子[0] = 1, 咪咪的小篮子[1] = 用户字节.length, 咪咪的小篮子.set(用户字节, 2), 咪咪的小篮子[2 + 用户字节.length] = 口令字节.length, 咪咪的小篮子.set(口令字节, 3 + 用户字节.length);
}

const 梦幻背景 = `<body style=margin:0;overflow:hidden;background:#000><canvas id=c style=width:100vw;height:100vh><script>var C=document.getElementById("c"),g=C.getContext("webgl"),t=0,P,R,F,U,O,X,Y,L,T,b=.4,K="float L(vec3 v){vec3 a=v;float b,c,d;for(int i=0;i<5;i++){b=length(a);c=atan(a.y,a.x)*10.;d=acos(a.z/b)*10.;b=pow(b,8.);a=vec3(b*sin(d)*cos(c),b*sin(d)*sin(c),b*cos(d))+v;if(b>6.)break;}return 4.-dot(a,a);}",VS="attribute vec4 p;varying vec3 d,ld;uniform vec3 r,f,u;uniform float x,y;void main(){gl_Position=p;d=f+r*p.x*x+u*p.y*y;ld=vec3(p.x*x,p.y*y,-1.);}",FS="precision highp float;float L(vec3 v);uniform vec3 r,f,u,o;uniform float t;varying vec3 d,ld;uniform float l;void main(){vec3 tc=vec3(0);for(int i=0;i<4;i++){vec2 of=vec2(mod(float(i),2.),floor(float(i)/2.))*.5;vec3 rd=normalize(d+r*of.x*.001+u*of.y*.001),c=vec3(0);float s=.002*l,r1,r2,r3;for(int k=2;k<1200;k++){float ds=s*float(k);vec3 p=o+rd*ds;if(L(p)>0.){r1=s*float(k-1);r2=ds;for(int j=0;j<24;j++){r3=(r1+r2)*.5;if(L(o+rd*r3)>0.)r2=r3;else r1=r3;}vec3 v=o+rd*r3,nw;float e=r3*1e-4;nw=normalize(vec3(L(v-r*e)-L(v+r*e),L(v-u*e)-L(v+u*e),L(v+f*e)-L(v-f*e)));vec3 rf=reflect(normalize(ld),nw);float d2=dot(v,v),lt=pow(max(0.,dot(rf,vec3(.276,.92,.276))),4.)*.45+max(0.,dot(nw,vec3(.276,.92,.276)))*.25+.3;c=(sin(d2*5.+t+vec3(0,2,4))*.5+.5)*lt;break;}}tc+=c;}gl_FragColor=vec4(pow(tc*.25,vec3(.7)),1);}";function i(){var s=g.createProgram(),v=g.createShader(35633),f=g.createShader(35632);g.shaderSource(v,VS),g.compileShader(v),g.shaderSource(f,FS+K),g.compileShader(f),g.attachShader(s,v),g.attachShader(s,f),g.linkProgram(s),g.useProgram(s),P=g.getAttribLocation(s,"p"),R=g.getUniformLocation(s,"r"),F=g.getUniformLocation(s,"f"),U=g.getUniformLocation(s,"u"),O=g.getUniformLocation(s,"o"),X=g.getUniformLocation(s,"x"),Y=g.getUniformLocation(s,"y"),L=g.getUniformLocation(s,"l"),T=g.getUniformLocation(s,"t"),g.bindBuffer(34962,g.createBuffer()),g.bufferData(34962,new Float32Array([-1,-1,0,1,-1,0,1,1,0,-1,-1,0,1,1,0,-1,1,0]),35044),g.vertexAttribPointer(P,3,5126,!1,0,0),g.enableVertexAttribArray(P)}function w(){t+=.02,innerWidth*devicePixelRatio!=C.width&&(C.width=innerWidth*(d=devicePixelRatio||1),C.height=innerHeight*d,g.viewport(0,0,C.width,C.height));var v=C.width/C.height;g.uniform1f(X,v>1?v:1),g.uniform1f(Y,v>1?1:1/v),g.uniform1f(L,1.6),g.uniform1f(T,t),g.uniform3f(O,1.6*Math.cos(t*.5)*Math.cos(b),1.6*Math.sin(b),1.6*Math.sin(t*.5)*Math.cos(b)),g.uniform3f(R,Math.sin(t*.5),0,-Math.cos(t*.5)),g.uniform3f(U,-Math.sin(b)*Math.cos(t*.5),Math.cos(b),-Math.sin(b)*Math.sin(t*.5)),g.uniform3f(F,-Math.cos(t*.5)*Math.cos(b),-Math.sin(b),-Math.sin(t*.5)*Math.cos(b)),g.drawArrays(4,0,6),requestAnimationFrame(w)}i(),w()<\/script>`;

const 甜点坐标转字符串 = (坐标类型, 坐标字节) => {
    if (坐标类型 === 3) return 魔法解码官.decode(坐标字节);
    if (坐标类型 === 1) return `${坐标字节[0]}.${坐标字节[1]}.${坐标字节[2]}.${坐标字节[3]}`;
    let ipv6 = ((坐标字节[0] << 8) | 坐标字节[1]).toString(16);
    for (let i = 1; i < 8; i++) ipv6 += ':' + ((坐标字节[i * 2] << 8) | 坐标字节[i * 2 + 1]).toString(16);
    return `[${ipv6}]`;
};

const 甜点端口解析 = (地址, 默认端口) => {
    if (地址.charCodeAt(0) === 91) {
        const 分隔索引 = 地址.indexOf(']:');
        if (分隔索引 !== -1) return [地址.substring(0, 分隔索引 + 1), 地址.substring(分隔索引 + 2)];
        return [地址, 默认端口];
    }
    const tp索引 = 地址.indexOf('.tp');
    const 最后一个冒号 = 地址.lastIndexOf(':');
    if (tp索引 !== -1 && 最后一个冒号 === -1) return [地址, 地址.substring(tp索引 + 3, 地址.indexOf('.', tp索引 + 3))];
    if (最后一个冒号 === -1) return [地址, 默认端口];
    return [地址.substring(0, 最后一个冒号), 地址.substring(最后一个冒号 + 1)];
};

const 魔法身份解析 = (认证参数) => {
    let 用户, 密码, 主机串;
    const at索引 = 认证参数.lastIndexOf('@');
    if (at索引 === -1) {主机串 = 认证参数} else {
        const 凭证 = 认证参数.substring(0, at索引);
        主机串 = 认证参数.substring(at索引 + 1);
        const 冒号索引 = 凭证.indexOf(':');
        if (冒号索引 === -1) {用户 = 凭证} else {
            用户 = 凭证.substring(0, 冒号索引);
            密码 = 凭证.substring(冒号索引 + 1);
        }
    }
    const [主机名, 端口] = 甜点端口解析(主机串, 1080);
    return {username: 用户, password: 密码, hostname: 主机名, port: 端口};
};

const 是不是小猫喵 = (串) => {
    const 长度 = 串.length;
    if (长度 > 15 || 长度 < 7) return false;
    let 部分 = 0, 点数 = 0, P长 = 0, 头 = 0;
    for (let i = 0; i < 长度; i++) {
        const 字符码 = 串.charCodeAt(i);
        if (字符码 === 46) {
            if (点数 === 3 || P长 === 0 || (P长 > 1 && 头 === 48)) return false;
            点数++, 部分 = 0, P长 = 0;
        } else {
            const 数字 = (字符码 - 48) >>> 0;
            if (数字 > 9) return false;
            if (P长 === 0) 头 = 字符码;
            P长++, 部分 = 部分 * 10 + 数字;
            if (部分 > 255 || P长 > 3) return false;
        }
    }
    return 点数 === 3 && P长 > 0 && !(P长 > 1 && 头 === 48);
};

const 是不是小花园 = (串) => {
    if (!纯净领域模式) return true;
    const 第一个码 = 串.charCodeAt(0);
    if ((第一个码 - 48) >>> 0 > 9) return 第一个码 !== 91;
    return !是不是小猫喵(串);
};

const 开启魔法扉页 = (主机名, 端口, 通道 = connect({hostname: 主机名, port: 端口})) => 通道.opened.then(() => 通道);

const 奇迹连接 = (主机名, 端口, 坐标类型, 限制 = 魔法同步强度) => {
    if (限制 === 1 || (纯净领域模式 && 坐标类型 !== 3)) return 开启魔法扉页(主机名, 端口);
    return Promise.any(Array(限制).fill(null).map(() => 开启魔法扉页(主机名, 端口)));
};

const 通过咪咪跳转 = async (目标类型, 目标端口, 咪咪认证, 坐标字节, 限制) => {
    const 地址类型 = 是不是小花园(咪咪认证.hostname) ? 3 : 0;
    const 咪咪通道 = await 奇迹连接(咪咪认证.hostname, 咪咪认证.port, 地址类型, 限制);
    const 写入者 = 咪咪通道.writable.getWriter();
    const 读取者 = 咪咪通道.readable.getReader();
    await 写入者.write(咪咪仪式启动);
    const {value: 响应} = await 读取者.read();
    if (!响应 || 响应[0] !== 5 || 响应[1] === 0xFF) return null;
    if (响应[1] === 2) {
        if (!咪咪认证.username) return null;
        const 用户字节 = 魔法翻译官.encode(咪咪认证.username);
        const 口令字节 = 魔法翻译官.encode(咪咪认证.password || '');
        const 认证请求 = new Uint8Array(3 + 用户字节.length + 口令字节.length)
        认证请求[0] = 1, 认证请求[1] = 用户字节.length, 认证请求.set(用户字节, 2), 认证请求[2 + 用户字节.length] = 口令字节.length, 认证请求.set(口令字节, 3 + 用户字节.length);
        await 写入者.write(认证请求);
        const {value: 认证结果} = await 读取者.read();
        if (!认证结果 || 认证结果[0] !== 1 || 认证结果[1] !== 0) return null;
    } else if (响应[1] !== 0) {return null}
    const 是域名吗 = 目标类型 === 3, 启动包 = new Uint8Array(6 + 坐标字节.length + (是域名吗 ? 1 : 0));
    启动包[0] = 5, 启动包[1] = 1, 启动包[2] = 0, 启动包[3] = 目标类型;
    是域名吗 ? (启动包[4] = 坐标字节.length, 启动包.set(坐标字节, 5)) : 启动包.set(坐标字节, 4);
    启动包[启动包.length - 2] = 目标端口 >> 8, 启动包[启动包.length - 1] = 目标端口 & 0xff;
    await 写入者.write(启动包);
    const {value: 最终结果} = await 读取者.read();
    if (!最终结果 || 最终结果[1] !== 0) return null;
    写入者.releaseLock(), 读取者.releaseLock();
    return 咪咪通道;
};

const 丝带头部文本 = `User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36\r\nProxy-Connection: Keep-Alive\r\nConnection: Keep-Alive\r\n\r\n`;
const 编码后的丝带 = 魔法翻译官.encode(丝带头部文本);

const 通过甜点跳转 = async (目标类型, 目标端口, 甜点认证, 坐标字节, 限制) => {
    const {username, password, hostname, port} = 甜点认证;
    const 地址类型 = 是是不是小花园(hostname) ? 3 : 0;
    const 甜点通道 = await 奇迹连接(hostname, port, 地址类型, 限制);
    const 写入者 = 甜点通道.writable.getWriter();
    const 甜点主机 = 甜点坐标转字符串(目标类型, 坐标字节);
    let 跳转请求 = `CONNECT ${甜点主机}:${目标端口} HTTP/1.1\r\nHost: ${甜点主机}:${目标端口}\r\n`;
    if (username) 跳转请求 += `Proxy-Authorization: Basic ${btoa(`${username}:${password || ''}`)}\r\n`;
    const 完整头部 = new Uint8Array(跳转请求.length * 3 + 编码后的丝带.length);
    const {written} = 魔法翻译官.encodeInto(跳转请求, 完整头部);
    完整头部.set(编码后的丝带, written);
    await 写入者.write(完整头部.subarray(0, written + 编码后的丝带.length));
    写入者.releaseLock();
    const 读取者 = 甜点通道.readable.getReader();
    const 临时盒 = new Uint8Array(256);
    let 已读字节 = 0, 校验通过 = false;
    while (已读字节 < 临时盒.length) {
        const {value, done} = await 读取者.read();
        if (done || 已读字节 + value.length > 临时盒.length) return null;
        const 之前长度 = 已读字节;
        临时盒.set(value, 已读字节);
        已读字节 += value.length;
        if (!校验通过 && 已读字节 >= 12) {
            if (临时盒[9] !== 50) return null;
            校验通过 = true;
        }
        const 查找起点 = Math.max(15, 之前长度 - 3);
        for (let i = 查找起点; i <= 已读字节 - 4; i++) {
            if (临时盒[i] === 13 && 临时盒[i + 1] === 10 && 临时盒[i + 2] === 13 && 临时盒[i + 3] === 10) {
                读取者.releaseLock();
                if (已读字节 > i + 4) {
                    const {readable, writable} = new TransformStream();
                    const tw = writable.getWriter();
                    tw.write(临时盒.subarray(i + 4, 已读字节));
                    tw.releaseLock();
                    甜点通道.readable.pipeTo(writable).catch(() => {});
                    甜点通道.readable = readable;
                }
                return 甜点通道;
            }
        }
    }
    return null;
};

const 获取甜点坐标 = (盒, 偏移, 类型) => {
    const 长度 = 类型 === 3 ? 盒[偏移++] : 类型 === 1 ? 4 : 类型 === 4 ? 16 : null;
    if (长度 === null) return null;
    const 结束位置 = 偏移 + 长度;
    if (结束位置 > 盒.length) return null;
    const 字节 = 盒.subarray(偏移, 结束位置);
    return {addrBytes: 字节, dataOffset: 结束位置};
};

const 寻找甜心印记 = (分块) => {
    for (let i = 0; i < 16; i++) if (分块[i + 1] !== 甜心心跳字节[i]) return null;
    let 偏移 = 19 + 分块[17];
    const 端口 = (分块[偏移] << 8) | 分块[偏移 + 1];
    let 类型 = 分块[偏移 + 2];
    if (类型 !== 1) 类型 += 1;
    const 信息 = 获取甜点坐标(分块, 偏移 + 3, 类型);
    if (!信息) return null;
    return {addrType: 类型, addrBytes: 信息.addrBytes, dataOffset: 信息.dataOffset, port: 端口, isDns: 端口 === 53};
};

const 寻找糖果印记 = (分块) => {
    for (let i = 0; i < 56; i++) if (分块[i] !== 魔法糖果字节[i]) return null;
    const 类型 = 分块[59];
    const 信息 = 获取甜点坐标(分块, 60, 类型);
    if (!信息) return null;
    const 端口 = (分块[信息.dataOffset] << 8) | 分块[信息.dataOffset + 1];
    return {addrType: 类型, addrBytes: 信息.addrBytes, dataOffset: 信息.dataOffset + 4, port: 端口, isDns: 端口 === 53};
};

const 寻找影子印记 = (分块) => {
    const 类型 = 分块[0];
    const 信息 = 获取甜点坐标(分块, 1, 类型);
    if (!信息) return null;
    const 端口 = (分块[信息.dataOffset] << 8) | 分块[信息.dataOffset + 1];
    return {addrType: 类型, addrBytes: 信息.addrBytes, dataOffset: 信息.dataOffset + 2, port: 端口, isDns: 端口 === 53};
};

const 寻找咪咪印记 = (分块) => {
    if (分块[2] !== 0) return null;
    const 类型 = 分块[3];
    const 信息 = 获取甜点坐标(分块, 4, 类型);
    if (!信息) return null;
    const 端口 = (分块[信息.dataOffset] << 8) | 分块[信息.dataOffset + 1];
    return {addrType: 类型, addrBytes: 信息.addrBytes, dataOffset: 信息.dataOffset + 2, port: 端口, isSocks5: true};
};

const 寻找甜点印记 = (分块) => {
    const 长度 = 分块.length;
    if (长度 < 24 || 分块[长度 - 4] !== 13 || 分块[长度 - 3] !== 10 || 分块[长度 - 2] !== 13 || 分块[长度 - 1] !== 10) return null;
    const 空格位置 = 分块.indexOf(32, 13);
    if (空格位置 === -1) return null;
    if (咪咪的秘密) {
        let p = 分块.indexOf(66, 空格位置 + 30), m = false;
        while (p !== -1 && p <= 长度 - 咪咪的秘密.length - 10) {
            if (分块[p + 1] === 97 && 分块[p + 2] === 115 && 分块[p + 3] === 105 && 分块[p + 4] === 99 && 分块[p + 5] === 32) {
                m = true;
                for (let j = 0; j < 咪咪的秘密.length; j++) if (分块[p + 6 + j] !== 咪咪的秘密[j]) {m = false; break;}
                if (m) break;
            }
            p = 分块.indexOf(66, p + 1);
        }
        if (!m) return {authFailed: true};
    }
    const 冒号位置 = 分块.lastIndexOf(58, 空格位置 - 3);
    if (冒号位置 < 12) return null;
    let 端口 = 0;
    for (let i = 冒号位置 + 1, d; i < 空格位置 && (d = 分块[i] - 48) >= 0 && d <= 9; i++) 端口 = 端口 * 10 + d;
    return {addrType: 3, addrBytes: 分块.subarray(8, 冒号位置), port: 端口, dataOffset: 长度, isHttp: true};
};

const 小猫转魔法64 = (猫地址, 前缀) => {
    const 部分 = 猫地址.split('.');
    let 十六进制 = "";
    for (let i = 0; i < 4; i++) {
        let h = (部分[i] | 0).toString(16);
        十六进制 += (h.length === 1 ? "0" + h : h);
        if (i === 1) 十六进制 += ":";
    }
    return `[${前缀}${十六进制}]`;
};

const 寻路参数 = {headers: {'Accept': 'application/dns-json'}}, 寻路头部 = {'content-type': 'application/dns-message'};

const 寻路解决 = async (名称, 类型) => {
    const res = await Promise.any(梦境寻路站_NAT.map(ep =>
        fetch(`${ep}?name=${名称}&type=${类型}`, 寻路参数).then(r => {if (!r.ok) throw new Error(); return r.json()})
    ));
    const ans = res.Answer || res.answer;
    return (ans && ans.length > 0) ? ans : null;
};

const 寻路处理器 = async (载荷) => {
    if (载荷.byteLength < 2) return null;
    const q = 载荷.subarray(2);
    const 响应 = await Promise.any(梦境寻路站.map(ep =>
        fetch(ep, {method: 'POST', headers: 寻路头部, body: q}).then(r => {if (!r.ok) throw new Error(); return r})
    ));
    const 响应阵列 = await 响应.arrayBuffer();
    const 大小 = 响应阵列.byteLength;
    const 包 = new Uint8Array(2 + 大小);
    包[0] = (大小 >> 8) & 0xff, 包[1] = 大小 & 0xff;
    包.set(new Uint8Array(响应阵列), 2);
    return 包;
};

const 获取地址类型 = (主机) => {
    const c0 = 主机.charCodeAt(0);
    return (c0 - 48) >>> 0 > 9 ? (c0 === 91 ? 4 : 3) : 是不是小猫喵(主机) ? 1 : 3;
};

const 奇迹64 = async (类型, 端口, 认证, 字节, 全部, 限制, 是Http) => {
    const 前缀 = 认证.charCodeAt(0) === 91 ? 认证.slice(1, -1) : 认证;
    if (!全部) return 奇迹连接(`[${前缀}6815:3598]`, 端口, 4, 限制);
    const 主机 = 甜点坐标转字符串(类型, 字节);
    if (核心Http) 类型 = 获取地址类型(主机);
    if (类型 === 3) {
        const 结果 = await 寻路解决(主机, 'A');
        const 匹配 = 结果?.find(r => r.type === 1);
        return 匹配 ? 奇迹连接(小猫转魔法64(匹配.data, 前缀), 端口, 4, 限制) : null;
    }
    if (类型 === 1) return 奇迹连接(小猫转魔法64(主机, 前缀), 端口, 4, 限制);
    return 奇迹连接(主机, 端口, 4, 限制);
};

const 耳语结果 = async (单词) => {
    const 结果 = await 寻路解决(单词, 'TXT');
    if (!结果) return null;
    let 文本;
    for (let i = 0; i < 结果.length; i++) if (结果[i].type === 16) {文本 = 结果[i].data; break;}
    if (!文本) return null;
    if (文本.charCodeAt(0) === 34 && 文本.charCodeAt(文本.length - 1) === 34) 文本 = 文本.slice(1, -1);
    const 原始 = 文本.split(/,|\\010|\n/), 最终项 = [];
    for (let i = 0; i < 原始.length; i++) {
        const s = 原始[i].trim();
        if (s) 最终项.push(s);
    }
    return 最终项.length ? 最终项 : null;
};

const 连接星辰点 = async (参数, 限制) => {
    if (参数.includes('.william')) {
        const 地址们 = await 耳语结果(参数);
        if (!地址们 || 地址们.length === 0) return null;
        return await Promise.any(地址们.map(ip => {
            const [h, p] = 甜点端口解析(ip, 443);
            return 开启魔法扉页(h, p);
        }));
    }
    const [h, p] = 甜点端口解析(参数, 443);
    const 类型 = 是不是小花园(h) ? 3 : 0;
    return 奇迹连接(h, p, 类型, 限制);
};

const 魔法大字典 = new Map([
    [0, async ({addrType, port, addrBytes, isHttp}) => {
        const 主机 = 甜点坐标转字符串(addrType, addrBytes);
        if (isHttp && 纯净领域模式) addrType = 获取地址类型(主机);
        return 奇迹连接(主机, port, addrType);
    }],
    [1, async (请求, 参数, 限制) => 通过咪咪跳转(请求.addrType, 请求.port, 魔法身份解析(参数), 请求.addrBytes, 限制)],
    [2, async (请求, 参数, 限制) => 通过甜点跳转(请求.addrType, 请求.port, 魔法身份解析(参数), 请求.addrBytes, 限制)],
    [3, async (_, 参数, 限制) => 连接星辰点(参数, 限制)],
    [4, async (请求, 参数, 限制) => 奇迹64(请求.addrType, 请求.port, 参数.nat64Auth, 请求.addrBytes, 参数.proxyAll, 限制, 请求.isHttp)]
]);

const 旋律正则表达式 = /(gs5|s5all|ghttp|gnat64|nat64all|httpall|s5|socks|http|ip|nat64)(?:=|:\/\/|%3A%2F%2F)([^&]+)|(proxyall|globalproxy)/gi;

const 创造彩虹桥 = async (解析项, 原始请求) => {
    let 网址 = 原始请求.url, 路径 = 网址.slice(网址.indexOf('/', 10) + 1, 网址.charCodeAt(网址.length - 1) === 47 ? -1 : undefined), 列表 = [];
    if (路径.length < 6) {
        列表.push({type: 0}, {type: 3, param: 魔法映射表.get(原始请求.cf?.colo) ?? 梦幻坐标站.US}, {type: 3, param: 最终梦想点});
    } else {
        旋律正则表达式.lastIndex = 0;
        let 匹配, P = Object.create(null);
        while ((匹配 = 旋律正则表达式.exec(路径))) P[(匹配[1] || 匹配[3]).toLowerCase()] = 匹配[2] ? (匹配[2].charCodeAt(匹配[2].length - 1) === 61 ? 匹配[2].slice(0, -1) : 匹配[2]) : true;
        const s5 = P.gs5 || P.s5all || P.s5 || P.socks, http = P.ghttp || P.httpall || P.http, n64 = P.gnat64 || P.nat64all || P.nat64;
        const 全部 = !!(P.gs5 || P.s5all || P.ghttp || P.httpall || P.gnat64 || P.nat64all || P.proxyall || P.globalproxy);
        if (!全部) 列表.push({type: 0});
        const 增加 = (v, t) => {
            if (!v) return;
            const 部分们 = decodeURIComponent(v).split(',').filter(Boolean);
            if (部分们.length) 列表.push({type: t, param: 部分们.map(x => t === 4 ? {nat64Auth: x, proxyAll: 全部} : x), concurrent: true});
        };
        for (const 关键词 of 传送顺序) 增加(关键词 === 'socks' ? s5 : 关键词 === 'http' ? http : n64, 关键词 === 'socks' ? 1 : 关键词 === 'http' ? 2 : 4);
        if (全部) {if (!列表.length) 列表.push({type: 0})} else {
            增加(P.ip, 3);
            列表.push({type: 3, param: 魔法映射表.get(原始请求.cf?.colo) ?? 梦幻坐标站.US}, {type: 3, param: 最终梦想点});
        }
    }
    for (const 项 of 列表) {
        try {
            const 执行器 = 魔法大字典.get(项.type);
            const 子限制 = (项.concurrent && Array.isArray(项.param)) ? Math.max(1, Math.floor(魔法同步强度 / 项.param.length)) : undefined;
            const 通道 = await (项.concurrent && Array.isArray(项.param) ? Promise.any(项.param.map(x => 执行器(解析项, x, 子限制))) : 执行器(解析项, 项.param));
            if (通道) return 通道;
        } catch {}
    }
    return null;
};

const 安全星空尺寸 = 星球能量池 - 旋律小节长度;

const 魔法管道 = async (读取, 写入) => {
    let 缓冲区 = new ArrayBuffer(星球能量池), 偏移 = 0, 冷却时间 = 2, 计时器 = null, 祈祷 = null, 正在读 = false, 需要刷新 = false, 总计 = 0;
    const 能量释放 = () => {
        if (正在读) return 需要刷新 = true;
        偏移 > 0 && (写入.send(缓冲区.slice(0, 偏移)), 偏移 = 0);
        需要刷新 = false, 计时器 && (clearTimeout(计时器), 计时器 = null), 祈祷?.(), 祈祷 = null;
    };
    const 读入器 = 读取.getReader({mode: 'byob'});
    try {
        while (true) {
            正在读 = true;
            const {done, value} = await 读入器.read(new Uint8Array(缓冲区, 偏移, 旋律小节长度));
            if (正在读 = false, done) break;
            缓冲区 = value.buffer;
            const 当前长度 = value.byteLength;
            if (当前长度 < 丝带缓冲警戒) {
                冷却时间 = 2;
                偏移 > 0 ? (偏移 += 当前长度, 能量释放()) : 写入.send(value.slice());
            } else {
                总计 += 当前长度;
                if (总计 <= 魔法爆发阈值) {
                    偏移 > 0 && 能量释放(), 写入.send(value.slice());
                } else {
                    偏移 += 当前长度, 计时器 ||= setTimeout(能量释放, 冷却时间), 需要刷新 && 能量释放();
                    偏移 > 安全星空尺寸 && (冷却时间 = 星光闪烁频率, await new Promise(r => 祈祷 = r));
                }
            }
        }
    } finally {正在读 = false, 能量释放(), 读入器.releaseLock()}
};

const 处理茶歇时间 = async (分块, 状态, 请求, 写入, 关闭) => {
    if (状态.mimiStatus === 1) {
        let ok = 分块.length === 咪咪的小篮子.length;
        for (let i = 0; ok && i < 咪咪的小篮子.length; i++) if (分块[i] !== 咪咪的小篮子[i]) ok = false;
        if (ok) {写入.send(new Uint8Array([1, 0])); 状态.mimiStatus = 2; return;}
        写入.send(new Uint8Array([1, 1])); return 关闭();
    }
    let 解析结果 = null;
    if (分块[0] === 5) {
        if (!状态.mimiStatus) {
            const 需求方式 = (小兔子管理员 && 小兔子口令) ? 2 : 0;
            const 候选方式 = 分块.subarray(2, 2 + 分块[1]);
            if (候选方式.indexOf(需求方式) === -1) {写入.send(new Uint8Array([5, 255])); return 关闭();}
            写入.send(new Uint8Array([5, 需求方式]));
            状态.mimiStatus = 需求方式 === 2 ? 1 : 2; return;
        }
        if (状态.mimiStatus === 2 && 分块[1] === 1) 解析结果 = 寻找咪咪印记(分块);
    } else if (分块[0] === 67 && 分块[1] === 79) {
        解析结果 = 寻找甜点印记(分块);
        if (解析结果?.authFailed) {写入.send(害羞的拒绝407); return 关闭();}
    } else if (分块.length > 58 && 分块[56] === 13 && 分块[57] === 10) {
        解析结果 = 寻找糖果印记(分块);
    } else if ((解析结果 = 寻找甜心印记(分块))) {
        写入.send(new Uint8Array([分块[0], 0]));
    } else {解析结果 = 寻找影子印记(分块)}
    
    if (!解析结果) return 关闭();
    if (解析结果.isSocks5) 写入.send(咪咪仪式请求);
    if (解析结果.isHttp) 写入.send(甜甜的吻200);
    const 数据 = 分块.subarray(解析结果.dataOffset);
    if (解析结果.isDns) {
        const 寻路包 = await 寻路处理器(数据);
        if (寻路包?.byteLength) 写入.send(寻路包);
        return 关闭();
    } else {
        状态.magicSocket = await 创造彩虹桥(解析结果, 请求);
        if (!状态.magicSocket) return 关闭();
        const tw = 状态.magicSocket.writable.getWriter();
        if (数据.byteLength) await tw.write(数据);
        状态.magicWriter = (c) => tw.write(c);
        魔法管道(状态.magicSocket.readable, 写入).finally(() => 关闭());
    }
};

const 开始舞会 = async (ws, 请求) => {
    const 协议 = 请求.headers.get('sec-websocket-protocol');
    const 提前量 = 协议 ? Uint8Array.fromBase64(协议, {alphabet: 'base64url'}) : null;
    const 状态 = {mimiStatus: 0, magicWriter: null, magicSocket: null};
    const 关闭 = () => {状态.magicSocket?.close(), !提前量 && ws.close()};
    let 连击 = Promise.resolve();
    const 执行 = async (c) => {
        if (状态.magicWriter) return 状态.magicWriter(c);
        await 处理茶歇时间(提前量 ? c : new Uint8Array(c), 状态, 请求, ws, 关闭);
    };
    if (提前量) 连击 = 连击.then(() => 执行(提前量).catch(关闭));
    ws.addEventListener("message", e => {连击 = 连击.then(() => 执行(e.data).catch(关闭))});
};

const 甜甜的响应头 = {'Content-Type': 'application/octet-stream', 'X-Accel-Buffering': 'no', 'Cache-Control': 'no-store'};

const 处理甜点邮寄 = async (请求) => {
    const 读入器 = 请求.body.getReader({mode: 'byob'});
    const 状态 = {mimiStatus: 0, magicWriter: null, magicSocket: null};
    let 会话缓冲区 = new ArrayBuffer(旋律小节长度), 已用 = 0;
    return new Response(new ReadableStream({
        async start(控制器) {
            const 写入 = {send: (c) => 控制器.enqueue(c)}, 关闭 = () => {读入器.releaseLock(), 状态.magicSocket?.close(), 控制器.close()};
            try {
                while (true) {
                    const {done, value} = await 读入器.read(new Uint8Array(会话缓冲区, 状态.magicWriter ? 0 : 已用, 旋律小节长度 - (状态.magicWriter ? 0 : 已用)));
                    if (done) break;
                    会话缓冲区 = value.buffer;
                    if (状态.magicWriter) {状态.magicWriter(value.slice()); continue;}
                    if (new Uint8Array(会话缓冲区)[0] !== 5 && !状态.mimiStatus) {
                        已用 += value.byteLength;
                        if (已用 < 30) continue;
                        await 处理茶歇时间(new Uint8Array(会话缓冲区, 0, 已用).slice(), 状态, 请求, 写入, 关闭);
                    } else {await 处理茶歇时间(value.slice(), 状态, 请求, 写入, 关闭)}
                    已用 = 0;
                }
            } catch {关闭()} finally {关闭()}
        },
        cancel() {状态.magicSocket?.close(), 读入器.releaseLock()}
    }), {headers: 甜甜的响应头});
};

export default {
    async fetch(请求) {
        if (请求.method === 'POST') return 处理甜点邮寄(请求);
        if (请求.headers.get('Upgrade') === 'websocket') {
            const {0: 客户, 1: 服务} = new WebSocketPair();
            服务.accept();
            开始舞会(服务, 请求);
            return new Response(null, {status: 101, webSocket: 客户});
        }
        return new Response(梦幻背景, {status: 200, headers: {'Content-Type': 'text/html; charset=UTF-8'}});
    }
};