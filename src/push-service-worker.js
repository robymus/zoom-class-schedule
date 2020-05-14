/*
 * Process events received from push
 * - show notification
 * - also store data in event
 *
 * event data should be:
 * {
 *  title: "..",
 *  body: "..",
 *  icon: "..",
 *  badge: "..",
 *  url: "url to open on click"
 * }
 *
 * url can be null, in this case clicks are not handled
 */
self.addEventListener('push', function(event) {
    console.log('[Service Worker] Push Received.');
    console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);

    const title = event.data.title;
    const options = {
        body: event.data.body,
        icon: event.data.icon,
        badge: event.data.badge,
        data: event.data
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
    console.log('[Service Worker] Notification click Received.');

    event.notification.close();

    const data = event.notification.data;

    if ('url' in data && data.url !== null) {
        event.waitUntil(
            clients.openWindow(data.url)
        );
    }
});