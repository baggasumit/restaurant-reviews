let restaurant;
var map;

// When application is offline, initMap callback won't be called.
// Therefore, updating the DOM with Restaurant Info has to be done here.
document.addEventListener('DOMContentLoaded', (event) => {
  if (!window.navigator.onLine) {
    fetchRestaurantFromURL((error, restaurant) => {
      if (error) {
        // Got an error!
        console.error(error);
      } else {
        fillBreadcrumb();
      }
    });
  }
  document.querySelector('#add-review').addEventListener('submit', addReview);
  window.addEventListener('online', DBHelper.postDeferredReviews);
});

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  if (!window.navigator.onLine) return; // If it is called even if app is offline
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false,
      });
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);

      fillBreadcrumb();
    }
  });
};

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) {
    // restaurant already fetched!
    callback(null, self.restaurant);
    return;
  }
  const id = getParameterByName('id');
  if (!id) {
    // no id found in URL
    error = 'No restaurant id in URL';
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant);
    });
  }
};

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant) + '.jpg';
  image.alt = restaurant.image_alt;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (
  operatingHours = self.restaurant.operating_hours
) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  // const title = document.createElement('h3');
  // title.innerHTML = 'Reviews';
  // container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach((review) => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
};

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = formatDate(review.createdAt);
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
};

/**
 * Format date as Month Day, YEAR
 */
formatDate = (dateString) => {
  const date = new Date(dateString);
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return date.toLocaleDateString('en-US', options);
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  // Check if breadcrumb is already populated
  if (breadcrumb.childElementCount === 1) {
    const li = document.createElement('li');
    li.innerHTML = restaurant.name;
    breadcrumb.appendChild(li);
  }
};

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

function addReview(event) {
  event.preventDefault();

  const restaurantId = window.location.search.slice(4);
  const review = {
    name: this.name.value,
    rating: this.rating.value,
    restaurant_id: restaurantId,
    comments: this.comments.value,
  };

  if (window.navigator.onLine) {
    fetch('http://localhost:1337/reviews/', {
      method: 'POST',
      body: JSON.stringify(review),
    })
      .then(() => {
        window.location.reload();
      })
      .catch((error) => {
        console.log('Could not POST review; Error: ', error);
      });
  } else {
    console.log('App is offine, save review to IndexedDb');
    saveReviewToIndexedDb(review);
  }
}

function saveReviewToIndexedDb(review) {
  const dbPromise = idb.open('restaurant-db', 1);
  let tx, keyValStore;
  dbPromise
    .then((db) => {
      tx = db.transaction('restaurants', 'readwrite');
      keyValStore = tx.objectStore('restaurants');
      return keyValStore.get('deferredReviews');
    })
    .then((reviews) => {
      reviews.push(review);
      keyValStore.put(reviews, 'deferredReviews');
      self.restaurant.reviews.push(review);
      keyValStore.put(self.restaurant.reviews, self.restaurant.id);
      return tx.complete;
    })
    .then(() => {
      console.log('Review added to Deferred Reviews');
      window.location.reload();
    });
}
