import * as maplibregl from 'https://unpkg.com/maplibre-gl@^6.14.0/dist/maplibre-gl.mjs';

const map = new maplibregl.Map({
    container: "map",
    style: "https://tiles.openfreemap.org/styles/liberty",
    center: [-98.3735533, 38.0331492],
    zoom: 2
});

const marker = new maplibregl.Marker({
    color: '#ff0000',
    draggable: true
});

map.on('click', (e) => {
    marker
        .setLngLat(e.lngLat)
        .addTo(map);
});

const lat = document.getElementById("lat").value;
const lng = document.getElementById("lng").value;

if (lat !== "" && lng !== "") {
    marker
        .setLngLat([lng, lat])
        .addTo(map);
}

const form = document.getElementById("repeaterForm");
form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const lngLat = marker.getLngLat();

    if (lngLat === undefined) {
        document.getElementById("locationPlease").style.display = "block";
    } else {
        document.getElementById("locationPlease").style.display = "none";
    }
})