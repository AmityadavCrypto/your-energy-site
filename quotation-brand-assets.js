(function initQuotationBrandAssets() {
  const FULL_LOGO_PATH = "assets/logo-your-energy-web.png";
  const EXACT_MARK_WIDTH = 362;
  const EXACT_MARK_HEIGHT = 378;
  const EXACT_MARK_SOURCE_X = 349;
  const EXACT_MARK_SOURCE_Y = 0;
  const FULL_LOGO_WIDTH = 1384;
  const FULL_LOGO_HEIGHT = 593;

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

  function buildExactMarkSvgMarkup(imageHref, className = "quotation-card-logo") {
    return `<svg class="${escapeAttribute(className)}" viewBox="0 0 ${EXACT_MARK_WIDTH} ${EXACT_MARK_HEIGHT}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet" overflow="hidden">
  <defs>
    <clipPath id="quotation-mark-artwork-clip">
      <path d="M 4 0 H ${EXACT_MARK_WIDTH} V ${EXACT_MARK_HEIGHT} H 0 V 80 H 4 Z"/>
    </clipPath>
  </defs>
  <image href="${escapeAttribute(imageHref)}" x="-${EXACT_MARK_SOURCE_X}" y="-${EXACT_MARK_SOURCE_Y}" width="${FULL_LOGO_WIDTH}" height="${FULL_LOGO_HEIGHT}" clip-path="url(#quotation-mark-artwork-clip)"/>
</svg>`;
  }

  function svgMarkupToDataUrl(svgMarkup) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgMarkup)}`;
  }

  function buildFullLogoMarkup(className = "quotation-logo", sourceOverride) {
    return buildImageMarkup({
      className,
      src: sourceOverride || getAssetUrl(FULL_LOGO_PATH),
      alt: "Your Energy logo",
      width: FULL_LOGO_WIDTH,
      height: FULL_LOGO_HEIGHT,
    });
  }

  function buildMarkMarkup(className = "quotation-card-logo", sourceOverride) {
    if (sourceOverride) {
      return buildImageMarkup({
        className,
        src: sourceOverride,
        width: EXACT_MARK_WIDTH,
        height: EXACT_MARK_HEIGHT,
        decorative: true,
      });
    }

    return buildExactMarkSvgMarkup(getAssetUrl(FULL_LOGO_PATH), className);
  }

  async function getPrintAssets() {
    if (!printAssetsPromise) {
      printAssetsPromise = fetchAssetAsDataUrl(FULL_LOGO_PATH)
        .catch(() => getAssetUrl(FULL_LOGO_PATH))
        .then((fullLogoSrc) => ({
          fullLogoSrc,
          markSrc: svgMarkupToDataUrl(buildExactMarkSvgMarkup(fullLogoSrc)),
        }));
    }

    return printAssetsPromise;
  }

  window.QuotationBrandAssets = {
    buildFullLogoMarkup,
    buildMarkMarkup,
    getPrintAssets,
  };
})();
