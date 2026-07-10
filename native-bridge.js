(function (global) {
  'use strict'

  var scriptUrl = document.currentScript && document.currentScript.src ? document.currentScript.src : location.href
  var methods = [
    'shareText', 'getDeviceState', 'getBundledManifest', 'getInstalledInfo', 'getInstalledBatch',
    'downloadAndInstall', 'getTaskStatus', 'openInstallPermission', 'getVideoAccessState',
    'requestVideoAccess', 'listLocalVideos', 'listLocalVideosAsync', 'getLocalVideoScanStatus',
    'prepareLocalVideo', 'prepareLocalVideoAsync', 'getLocalVideoPrepareStatus', 'uploadLocalVideo',
    'uploadLocalVideoOriginal', 'uploadLocalVideoAsync', 'uploadLocalVideoOriginalAsync',
    'getLocalVideoUploadStatus', 'createLocalVideoShare', 'createLastSelectedVideoShare',
    'inspectLastSelectedApk', 'getNativeCapabilities', 'configureEvergreen'
  ]

  function readSessionToken() {
    var token = ''
    try {
      var url = new URL(location.href)
      var rawFragment = url.hash.replace(/^#/, '')
      try { rawFragment = decodeURIComponent(rawFragment) } catch (error) {}
      var fragment = new URLSearchParams(rawFragment)
      token = fragment.get('_native_session') || url.searchParams.get('_native_session') || ''
      if (token) {
        sessionStorage.setItem('shenYueNativeSession', token)
        fragment.delete('_native_session')
        url.searchParams.delete('_native_session')
        url.hash = fragment.toString() ? '#' + fragment.toString() : ''
        history.replaceState(history.state, document.title, url.pathname + url.search + url.hash)
      }
    } catch (error) {
      token = ''
    }
    if (!token) {
      try {
        token = sessionStorage.getItem('shenYueNativeSession') || ''
      } catch (error) {
        token = ''
      }
    }
    return token
  }

  function installBridge() {
    if (global.ShenYueUpdater) return global.ShenYueUpdater
    var raw = global.ShenYueNativeRaw
    var token = readSessionToken()
    if (!raw || typeof raw.invoke !== 'function' || token.length < 40) return null

    function method(name) {
      return function () {
        var args = Array.prototype.slice.call(arguments).map(function (value) {
          return value == null ? '' : String(value)
        })
        return raw.invoke(token, name, JSON.stringify(args))
      }
    }

    if (typeof Proxy === 'function') {
      global.ShenYueUpdater = new Proxy({}, {
        get: function (_, name) {
          if (name === 'then') return undefined
          return method(String(name))
        },
      })
    } else {
      global.ShenYueUpdater = {}
      methods.forEach(function (name) {
        global.ShenYueUpdater[name] = method(name)
      })
    }
    return global.ShenYueUpdater
  }

  function parseResult(raw) {
    try {
      return JSON.parse(raw || '{}')
    } catch (error) {
      return { ok: false, message: '原生橋接回傳格式錯誤。' }
    }
  }

  function configUrl() {
    try {
      return new URL('replay-center/native-config.json', scriptUrl).toString()
    } catch (error) {
      return 'replay-center/native-config.json'
    }
  }

  async function applyEvergreenConfig() {
    var bridge = installBridge()
    if (!bridge || typeof bridge.configureEvergreen !== 'function') {
      return { ok: true, mode: 'web', bridgeVersion: 0 }
    }
    var capabilities = typeof bridge.getNativeCapabilities === 'function'
      ? parseResult(bridge.getNativeCapabilities())
      : { ok: true, bridgeVersion: 1 }
    try {
      var url = new URL(configUrl())
      url.searchParams.set('_evergreen', String(Date.now()))
      var response = await fetch(url.toString(), { cache: 'no-store', credentials: 'omit' })
      if (!response.ok) throw new Error('HTTP ' + response.status)
      var config = await response.json()
      var applied = parseResult(bridge.configureEvergreen(JSON.stringify(config)))
      if (!applied.ok) throw new Error(applied.message || '常青設定遭原生核心拒絕')
      applied.mode = 'remote'
      applied.configUrl = configUrl()
      global.ShenYueEvergreenConfig = config
      return applied
    } catch (error) {
      capabilities.mode = 'cached'
      capabilities.warning = 'GitHub 常青設定暫時無法讀取，已使用 APK 內建或最後有效設定：' + (error.message || error)
      return capabilities
    }
  }

  installBridge()
  global.ShenYueNativeConfigReady = applyEvergreenConfig().then(function (result) {
    global.ShenYueNativeConfigState = result
    global.dispatchEvent(new CustomEvent('shenYueEvergreenReady', { detail: result }))
    return result
  })

  global.addEventListener('shenYueNativeReady', function () {
    installBridge()
  })
})(window)
