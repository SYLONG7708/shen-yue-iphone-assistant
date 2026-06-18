(function () {
  var SETTINGS_KEY = 'replay-center-compat-settings'
  var selectedFile = null
  var selectedObjectUrl = ''
  var lastWatchUrl = ''
  var preferredHost = 'https://shanghai-hiv-teens-halifax.trycloudflare.com'

  var defaults = {
    endpoint: preferredHost + '/api/upload/{filename}',
    oneTimeEndpoint: preferredHost + '/api/one-time-links',
    mode: 'PUT',
    token: '',
  }

  var el = {
    runtimeBadge: byId('runtimeBadge'),
    statusBox: byId('statusBox'),
    statusText: byId('statusText'),
    endpointInput: byId('endpointInput'),
    oneTimeInput: byId('oneTimeInput'),
    modeInput: byId('modeInput'),
    tokenInput: byId('tokenInput'),
    pingButton: byId('pingButton'),
    pickButton: byId('pickButton'),
    fileInput: byId('fileInput'),
    fileName: byId('fileName'),
    fileMeta: byId('fileMeta'),
    progressBar: byId('progressBar'),
    uploadButton: byId('uploadButton'),
    shareButton: byId('shareButton'),
    resetButton: byId('resetButton'),
    previewVideo: byId('previewVideo'),
    emptyPreview: byId('emptyPreview'),
    qrWrap: byId('qrWrap'),
    openWatchButton: byId('openWatchButton'),
    copyWatchButton: byId('copyWatchButton'),
    resultBox: byId('resultBox'),
  }

  init()

  function byId(id) {
    return document.getElementById(id)
  }

  function init() {
    var settings = readSettings()
    el.endpointInput.value = settings.endpoint || defaults.endpoint
    el.oneTimeInput.value = settings.oneTimeEndpoint || defaults.oneTimeEndpoint
    el.modeInput.value = settings.mode || defaults.mode
    el.tokenInput.value = settings.token || ''

    bindInputs()
    setStatus('ready', '已套用公開 HTTPS 上傳伺服器 ' + preferredHost + '，請選擇影片上傳。')
    window.setTimeout(pingServer, 400)

    if (window.Capacitor) {
      el.runtimeBadge.innerHTML = 'Capacitor WebView 相容模式'
    }
  }

  function bindInputs() {
    var inputs = [el.endpointInput, el.oneTimeInput, el.modeInput, el.tokenInput]
    for (var i = 0; i < inputs.length; i += 1) {
      inputs[i].addEventListener('change', saveSettings)
      inputs[i].addEventListener('input', saveSettings)
    }

    var hostButtons = document.querySelectorAll('[data-host]')
    for (var h = 0; h < hostButtons.length; h += 1) {
      hostButtons[h].addEventListener('click', function () {
        applyHost(this.getAttribute('data-host'))
      })
    }

    el.pingButton.addEventListener('click', pingServer)
    el.pickButton.addEventListener('click', function () {
      el.fileInput.click()
    })
    el.fileInput.addEventListener('change', function () {
      handleFile(el.fileInput.files && el.fileInput.files[0])
    })
    el.uploadButton.addEventListener('click', uploadAndCreateShare)
    el.shareButton.addEventListener('click', shareCurrentLink)
    el.resetButton.addEventListener('click', resetFile)
    el.copyWatchButton.addEventListener('click', function () {
      copyText(lastWatchUrl)
    })
  }

  function readSettings() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY)
      if (!raw) return defaults
      var saved = JSON.parse(raw)
      if (usesPrivateNetworkHost(saved.endpoint) || usesPrivateNetworkHost(saved.oneTimeEndpoint)) {
        return defaults
      }
      return {
        endpoint: saved.endpoint || defaults.endpoint,
        oneTimeEndpoint: saved.oneTimeEndpoint || defaults.oneTimeEndpoint,
        mode: saved.mode || defaults.mode,
        token: saved.token || '',
      }
    } catch (error) {
      return defaults
    }
  }

  function saveSettings() {
    var settings = {
      endpoint: el.endpointInput.value,
      oneTimeEndpoint: el.oneTimeInput.value,
      mode: el.modeInput.value,
      token: el.tokenInput.value,
    }
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch (error) {
      return
    }
  }

  function applyHost(host) {
    if (!host) return
    el.endpointInput.value = host + '/api/upload/{filename}'
    el.oneTimeInput.value = host + '/api/one-time-links'
    el.modeInput.value = 'PUT'
    saveSettings()
    setStatus('ready', '已套用測試伺服器：' + host)
  }

  function usesPrivateNetworkHost(value) {
    return /\/\/(10\.0\.2\.2|127\.0\.0\.1|localhost|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:|\/)/i.test(String(value || ''))
  }

  function setStatus(type, text) {
    el.statusBox.className = 'notice'
    if (type === 'error') el.statusBox.className += ' error'
    if (type === 'busy') el.statusBox.className += ' busy'
    el.statusText.innerHTML = text
  }

  function setProgress(percent) {
    var value = Math.max(0, Math.min(100, percent || 0))
    el.progressBar.style.width = value + '%'
  }

  function handleFile(file) {
    if (!file) return
    if (file.type && file.type.indexOf('video/') !== 0 && !/\.(mp4|m4v|mov|mkv|webm)$/i.test(file.name)) {
      setStatus('error', '請選擇影片檔。')
      return
    }

    selectedFile = file
    lastWatchUrl = ''
    setProgress(0)
    el.fileName.innerHTML = escapeHtml(file.name)
    el.fileMeta.innerHTML = formatBytes(file.size) + ' / ' + (file.type || 'video')
    el.uploadButton.disabled = false
    el.shareButton.disabled = true
    el.resultBox.innerHTML = '已選擇影片，等待上傳。'
    resetQr()

    if (selectedObjectUrl) URL.revokeObjectURL(selectedObjectUrl)
    selectedObjectUrl = URL.createObjectURL(file)
    el.previewVideo.src = selectedObjectUrl
    el.previewVideo.className = ''
    el.emptyPreview.className = 'hidden'
    setStatus('ready', '影片已加入待上傳清單：' + escapeHtml(file.name))
  }

  function resetFile() {
    selectedFile = null
    lastWatchUrl = ''
    if (selectedObjectUrl) URL.revokeObjectURL(selectedObjectUrl)
    selectedObjectUrl = ''
    el.fileInput.value = ''
    el.fileName.innerHTML = '選擇 MP4 / MOV / MKV 影片'
    el.fileMeta.innerHTML = '點擊後從雷霆模擬器選檔'
    el.previewVideo.removeAttribute('src')
    el.previewVideo.className = 'hidden'
    el.emptyPreview.className = 'empty-preview'
    el.uploadButton.disabled = true
    el.shareButton.disabled = true
    setProgress(0)
    resetQr()
    el.resultBox.innerHTML = '尚未產生連結'
    setStatus('ready', '已清除，請重新選擇影片。')
  }

  function resetQr() {
    el.qrWrap.innerHTML =
      '<div><strong>等待上傳完成</strong><p class="muted">完成後會顯示手機掃碼觀看與下載連結。</p></div>'
    el.openWatchButton.href = '#'
    el.openWatchButton.className = 'link-button is-disabled'
    el.copyWatchButton.disabled = true
    el.shareButton.disabled = true
  }

  function pingServer() {
    var oneTimeUrl = el.oneTimeInput.value
    var base = oneTimeUrl.replace(/\/api\/one-time-links.*$/, '')
    if (!base) {
      setStatus('error', '請先填入一次性 QR API。')
      return
    }

    setStatus('busy', '正在測試連線：' + escapeHtml(base))
    request('GET', base + '/', null, {}, function (error, responseText) {
      if (error) {
        setStatus('error', '連線失敗：' + escapeHtml(error.message || error))
        return
      }
      setStatus('ready', '連線成功。伺服器回應：' + escapeHtml(shortText(responseText, 160)))
    })
  }

  function uploadAndCreateShare() {
    if (!selectedFile) {
      setStatus('error', '請先選擇影片。')
      return
    }

    var endpoint = el.endpointInput.value
    if (!endpoint) {
      setStatus('error', '請填入上傳 API。')
      return
    }

    saveSettings()
    el.uploadButton.disabled = true
    el.shareButton.disabled = true
    setProgress(0)
    setStatus('busy', '正在上傳影片，請保持網路連線。')

    uploadFile(selectedFile, function (error, uploadResult) {
      if (error) {
        el.uploadButton.disabled = false
        setStatus('error', '上傳失敗：' + escapeHtml(error.message || error))
        return
      }

      setProgress(100)
      var publicUrl = uploadResult.publicUrl || uploadResult.shareUrl || uploadResult.url || ''
      if (!publicUrl) {
        el.uploadButton.disabled = false
        setStatus('error', '上傳完成，但伺服器沒有回傳 publicUrl / shareUrl / url。')
        return
      }

      setStatus('busy', '上傳完成，正在建立一次性觀看連結。')
      createOneTimeLink(publicUrl, uploadResult, function (shareError, shareResult) {
        el.uploadButton.disabled = false
        if (shareError) {
          setStatus('error', '一次性 QR 建立失敗：' + escapeHtml(shareError.message || shareError))
          el.resultBox.innerHTML = '影片已上傳：<br>' + escapeHtml(publicUrl)
          return
        }

        showShare(shareResult, publicUrl)
      })
    })
  }

  function uploadFile(file, done) {
    var endpoint = resolveUploadEndpoint(el.endpointInput.value, file.name)
    var headers = {}
    if (el.tokenInput.value) headers.Authorization = 'Bearer ' + el.tokenInput.value

    if (el.modeInput.value === 'POST') {
      var form = new FormData()
      form.append('file', file, file.name)
      request('POST', endpoint, form, headers, parseJsonDone(done), onUploadProgress)
      return
    }

    headers['Content-Type'] = file.type || 'application/octet-stream'
    request('PUT', endpoint, file, headers, parseJsonDone(done), onUploadProgress)
  }

  function createOneTimeLink(publicUrl, uploadResult, done) {
    var endpoint = el.oneTimeInput.value
    if (!endpoint) {
      done(null, {
        watchUrl: publicUrl,
        token: 'direct-link',
        mode: 'direct',
      })
      return
    }

    var headers = {
      'Content-Type': 'application/json; charset=utf-8',
    }
    if (el.tokenInput.value) headers.Authorization = 'Bearer ' + el.tokenInput.value

    var body = JSON.stringify({
      videoUrl: publicUrl,
      storageKey: uploadResult.storageKey || uploadResult.fileName || selectedFile.name,
      fileName: uploadResult.fileName || selectedFile.name,
      ttlMinutes: 30,
      downloadEnabled: true,
    })

    request('POST', endpoint, body, headers, parseJsonDone(done))
  }

  function showShare(shareResult, publicUrl) {
    var watchUrl = shareResult.watchUrl || shareResult.url || publicUrl
    lastWatchUrl = watchUrl

    var qrDataUrl = shareResult.qrDataUrl || ''
    if (!qrDataUrl) {
      qrDataUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=' + encodeURIComponent(watchUrl)
    }

    el.qrWrap.innerHTML =
      '<img src="' +
      escapeAttr(qrDataUrl) +
      '" alt="一次性 QR Code"><strong>掃碼觀看影片</strong><p class="muted">手機掃描後可觀看並下載。</p>'
    el.openWatchButton.href = watchUrl
    el.openWatchButton.className = 'link-button'
    el.copyWatchButton.disabled = false
    el.shareButton.disabled = false
    el.resultBox.innerHTML =
      '觀看連結：<br><strong>' +
      escapeHtml(watchUrl) +
      '</strong><br><br>影片網址：<br>' +
      escapeHtml(publicUrl)
    setStatus('ready', '完整流程完成：影片已上傳，並已產生一次性 QR。')
  }

  function shareCurrentLink() {
    if (!lastWatchUrl) {
      setStatus('error', '請先上傳影片並產生 QR。')
      return
    }

    var title = '回放中心影片'
    var text = '回放中心影片已產生，手機可觀看與下載：\n' + lastWatchUrl
    if (window.ShenYueUpdater && typeof window.ShenYueUpdater.shareText === 'function') {
      try {
        window.ShenYueUpdater.shareText(title, text, lastWatchUrl)
        setStatus('ready', '已開啟系統分享視窗，可選擇 LINE、微信、Messenger 或其他通訊 APP。')
        return
      } catch (error) {
        setStatus('error', '開啟分享失敗：' + escapeHtml(error.message || error))
      }
    }

    if (navigator.share) {
      navigator
        .share({
          title: title,
          text: text,
          url: lastWatchUrl,
        })
        .then(function () {
          setStatus('ready', '已開啟分享視窗。')
        })
        .catch(function () {
          copyText(lastWatchUrl)
        })
      return
    }

    copyText(lastWatchUrl)
    setStatus('ready', '此裝置不支援系統分享，已先複製觀看連結。')
  }

  function request(method, url, body, headers, done, progressHandler) {
    var xhr = new XMLHttpRequest()
    xhr.open(method, url, true)
    xhr.timeout = 120000

    for (var key in headers) {
      if (Object.prototype.hasOwnProperty.call(headers, key)) {
        xhr.setRequestHeader(key, headers[key])
      }
    }

    if (xhr.upload && progressHandler) {
      xhr.upload.onprogress = function (event) {
        if (!event.lengthComputable) return
        progressHandler(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return
      if (xhr.status >= 200 && xhr.status < 300) {
        done(null, xhr.responseText)
        return
      }
      done(new Error('HTTP ' + xhr.status + ' ' + shortText(xhr.responseText || '', 120)))
    }

    xhr.onerror = function () {
      done(new Error('網路錯誤，請確認模擬器能連到伺服器。目前 API：' + url))
    }
    xhr.ontimeout = function () {
      done(new Error('連線逾時。'))
    }
    xhr.send(body)
  }

  function parseJsonDone(done) {
    return function (error, responseText) {
      if (error) {
        done(error)
        return
      }
      try {
        done(null, JSON.parse(responseText || '{}'))
      } catch (parseError) {
        done(new Error('伺服器回傳不是 JSON：' + shortText(responseText, 120)))
      }
    }
  }

  function onUploadProgress(percent) {
    setProgress(percent)
    setStatus('busy', '上傳中：' + percent + '%')
  }

  function resolveUploadEndpoint(endpoint, fileName) {
    var encoded = encodeURIComponent(fileName)
    if (endpoint.indexOf('{filename}') >= 0) {
      return endpoint.split('{filename}').join(encoded)
    }
    return endpoint
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B'
    var units = ['B', 'KB', 'MB', 'GB', 'TB']
    var index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
    var value = bytes / Math.pow(1024, index)
    return value.toFixed(value >= 10 || index === 0 ? 0 : 1) + ' ' + units[index]
  }

  function copyText(text) {
    if (!text) return
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
      el.copyWatchButton.innerHTML = '已複製'
      window.setTimeout(function () {
        el.copyWatchButton.innerHTML = '複製連結'
      }, 1200)
      return
    }

    var textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    el.copyWatchButton.innerHTML = '已複製'
    window.setTimeout(function () {
      el.copyWatchButton.innerHTML = '複製連結'
    }, 1200)
  }

  function shortText(text, length) {
    var value = text || ''
    if (value.length <= length) return value
    return value.slice(0, length) + '...'
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;')
  }
})()
