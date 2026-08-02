function createCatalogCard(item) {
  const card = document.createElement("article");
  card.className = "blog-card";
  card.dataset.blogCard = "";
  card.dataset.category = item.categorySlug;

  const visual = document.createElement("a");
  visual.className = `blog-card-visual ${item.tone}`;
  visual.href = item.href;
  visual.setAttribute("aria-label", `Read ${item.title}`);
  const visualCategory = document.createElement("span");
  visualCategory.textContent = item.category;
  const visualNumber = document.createElement("strong");
  visualNumber.textContent = item.number;
  visual.append(visualCategory, visualNumber);

  const body = document.createElement("div");
  body.className = "blog-card-body";
  const category = document.createElement("span");
  category.className = "blog-card-category";
  category.textContent = item.category;
  const heading = document.createElement("h3");
  const link = document.createElement("a");
  link.href = item.href;
  link.textContent = item.title;
  heading.append(link);
  const excerpt = document.createElement("p");
  excerpt.textContent = item.excerpt;
  const meta = document.createElement("div");
  meta.className = "blog-card-meta";
  const readTime = document.createElement("span");
  readTime.textContent = item.readTime;
  meta.append(readTime);
  body.append(category, heading, excerpt, meta);
  card.append(visual, body);
  return card;
}

function renderExpandedCatalog() {
  const grid = document.querySelector(".blog-grid");
  const catalog = window.YOUR_ENERGY_BLOG_CATALOG;
  if (!grid || !Array.isArray(catalog)) return;
  const fragment = document.createDocumentFragment();
  catalog.forEach((item) => fragment.append(createCatalogCard(item)));
  grid.append(fragment);
}

function setupBlogFilters() {
  const search = document.querySelector("[data-blog-search]");
  const filters = Array.from(document.querySelectorAll("[data-blog-filter]"));
  const cards = Array.from(document.querySelectorAll("[data-blog-card]"));
  const count = document.querySelector("[data-blog-count]");
  const empty = document.querySelector("[data-blog-empty]");
  const loadMore = document.querySelector("[data-blog-load-more]");

  if (!cards.length) return;

  let activeCategory = "all";
  const pageSize = 24;
  let visibleLimit = pageSize;

  const applyFilters = () => {
    const query = (search?.value || "").trim().toLowerCase();
    const matches = [];

    cards.forEach((card) => {
      const category = card.dataset.category || "";
      const searchableText = card.textContent.toLowerCase();
      const categoryMatches = activeCategory === "all" || category === activeCategory;
      const searchMatches = !query || searchableText.includes(query);
      if (categoryMatches && searchMatches) matches.push(card);
      card.hidden = true;
    });

    matches.slice(0, visibleLimit).forEach((card) => {
      card.hidden = false;
    });

    if (count) count.textContent = `${matches.length} ${matches.length === 1 ? "guide" : "guides"}`;
    if (empty) empty.hidden = matches.length !== 0;
    if (loadMore) {
      loadMore.hidden = visibleLimit >= matches.length;
      loadMore.textContent = `Show more guides (${Math.min(pageSize, Math.max(0, matches.length - visibleLimit))})`;
    }
  };

  filters.forEach((filter) => {
    filter.addEventListener("click", () => {
      activeCategory = filter.dataset.blogFilter || "all";
      filters.forEach((item) => {
        const isActive = item === filter;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-pressed", String(isActive));
      });
      visibleLimit = pageSize;
      applyFilters();
    });
  });

  search?.addEventListener("input", () => {
    visibleLimit = pageSize;
    applyFilters();
  });
  loadMore?.addEventListener("click", () => {
    visibleLimit += pageSize;
    applyFilters();
  });
  applyFilters();
}

document.addEventListener("DOMContentLoaded", () => {
  renderExpandedCatalog();
  setupBlogFilters();
});
