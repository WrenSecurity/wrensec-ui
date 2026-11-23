# Wren Security UI

Shared components for Wren Security user interfaces.

## New components

New components are written as ES modules with the `.jsm` extension, next to the related (legacy AMD) code:

* the build transpiles them into AMD modules (`.js`) so that RequireJS and its optimizer can load them,
* they are linted with stricter rules that require modern language features (`const`/`let`, arrow functions,
  template literals, ...) and ES module `import`/`export` instead of AMD `define`/`require`,
* AMD code sees the module's exports as an object, so it has to use the default export (`ViewManager` does
  this for views); AMD modules are imported with a default import
  (`import Router from "org/forgerock/commons/ui/common/main/Router"`).

## Supported Browsers

Wren Security UI supports the same browsers as [Vite 8](https://vite.dev/guide/build#browser-compatibility):

| Browser         | Minimum version |
| --------------- | --------------- |
| Chrome and Edge | 111             |
| Firefox         | 114             |
| Safari          | 16.4            |

Styles and scripts may use features available in all of these browsers (e.g. CSS custom properties,
`color-mix()` or media query ranges). Features that are newer than this baseline, such as CSS nesting, are
compiled away during the build.
