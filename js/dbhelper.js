/**
 * Common database helper functions.
 */
class DBHelper {
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get RESTAURANTS_URL() {
    return `http://localhost:1337/restaurants`;
  }

  static get REVIEWS_URL() {
    return `http://localhost:1337/reviews/?restaurant_id=`;
  }

  static fetchRestaurantsFromIndexedDb(callback) {
    const dbPromise = idb.open('restaurant-db', 1, (upgradeDb) => {
      const keyValStore = upgradeDb.createObjectStore('restaurants');
    });

    dbPromise
      .then((db) => {
        const tx = db.transaction('restaurants');
        const keyValStore = tx.objectStore('restaurants');
        return keyValStore.get('allRestaurants');
      })
      .then((restaurants) => {
        callback(null, restaurants);
      });
  }

  static fetchReviewsFromIndexedDb(restaurant, callback) {
    // const dbPromise = idb.open('restaurant-db', 1, (upgradeDb) => {
    //   const keyValStore = upgradeDb.createObjectStore('restaurants');
    // });
    const dbPromise = idb.open('restaurant-db', 1);

    dbPromise
      .then((db) => {
        const tx = db.transaction('restaurants');
        const keyValStore = tx.objectStore('restaurants');
        return keyValStore.get(restaurant.id);
      })
      .then((reviews) => {
        restaurant.reviews = reviews;
        callback(null, restaurant);
      });
  }

  /**
   * POST all reviews saved in IndexedDb while the app was offline
   */
  static postDeferredReviews() {
    const dbPromise = idb.open('restaurant-db', 1);
    let keyValStore;
    dbPromise
      .then((db) => {
        const tx = db.transaction('restaurants', 'readwrite');
        keyValStore = tx.objectStore('restaurants');
        return keyValStore.get('deferredReviews');
      })
      .then((reviews) => {
        if (reviews.length === 0) return; // Nothing to do if no Deferred Reviews
        keyValStore.put([], 'deferredReviews'); // Reset
        return Promise.all(
          reviews.map((review) =>
            fetch('http://localhost:1337/reviews/', {
              method: 'POST',
              body: JSON.stringify(review),
            })
          )
        );
      })
      .then(() => {
        console.log('Back online, all reviews POSTed');
      });
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    fetch(DBHelper.RESTAURANTS_URL)
      .then((response) => response.json())
      .then((restaurants) => {
        // console.table(data);
        DBHelper.storeRestaurantsInIndexedDb(restaurants);
        callback(null, restaurants);
      })
      .catch((error) => {
        console.log('Fetch error: ', error);
        DBHelper.fetchRestaurantsFromIndexedDb(callback);
      });
  }

  /**
   * Fetch reviews for a given restaurant.
   */
  static fetchReviews(restaurant, callback) {
    fetch(`${DBHelper.REVIEWS_URL}${restaurant.id}`)
      .then((response) => response.json())
      .then((reviews) => {
        // console.table(data);
        // DBHelper.storeInIndexedDb(restaurants);
        restaurant.reviews = reviews;
        DBHelper.storeReviewsInIndexedDb(restaurant.id, reviews);
        callback(null, restaurant);
      })
      .catch((error) => {
        console.log('Fetch error: ', error);
        DBHelper.fetchReviewsFromIndexedDb(restaurant, callback);
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find((r) => r.id == id);
        if (restaurant) {
          // Got the restaurant
          DBHelper.fetchReviews(restaurant, callback);
          // callback(null, restaurant);
        } else {
          // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter((r) => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(
          (r) => r.neighborhood == neighborhood
        );
        callback(null, results);
      }
    });
  }

  static storeRestaurantsInIndexedDb(restaurants) {
    const dbPromise = idb.open('restaurant-db', 1, (upgradeDb) => {
      const keyValStore = upgradeDb.createObjectStore('restaurants');
      console.log('IndexedDb created');
      keyValStore.put(restaurants, 'allRestaurants');
      keyValStore.put([], 'deferredReviews');
    });
  }

  static storeReviewsInIndexedDb(restaurantId, reviews) {
    const dbPromise = idb.open('restaurant-db', 1);

    dbPromise.then((db) => {
      const tx = db.transaction('restaurants', 'readwrite');
      const keyValStore = tx.objectStore('restaurants');
      keyValStore.put(reviews, restaurantId);
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(
    cuisine,
    neighborhood,
    callback
  ) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;

        if (cuisine != 'all') {
          // filter by cuisine
          results = results.filter((r) => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') {
          // filter by neighborhood
          results = results.filter((r) => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map(
          (v, i) => restaurants[i].neighborhood
        );
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter(
          (v, i) => neighborhoods.indexOf(v) == i
        );
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter(
          (v, i) => cuisines.indexOf(v) == i
        );
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return `./restaurant.html?id=${restaurant.id}`;
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    restaurant.photograph = restaurant.photograph || '10';
    return `/images/${restaurant.photograph}`;
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP,
    });
    return marker;
  }
}
