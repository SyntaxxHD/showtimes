self.addEventListener('push', event => {
  const d = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(d.title ?? 'Neuer Film', {
      body: d.body ?? '',
      icon: '/static/icon-192.png',
      data: { url: d.url ?? '/program' }
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data?.url ?? '/program'))
})
