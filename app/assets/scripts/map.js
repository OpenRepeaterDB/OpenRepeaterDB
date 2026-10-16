import * as maplibregl from 'https://unpkg.com/maplibre-gl@^6.14.0/dist/maplibre-gl.mjs';

const map = new maplibregl.Map({
    container: "map", // container id
    style: "https://tiles.openfreemap.org/styles/liberty", // style URL
    center: [-98.3735533, 38.0331492], // starting position [lng, lat]
    zoom: 2, // starting zoom
});

const repeatersJson = await fetch("/repeaters.json");

if (repeatersJson.ok) {
    const repeaters = await repeatersJson.json();
    Object.keys(repeaters).forEach(repeaterId => {
        const repeater = repeaters[repeaterId];

        const popup = new maplibregl.Popup({offset: 25}).setHTML(
            `<h3>${repeater["callsign"]}</h3>` +
            `<p><b>Uplink</b>: ${repeater["downlink"] + repeater["offset"]} MHz` +
            `<p><b>Downlink</b>: ${repeater["downlink"]} MHz` +
            `<p><b>Tone</b>: ${repeater["uplink_tone"]} Hz` +
            `<p><b>Location</b>: ${repeater["city"]}, ${repeater["region"]}, ${repeater["country"]}`
        );
        const marker = new maplibregl.Marker()
          .setLngLat([repeater["lng"], repeater["lat"]])
          .setPopup(popup)
          .addTo(map);
    })
} else {
    alert("Didn't load repeaters right, maybe try refreshing the page?")
}