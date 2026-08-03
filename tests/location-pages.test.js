const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const sharedPhoneDisplay = "+91 92618 69245";
const sharedPhoneSchema = "+91-92618-69245";

const locations = [
  {
    slug: "gurugram",
    city: "Gurugram",
    address: "SGT Chandu Budhera Road, Near Labour Chowk, Garhi Harsaru, Gurugram - 122505, Haryana",
    postalCode: "122505",
  },
  {
    slug: "rewari",
    city: "Rewari",
    address: "Kund-Behror Road, near Madona Beauty Parlour, near Om Villa Marriage Garden, Rewari - 123102, Haryana",
    postalCode: "123102",
  },
  {
    slug: "kotputli",
    city: "Kotputli",
    address: "White House, Shakti Vihar, Kotputli - 303108, Rajasthan",
    postalCode: "303108",
  },
  {
    slug: "sikar",
    city: "Sikar",
    address: "Sanwali Circle, Sikar - 332021, Rajasthan",
    postalCode: "332021",
  },
  {
    slug: "jaipur",
    city: "Jaipur",
    address: "Nemi Sagar Colony, Vaishali Nagar, Jaipur - 302021, Rajasthan",
    postalCode: "302021",
  },
];

function readLocation(slug) {
  return fs.readFileSync(path.join(root, "locations", `${slug}.html`), "utf8");
}

function readStructuredData(html) {
  const match = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
  assert.ok(match, "Location page is missing JSON-LD structured data");
  return JSON.parse(match[1]);
}

test("every official office has a complete, unique location page", () => {
  const titles = new Set();

  locations.forEach(({ slug, city, address, postalCode }) => {
    const html = readLocation(slug);
    const canonical = `https://www.yourenergy.co.in/locations/${slug}.html`;
    const titleMatch = html.match(/<title>(.*?)<\/title>/);

    assert.ok(titleMatch, `${city} is missing a title`);
    assert.ok(!titles.has(titleMatch[1]), `${city} title is duplicated`);
    titles.add(titleMatch[1]);

    assert.ok(html.includes(`rel="canonical" href="${canonical}"`), `${city} canonical URL is incorrect`);
    assert.ok(html.includes(address), `${city} display address is incorrect`);
    assert.ok(html.includes(sharedPhoneDisplay), `${city} does not show the shared phone number`);
    assert.ok(html.includes("Official Your Energy office"), `${city} is not identified as an official office`);
    assert.ok(html.includes("physical office"), `${city} does not distinguish its office from service coverage`);
    assert.ok(html.includes("location-area-disclaimer"), `${city} is missing its service-area disclaimer`);

    const schema = readStructuredData(html);
    assert.equal(schema["@type"], "LocalBusiness");
    assert.equal(schema.url, canonical);
    assert.equal(schema.telephone, sharedPhoneSchema);
    assert.equal(schema.address.addressLocality, city);
    assert.equal(schema.address.postalCode, postalCode);
    assert.equal(schema.address.addressCountry, "IN");

    locations.forEach(({ slug: linkedSlug, city: linkedCity }) => {
      assert.ok(html.includes(`href="${linkedSlug}.html"`), `${city} does not link to the ${linkedCity} office`);
    });
  });
});

test("office directory and sitemap expose all five official location pages", () => {
  const homepage = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const directory = fs.readFileSync(path.join(root, "locations", "index.html"), "utf8");
  const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");

  assert.ok(homepage.includes('href="locations/"'), "Homepage does not link to the office directory");
  assert.ok(directory.includes('rel="canonical" href="https://www.yourenergy.co.in/locations/"'));
  assert.ok(sitemap.includes("https://www.yourenergy.co.in/locations/"), "Sitemap does not include the office directory");

  locations.forEach(({ slug, city }) => {
    assert.ok(directory.includes(`href="${slug}.html"`), `Office directory does not link to ${city}`);
    assert.ok(sitemap.includes(`https://www.yourenergy.co.in/locations/${slug}.html`), `Sitemap does not include ${city}`);
  });

  const schema = readStructuredData(directory);
  assert.equal(schema["@type"], "CollectionPage");
  assert.equal(schema.mainEntity["@type"], "ItemList");
  assert.equal(schema.mainEntity.numberOfItems, 5);
  assert.equal(schema.mainEntity.itemListElement.length, 5);
});

test("homepage company section highlights only Gurugram, Kotputli, and Sikar", () => {
  const homepage = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const match = homepage.match(/Company &amp; Offices<\/strong>([\s\S]*?)<div class="footer-contact-tools">/);

  assert.ok(match, "Homepage company and offices section is missing");
  const officeBlock = match[1];

  ["gurugram", "kotputli", "sikar"].forEach((slug) => {
    assert.ok(officeBlock.includes(`href="locations/${slug}.html"`), `${slug} is missing from the homepage office block`);
  });
  ["rewari", "jaipur"].forEach((slug) => {
    assert.ok(!officeBlock.includes(`href="locations/${slug}.html"`), `${slug} should only appear in the office directory`);
  });
  assert.ok(officeBlock.includes('href="locations/"'), "Homepage office block is missing the all-offices link");
});

test("Rewari and Behror spellings remain correct", () => {
  const rewari = readLocation("rewari");
  const homepage = fs.readFileSync(path.join(root, "index.html"), "utf8");

  assert.ok(rewari.includes("Kund-Behror Road"));
  assert.ok(!rewari.includes("Kund-Behror Road, near Madona Beauty Parlour, near Om Villa Marriage Garden, Behror"));
  assert.ok(homepage.includes("<li>Behror</li>"));
  assert.ok(!homepage.includes("Bheror"));
});
