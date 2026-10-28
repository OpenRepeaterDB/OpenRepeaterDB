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

const lat = document.getElementById("lat");
const lng = document.getElementById("lng");

if (lat.value !== "" && lng.value !== "") {
    marker
        .setLngLat([lng.value, lat.value])
        .addTo(map);
}

const form = document.getElementById("repeaterForm");
form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    submitForm()
})

async function submitForm() {
    const lngLat = marker.getLngLat();

    if (lngLat === undefined) {
        document.getElementById("locationPlease").style.display = "block";
    } else {
        document.getElementById("locationPlease").style.display = "none";
        lat.value = lngLat.lat;
        lng.value = lngLat.lng;

        const formData = new FormData(form);

        document.getElementById("submittingChanges").showModal();
        const repeater = Object.fromEntries(formData);
        repeater["downlink"] = parseFloat(repeater["downlink"]);
        repeater["lat"] = parseFloat(repeater["lat"]);
        repeater["lng"] = parseFloat(repeater["lng"]);
        repeater["offset"] = parseFloat(repeater["offset"]);
        repeater["uplink_tone"] = parseFloat(repeater["uplink_tone"]);
    
        const result = await fetch("https://dubster.hazelhope.com/api/openrepeaterdb/suggest.py", {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify(repeater),
        });
    
        document.getElementById("submittingChanges").close();
        if (result.status == 200) {
            document.getElementById("error").close();
            const ghLink = (await result.json()).url;
            document.getElementById("githubLink").href = ghLink;
            document.getElementById("success").showModal();
        } else {
            if (result.status == 429) {
                document.getElementById("rateLimited").style.display = "block";
                document.getElementById("internalServerError").style.display = "none";
            } else {
                document.getElementById("rateLimited").style.display = "none";
                document.getElementById("internalServerError").style.display = "block";
            }
            document.getElementById("error").showModal();
        }
    }
}

document.getElementById("retry").addEventListener("click", submitForm)

document.getElementById("closeSuccess").addEventListener("click", () => {
    location.href = "/";
})

const ctcssSelector = document.getElementById("uplink_tone_type");
const ctcssOption = document.getElementById("ctcssOption");
const dcsOption = document.getElementById("dcsOption");

function updateDcsCtcss() {
    if (ctcssSelector.value === "dcs") {
        dcsOption.style.display = "block";
        ctcssOption.style.display = "none";
    } else if (ctcssSelector.value === "ctcss") {
        ctcssOption.style.display = "block";
        dcsOption.style.display = "none";
    } else {
        ctcssOption.style.display = "none";
        dcsOption.style.display = "none";
    }
}

ctcssSelector.addEventListener("change", updateDcsCtcss)