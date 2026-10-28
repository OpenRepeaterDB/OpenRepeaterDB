import * as maplibregl from 'https://unpkg.com/maplibre-gl@^6.14.0/dist/maplibre-gl.mjs';

const map = new maplibregl.Map({
    container: "map",
    style: "https://tiles.openfreemap.org/styles/liberty",
    center: [-98.3735533, 38.0331492],
    zoom: 2,
    fadeDuration: 0
});

const repeatersJson = await fetch("/repeaters.geojson", { cache: "no-cache" });

if (repeatersJson.ok) {
    const repeaters = await repeatersJson.json();

    if (!map.isStyleLoaded()) {
        await new Promise(resolve => {
            map.once("load", resolve);
        });
    }

    map.addSource("repeaters", {
        type: "geojson",
        data: repeaters,
        cluster: true,
        clusterRadius: 20,
        clusterMaxZoom: 14
    });

    map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'repeaters',
        filter: ['has', 'point_count'],
        paint: {
            'circle-color': '#2E7D32',
            'circle-radius': 16,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
        }
    });

    map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'repeaters',
        filter: ['has', 'point_count'],
        layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['Lato'],
            'text-size': 12
        },
        paint: {
            "text-color": "#fafafa"
        }
    });

    map.addLayer({
        id: "repeaters",
        type: "circle",
        source: "repeaters",
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': '#2E7D32',
            'circle-radius': 8,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
        }
    });

    map.on('click', 'repeaters', (e) => {
      const coordinates = e.features[0].geometry.coordinates.slice();
    
      // Handle wrap-around for zoomed-out maps
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      const repeater = e.features[0].properties;

      const uplink = (repeater["downlink"] + repeater["offset"]).toFixed(4);
      const normalizedUplink = uplink.endsWith("0") ? uplink.substring(0, 7) : uplink;

      let uplinkToneStr = "";

      if (repeater["uplink_tone_type"] === "ctcss" && repeater["uplink_tone"] !== null && repeater["uplink_tone"] !== undefined) {
          uplinkToneStr = `<p><b>Tone</b>: ${repeater["uplink_tone"]} Hz`
      } else if (repeater["uplink_tone_type"] === "dcs" && repeater["uplink_code"] !== null && repeater["uplink_code"] !== undefined) {
          uplinkToneStr = `<p><b>DCS Code</b>: D${Math.abs(repeater["uplink_code"])}${repeater["uplink_code"] < 0 ? "I" : "N"}`;          
      }
      
      new maplibregl.Popup()
        .setLngLat(coordinates)
        .setHTML(
            `<h3>${repeater["callsign"]}</h3>` +
            `<p><b>Downlink</b>: ${repeater["downlink"]} MHz` +
            `<p><b>Uplink</b>: ${normalizedUplink} MHz` +
            uplinkToneStr +
            `<p><b>Location</b>: ${repeater["city"]}, ${repeater["region"]}, ${repeater["country"]}` +
            `<p><a href="/repeater/${repeater["id"]}">More information</a></p>`
        )
        .addTo(map);
    });
} else {
    alert("Didn't load repeaters right, maybe try refreshing the page?")
}