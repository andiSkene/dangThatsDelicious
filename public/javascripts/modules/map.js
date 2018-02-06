import axios from 'axios';
import { $ } from './bling';

const mapOptions = {
  center: { lat: 39.7392, lng: -104.9903 },
  zoom: 10
}

function loadPlaces(map, lat = 39.7392, lng = -104.9903){
  axios.get(`/api/stores/near?lat=${lat}&lng=${lng}`)
    .then(res => {
      const places = res.data;
      if(!places.length){
        alert('No places found!');
        return;
      };

      //create bounds
      const bounds = new google.maps.LatLngBounds();
      const infoWindow = new google.maps.InfoWindow();

      const markers = places.map(place => {
          const [placeLng, placeLat] = place.location.coordinates;
          const position = { lat: placeLat, lng: placeLng};
          //extend the bounds of the viewable map
          bounds.extend(position);
          const marker = new google.maps.Marker({ map, position });
          //attach data to each marker on map
          marker.place = place;
          return marker;
      });

      //when someone clicks on a marker, show the details of the place
      markers.forEach(marker => marker.addListener('click', function() {
        const html = `
        <div class="popup">
          <a href="/store/${this.place.slug}">
            <img src="/uploads/${this.place.photo || 'store.png'}" alt="${this.place.name}" />
            <p>${this.place.name} - ${this.place.location.address}</p>
            </a>
          </div>
          `;
        infoWindow.setContent(html);
        infoWindow.open(map, marker);
      }));

      //center the markers on the map
      map.setCenter(bounds.getCenter());
      //zoom the map to fit all the markers perfectly
      map.fitBounds(bounds);
    });
};

function makeMap(mapDiv){
 if(!mapDiv) return;
 //make our mapDiv :: pass in where it goes and optsion
 const map = new google.maps.Map(mapDiv, mapOptions);
 loadPlaces(map);

 const input = $('[name="geolocate"]');
 const autocomplete = new google.maps.places.Autocomplete(input);
 autocomplete.addListener('place_changed', () => {
   const place = autocomplete.getPlace();
   loadPlaces(map, place.geometry.location.lat(), place.geometry.location.lng())
 })
};

export default makeMap;
