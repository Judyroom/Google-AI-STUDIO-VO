# Resona AI · 语音合成与音色设计工坊

基于 Google Gemini API（`gemini-3.8-flash-lite-tts` 与 `gemini-3.8-flash-tts`）的中英双语语音合成工具，并支持用 Gemini Voice Design 通过一段文字描述设计专属 AI 音色。

---

## ✨ 核心特性

- 🎙️ **中英双语语音合成**：5 个 Gemini 预置音色，可选演绎风格、自定义风格指令，以及 `<breath>`、`<laugh>` 等语气标记。
- 🪄 **音色设计（Voice Design）**：用自然语言描述想要的声音（性别年龄、音色质感、语速语调、使用场景），生成一个保存在 Gemini 项目中的全新 AI 音色，可在语音合成中反复使用。不基于任何真人声音。
- 🔁 **双模型自动切换**：一个模型额度繁忙时自动切换到另一个。
- 🕘 **生成历史**：本地保存最近的生成记录，支持回放、下载 WAV 和重新载入文本。

---

## 🚀 本地运行与部署

### 1. 克隆 / 下载项目代码
```bash
git clone <你的 GitHub 仓库地址>
cd <项目目录>
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
复制根目录下的 `.env.example` 为 `.env`：
```bash
cp .env.example .env
```
在 `.env` 中填入你的 Google Gemini API Key：
```env
GEMINI_API_KEY="你的_GEMINI_API_KEY"
PORT=3000
```
> 💡 提示：可以在 [Google AI Studio 控制台](https://aistudio.google.com/apikey) 免费申请 API Key。

### 4. 启动本地开发服务
```bash
npm run dev
```
启动成功后，在浏览器访问 `http://localhost:3000` 即可开始使用。

---

## 📦 生产环境打包与部署

### 本地编译生产版本
```bash
npm run build
npm start
```

### 部署到云平台（如 Railway、Render、Zeabur、Docker 或 Vercel）
- **Node.js 环境**：要求 Node.js 18+ 或 20+。
- **启动命令 (Start Command)**：`npm start`
- **构建命令 (Build Command)**：`npm run build`
- **环境变量 (Environment Variables)**：配置 `GEMINI_API_KEY`。
