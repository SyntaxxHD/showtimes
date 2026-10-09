(function () {
  var isIOS = typeof window.navigator.standalone !== 'undefined'
  var isPWA =
    window.matchMedia('(display-mode: standalone)').matches || !!window.navigator.standalone
  var isSecure = location.protocol === 'https:' || location.hostname === 'localhost'

  var gate = document.getElementById('push-gate')

  function showGate(id) {
    gate.classList.add('locked')
    document.getElementById(id).classList.remove('settings-push-overlay--hidden')
  }

  if (isIOS && !isPWA) {
    showGate('push-gate-pwa')
    return
  }

  if (!isSecure) {
    showGate('push-gate-https')
    return
  }

  var btn = document.getElementById('push-toggle-btn')
  if (!btn || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    if (btn) btn.disabled = true
    return
  }

  var vapidKey = btn.dataset.vapidKey

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    var raw = atob(base64)
    var output = new Uint8Array(raw.length)
    for (var i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
    return output
  }

  navigator.serviceWorker.register('/static/sw.js').then(function (reg) {
    return reg.pushManager.getSubscription().then(function (sub) {
      if (sub) {
        btn.textContent = 'Deaktivieren'
        btn.onclick = function () {
          sub
            .unsubscribe()
            .then(function () {
              return fetch('/settings/push-unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: sub.endpoint })
              })
            })
            .then(function () {
              location.reload()
            })
        }
      } else {
        btn.textContent = 'Aktivieren'
        btn.onclick = function () {
          Notification.requestPermission().then(function (perm) {
            if (perm !== 'granted') return
            reg.pushManager
              .subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey)
              })
              .then(function (newSub) {
                var j = newSub.toJSON()
                return fetch('/settings/push-subscribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth })
                })
              })
              .then(function () {
                location.reload()
              })
          })
        }
      }
    })
  })
})()
