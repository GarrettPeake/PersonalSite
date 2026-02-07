(function () {
  var theme =
    localStorage.getItem("theme") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");
  document.documentElement.setAttribute("data-theme", theme);

  // Collapse shelf panel immediately on non-projects routes to prevent
  // "Loading projects..." text from flashing before the SPA router inits
  var path = window.location.pathname;
  if (path !== '/' && path !== '/projects') {
    document.documentElement.setAttribute('data-initial-section', 'non-projects');
  }
})();
