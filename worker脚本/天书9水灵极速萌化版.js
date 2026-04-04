import { connect } from "cloudflare:sockets";

// 这里的密钥现在是小熊的魔法口令啦
let 这里的草莓味魔法口令 = "x888x888-8888-8888-8888-x888x888x888";
let 远方的星星坐标 = "sg.wogg.us.kg";

export default {
  async fetch(小饼干请求) {
    const 看看是不是亮闪闪的升级 = 小饼干请求.headers.get("Upgrade");
    const 这里的地图 = new URL(小饼干请求.url);
    
    if (看看是不是亮闪闪的升级 === "websocket") {
      if (这里的地图.searchParams.has("ip")) {
        远方的星星坐标 = 这里的地图.searchParams.get("ip");
      }
      return await 开启粉红传送门();
    }
    return new Response(null);
  },
};

async function 开启粉红传送门() {
  const 双胞胎星星 = new WebSocketPair();
  const [小奶油, 这里的出口] = Object.values(双胞胎星星);
  
  这里的出口.accept();
  // 握个手，嘿咻！
  这里的出口.send(new Uint8Array([0, 0]));
  
  开始魔法接力(这里的出口);
  
  return new Response(null, { status: 101, webSocket: 小奶油 });
}

async function 开始魔法接力(这里的出口) {
  let 魔法管道,
    是不是第一次见面 = false,
    排排队处理 = Promise.resolve(),
    正在搬运的糖果;

  这里的出口.addEventListener("message", async (闪亮事件) => {
    排排队处理 = 排排队处理.then(async () => {
      if (!是不是第一次见面) {
        是不是第一次见面 = true;
        await 拆开魔法礼包(闪亮事件.data);
      } else {
        await 正在搬运的糖果.write(闪亮事件.data);
      }
    });
  });

  async function 拆开魔法礼包(礼包内容) {
    if (校验魔法口令(new Uint8Array(礼包内容.slice(1, 17))) !== 这里的草莓味魔法口令) {
      return new Response(null);
    }

    const 发现宝藏位置 = new Uint8Array(礼包内容)[17];
    const 寻找门牌号索引 = 18 + 发现宝藏位置 + 1;
    const 门牌号小盒子 = 礼包内容.slice(寻找门牌号索引, 寻找门牌号索引 + 2);
    const 最终目的地门牌号 = new DataView(门牌号小盒子).getUint16(0);
    
    const 寻找目的地索引 = 寻找门牌号索引 + 2;
    const 目的地类型盒子 = new Uint8Array(礼包内容.slice(寻找目的地索引, 寻找目的地索引 + 1));
    const 它是哪种小动物 = 目的地类型盒子[0];

    let 目的地长度 = 0;
    let 最终目的地坐标 = "";
    let 详细情报索引 = 寻找目的地索引 + 1;

    switch (它是哪种小动物) {
      case 1:
        目的地长度 = 4;
        最终目的地坐标 = new Uint8Array(礼包内容.slice(详细情报索引, 详细情报索引 + 目的地长度)).join(".");
        break;
      case 2:
        目的地长度 = new Uint8Array(礼包内容.slice(详细情报索引, 详细情报索引 + 1))[0];
        详细情报索引 += 1;
        最终目的地坐标 = new TextDecoder().decode(礼包内容.slice(详细情报索引, 详细情报索引 + 目的地长度));
        break;
      case 3:
        目的地长度 = 16;
        const 魔法视图 = new DataView(礼包内容.slice(详细情报索引, 详细情报索引 + 目的地长度));
        const 亮闪闪坐标 = [];
        for (let i = 0; i < 8; i++) {
          亮闪闪坐标.push(魔法视图.getUint16(i * 2).toString(16));
        }
        最终目的地坐标 = 亮闪闪坐标.join(":");
        break;
      default:
        return new Response(null);
    }

    const 剩下的甜点 = 礼包内容.slice(详细情报索引 + 目的地长度);

    try {
      魔法管道 = connect({ hostname: 最终目的地坐标, port: 最终目的地门牌号 });
      await 魔法管道.opened;
    } catch {
      const [备用星星, 备用门牌 = 最终目的地门牌号] = 远方的星星坐标.split(":");
      魔法管道 = connect({ hostname: 备用星星, port: 备用门牌 });
    }

    搭建爱心桥梁(剩下的甜点);
  }

  function 校验魔法口令(数组, 偏移 = 0) {
    const 咒语 = (转换色彩格式[数组[偏移 + 0]] + 转换色彩格式[数组[偏移 + 1]] + 转换色彩格式[数组[偏移 + 2]] + 转换色彩格式[数组[偏移 + 3]] + "-" + 转换色彩格式[数组[偏移 + 4]] + 转换色彩格式[数组[偏移 + 5]] + "-" + 转换色彩格式[数组[偏移 + 6]] + 转换色彩格式[数组[偏移 + 7]] + "-" + 转换色彩格式[数组[偏移 + 8]] + 转换色彩格式[数组[偏移 + 9]] + "-" + 转换色彩格式[数组[偏移 + 10]] + 转换色彩格式[数组[偏移 + 11]] + 转换色彩格式[数组[偏移 + 12]] + 转换色彩格式[数组[偏移 + 13]] + 转换色彩格式[数组[偏移 + 14]] + 转换色彩格式[数组[偏移 + 15]]).toLowerCase();
    return 咒语;
  }

  const 转换色彩格式 = [];
  for (let i = 0; i < 256; ++i) {
    转换色彩格式.push((i + 256).toString(16).slice(1));
  }

  async function 搭建爱心桥梁(剩下的甜点) {
    正在搬运的糖果 = 魔法管道.writable.getWriter();
    if (剩下的甜点) await 正在搬运的糖果.write(剩下的甜点);
    
    魔法管道.readable.pipeTo(
      new WritableStream({
        async write(亮晶晶数据) {
          这里的出口.send(亮晶晶数据);
        },
      })
    );
  }
}