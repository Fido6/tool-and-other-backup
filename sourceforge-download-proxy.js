addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)

  // 如果路径不是根路径，则尝试反代
  if (url.pathname !== '/') {
    const targetUrl = decodeURIComponent(url.pathname.substring(1))
    
    // 简单验证是否包含 dl.sourceforge.net
    if (!targetUrl.includes('dl.sourceforge.net')) {
      return new Response('无效的下载链接', { status: 400 })
    }

    // 判断是否是特定路径下的请求
    let shouldForwardHeaders = false
    if (targetUrl.startsWith('https://downloads.sourceforge.net/project/ababa/')) {
      shouldForwardHeaders = true
    }

    try {
      // 中转请求到目标地址，根据是否需要转发请求头决定 headers 的传递
      const response = await fetch(targetUrl, { 
        method: request.method,
        headers: shouldForwardHeaders ? request.headers : {},
        redirect: 'manual' // 手动处理重定向
      })

      // 构建新的响应头，确保 CORS 允许浏览器访问
      const newHeaders = new Headers(response.headers)
      newHeaders.set('Access-Control-Allow-Origin', '*')

      // 如果是重定向响应，直接返回
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        return new Response(response.body, {
          status: response.status,
          headers: newHeaders
        })
      }

      // 如果响应是 HTML，则替换其中的链接
      if (response.headers.get('content-type')?.includes('text/html')) {
        const html = await response.text()
        // 修复正则表达式，移除多余的反斜杠
        const modifiedHtml = html.replace(/https?:\/\/(?:dl\.|www\.)?sourceforge\.net/g, 'https://' + url.host)
        return new Response(modifiedHtml, {
          status: response.status,
          headers: newHeaders
        })
      } else {
        // 提取并设置正确的文件名
        // 从原始URL中提取文件名
        const urlObj = new URL(targetUrl);
        const pathSegments = urlObj.pathname.split('/');
        let filename = pathSegments[pathSegments.length - 1];
        
        // 如果URL中包含查询参数，尝试从中提取文件名
        if (filename.includes('?')) {
          filename = filename.split('?')[0];
        }
        
        // 解码文件名
        filename = decodeURIComponent(filename);
        
        // 设置Content-Disposition头
        newHeaders.set('Content-Disposition', `attachment; filename="${filename}"`);
        
        return new Response(response.body, {
          status: response.status,
          headers: newHeaders
        })
      }
    } catch (err) {
      return new Response('请求失败: ' + err.message, { status: 500 })
    }
  }

  // 返回前端页面
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  })
}

// 修改HTML部分，更新为Material You风格设计
const html = `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Sourceforge 反代</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
  <style>
    /* CSS变量定义，方便主题切换 */
    :root {
      --primary-color: #3f51b5;
      --primary-variant: #303f9f;
      --secondary-color: #ff4081;
      --background-color: #f5f5f5;
      --surface-color: #ffffff;
      --error-color: #f44336;
      --text-primary: #212121;
      --text-secondary: #757575;
      --border-color: #e0e0e0;
      --shadow-elevation-1: 0 2px 5px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.24);
      --shadow-elevation-2: 0 4px 10px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.12);
      --border-radius: 12px;
      --transition: all 0.3s cubic-bezier(.25,.8,.25,1);
    }

    /* 基础样式重置 */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Roboto', sans-serif;
      background-color: var(--background-color);
      color: var(--text-primary);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
      margin: 0;
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(63, 81, 181, 0.05) 0%, transparent 25%),
        radial-gradient(circle at 90% 80%, rgba(255, 64, 129, 0.05) 0%, transparent 25%);
    }

    /* 容器样式 - 确保居中并响应式 */
    .container {
      width: 100%;
      max-width: 500px;
      padding: 32px;
      background-color: var(--surface-color);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-elevation-2);
      transition: var(--transition);
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* 标题样式 */
    h1 {
      text-align: center;
      color: var(--primary-color);
      font-weight: 500;
      font-size: 28px;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }

    /* 输入容器样式 */
    .input-container {
      position: relative;
      margin: 0;
    }

    .input-container input {
      width: 100%;
      padding: 16px 12px 16px 52px;
      font-size: 16px;
      border: 2px solid var(--border-color);
      border-radius: var(--border-radius);
      background-color: var(--surface-color);
      color: var(--text-primary);
      transition: var(--transition);
      outline: none;
    }

    .input-container input:focus {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(63, 81, 181, 0.1);
    }

    .input-container input::placeholder {
      color: var(--text-secondary);
    }

    /* 输入框图标 */
    .input-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
      font-size: 20px;
    }

    /* 按钮容器样式 */
    .button-container {
      display: flex;
      justify-content: center;
    }

    .button-container button {
      padding: 14px 28px;
      font-size: 16px;
      font-weight: 500;
      color: white;
      background-color: var(--primary-color);
      border: none;
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: var(--transition);
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 120px;
      justify-content: center;
    }

    .button-container button:hover:not(:disabled) {
      background-color: var(--primary-variant);
      box-shadow: var(--shadow-elevation-1);
      transform: translateY(-1px);
    }

    .button-container button:active:not(:disabled) {
      transform: translateY(0);
    }

    .button-container button:disabled {
      background-color: var(--border-color);
      color: var(--text-secondary);
      cursor: not-allowed;
      transform: none;
    }

    /* 警告信息样式 */
    #warning {
      color: var(--error-color);
      margin-top: 4px;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 20px;
    }

    /* 信息提示卡片 */
    .info-card {
      background-color: rgba(63, 81, 181, 0.05);
      border-left: 4px solid var(--primary-color);
      padding: 16px;
      border-radius: 0 var(--border-radius) var(--border-radius) 0;
      font-size: 14px;
      color: var(--text-secondary);
      margin-top: 8px;
    }

    .info-card p {
      margin: 0;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    /* 页脚样式 */
    footer {
      margin-top: 24px;
      color: var(--text-secondary);
      font-size: 12px;
      text-align: center;
    }

    /* 响应式设计 */
    @media (max-width: 600px) {
      .container {
        padding: 24px;
        margin: 16px;
      }
      
      h1 {
        font-size: 24px;
      }
    }

    /* Material You风格的动画 */
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .container {
      animation: fadeIn 0.5s ease-out;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>
      <i class="material-icons">get_app</i>
      Sourceforge 反代
    </h1>
    
    <div class="input-container">
      <i class="material-icons input-icon">link</i>
      <input type="text" id="downloadUrl" placeholder="请输入 dl.sourceforge.net 的下载链接" />
    </div>
    
    <div id="warning"></div>
    
    <div class="button-container">
      <button id="downloadBtn" disabled>
        <i class="material-icons">download</i>
        下载
      </button>
    </div>
    
    <div class="info-card">
      <p>
        <i class="material-icons">info</i>
        该工具仅用于代理 dl.sourceforge.net 的下载链接，确保链接格式正确。
      </p>
    </div>
  </div>
  <script>
    const input = document.getElementById('downloadUrl')
    const btn = document.getElementById('downloadBtn')
    const warning = document.getElementById('warning')

    input.addEventListener('input', () => {
      const url = input.value.trim()

      if (!url.includes('dl.sourceforge.net')) {
        btn.disabled = true
        warning.innerHTML = '<i class="material-icons">error</i> 请输入带有 dl.sourceforge.net 的下载链接'
        return
      }

      if (!url.endsWith('?viasf=1')) {
        input.value = url + (url.includes('?') ? '&' : '?') + 'viasf=1'
      }

      warning.textContent = ''
      btn.disabled = false
    })

    btn.addEventListener('click', () => {
      const url = input.value.trim()
      const encodedUrl = encodeURIComponent(url)
      window.location.href = '/' + encodedUrl
    })
  </script>
</body>
</html>`