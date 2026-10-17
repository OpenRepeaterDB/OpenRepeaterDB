import { readFile, writeFile, rm, mkdir, cp } from "node:fs/promises";
import repeaters from "./repeaters.json" with { type: 'json' }

// Empty the build directory
await rm("build/", { recursive: true, force: true });
await mkdir("build/");
await mkdir("build/repeater/");
await mkdir("build/edit/");

// Read header, footer
const header = await readFile("app/header.html", {encoding: "utf-8"});
const footer = await readFile("app/footer.html", {encoding: "utf-8"});

// Copy assets
await cp("repeaters.json", "build/repeaters.json");
await cp("app/assets", "build/assets", { recursive: true });

// Copy 404, index, map
await copyFile("app/index.html", "build/index.html");
await copyFile("app/map.html", "build/map.html");
await copyFile("app/404.html", "build/404.html");
await copyFile("app/edit.html", "build/addrepeater.html", {
    title: "Add Repeater",
    callsign: "",
    downlink: "",
    offset: "",
    tone: "",
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
    copyFile("app/repeater.html", `build/repeater/${repeaterId}.html`, {
        callsign: repeater["callsign"],
        city: repeater["city"],
        region: repeater["region"],
        country: repeater["country"],
        downlink: repeater["downlink"],
        uplink: repeater["downlink"] + repeater["offset"],
        offset: repeater["offset"],
        tone: repeater["uplink_tone"],
        uplink_tone_display: repeater["uplink_tone"] === null ? "none" : "block",
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
        uplink: repeater["downlink"] + repeater["offset"],
        offset: repeater["offset"],
        tone: repeater["uplink_tone"],
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