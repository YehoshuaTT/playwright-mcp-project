const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3500;

// Middleware
app.use(cors());
app.use(express.json({ limit: '51mb' }));

// Global variables
let browser = null;
let context = null;
let page = null;

// Initialize browser
async function initBrowser() {
  try {
    console.log(' Initializing Playwright browser...');
    browser = await chromium.launch({ 
      headless: process.env.HEADLESS !== 'false',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    page = await context.newPage();
    console.log(' Browser initialized successfully');
    return true;
  } catch (error) {
    console.error(' Failed to initialize browser:', error);
    return false;
  }
}

// MCP Server Protocol Implementation
const mcpMethods = {
  'tools/list': async () => ({
    tools: [
      {
        name: 'navigate',
        description: 'Navigate to a URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL to navigate to' }
          },
          required: ['url']
        }
      },
      {
        name: 'screenshot',
        description: 'Take a screenshot',
        inputSchema: {
          type: 'object',
          properties: {
            fullPage: { type: 'boolean', description: 'Capture full page' }
          }
        }
      },
      {
        name: 'extract_text',
        description: 'Extract text from page or element',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector (optional)' }
          }
        }
      },
      {
        name: 'click',
        description: 'Click on an element',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector' }
          },
          required: ['selector']
        }
      },
      {
        name: 'fill_form',
        description: 'Fill form field',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector' },
            text: { type: 'string', description: 'Text to fill' }
          },
          required: ['selector', 'text']
        }
      },
      {
        name: 'wait_for_element',
        description: 'Wait for element to appear',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector' },
            timeout: { type: 'number', description: 'Timeout in ms' }
          },
          required: ['selector']
        }
      }
    ]
  }),

  'tools/call': async (params) => {
    const { name, arguments: args } = params;
    
    if (!page) {
      await initBrowser();
    }

    try {
      switch (name) {
        case 'navigate':
          await page.goto(args.url, { waitUntil: 'networkidle' });
          const title = await page.title();
          return {
            content: [{
              type: 'text',
              text: ` Navigated to: ${args.url}\nTitle: ${title}`
            }]
          };

        case 'screenshot':
          const screenshot = await page.screenshot({ 
            fullPage: args.fullPage || false,
            type: 'png'
          });
          const screenshotPath = `/app/screenshots/screenshot_${Date.now()}.png`;
          await fs.writeFile(screenshotPath, screenshot);
          
          return {
            content: [{
              type: 'text',
              text: ` Screenshot saved to: ${screenshotPath}`
            }, {
              type: 'image',
              data: screenshot.toString('base64'),
              mimeType: 'image/png'
            }]
          };

        case 'extract_text':
          let text;
          if (args.selector) {
            text = await page.textContent(args.selector);
          } else {
            text = await page.textContent('body');
          }
          return {
            content: [{
              type: 'text',
              text: ` Extracted text:\n${text}`
            }]
          };

        case 'click':
          await page.click(args.selector);
          return {
            content: [{
              type: 'text',
              text: ` Clicked on: ${args.selector}`
            }]
          };

        case 'fill_form':
          await page.fill(args.selector, args.text);
          return {
            content: [{
              type: 'text',
              text: ` Filled ${args.selector} with: ${args.text}`
            }]
          };

        case 'wait_for_element':
          await page.waitForSelector(args.selector, { 
            timeout: args.timeout || 30000 
          });
          return {
            content: [{
              type: 'text',
              text: `Element found: ${args.selector}`
            }]
          };

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: ` Error: ${error.message}`
        }],
        isError: true
      };
    }
  }
};

// REST API Routes (for testing)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    browser: browser ? 'Connected' : 'Disconnected'
  });
});

app.post('/api/navigate', async (req, res) => {
  try {
    const result = await mcpMethods['tools/call']({
      name: 'navigate',
      arguments: req.body
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/screenshot', async (req, res) => {
  try {
    const result = await mcpMethods['tools/call']({
      name: 'screenshot',
      arguments: req.body
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket for MCP protocol
const wss = new WebSocket.Server({ port: 3001 });

wss.on('connection', (ws) => {
  console.log('🔌 MCP client connected');
  
  ws.on('message', async (message) => {
    try {
      const request = JSON.parse(message.toString());
      const { id, method, params } = request;
      
      if (mcpMethods[method]) {
        const result = await mcpMethods[method](params);
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id,
          result
        }));
      } else {
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          }
        }));
      }
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: error.message
        }
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 MCP client disconnected');
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log(' Shutting down...');
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});

// Start server
app.listen(PORT, async () => {
  console.log(`   Playwright MCP Server running on:`);
  console.log(`   HTTP: http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:3001`);
  console.log('');
  
  const browserReady = await initBrowser();
  if (browserReady) {
    console.log(' Server ready for Claude Desktop connection!');
  } else {
    console.log('  Server started but browser initialization failed');
  }
});