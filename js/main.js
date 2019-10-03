let restaurants, neighborhoods, cuisines;
var newMap;
var markers = [];
const image_alts = {
  image_1: 'Group of people sitting in a restaurant',
  image_2: 'Pizza on a plate',
  image_3: 'Row of tables with tabletop grill',
  image_4: "Restaurant's look from the street",
  image_5: 'People dining in the foreground. Order counter in the background.',
  image_6: 'People dining and United States flag on the wall',
  image_7: 'Two men walking a dog in front of the restaurant',
  image_8: 'Restaurant logo view from the street',
  image_9: 'A guy eating with chopsticks and a girl checking her phone',
  image_10: 'Series of bar stools in front of a bar',
};

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap();
  fetchNeighborhoods();
  fetchCuisines();
  // When application is offline, initMap callback won't be called.
  // Therefore, updateRestaurants has to be called here.
  if (!window.navigator.onLine) {
    updateRestaurants();
  }
  document.querySelector('.show-map').addEventListener('click', function() {
    document.querySelector('#map').classList.toggle('hide');
    this.classList.toggle('hide');
  });
  window.addEventListener('online', DBHelper.postDeferredReviews);
});

/*
 * Setup lazy loading of images below the fold
 */
lazyLoadImagesSetup = () => {
  var lazyImages = [].slice.call(document.querySelectorAll('picture'));

  if ('IntersectionObserver' in window) {
    let lazyImageObserver = new IntersectionObserver(function(
      entries,
      observer
    ) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          let lazyImage = entry.target;
          // Remove the first source element (low quality placeholder image) when section is scrolled into view
          const firstSource = lazyImage.querySelector('source');
          lazyImage.removeChild(firstSource);
          lazyImageObserver.unobserve(lazyImage);
        }
      });
    });

    lazyImages.forEach(function(lazyImage) {
      lazyImageObserver.observe(lazyImage);
    });
  } else {
    // Possibly fall back to a more compatible method here
    console.log('Browser does not support Intersection Observer');
  }
};

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) {
      // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
};

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach((neighborhood) => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
};

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach((cuisine) => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  self.newMap = L.map('map', {
    center: [40.722216, -73.987501],
    zoom: 12,
    scrollWheelZoom: false,
  });
  L.tileLayer(
    'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}',
    {
      mapboxToken:
        'pk.eyJ1IjoiYmFnZ2FzdW1pdCIsImEiOiJjazBwbmt2bmIwbmNuM2NuOHhqYzBjZzN3In0.hmrtonLqAHdBQ_YgtsjokA',
      maxZoom: 18,
      attribution:
        'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      id: 'mapbox.streets',
    }
  ).addTo(newMap);

  updateRestaurants();
};

/**
 * Initialize Google map, called from HTML.
 */
window.initGMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501,
  };

  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false,
  });

  updateRestaurants();
};

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(
    cuisine,
    neighborhood,
    (error, restaurants) => {
      if (error) {
        // Got an error!
        console.error(error);
      } else {
        resetRestaurants(restaurants);
        fillRestaurantsHTML();
      }
    }
  );
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  // self.markers.forEach((m) => m.setMap(null));
  if (self.markers) {
    self.markers.forEach((marker) => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach((restaurant) => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
  lazyLoadImagesSetup();
};

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurantObj) => {
  const restaurant = restaurantObj.fields;
  const li = document.createElement('li');
  const image_path = DBHelper.imageUrlForRestaurant(restaurant);

  const picture = document.createElement('picture');

  // Placeholder image before lazy loading
  const source_webp_low = document.createElement('source');
  source_webp_low.srcset = image_path + '_low.jpg';
  picture.append(source_webp_low);

  const source_webp_small = document.createElement('source');
  source_webp_small.media = '(max-width: 550px)';
  source_webp_small.srcset = image_path + '_small.webp';
  source_webp_small.type = 'image/webp';
  picture.append(source_webp_small);

  const source_small = document.createElement('source');
  source_small.media = '(max-width: 550px)';
  source_small.srcset = image_path + '_small.jpg';
  picture.append(source_small);

  const source_webp = document.createElement('source');
  source_webp.srcset = image_path + '.webp';
  source_webp.type = 'image/webp';
  picture.append(source_webp);

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = image_path + '.jpg';
  image.alt = image_alts['image_' + restaurant.photograph];
  picture.append(image);

  li.append(picture);

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  li.append(name);

  const heart = document.createElement('span');
  heart.classList.add('heart');
  // Using JSON parse because value can be String "false" instead of Boolean false
  // if (JSON.parse(restaurant.is_favorite)) {
  if (restaurant.is_favorite) {
    heart.classList.add('hearted');
  }
  heart.addEventListener(
    'click',
    toggleFavoriteRestaurant.bind(heart, restaurantObj.id)
  );
  li.append(heart);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more);
  return li;
};

/**
 * Mark a restaurant as favorite and sent POST request to database
 */
function toggleFavoriteRestaurant(restaurantId) {
  const isFavorite = this.classList.contains('hearted') ? true : false;
  const url = `https://api.airtable.com/v0/appYOMzd3a6vUTxwE/Restaurants/${restaurantId}`;
  const headers = new Headers({
    Authorization: 'Bearer key7Jc1cbchLjkC4R',
    'Content-Type': 'application/json',
  });
  const data = {
    fields: {
      is_favorite: !isFavorite,
    },
  };

  fetch(url, { method: 'PATCH', headers, body: JSON.stringify(data) }).then(
    () => {
      this.classList.toggle('hearted');
    }
  );
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach((restaurant) => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(
      restaurant.fields,
      self.newMap
    );
    marker.on('click', onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });
};
/*
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach((restaurant) => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant.fields, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url;
    });
    self.markers.push(marker);
  });
};
*/
