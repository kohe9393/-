/* 日本史一問一答 オフライン用 Service Worker
   ・アプリ本体はキャッシュ優先（起動を速くし、圏外でも開ける）
   ・data/*.json はネットワーク優先（更新を確実に反映、失敗時はキャッシュ）
   index.html を更新したら CACHE の番号を必ず +1 する */
var CACHE = 'rekishi-v1';
var SHELL = ['./', './index.html', './data/questions.json'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(SHELL.map(function(u){
        return c.add(u).catch(function(){ /* 1つ失敗しても導入は続行 */ });
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ return k === CACHE ? null : caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.indexOf('/data/') >= 0) {
    /* ネットワーク優先 */
    e.respondWith(
      fetch(req).then(function(res){
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){
        return caches.match(req).then(function(r){
          return r || new Response('{}', { headers: { 'Content-Type': 'application/json' } });
        });
      })
    );
    return;
  }

  /* キャッシュ優先＋裏で更新 */
  e.respondWith(
    caches.match(req).then(function(hit){
      var net = fetch(req).then(function(res){
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){ return hit; });
      return hit || net;
    })
  );
});
