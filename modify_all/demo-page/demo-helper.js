/** Demo-only UI — collapse state for the helper card. No extension logic. */
(function () {
  var helper = document.getElementById("demo-helper");
  var toggle = document.getElementById("demo-helper-toggle");
  if (!helper || !toggle) return;

  var collapsed = sessionStorage.getItem("genie-demo-helper-collapsed") === "1";
  if (collapsed) helper.classList.add("is-collapsed");
  toggle.setAttribute("aria-expanded", String(!collapsed));
  toggle.textContent = collapsed ? "+" : "−";

  toggle.addEventListener("click", function () {
    var isCollapsed = helper.classList.toggle("is-collapsed");
    sessionStorage.setItem("genie-demo-helper-collapsed", isCollapsed ? "1" : "0");
    toggle.setAttribute("aria-expanded", String(!isCollapsed));
    toggle.textContent = isCollapsed ? "+" : "−";
  });
})();
