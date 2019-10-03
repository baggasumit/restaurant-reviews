function createLatLngObject(latlng) {
  const [lat, lng] = latlng.split(',').map(Number);
  return { lat, lng };
}
