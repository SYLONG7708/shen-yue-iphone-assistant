#!/usr/bin/env node

const fs = require('fs')
const http = require('http')
const path = require('path')

const input = process.argv[2]
const port = Number(process.argv[3] || 8789)
if (!input || !fs.existsSync(input)) {
  console.error('Usage: node replay-integration-server.js <video-file> [port]')
  process.exit(2)
}

const filePath = path.resolve(input)
const stat = fs.statSync(filePath)
const fileName = path.basename(filePath)
const watchTemplatePath = path.resolve(__dirname, '../android-wrapper/app/src/main/assets/replay-local-watch.html')

function sendJson(response, value) {
  const body = Buffer.from(JSON.stringify(value))
  response.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store'
  })
  response.end(body)
}

function parseRange(value, size) {
  const match = /^bytes=(\d+)-(\d*)$/.exec(value || '')
  if (!match) return null
  const start = Number(match[1])
  const end = match[2] ? Math.min(size - 1, Number(match[2])) : size - 1
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= size) return false
  return { start, end }
}

const server = http.createServer((request, response) => {
  if (request.url.startsWith('/local-watch/testtoken')) {
    const boot = {
      token: 'testtoken',
      fileName,
      mimeType: 'video/mp4',
      size: stat.size,
      statusUrl: '/local-status/testtoken',
      downloadUrl: `/local-download/testtoken/${encodeURIComponent(fileName)}`,
      originalUrl: `/local-download/testtoken/${encodeURIComponent(fileName)}`,
      receiverUrl: 'shenyue-replay://download'
    }
    const html = fs.readFileSync(watchTemplatePath, 'utf8')
      .replace('__SHENYUE_BOOTSTRAP_JSON__', JSON.stringify(boot).replace(/<\//g, '<\\/'))
    const body = Buffer.from(html)
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': body.length,
      'Cache-Control': 'no-store'
    })
    response.end(body)
    return
  }

  if (request.url.startsWith('/local-status/testtoken')) {
    sendJson(response, {
      ok: true,
      status: 'done',
      progress: 100,
      message: '測試影片準備完成。',
      fileName,
      mimeType: 'video/mp4',
      size: stat.size
    })
    return
  }

  if (!request.url.startsWith('/local-download/testtoken/')) {
    response.writeHead(404, { 'Content-Type': 'text/plain' })
    response.end('Not Found')
    return
  }

  const range = parseRange(request.headers.range, stat.size)
  if (range === false) {
    response.writeHead(416, { 'Content-Range': `bytes */${stat.size}` })
    response.end()
    return
  }
  const start = range ? range.start : 0
  const end = range ? range.end : stat.size - 1
  const length = end - start + 1
  const headers = {
    'Content-Type': 'video/mp4',
    'Content-Length': length,
    'Accept-Ranges': 'bytes',
    'Content-Disposition': `attachment; filename="${fileName.replace(/"/g, '_')}"`,
    'Cache-Control': 'no-store'
  }
  if (range) headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`
  response.writeHead(range ? 206 : 200, headers)
  if (request.method === 'HEAD') {
    response.end()
    return
  }
  fs.createReadStream(filePath, { start, end }).pipe(response)
})

server.listen(port, '0.0.0.0', () => {
  console.log(`READY http://0.0.0.0:${port} ${fileName} ${stat.size}`)
})
