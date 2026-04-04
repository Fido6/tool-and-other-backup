export default {
  async fetch(request, env) {

    if (request.method === "GET") {
      return new Response(html, {
        headers: { "content-type": "text/html;charset=UTF-8" }
      });
    }

    if (request.method === "POST") {
      try {
        const { messages, model } = await request.json();

        const stream = await env.AI.run(model, {
          messages,
          stream: true
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache"
          }
        });

      } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    return new Response("Method Not Allowed", { status: 405 });
  }
};

const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Workers AI 聊天室</title>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<style>
body { font-family: Arial; max-width: 800px; margin: 30px auto; }
#chat { border:1px solid #ccc; padding:15px; min-height:400px; overflow-y:auto; }
textarea { width:100%; height:80px; }
button { padding:8px 15px; margin-top:10px; }
select { padding:6px; }
.msg-user { margin:10px 0; }
.msg-ai { margin:10px 0; color:#0066cc; }
.controls { margin-bottom:15px; display:flex; gap:10px; }
</style>
</head>
<body>

<h2>Workers AI 流式聊天室</h2>

<div class="controls">
<select id="model">
<option value="@cf/zai-org/glm-4.7-flash" selected>GLM 4.7 Flash</option>
<option value="@cf/qwen/qwen3-30b-a3b-fp8">Qwen 3 30B</option>
<option value="@cf/meta/llama-4-scout-17b-16e-instruct">Llama 4 Scout</option>
</select>

<button onclick="clearChat()">清空对话</button>
</div>

<div id="chat"></div>

<textarea id="message" placeholder="输入你的问题..."></textarea>
<br>
<button onclick="send()">发送</button>

<script>

let history = [
  { role: "system", content: "你是一个专业、简洁、回答准确的AI助手。" }
];

function clearChat() {
  history = [
    { role: "system", content: "你是一个专业、简洁、回答准确的AI助手。" }
  ];
  document.getElementById("chat").innerHTML = "";
}

async function send() {
  const input = document.getElementById("message");
  const message = input.value.trim();
  if (!message) return;

  const model = document.getElementById("model").value;
  const chat = document.getElementById("chat");

  history.push({ role: "user", content: message });

  chat.innerHTML += "<div class='msg-user'><b>👤 你：</b><br>" + message + "</div>";
  chat.innerHTML += "<div class='msg-ai'><b>🤖 AI：</b><div id='stream'></div></div>";

  input.value = "";

  const response = await fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: history, model })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const streamEl = document.getElementById("stream");

  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.replace("data: ", "").trim();

      if (data === "[DONE]") {
        history.push({ role: "assistant", content: fullText });
        return;
      }

      try {
        const json = JSON.parse(data);
        const content = json.choices?.[0]?.delta?.content;
        if (content) {
          fullText += content;
          streamEl.innerHTML = marked.parse(fullText);
          chat.scrollTop = chat.scrollHeight;
        }
      } catch (e) {}
    }
  }
}

</script>
</body>
</html>
`;