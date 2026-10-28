import { readFile, writeFile, rm, mkdir, cp, readdir } from "node:fs/promises";

// Empty the build directory
await rm("build/", { recursive: true, force: true });
await mkdir("build/");
await mkdir("build/repeater/");
await mkdir("build/edit/");

// Read header, footer
const header = await readFile("app/header.html", {encoding: "utf-8"});
const footer = await readFile("app/footer.html", {encoding: "utf-8"});

// Copy assets
await cp("app/assets", "build/assets", { recursive: true });

// Copy 404, index, map
await copyFile("app/index.html", "build/index.html");
await copyFile("app/map.html", "build/map.html");
await copyFile("app/404.html", "build/404.html");

const repeaterIds = (await readdir("repeaters/")).filter(str => str !== "README.md" && str !== "LICENSE" && !str.startsWith("."));
const repeaters = {};

for (const fileName of repeaterIds) {
    const repeaterContents = await readFile(`repeaters/${fileName}`, { encoding: "utf-8" });
    const repeaterId = fileName.replaceAll(".json", "");
    repeaters[repeaterId] = JSON.parse(repeaterContents);
}

// Convert repeaters to geojson
const repeatersGeoJson = {
    "type": "FeatureCollection",
    "features": Object.keys(repeaters).map(repeaterId => {
        const repeater = repeaters[repeaterId];
        repeater["id"] = repeaterId;
        return {
            "type": "Feature",
            "properties": repeater,
            "geometry": {
                "type": "Point",
                "coordinates": [
                    repeater["lng"],
                    repeater["lat"]
                ]
            }
        };
    })
}

writeFile("build/repeaters.json", JSON.stringify(repeaters));
writeFile("build/repeaters.geojson", JSON.stringify(repeatersGeoJson));

await copyFile("app/edit.html", "build/addrepeater.html", {
    title: "Add Repeater",
    callsign: "",
    downlink: "",
    offset: "",
    tone: "",
    code: "",
    dcs_normal_selected: "",
    dcs_inverted_selected: "",
    none_selected: "selected",
    ctcss_selected: "",
    dcs_selected: "",
    ctcss_display: "none",
    dcs_display: "none",
    city: "",
    region: "",
    country: "",
    website: "",
    notes: "",
    lat: "",
    lng: "",
    id: ""
});

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
Object.keys(repeaters).forEach(repeaterId => {
    const repeater = repeaters[repeaterId];
    const lastUpdatedDate = new Date(repeater["last_updated"]);
    const lastUpdated = `${months[lastUpdatedDate.getUTCMonth()]} ${lastUpdatedDate.getUTCDate()}, ${lastUpdatedDate.getUTCFullYear()} at ${lastUpdatedDate.getUTCHours().toString().padStart(2, "0")}:${lastUpdatedDate.getUTCMinutes().toString().padStart(2, "0")} UTC`

    const uplink = (repeater["downlink"] + repeater["offset"]).toFixed(4);
    const normalizedUplink = uplink.endsWith("0") ? uplink.substring(0, 7) : uplink;

    const uplinkToneDCS = repeater["uplink_tone_type"] === "dcs" ?
        `D${Math.abs(repeater["uplink_code"])}${repeater["uplink_code"] < 0 ? "I" : "N"}`
        : "";
    copyFile("app/repeater.html", `build/repeater/${repeaterId}.html`, {
        callsign: repeater["callsign"],
        city: repeater["city"],
        region: repeater["region"],
        country: repeater["country"],
        downlink: repeater["downlink"],
        uplink: normalizedUplink,
        offset: repeater["offset"],
        tone: repeater["uplink_tone"],
        code: uplinkToneDCS,
        uplink_tone_display: repeater["uplink_tone"] == null ? "none" : "block",
        uplink_code_display: repeater["uplink_code"] == null ? "none" : "block",
        notes: repeater["notes"]
            .replaceAll("\r", "")
            .replaceAll("\n\n", "\n")
            .split("\n")
            .map(line => `<p>${line}</p>`)
            .join(""),
        website: repeater["owner_website"],
        last_updated: lastUpdated,
        lat: repeater["lat"],
        lng: repeater["lng"],
        id: repeaterId,
    }, {
        title: `${repeater["callsign"]} | OpenRepeaterDB`
    })

    copyFile("app/edit.html", `build/edit/${repeaterId}.html`, {
        title: "Edit Repeater",
        callsign: repeater["callsign"],
        city: repeater["city"],
        region: repeater["region"],
        country: repeater["country"],
        downlink: repeater["downlink"],
        uplink: normalizedUplink,
        offset: repeater["offset"],
        tone: repeater["uplink_tone"] !== null && repeater["uplink_tone"] !== undefined ? repeater["uplink_tone"] : "",
        code: repeater["uplink_code"] ? Math.abs(repeater["uplink_code"]) : "",
        dcs_normal_selected: repeater["uplink_code"] >= 0 ? "selected" : "",
        dcs_inverted_selected: repeater["uplink_code"] < 0 ? "selected" : "",
        none_selected: repeater["uplink_tone_type"] === "none" ? "selected" : "",
        ctcss_selected: repeater["uplink_tone_type"] === "ctcss" ? "selected" : "",
        dcs_selected: repeater["uplink_tone_type"] === "dcs" ? "selected" : "",
        ctcss_display: repeater["uplink_tone_type"] === "ctcss" ? "block" : "none",
        dcs_display: repeater["uplink_tone_type"] === "dcs" ? "block" : "none",
        notes: repeater["notes"],
        website: repeater["owner_website"],
        lat: repeater["lat"],
        lng: repeater["lng"],
        id: repeaterId,
    }, {
        title: `Edit ${repeater["callsign"]} | OpenRepeaterDB`
    });
})

async function copyFile(src, dest, customReplace={}, overrideMetadata={}) {
    const template = await readFile(src, {encoding: "utf-8"});
    const splitAtMetadata = template.split(":endmetadata-->");

    const metadata = JSON.parse(splitAtMetadata[0].replace("<!--metadata:", "").trim());

    const mergedMetadata = { ...metadata, ...overrideMetadata };
    let extraCss = "";
    if ("css" in mergedMetadata) {
        mergedMetadata["css"].forEach(stylesheet => {
            extraCss += `<link rel="stylesheet" href="/assets/styles/${stylesheet}.css">\n`
        })
    }
    const newHeader = header
        .replaceAll("{{title}}", mergedMetadata["title"])
        .replaceAll("{{extra_css}}", extraCss)

    
    let processedTemplate = splitAtMetadata[1].replaceAll("{{header}}", newHeader).replaceAll("{{footer}}", footer);

    Object.keys(customReplace).forEach(key => {
        processedTemplate = processedTemplate.replaceAll(`{{${key}}}`, customReplace[key]);
    })

    await writeFile(dest, processedTemplate);
}