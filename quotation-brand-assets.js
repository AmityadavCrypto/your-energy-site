(function initQuotationBrandAssets() {
  const FULL_LOGO_PATH = "assets/logo-your-energy-web.png";
  const MARK_SVG = String.raw`<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" shape-rendering="geometricPrecision">
  <circle cx="512" cy="560" r="280" fill="none" stroke="#08203F" stroke-width="116" stroke-dasharray="1585 175" stroke-dashoffset="88" transform="rotate(-90 512 560)"/>
  <rect x="454" y="104" width="116" height="394" rx="58" fill="#76C300"/>
</svg>`;

  let printAssetsPromise = null;

  function escapeAttribute(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function getAssetUrl(path) {
    return new URL(path, window.location.href).href;
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("Could not convert brand asset to a data URL."));
      reader.readAsDataURL(blob);
    });
  }

  async function fetchAssetAsDataUrl(path) {
    const response = await fetch(getAssetUrl(path), { cache: "force-cache" });
    if (!response.ok) {
      throw new Error(`Could not load asset: ${path}`);
    }

    const blob = await response.blob();
    return blobToDataUrl(blob);
  }

  function buildImageMarkup({ className, src, alt, width, height, decorative = false }) {
    const accessibilityAttributes = decorative
      ? 'alt="" aria-hidden="true"'
      : `alt="${escapeAttribute(alt)}"`;

    return `<img class="${escapeAttribute(className)}" src="${escapeAttribute(src)}" ${accessibilityAttributes} width="${width}" height="${height}" loading="eager" decoding="sync">`;
  }

  function withClass(svgMarkup, className) {
    if (!className) return svgMarkup;
    return svgMarkup.replace("<svg ", `<svg class="${escapeAttribute(className)}" `);
  }

  function buildFullLogoMarkup(className = "quotation-logo", sourceOverride) {
    return buildImageMarkup({
      className,
      src: sourceOverride || getAssetUrl(FULL_LOGO_PATH),
      alt: "Your Energy logo",
      width: 1384,
      height: 593,
    });
  }

  function buildMarkMarkup(className = "quotation-card-logo", sourceOverride) {
    if (sourceOverride) {
      return buildImageMarkup({
        className,
        src: sourceOverride,
        width: 1024,
        height: 1024,
        decorative: true,
      });
    }

    return withClass(MARK_SVG, className);
  }

  async function getPrintAssets() {
    if (!printAssetsPromise) {
      printAssetsPromise = fetchAssetAsDataUrl(FULL_LOGO_PATH)
        .catch(() => getAssetUrl(FULL_LOGO_PATH))
        .then((fullLogoSrc) => ({ fullLogoSrc }));
    }

    return printAssetsPromise;
  }

  window.QuotationBrandAssets = {
    buildFullLogoMarkup,
    buildMarkMarkup,
    getPrintAssets,
  };
})();
