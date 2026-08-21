/* NEST service worker — real Web Push only, deliberately no caching layer:
   the app must always load fresh so deploys are never masked by stale
   caches. Notifications arrive and deep-link even while NEST is closed. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let note = { title: "NEST 🪺", body: "Something new is waiting for you.", url: "/", tag: "nest" };
  try {
    if (event.data) note = { ...note, ...event.data.json() };
  } catch (e) {
    /* malformed payload — show the generic note */
  }
  event.waitUntil(
    self.registration.showNotification(note.title, {
      body: note.body,
      tag: note.tag,
      icon: "/icons/nest-192.png?v=2",
      badge: "/icons/nest-192.png?v=2",
      data: { url: note.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Reuse an open NEST window when there is one: navigate it to the
      // deep link and bring it forward. Otherwise open a fresh one.
      for (const client of all) {
        if ("navigate" in client) {
          await client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })()
  );
});
