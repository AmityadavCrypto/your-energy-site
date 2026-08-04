const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath));
}

function pngDimensions(relativePath) {
  const png = read(relativePath);
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  };
}

test("favicon master uses clean vector geometry instead of a raster crop", () => {
  const svg = read("assets/favicon.svg").toString("utf8");

  assert.match(svg, /<path d="M 148 160 A 168 168/);
  assert.match(svg, /fill="#76C300"/);
  assert.match(svg, /stroke="#08203F"/);
  assert.doesNotMatch(svg, /<image|data:image/i);
});

test("favicon PNG exports have the required square dimensions", () => {
  const exports = [
    ["assets/favicon-16.png", 16],
    ["assets/favicon-32.png", 32],
    ["assets/favicon-48.png", 48],
    ["assets/favicon-96.png", 96],
    ["assets/apple-touch-icon.png", 180],
    ["assets/android-chrome-192.png", 192],
    ["assets/android-chrome-512.png", 512],
  ];

  for (const [file, size] of exports) {
    assert.deepEqual(pngDimensions(file), { width: size, height: size }, file);
  }
});

test("root ICO includes 16, 32, and 48 pixel images", () => {
  const ico = read("favicon.ico");
  const count = ico.readUInt16LE(4);
  const sizes = [];

  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(count, 3);

  for (let index = 0; index < count; index += 1) {
    sizes.push(ico[6 + index * 16] || 256);
  }

  assert.deepEqual(sizes, [16, 32, 48]);
});

test("homepage exposes stable favicon URLs for Google", () => {
  const homepage = read("index.html").toString("utf8");

  assert.match(homepage, /href="\/favicon\.ico"/);
  assert.match(homepage, /href="\/assets\/favicon\.svg"/);
  assert.match(homepage, /href="\/assets\/favicon-96\.png"/);
  assert.doesNotMatch(homepage, /favicon[^"']*\?v=/);
});
