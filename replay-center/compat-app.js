(function () {
  var SETTINGS_KEY = 'replay-center-compat-settings'
  var selectedFile = null
  var selectedNativeVideo = null
  var selectedObjectUrl = ''
  var lastWatchUrl = ''
  var preparePollTimer = 0
  var scanPollTimer = 0
  var uploadPollTimer = 0
  var autoUploadTimer = 0
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
    nativeVideoTools: byId('nativeVideoTools'),
    nativeScanButton: byId('nativeScanButton'),
    nativePermissionButton: byId('nativePermissionButton'),
    nativeVideoList: byId('nativeVideoList'),
    progressWrap: byId('progressWrap'),
    progressBar: byId('progressBar'),
    progressText: byId('progressText'),
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

    if (hasNativeVideoBridge()) {
      el.nativeVideoTools.className = 'native-video-tools'
      el.runtimeBadge.className = 'badge'
      el.runtimeBadge.innerHTML = 'Android APK 車機模式'
      refreshNativeAccessState()
    }

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
    el.nativeScanButton.addEventListener('click', scanNativeVideos)
    el.nativePermissionButton.addEventListener('click', requestNativeVideoAccess)
    el.fileInput.addEventListener('change', function () {
      handleFile(el.fileInput.files && el.fileInput.files[0])
    })
    el.uploadButton.addEventListener('click', uploadAndCreateShare)
    el.shareButton.addEventListener('click', shareCurrentLink)
    el.resetButton.addEventListener('click', resetFile)
    el.copyWatchButton.addEventListener('click', function () {
      copyText(lastWatchUrl)
    })
    window.addEventListener('focus', refreshNativeAccessState)
    window.addEventListener('pageshow', refreshNativeAccessState)
    window.addEventListener('message', function (event) {
      if (event && event.data && event.data.type === 'shenYueApkResume') refreshNativeAccessState()
    })
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) refreshNativeAccessState()
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

  function setProgress(percent, indeterminate) {
    var value = Math.max(0, Math.min(100, percent || 0))
    if (el.progressWrap) {
      el.progressWrap.className = indeterminate ? 'progress is-indeterminate' : 'progress'
    }
    el.progressBar.style.width = value + '%'
    if (el.progressText) el.progressText.innerHTML = value + '%'
  }

  function clearPreparePoll() {
    if (!preparePollTimer) return
    window.clearTimeout(preparePollTimer)
    preparePollTimer = 0
  }

  function clearScanPoll() {
    if (!scanPollTimer) return
    window.clearTimeout(scanPollTimer)
    scanPollTimer = 0
  }

  function clearUploadPoll() {
    if (!uploadPollTimer) return
    window.clearTimeout(uploadPollTimer)
    uploadPollTimer = 0
  }

  function clearAutoUpload() {
    if (!autoUploadTimer) return
    window.clearTimeout(autoUploadTimer)
    autoUploadTimer = 0
  }

  function hasNativeVideoBridge() {
    return Boolean(
      window.ShenYueUpdater &&
        typeof window.ShenYueUpdater.listLocalVideos === 'function' &&
        typeof window.ShenYueUpdater.uploadLocalVideo === 'function'
    )
  }

  function parseNativeResult(raw) {
    try {
      return JSON.parse(raw || '{}')
    } catch (error) {
      return { ok: false, message: 'Android 回傳資料格式錯誤。' }
    }
  }

  function canPrepareNativeVideo() {
    return Boolean(
      window.ShenYueUpdater &&
        typeof window.ShenYueUpdater.prepareLocalVideo === 'function'
    )
  }

  function canPrepareNativeVideoAsync() {
    return Boolean(
      window.ShenYueUpdater &&
        typeof window.ShenYueUpdater.prepareLocalVideoAsync === 'function' &&
        typeof window.ShenYueUpdater.getLocalVideoPrepareStatus === 'function'
    )
  }

  function canScanNativeVideosAsync() {
    return Boolean(
      window.ShenYueUpdater &&
        typeof window.ShenYueUpdater.listLocalVideosAsync === 'function' &&
        typeof window.ShenYueUpdater.getLocalVideoScanStatus === 'function'
    )
  }

  function canUploadNativeVideoAsync() {
    return Boolean(
      window.ShenYueUpdater &&
        typeof window.ShenYueUpdater.getLocalVideoUploadStatus === 'function' &&
        (typeof window.ShenYueUpdater.uploadLocalVideoOriginalAsync === 'function' ||
          typeof window.ShenYueUpdater.uploadLocalVideoAsync === 'function')
    )
  }

  function canCreateFastLocalShare() {
    if (!window.ShenYueUpdater) return false
    if (selectedNativeVideo && typeof window.ShenYueUpdater.createLocalVideoShare === 'function') return true
    if (selectedFile && typeof window.ShenYueUpdater.createLastSelectedVideoShare === 'function') return true
    return false
  }

  function isTransportStreamVideo(item) {
    if (!item) return false
    return /\.(ts|mts|m2ts)$/i.test(item.name || '') || /video\/(mp2t|mpeg|mpeg2)/i.test(item.mimeType || '')
  }

  function guessNativeMimeType(fileName) {
    if (/\.(ts|mts|m2ts)$/i.test(fileName || '')) return 'video/mp2t'
    if (/\.mov$/i.test(fileName || '')) return 'video/quicktime'
    return 'video/mp4'
  }

  function showNativePreview(uri) {
    if (!uri) return
    el.previewVideo.src = uri
    el.previewVideo.className = ''
    el.emptyPreview.className = 'hidden'
  }

  function hideNativePreview() {
    el.previewVideo.removeAttribute('src')
    el.previewVideo.className = 'hidden'
    el.emptyPreview.className = 'empty-preview'
  }

  function refreshNativeAccessState() {
    if (!hasNativeVideoBridge() || typeof window.ShenYueUpdater.getVideoAccessState !== 'function') return
    var state = parseNativeResult(window.ShenYueUpdater.getVideoAccessState())
    if (!state.ok) {
      el.nativeVideoList.innerHTML = '<div class="result-box">影片權限狀態讀取失敗：' + escapeHtml(state.message || '') + '</div>'
      return
    }
    if (state.readVideoGranted || state.allFilesGranted) {
      el.nativePermissionButton.innerHTML = state.allFilesGranted ? '已可讀取所有檔案' : '已可讀取影片'
      el.nativeVideoList.innerHTML = '<div class="result-box">固定讀取 USB 的 DCIM/CAMERA 影片；支援 MP4 與 TS，並相容 sdcard1、usb_storage、udisk 類車機掛載點。</div>'
      return
    }
    el.nativeVideoList.innerHTML = '<div class="result-box">車機尚未授權讀取 USB 影片，請先按「允許讀取影片」。</div>'
  }

  function requestNativeVideoAccess() {
    if (!hasNativeVideoBridge() || typeof window.ShenYueUpdater.requestVideoAccess !== 'function') return
    window.ShenYueUpdater.requestVideoAccess()
    setStatus('ready', '已開啟 Android 權限畫面；授權後回到本頁會自動刷新狀態。')
    window.setTimeout(refreshNativeAccessState, 800)
  }

  function scanNativeVideos() {
    if (!hasNativeVideoBridge()) {
      setStatus('error', '目前不是 Android APK 車機模式，請使用上方選檔。')
      return
    }
    setStatus('busy', '正在掃描 USB1/USB2 與車機實際 USB 掛載點的 DCIM/CAMERA 影片。')
    el.nativeVideoList.innerHTML = '<div class="result-box">掃描中...</div>'
    clearScanPoll()
    if (canScanNativeVideosAsync()) {
      var started = parseNativeResult(window.ShenYueUpdater.listLocalVideosAsync())
      if (started.ok && started.taskId) {
        setProgress(Math.max(8, started.progress || 8), true)
        pollNativeVideoScan(started.taskId)
        return
      }
    }
    window.setTimeout(function () {
      var result = parseNativeResult(window.ShenYueUpdater.listLocalVideos())
      if (!result.ok) {
        el.nativeVideoList.innerHTML = '<div class="result-box">' + escapeHtml(result.message || '掃描失敗') + '</div>'
        setStatus('error', escapeHtml(result.message || '掃描失敗'))
        return
      }
      renderNativeVideos(result.items || [], result.scanRoots || [])
    }, 60)
  }

  function pollNativeVideoScan(taskId) {
    var state = parseNativeResult(window.ShenYueUpdater.getLocalVideoScanStatus(taskId))
    if (!state.ok) {
      clearScanPoll()
      setProgress(0, false)
      el.nativeVideoList.innerHTML = '<div class="result-box">' + escapeHtml(state.message || '掃描失敗') + '</div>'
      setStatus('error', escapeHtml(state.message || '掃描失敗'))
      return
    }

    setProgress(Math.max(8, state.progress || 8), state.status !== 'done' && state.status !== 'failed')
    setStatus(state.status === 'failed' ? 'error' : 'busy', escapeHtml(state.message || '正在掃描 USB/DCIM/CAMERA...'))
    if (state.status === 'done') {
      clearScanPoll()
      renderNativeVideos(state.items || [], state.scanRoots || [])
      return
    }
    if (state.status === 'failed') {
      clearScanPoll()
      el.nativeVideoList.innerHTML = '<div class="result-box">' + escapeHtml(state.message || '掃描失敗') + '</div>'
      setProgress(0, false)
      return
    }

    scanPollTimer = window.setTimeout(function () {
      pollNativeVideoScan(taskId)
    }, 350)
  }

  function renderNativeVideos(items, scanRoots) {
    if (!items.length) {
      var roots = Array.isArray(scanRoots) && scanRoots.length
        ? '<small>已檢查：' + escapeHtml(scanRoots.join('、')) + '</small>'
        : '<small>沒有找到可讀取的 USB DCIM/CAMERA 資料夾。</small>'
      el.nativeVideoList.innerHTML = '<div class="result-box">沒有找到 USB DCIM/CAMERA 內的 MP4 / TS。請確認影片放在 USB 的 DCIM/CAMERA 資料夾。' + roots + '</div>'
      setStatus('ready', '掃描完成，但 USB DCIM/CAMERA 沒有 MP4 / TS。')
      return
    }
    el.nativeVideoList.innerHTML = ''
    var fragment = document.createDocumentFragment()
    for (var i = 0; i < items.length; i += 1) {
      fragment.appendChild(createNativeVideoItem(items[i]))
    }
    el.nativeVideoList.appendChild(fragment)
    setStatus('ready', '掃描完成，從 USB DCIM/CAMERA 找到 ' + items.length + ' 個影片。')
  }

  function createNativeVideoItem(item) {
    var button = document.createElement('button')
    button.type = 'button'
    button.className = 'native-video-item'
    var path = item.path ? '<small>' + escapeHtml(item.path) + '</small>' : ''
    button.innerHTML =
      '<span><strong>' +
      escapeHtml(item.name || 'replay-video.mp4') +
      '</strong>' +
      path +
      '</span><small>' +
      escapeHtml(formatBytes(item.size || 0)) +
      ' / ' +
      escapeHtml(item.source || 'video') +
      '</small>'
    button.addEventListener('click', function () {
      selectNativeVideo(item)
    })
    return button
  }

  function selectNativeVideo(item) {
    clearPreparePoll()
    clearScanPoll()
    clearUploadPoll()
    clearAutoUpload()
    selectedFile = null
    selectedNativeVideo = item
    lastWatchUrl = ''
    setProgress(0)
    el.fileInput.value = ''
    el.fileName.innerHTML = escapeHtml(item.name || 'replay-video.mp4')
    el.fileMeta.innerHTML = formatBytes(item.size || 0) + ' / ' + (item.mimeType || 'video') + ' / ' + (item.source || 'USB 影片')
    el.uploadButton.disabled = true
    el.shareButton.disabled = true
    el.resultBox.innerHTML = '已選擇車機影片，正在上傳並產生 QR。'
    resetQr()

    if (selectedObjectUrl) URL.revokeObjectURL(selectedObjectUrl)
    selectedObjectUrl = ''
    hideNativePreview()
    selectedNativeVideo.uploadUri = item.uri || ''
    selectedNativeVideo.uploadName = item.name || 'replay-video.mp4'
    selectedNativeVideo.uploadMimeType = item.mimeType || guessNativeMimeType(item.name)
    selectedNativeVideo.uploadSize = item.size || 0
    selectedNativeVideo.uploadOriginal = true
    setProgress(4)
    setStatus('busy', '已選擇車機影片，正在直接上傳並產生 QR。')
    autoUploadTimer = window.setTimeout(function () {
      autoUploadTimer = 0
      if (!selectedNativeVideo || selectedNativeVideo.uri !== item.uri) return
      uploadAndCreateShare()
    }, 120)
  }

  function startPreparingSelectedNativeVideo(item) {
    if (!selectedNativeVideo || selectedNativeVideo.uri !== item.uri) return
    var started = parseNativeResult(
      window.ShenYueUpdater.prepareLocalVideoAsync(
        item.uri || '',
        item.name || 'replay-video.mp4',
        item.mimeType || 'video/mp4'
      )
    )
    if (!started.ok || !started.taskId) {
      enableOriginalNativeUploadFallback(item, 'TS 轉 MP4 啟動失敗：' + escapeHtml(started.message || '未知錯誤'))
      return
    }
    pollNativeVideoPrepare(item, started.taskId)
  }

  function pollNativeVideoPrepare(item, taskId) {
    if (!selectedNativeVideo || selectedNativeVideo.uri !== item.uri) return
    var state = parseNativeResult(window.ShenYueUpdater.getLocalVideoPrepareStatus(taskId))
    if (!selectedNativeVideo || selectedNativeVideo.uri !== item.uri) return

    if (!state.ok) {
      enableOriginalNativeUploadFallback(item, 'TS 轉 MP4 失敗：' + escapeHtml(state.message || '未知錯誤'))
      return
    }

    setProgress(state.progress || 0, Boolean(state.indeterminate))
    if (state.status === 'done') {
      clearPreparePoll()
      applyPreparedNativeVideo(item, state)
      return
    }
    if (state.status === 'failed') {
      clearPreparePoll()
      enableOriginalNativeUploadFallback(item, 'TS 轉 MP4 失敗：' + escapeHtml(state.message || '未知錯誤'))
      return
    }

    setStatus('busy', state.indeterminate ? '正在準備 MP4...' : '正在準備 MP4：' + (state.progress || 0) + '%')
    preparePollTimer = window.setTimeout(function () {
      pollNativeVideoPrepare(item, taskId)
    }, 500)
  }

  function prepareSelectedNativeVideo(item) {
    if (!selectedNativeVideo || selectedNativeVideo.uri !== item.uri) return
    var prepared = parseNativeResult(
      window.ShenYueUpdater.prepareLocalVideo(
        item.uri || '',
        item.name || 'replay-video.mp4',
        item.mimeType || 'video/mp4'
      )
    )
    if (!selectedNativeVideo || selectedNativeVideo.uri !== item.uri) return

    if (!prepared.ok || !prepared.uri) {
      enableOriginalNativeUploadFallback(item, 'TS 轉 MP4 失敗：' + escapeHtml(prepared.message || '未知錯誤'))
      return
    }

    applyPreparedNativeVideo(item, prepared)
  }

  function applyPreparedNativeVideo(item, prepared) {
    if (!selectedNativeVideo || selectedNativeVideo.uri !== item.uri) return
    selectedNativeVideo.previewUri = prepared.uri
    selectedNativeVideo.uploadUri = prepared.uri
    selectedNativeVideo.uploadName = prepared.fileName || item.name || 'replay-video.mp4'
    selectedNativeVideo.uploadMimeType = prepared.mimeType || 'video/mp4'
    selectedNativeVideo.uploadSize = prepared.size || item.size || 0
    selectedNativeVideo.uploadConverted = Boolean(prepared.converted)

    el.fileName.innerHTML = escapeHtml(selectedNativeVideo.uploadName)
    el.fileMeta.innerHTML =
      formatBytes(selectedNativeVideo.uploadSize || 0) +
      ' / ' +
      selectedNativeVideo.uploadMimeType +
      ' / ' +
      (item.source || 'USB 影片')
    el.resultBox.innerHTML = selectedNativeVideo.uploadConverted
      ? '已將 TS 準備為 MP4，預覽與 QR 會使用 MP4。'
      : '影片已準備完成，等待上傳。'
    showNativePreview(prepared.uri)
    el.uploadButton.disabled = false
    setProgress(100, false)
    setStatus('ready', '影片已準備完成：' + escapeHtml(selectedNativeVideo.uploadName))
  }

  function enableOriginalNativeUploadFallback(item, message) {
    if (!selectedNativeVideo || selectedNativeVideo.uri !== item.uri) return
    selectedNativeVideo.uploadUri = item.uri || ''
    selectedNativeVideo.uploadName = item.name || 'replay-video.ts'
    selectedNativeVideo.uploadMimeType = item.mimeType || 'video/mp2t'
    selectedNativeVideo.uploadSize = item.size || 0
    selectedNativeVideo.uploadOriginal = true
    el.fileName.innerHTML = escapeHtml(selectedNativeVideo.uploadName)
    el.fileMeta.innerHTML =
      formatBytes(selectedNativeVideo.uploadSize || 0) +
      ' / ' +
      selectedNativeVideo.uploadMimeType +
      ' / 原始檔'
    el.resultBox.innerHTML = 'MP4 準備失敗，仍可上傳原始影片產生 QR；手機可能需要下載或外部播放器。'
    if (item.uri) showNativePreview(item.uri)
    el.uploadButton.disabled = false
    setProgress(0, false)
    setStatus('error', message)
  }

  function handleFile(file) {
    if (!file) return
    clearPreparePoll()
    clearScanPoll()
    clearUploadPoll()
    clearAutoUpload()
    if (file.type && file.type.indexOf('video/') !== 0 && !/\.(mp4|m4v|mov|mkv|webm|ts|mts|m2ts)$/i.test(file.name)) {
      setStatus('error', '請選擇影片檔。')
      return
    }

    selectedFile = file
    selectedNativeVideo = null
    lastWatchUrl = ''
    setProgress(0)
    el.fileName.innerHTML = escapeHtml(file.name)
    el.fileMeta.innerHTML = formatBytes(file.size) + ' / ' + (file.type || 'video')
    el.uploadButton.disabled = true
    el.shareButton.disabled = true
    el.resultBox.innerHTML = '已選擇影片，正在上傳並產生 QR。'
    resetQr()

    if (selectedObjectUrl) URL.revokeObjectURL(selectedObjectUrl)
    selectedObjectUrl = URL.createObjectURL(file)
    el.previewVideo.src = selectedObjectUrl
    el.previewVideo.className = ''
    el.emptyPreview.className = 'hidden'
    setProgress(4)
    setStatus('busy', '影片已加入清單，正在上傳並產生 QR。')
    autoUploadTimer = window.setTimeout(function () {
      autoUploadTimer = 0
      if (selectedFile !== file) return
      uploadAndCreateShare()
    }, 120)
  }

  function resetFile() {
    clearPreparePoll()
    clearUploadPoll()
    clearAutoUpload()
    selectedFile = null
    selectedNativeVideo = null
    lastWatchUrl = ''
    if (selectedObjectUrl) URL.revokeObjectURL(selectedObjectUrl)
    selectedObjectUrl = ''
    el.fileInput.value = ''
    el.fileName.innerHTML = ''
    el.fileMeta.innerHTML = ''
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
    if (!selectedFile && !selectedNativeVideo) {
      setStatus('error', '請先選擇影片。')
      return
    }

    saveSettings()
    el.uploadButton.disabled = true
    el.shareButton.disabled = true
    setProgress(6)
    setStatus('busy', '正在建立本機快速 QR，不先上傳影片。')

    if (tryCreateFastLocalShare()) {
      return
    }

    var endpoint = el.endpointInput.value
    if (!endpoint) {
      el.uploadButton.disabled = false
      setStatus('error', '本機快速 QR 不可用，且沒有填入雲端上傳 API。')
      return
    }

    if (selectedNativeVideo) {
      uploadNativeVideoAndCreateShare()
      return
    }

    uploadFile(selectedFile, function (error, uploadResult) {
      if (error) {
        el.uploadButton.disabled = false
        setStatus('error', '上傳失敗：' + escapeHtml(error.message || error))
        return
      }

      finishUploadedVideo(uploadResult)
    })
  }

  function tryCreateFastLocalShare() {
    if (!canCreateFastLocalShare()) return false
    setProgress(10)
    setStatus('busy', '正在建立本機快速 QR，不需先上傳影片。')
    var result
    if (selectedNativeVideo) {
      result = parseNativeResult(
        window.ShenYueUpdater.createLocalVideoShare(
          selectedNativeVideo.uploadUri || selectedNativeVideo.uri || '',
          selectedNativeVideo.uploadName || selectedNativeVideo.name || 'replay-video.mp4',
          selectedNativeVideo.uploadMimeType || selectedNativeVideo.mimeType || 'video/mp4'
        )
      )
    } else {
      result = parseNativeResult(
        window.ShenYueUpdater.createLastSelectedVideoShare(
          selectedFile.name || 'replay-video.mp4',
          selectedFile.type || guessNativeMimeType(selectedFile.name)
        )
      )
    }

    if (!result.ok) {
      setProgress(0)
      el.uploadButton.disabled = false
      el.shareButton.disabled = true
      resetQr()
      el.resultBox.innerHTML =
        '本機快速 QR 建立失敗：<br><strong>' +
        escapeHtml(result.message || '未知錯誤') +
        '</strong><br><br>已停止雲端上傳，避免再次卡在 2%。請確認手機與車機連在同一個 Wi-Fi / 熱點後重選影片。'
      setStatus('error', '本機快速 QR 建立失敗，已停止雲端上傳避免卡在 2%：' + escapeHtml(result.message || '未知錯誤'))
      return true
    }

    setProgress(100)
    el.uploadButton.disabled = false
    var localWatchUrl = result.localWatchUrl || result.watchUrl || result.publicUrl || result.url
    var watchUrl = result.cloudWatchUrl || localWatchUrl
    var downloadUrl = result.downloadUrl || ''
    var originalUrl = result.originalUrl || ''
    showShare(
      {
        watchUrl: watchUrl,
        localWatchUrl: localWatchUrl,
        downloadUrl: downloadUrl,
        originalUrl: originalUrl,
        mode: 'local-fast',
      },
      watchUrl
    )
    el.resultBox.innerHTML =
      '本機快速 QR：<br><strong>' +
      escapeHtml(watchUrl) +
      '</strong><br><br>' +
      (downloadUrl ? '下載 MP4：<br>' + escapeHtml(downloadUrl) + '<br><br>' : '') +
      (localWatchUrl && localWatchUrl !== watchUrl ? '本機下載頁：<br>' + escapeHtml(localWatchUrl) + '<br><br>' : '') +
      '手機需與車機在同一個 Wi-Fi / 熱點網路。'
    return true
  }

  function finishUploadedVideo(uploadResult) {
    setProgress(100)
    var publicUrl = uploadResult.publicUrl || uploadResult.shareUrl || uploadResult.url || ''
    if (!publicUrl) {
      el.uploadButton.disabled = false
      setStatus('error', '上傳完成，但伺服器沒有回傳 publicUrl / shareUrl / url。')
      return
    }

    showShare(
      {
        watchUrl: publicUrl,
        mode: 'direct-processing',
      },
      publicUrl
    )
    setStatus('busy', '影片已上傳，已先顯示 QR，正在建立一次性觀看連結。')
    createOneTimeLink(publicUrl, uploadResult, function (shareError, shareResult) {
      el.uploadButton.disabled = false
      if (shareError) {
        showShare(
          {
            watchUrl: publicUrl,
            mode: 'direct-fallback',
            errorMessage: shareError.message || shareError,
          },
          publicUrl
        )
        return
      }

      showShare(shareResult, publicUrl)
    })
  }

  function uploadNativeVideoAndCreateShare() {
    if (!hasNativeVideoBridge() || !selectedNativeVideo) {
      el.uploadButton.disabled = false
      setStatus('error', 'Android 原生影片上傳不可用。')
      return
    }

    clearUploadPoll()
    if (canUploadNativeVideoAsync()) {
      startNativeVideoUploadAsync()
      return
    }

    setStatus('busy', '正在由 Android 直接讀取並上傳車機影片，影片較大時請等待。')
    window.setTimeout(function () {
      var uploader =
        selectedNativeVideo.uploadOriginal &&
        typeof window.ShenYueUpdater.uploadLocalVideoOriginal === 'function'
          ? window.ShenYueUpdater.uploadLocalVideoOriginal
          : window.ShenYueUpdater.uploadLocalVideo
      var uploadResult = parseNativeResult(
        uploader.call(
          window.ShenYueUpdater,
          selectedNativeVideo.uploadUri || selectedNativeVideo.uri || '',
          selectedNativeVideo.uploadName || selectedNativeVideo.name || 'replay-video.mp4',
          selectedNativeVideo.uploadMimeType || selectedNativeVideo.mimeType || 'video/mp4',
          el.endpointInput.value,
          el.modeInput.value,
          el.tokenInput.value || ''
        )
      )

      if (!uploadResult.ok) {
        el.uploadButton.disabled = false
        setStatus('error', '上傳失敗：' + escapeHtml(uploadResult.message || '未知錯誤'))
        return
      }

      finishUploadedVideo(uploadResult)
    }, 80)
  }

  function startNativeVideoUploadAsync() {
    setProgress(1)
    setStatus('busy', '正在由 Android 直接讀取原始影片並上傳：1%')
    window.setTimeout(function () {
      var uploader =
        selectedNativeVideo.uploadOriginal &&
        typeof window.ShenYueUpdater.uploadLocalVideoOriginalAsync === 'function'
          ? window.ShenYueUpdater.uploadLocalVideoOriginalAsync
          : window.ShenYueUpdater.uploadLocalVideoAsync
      var started = parseNativeResult(
        uploader.call(
          window.ShenYueUpdater,
          selectedNativeVideo.uploadUri || selectedNativeVideo.uri || '',
          selectedNativeVideo.uploadName || selectedNativeVideo.name || 'replay-video.mp4',
          selectedNativeVideo.uploadMimeType || selectedNativeVideo.mimeType || 'video/mp4',
          el.endpointInput.value,
          el.modeInput.value,
          el.tokenInput.value || ''
        )
      )

      if (!started.ok || !started.taskId) {
        el.uploadButton.disabled = false
        setStatus('error', '上傳啟動失敗：' + escapeHtml(started.message || '未知錯誤'))
        return
      }

      pollNativeVideoUpload(started.taskId)
    }, 60)
  }

  function pollNativeVideoUpload(taskId) {
    var state = parseNativeResult(window.ShenYueUpdater.getLocalVideoUploadStatus(taskId))
    if (!state.ok) {
      clearUploadPoll()
      el.uploadButton.disabled = false
      setStatus('error', '讀取上傳進度失敗：' + escapeHtml(state.message || '未知錯誤'))
      return
    }

    var percent = Math.max(0, Math.min(100, state.progress || 0))
    setProgress(percent)
    if (state.status === 'done') {
      clearUploadPoll()
      finishUploadedVideo(state)
      return
    }
    if (state.status === 'failed') {
      clearUploadPoll()
      el.uploadButton.disabled = false
      setStatus('error', '上傳失敗：' + escapeHtml(state.message || '未知錯誤'))
      return
    }

    setStatus('busy', escapeHtml(state.message || ('上傳中 ' + percent + '%')))
    uploadPollTimer = window.setTimeout(function () {
      pollNativeVideoUpload(taskId)
    }, 300)
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
      storageKey: uploadResult.storageKey || uploadResult.fileName || selectedVideoName(),
      fileName: uploadResult.fileName || selectedVideoName(),
      ttlMinutes: 30,
      downloadEnabled: true,
    })

    request('POST', endpoint, body, headers, parseJsonDone(done))
  }

  function selectedVideoName() {
    if (selectedNativeVideo && selectedNativeVideo.uploadName) return selectedNativeVideo.uploadName
    if (selectedNativeVideo && selectedNativeVideo.name) return selectedNativeVideo.name
    if (selectedFile && selectedFile.name) return selectedFile.name
    return 'replay-video.mp4'
  }

  function showShare(shareResult, publicUrl) {
    var watchUrl = shareResult.watchUrl || shareResult.url || publicUrl
    lastWatchUrl = watchUrl
    var isDirectFallback = shareResult.mode === 'direct-fallback'
    var isDirectProcessing = shareResult.mode === 'direct-processing'
    var isLocalFast = shareResult.mode === 'local-fast'
    var qrTitle = isDirectFallback || isDirectProcessing || isLocalFast ? '掃碼開啟影片連結' : '掃碼觀看影片'
    var qrNote = '手機掃描後可觀看並下載。'
    if (isLocalFast) qrNote = '本機快速 QR，不需上傳；掃碼會開啟下載 MP4 與分享通訊APP頁。'
    if (isDirectProcessing) qrNote = '已先顯示影片直連 QR，正在建立一次性連結。'
    if (isDirectFallback) qrNote = '一次性 API 暫時失敗，已先顯示影片直連 QR。'

    var qrDataUrl = shareResult.qrDataUrl || ''
    if (!qrDataUrl) {
      qrDataUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=' + encodeURIComponent(watchUrl)
    }

    el.qrWrap.innerHTML =
      '<img src="' +
      escapeAttr(qrDataUrl) +
      '" alt="一次性 QR Code"><strong>' +
      escapeHtml(qrTitle) +
      '</strong><p class="muted">' +
      escapeHtml(qrNote) +
      '</p>'
    el.openWatchButton.href = watchUrl
    el.openWatchButton.className = 'link-button'
    el.copyWatchButton.disabled = false
    el.shareButton.disabled = false
    el.resultBox.innerHTML =
      '觀看連結：<br><strong>' +
      escapeHtml(watchUrl) +
      '</strong><br><br>影片網址：<br>' +
      escapeHtml(publicUrl)
    if (isDirectFallback) {
      setStatus('ready', '影片已上傳；一次性 QR API 暫時失敗，已先產生影片直連 QR。')
      return
    }
    if (isDirectProcessing) {
      setStatus('ready', '影片已上傳，已先產生影片直連 QR。')
      return
    }
    if (isLocalFast) {
      setStatus('ready', '已建立本機快速 QR：不需上傳影片，手機和車機需在同一 Wi-Fi / 熱點。')
      return
    }
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
