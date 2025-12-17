# 🚀 AI-Powered µCodeLab - Quick Setup Guide

## What's New?

Your µCodeLab now has **production-ready AI capabilities** powered by NVIDIA's advanced models! 

### ✨ Features Included

✅ **AI Chat Assistant** - Talk to AI about your embedded code  
✅ **Real-Time Code Analysis** - Automatic issue detection  
✅ **Code Completion** - Smart suggestions as you type  
✅ **Code Generation** - Generate code from descriptions  
✅ **Code Review** - Professional code review  
✅ **Error Debugging** - AI-powered error analysis  

## 5-Minute Setup

### Step 1️⃣ Get Your Free NVIDIA API Key (2 minutes)

```bash
# Visit this URL in your browser:
https://build.nvidia.com/
```

1. Click **Sign In** (create account if needed - it's free!)
2. Go to **"Manage"** → **"API Keys"** (or just click any model)
3. Click **"Get API Key"** 
4. Copy your key (looks like: `nvapi-xxx...`)

### Step 2️⃣ Add API Key to Project (1 minute)

```bash
# Create .env file in project root
echo NVIDIA_API_KEY=your_api_key_here > .env
```

Or manually create `.env` file:
```
NVIDIA_API_KEY=nvapi-xxxxxxxxxxxxx
```

⚠️ **IMPORTANT:** Never share this key! Add `.env` to `.gitignore`

### Step 3️⃣ Start the App (2 minutes)

```bash
# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

The app will open at `http://localhost:5000`

## Using AI in the Editor

### 📝 Open a Code File

1. Go to **Editor** page
2. Open any Arduino or MicroPython project
3. Open a code file
4. **AI Assistant panel appears on the right** ✨

### 💬 Chat with AI

Type your question in the "Chat" tab:
- "How do I read from an analog sensor?"
- "Why is my code crashing?"
- "Optimize this loop for memory"
- "Generate WiFi connection code"

### 🔍 Auto-Analysis

Switch to "Analysis" tab to see:
- ❌ Errors detected
- ⚠️ Warnings
- ℹ️ Info & suggestions
- Auto-updates as you code!

## File Structure

New AI files added:
```
client/src/
├── lib/
│   └── ai-service.ts          (AI client library)
├── hooks/
│   └── use-ai.ts              (React hooks for AI)
└── components/
    └── ai-assistant.tsx       (UI component)

server/
└── ai-routes.ts               (Backend API routes)
```

## Common Tasks

### Generate Code
In Chat tab: "Generate code to control an LED with PWM on ESP32"

### Debug an Error
In Chat tab: Paste error message + ask for help
Example: "Why do I get 'undefined reference to digitalWrite'?"

### Code Review
In Chat tab: "Review my code for memory efficiency"

### Analyze Code
Switch to Analysis tab - auto-detects issues

## Troubleshooting

### ❌ "NVIDIA_API_KEY not configured"
- Check `.env` file exists in project root
- Verify key is correct: starts with `nvapi-`
- Restart dev server: `npm run dev`

### ❌ API is slow/timing out
- Network issue or NVIDIA API under load
- Retry in a few seconds
- Check your internet connection

### ❌ "Failed to generate completions"
- Rate limit reached on free tier
- Try again in a minute
- Consider upgrading API tier

## Environment Variables

### Required
```
NVIDIA_API_KEY=your_api_key
```

### Optional
```
NVIDIA_API_ENDPOINT=https://integrate.api.nvidia.com/v1/chat/completions
NVIDIA_MODEL=meta/llama-2-70b-chat
```

## API Models Available

Default: `meta/llama-2-70b-chat`

Other available models:
- `mistral/mistral-7b-instruct-v0.2`
- `meta/llama-2-13b-chat`
- And many more at [NVIDIA Build](https://build.nvidia.com/)

## Security Notes

✅ **Safe to use**
- Code sent encrypted to NVIDIA
- No data stored permanently  
- Your API key stays in `.env` (not in git)

⚠️ **Best Practices**
- Don't commit `.env` to git
- Don't share your API key
- Rotate keys periodically
- Review sensitive code analysis results

## Architecture Overview

```
┌─────────────────────┐
│   User in Editor    │
└──────────┬──────────┘
           │
┌──────────▼──────────────┐
│  AI Assistant Component │  (/components/ai-assistant.tsx)
└──────────┬──────────────┘
           │
┌──────────▼────────────────┐
│   AI Service Client       │  (/lib/ai-service.ts)
└──────────┬────────────────┘
           │
┌──────────▼────────────────┐
│   API Routes              │  (/server/ai-routes.ts)
└──────────┬────────────────┘
           │
┌──────────▼────────────────┐
│  NVIDIA AI API            │
│  (Cloud-based inference)  │
└───────────────────────────┘
```

## Next Steps

1. ✅ Set up API key (already done!)
2. ✅ Start the app
3. 🎯 Try asking AI a question about your code
4. 📚 Read full guide: [AI_INTEGRATION_GUIDE.md](AI_INTEGRATION_GUIDE.md)
5. 🚀 Build amazing embedded code!

## Getting Help

### Resources
- [NVIDIA Build Platform](https://build.nvidia.com/)
- [Arduino Docs](https://docs.arduino.cc/)
- [MicroPython Docs](https://docs.micropython.org/)
- [Full AI Integration Guide](AI_INTEGRATION_GUIDE.md)

### Useful Prompts

**Learning:**
- "Explain how interrupts work in Arduino"
- "What's the difference between analog and digital pins?"
- "How do WiFi protocols work?"

**Debugging:**
- "I got error: expected ')' before 'void', find the bug"
- "My ESP32 keeps resetting, what could be wrong?"
- "How do I debug serial communication issues?"

**Optimization:**
- "Optimize this code for memory usage"
- "How can I reduce power consumption?"
- "Make this loop more efficient"

**Generation:**
- "Generate code to read a temperature sensor"
- "Create a webserver for controlling LEDs"
- "Write a function for WiFi connection with retry logic"

## Pro Tips 💡

1. **Share context** - Mention your hardware/board
2. **Ask specific questions** - AI works best with details
3. **Use Analysis tab** - Catch issues before deployment
4. **Test on hardware** - Always verify AI suggestions
5. **Iterate** - Ask follow-up questions for refinement

## What's Possible Now?

✨ Write code faster with AI assistance  
🐛 Debug issues with AI insights  
📚 Learn embedded systems concepts  
🎯 Get professional code reviews  
⚡ Optimize for performance & memory  
🔒 Follow security best practices  

---

**Ready? Start coding with AI! 🚀**

Questions? Check [AI_INTEGRATION_GUIDE.md](AI_INTEGRATION_GUIDE.md) for detailed documentation.
