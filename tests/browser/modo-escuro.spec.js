"use strict";

// Issue #94: no modo escuro, textos que tinham #333 fixo (título do header, campos,
// select, itens de dropdown, breadcrumb ativo, list-group de ação e abas) sumiam no
// fundo escuro. Aqui eles precisam seguir a cor de texto do tema e passar no contraste.

const { test, expect } = require("./fixtures");
const AxeBuilder = require("@axe-core/playwright").default;

const FIXO = "rgb(51, 51, 51)"; // #333

test.use({ viewport: { width: 1280, height: 900 } });

async function escuro(page, url) {
  await page.goto(url);
  // Sem transições: .nav-link anima a cor (0,15s) e a leitura pegaria o meio do caminho.
  await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; }" });
  await page.evaluate(() => document.documentElement.setAttribute("data-bs-theme", "dark"));
}

async function cores(page, seletores) {
  return page.evaluate((sels) => {
    const corpo = getComputedStyle(document.body).color;
    return {
      corpo,
      itens: Object.fromEntries(sels.map((s) => {
        const el = document.querySelector(s);
        return [s, el ? getComputedStyle(el).color : null];
      })),
    };
  }, seletores);
}

test("header do exemplo admin: título legível no modo escuro", async ({ page }) => {
  await escuro(page, "/exemplos/admin.html");
  const { corpo, itens } = await cores(page, [".navbar-brand"]);
  expect(itens[".navbar-brand"]).not.toBe(FIXO);
  expect(itens[".navbar-brand"]).toBe(corpo);
  const { violations } = await new AxeBuilder({ page }).include("header").withRules(["color-contrast"]).analyze();
  expect(violations.map((v) => v.nodes.map((n) => n.target.join(" ")))).toEqual([]);
});

test("campo, select, abas, list-group e dropdown seguem a cor do texto no modo escuro", async ({ page }) => {
  const casos = [
    ["/componentes/formularios.html", [".form-control", ".form-select"]],
    ["/componentes/navs-abas.html", [".nav-tabs .nav-link:not(.active):not(.disabled)"]],
    ["/componentes/list-group.html", [".list-group-item-action:not(.active):not(.disabled)"]],
    ["/componentes/dropdowns.html", [".dropdown-item:not(.active):not(.disabled)"]],
    ["/componentes/breadcrumb.html", [".breadcrumb-item.active"]],
  ];
  for (const [url, seletores] of casos) {
    await escuro(page, url);
    const { corpo, itens } = await cores(page, seletores);
    for (const s of seletores) {
      expect(itens[s], `${url} ${s}`).not.toBeNull();
      expect(itens[s], `${url} ${s}`).not.toBe(FIXO);
      expect(itens[s], `${url} ${s}`).toBe(corpo);
    }
  }
});
