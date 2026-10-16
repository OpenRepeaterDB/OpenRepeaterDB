import { readFile, writeFile, rm, mkdir, cp } from "node:fs/promises";

// Empty the build directory
await rm("build/", { recursive: true, force: true });
await mkdir("build/");

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