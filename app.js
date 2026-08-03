const state = {
  brands: [],
  query: "",
  country: "all",
};

const elements = {
  form: document.querySelector("#search-form"),
  input: document.querySelector("#search-input"),
  grid: document.querySelector("#brand-grid"),
  filters: document.querySelector("#country-filters"),
  resultCount: document.querySelector("#result-count"),
  brandCount: document.querySelector("#brand-count"),
  lastChecked: document.querySelector("#last-checked"),
  empty: document.querySelector("#empty-state"),
  reset: document.querySelector("#reset-search"),
  template: document.querySelector("#brand-card-template"),
};

function plainText(value) {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();
}

function parseBrands(markdown) {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("| "))
    .map((line) => line.slice(1, -1).split("|").map((cell) => cell.trim()))
    .filter((cells) => cells.length === 6 && cells[0] !== "Brand" && !cells[0].startsWith("---"))
    .map(([name, website, headquarters, ownership, manufacturing, checked]) => ({
      name: plainText(name),
      website,
      headquarters: plainText(headquarters),
      ownership: plainText(ownership),
      manufacturing: plainText(manufacturing),
      checked,
    }));
}

function normalize(value) {
  return value.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function matches(brand) {
  const query = normalize(state.query);
  const haystack = normalize([brand.name, brand.headquarters, brand.ownership, brand.manufacturing].join(" "));
  return (!query || haystack.includes(query)) && (state.country === "all" || brand.headquarters === state.country);
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function createCard(brand, index) {
  const fragment = elements.template.content.cloneNode(true);
  const card = fragment.querySelector(".brand-card");
  card.style.animationDelay = `${Math.min(index, 12) * 35}ms`;
  fragment.querySelector("h3").textContent = brand.name;
  fragment.querySelector(".country").textContent = brand.headquarters;
  fragment.querySelector(".checked").textContent = brand.checked;
  fragment.querySelector(".checked").dateTime = brand.checked;
  fragment.querySelector(".ownership").textContent = brand.ownership;
  fragment.querySelector(".manufacturing").textContent = brand.manufacturing;
  fragment.querySelector(".brand-link").href = brand.website;
  return fragment;
}

function render() {
  const visible = state.brands.filter(matches);
  elements.grid.replaceChildren(...visible.map(createCard));
  elements.grid.setAttribute("aria-busy", "false");
  elements.resultCount.textContent = `${visible.length} résultat${visible.length > 1 ? "s" : ""}`;
  elements.empty.hidden = visible.length !== 0;
  elements.grid.hidden = visible.length === 0;

  document.querySelectorAll(".filter-button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.country === state.country));
  });
}

function renderFilters() {
  const countries = [...new Set(state.brands.map((brand) => brand.headquarters))]
    .sort((a, b) => countryName(a).localeCompare(countryName(b), "fr"));

  const options = [{ label: "Tous", value: "all" }, ...countries.map((country) => ({ label: country, value: country }))];
  elements.filters.replaceChildren(...options.map(({ label, value }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-button";
    button.dataset.country = value;
    button.textContent = label;
    button.setAttribute("aria-pressed", String(value === state.country));
    button.addEventListener("click", () => {
      state.country = value;
      render();
    });
    return button;
  }));
}

function countryName(value) {
  return value.split(/\s+/).slice(1).join(" ");
}

async function init() {
  try {
    const response = await fetch("BRANDS.md", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.brands = parseBrands(await response.text());
    elements.brandCount.textContent = state.brands.length;
    const latest = state.brands.map(({ checked }) => checked).sort().at(-1);
    elements.lastChecked.textContent = formatDate(latest);
    elements.lastChecked.dateTime = latest;
    renderFilters();
    render();
  } catch (error) {
    elements.grid.setAttribute("aria-busy", "false");
    elements.grid.innerHTML = `<p>La base n’a pas pu être chargée. <a href="BRANDS.md">Consulter le fichier source</a>.</p>`;
    console.error(error);
  }
}

elements.form.addEventListener("submit", (event) => event.preventDefault());
elements.input.addEventListener("input", (event) => {
  state.query = event.target.value.trim();
  render();
});
elements.reset.addEventListener("click", () => {
  state.query = "";
  state.country = "all";
  elements.input.value = "";
  elements.input.focus();
  render();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== elements.input) {
    event.preventDefault();
    elements.input.focus();
  }
  if (event.key === "Escape" && document.activeElement === elements.input) {
    elements.input.value = "";
    state.query = "";
    render();
    elements.input.blur();
  }
});

init();
