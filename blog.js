function setupBlogFilters() {
  const search = document.querySelector("[data-blog-search]");
  const filters = Array.from(document.querySelectorAll("[data-blog-filter]"));
  const cards = Array.from(document.querySelectorAll("[data-blog-card]"));
  const count = document.querySelector("[data-blog-count]");
  const empty = document.querySelector("[data-blog-empty]");

  if (!cards.length) return;

  let activeCategory = "all";

  const applyFilters = () => {
    const query = (search?.value || "").trim().toLowerCase();
    let visibleCount = 0;

    cards.forEach((card) => {
      const category = card.dataset.category || "";
      const searchableText = card.textContent.toLowerCase();
      const categoryMatches = activeCategory === "all" || category === activeCategory;
      const searchMatches = !query || searchableText.includes(query);
      const isVisible = categoryMatches && searchMatches;

      card.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });

    if (count) {
      count.textContent = `${visibleCount} ${visibleCount === 1 ? "guide" : "guides"}`;
    }

    if (empty) {
      empty.hidden = visibleCount !== 0;
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
      applyFilters();
    });
  });

  search?.addEventListener("input", applyFilters);
  applyFilters();
}

document.addEventListener("DOMContentLoaded", setupBlogFilters);
