(function initQuotationBrandAssets() {
  const FULL_LOGO_PATH = "assets/logo-your-energy-web.png";
  const MARK_PATH = "assets/your-energy-mark.svg";

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
    return buildImageMarkup({
      className,
      src: sourceOverride || getAssetUrl(MARK_PATH),
      width: 1024,
      height: 1024,
      decorative: true,
    });
  }

  async function getPrintAssets() {
    if (!printAssetsPromise) {
      printAssetsPromise = Promise.all([
        fetchAssetAsDataUrl(FULL_LOGO_PATH).catch(() => getAssetUrl(FULL_LOGO_PATH)),
        fetchAssetAsDataUrl(MARK_PATH).catch(() => getAssetUrl(MARK_PATH)),
      ]).then(([fullLogoSrc, markSrc]) => ({ fullLogoSrc, markSrc }));
    }

    return printAssetsPromise;
  }

  window.QuotationBrandAssets = {
    buildFullLogoMarkup,
    buildMarkMarkup,
    getPrintAssets,
  };
})();
