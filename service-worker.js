/*
 Credit: Service Workers: an Introduction By Matt Gaunt
 */

(function() {
  'use strict';

  var CACHE_NAME = 'static-cache';
  var urlsToCache = [
    '.',
    'index.html',
    'restaurant.html',
    'css/styles.css',
    'css/normalize.css',
    'data/restaurants.json',
    'js/dbhelper.js',
    'js/main.js',
    'js/restaurant_info.js',
    'images/1.jpg',
    'images/2.jpg',
    'images/3.jpg',
    'images/4.jpg',
    'images/5.jpg',
    'images/6.jpg',
    'images/7.jpg',
    'images/8.jpg',
    'images/9.jpg',
    'images/10.jpg',
    'images/1_small.jpg',
    'images/2_small.jpg',
    'images/3_small.jpg',
    'images/4_small.jpg',
    'images/5_small.jpg',
    'images/6_small.jpg',
    'images/7_small.jpg',
    'images/8_small.jpg',
    'images/9_small.jpg',
    'images/10_small.jpg',
  ];

  self.addEventListener('install', function(event) {
    // Perform install steps
    event.waitUntil(
      caches.open(CACHE_NAME).then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
    );
  });

  self.addEventListener('fetch', function(event) {
    event.respondWith(
      caches.match(event.request).then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // IMPORTANT: Clone the request. A request is a stream and
        // can only be consumed once. Since we are consuming this
        // once by cache and once by the browser for fetch, we need
        // to clone the response.
        var fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then(function(response) {
            // Check if we received a valid response
            if (
              !response ||
              response.status !== 200 ||
              response.type !== 'basic'
            ) {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            var responseToCache = response.clone();

            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseToCache);
            });

            return response;
          })
          .catch((error) => console.log(error));
      })
    );
  });
})();
