const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  serviceAreas,
  renderPage,
  renderDirectory,
} = require("../scripts/generate-service-area-pages");

const root = path.join(__dirname, "..");
const serviceAreaDir = path.join(root, "service-areas");
const phoneDisplay = "+91 92618 69245";
const phoneSchema = "+91-92618-69245";
const officeSlugs = new Set(["gurugram", "rewari", "kotputli", "sikar", "jaipur"]);
const officeStreetMarkers = [
  "SGT Chandu Budhera Road",
  "Kund-Behror Road",
  "White House, Shakti Vihar",
  "Sanwali Circle",
  "Nemi Sagar Colony",
];

function readPage(slug) {
  return fs.readFileSync(path.join(serviceAreaDir, `${slug}.html`), "utf8");
}

function structuredData(html) {
  const match = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
  assert.ok(match, "Service-area page is missing JSON-LD");
  return JSON.parse(match[1]);
}

test("generator creates all 19 non-office service-area pages reproducibly", () => {
  assert.equal(serviceAreas.length, 19);

  const generatedHtml = fs.readdirSync(serviceAreaDir).filter((file) => file.endsWith(".html"));
  assert.equal(generatedHtml.length, serviceAreas.length + 1);

  serviceAreas.forEach((area) => {
    assert.ok(!officeSlugs.has(area.slug), `${area.city} already has an office page`);
    assert.equal(readPage(area.slug), renderPage(area), `${area.city} page is out of sync with the generator`);
  });

  assert.equal(fs.readFileSync(path.join(serviceAreaDir, "index.html"), "utf8"), renderDirectory());
});

test("every city page has unique metadata, Service schema, and the shared phone", () => {
  const titles = new Set();
  const descriptions = new Set();
  const headlines = new Set();

  serviceAreas.forEach((area) => {
    const html = readPage(area.slug);
    const canonical = `https://www.yourenergy.co.in/service-areas/${area.slug}.html`;
    const title = html.match(/<title>(.*?)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="(.*?)">/)?.[1];

    assert.ok(title, `${area.city} is missing a title`);
    assert.ok(description, `${area.city} is missing a description`);
    assert.ok(!titles.has(title), `${area.city} title is duplicated`);
    assert.ok(!descriptions.has(description), `${area.city} description is duplicated`);
    assert.ok(!headlines.has(area.headline), `${area.city} headline is duplicated`);
    titles.add(title);
    descriptions.add(description);
    headlines.add(area.headline);

    assert.ok(html.includes(`rel="canonical" href="${canonical}"`));
    assert.ok(html.includes(phoneDisplay), `${area.city} is missing the shared phone number`);
    assert.ok(html.includes("service-area page, not a physical office listing"));

    const schema = structuredData(html);
    assert.equal(schema["@type"], "Service");
    assert.equal(schema.url, canonical);
    assert.equal(schema.provider.telephone, phoneSchema);
    assert.equal(schema.areaServed.name, area.city);
    assert.equal(schema.areaServed.containedInPlace.name, area.region);
    assert.equal(schema.address, undefined);
    assert.notEqual(schema["@type"], "LocalBusiness");
  });
});

test("service-area pages never publish office addresses", () => {
  serviceAreas.forEach((area) => {
    const html = readPage(area.slug);
    assert.ok(!html.includes("<address"), `${area.city} contains an address element`);
    officeStreetMarkers.forEach((marker) => {
      assert.ok(!html.includes(marker), `${area.city} contains the office marker ${marker}`);
    });
  });
});

test("homepage, directory, and sitemap link every service city", () => {
  const homepage = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const directory = fs.readFileSync(path.join(serviceAreaDir, "index.html"), "utf8");
  const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");

  assert.ok(homepage.includes('href="service-areas/"'));
  assert.ok(directory.includes('rel="canonical" href="https://www.yourenergy.co.in/service-areas/"'));
  assert.ok(sitemap.includes("https://www.yourenergy.co.in/service-areas/"));

  serviceAreas.forEach((area) => {
    assert.ok(homepage.includes(`href="service-areas/${area.slug}.html"`), `Homepage does not link ${area.city}`);
    assert.ok(directory.includes(`href="${area.slug}.html"`), `Directory does not link ${area.city}`);
    assert.ok(sitemap.includes(`https://www.yourenergy.co.in/service-areas/${area.slug}.html`), `Sitemap does not include ${area.city}`);
  });

  const schema = structuredData(directory);
  assert.equal(schema["@type"], "CollectionPage");
  assert.equal(schema.mainEntity.numberOfItems, serviceAreas.length);
  assert.equal(schema.mainEntity.itemListElement.length, serviceAreas.length);
});
