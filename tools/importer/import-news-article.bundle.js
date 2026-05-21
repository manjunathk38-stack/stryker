/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-news-article.js
  var import_news_article_exports = {};
  __export(import_news_article_exports, {
    default: () => import_news_article_default
  });

  // tools/importer/parsers/columns.js
  function parse(element, { document }) {
    const SELECTOR = ".standaloneimage.aem-GridColumn--default--6";
    const parent = element.parentElement;
    const columnEls = parent ? Array.from(parent.querySelectorAll(`:scope > ${SELECTOR}`)) : [element];
    if (columnEls[0] !== element) {
      element.remove();
      return;
    }
    const cellRow = columnEls.map((col) => {
      const img = col.querySelector(
        ".c-standalone-image-content img, .title-content img, img.img-responsive, img"
      );
      if (img) return img;
      return col.querySelector(".c-standalone-image-content, .c-standalone-image") || col;
    });
    const cells = [cellRow];
    const block = WebImporter.Blocks.createBlock(document, {
      name: "columns",
      cells
    });
    element.replaceWith(block);
    for (let i = 1; i < columnEls.length; i += 1) {
      columnEls[i].remove();
    }
  }

  // tools/importer/transformers/stryker-cleanup.js
  var TransformHook = {
    beforeTransform: "beforeTransform",
    afterTransform: "afterTransform"
  };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        "#cookie-alert",
        "#onetrust-consent-sdk",
        "#ot-sdk-btn-floating",
        "#c-country-switch-modal"
      ]);
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        "header#header",
        "footer#footer",
        ".c-back-to-top",
        ".c-publish-date",
        ".c-event-location-properties",
        // Generic safety: hidden form inputs scattered across the AEM markup
        // (e.g. #indexUrl, #hdnRunMode, #businessUnitTag, #hiddenPublishedDate,
        // #hdnShowAlert, #hdnAlertTitle, #hdnAlertMsg, #hdnAlertContBtnText,
        // #hdnAlertCancelBtnText, #hdnDisplayHcpConfirmation, #hdnShowFooter)
        // - none are authorable content.
        "input",
        // Strip noscript/iframe/link/source leftovers that survive cleaning.
        "iframe",
        "noscript",
        "source",
        "link"
      ]);
      element.querySelectorAll("*").forEach((el) => {
        el.removeAttribute("onclick");
        el.removeAttribute("data-track");
        el.removeAttribute("data-tracking");
      });
    }
  }

  // tools/importer/import-news-article.js
  var parsers = {
    columns: parse
  };
  var transformers = [transform];
  var PAGE_TEMPLATE = {
    name: "news-article",
    description: "Stryker news/message article page with hero, article content, and related news sections",
    urls: [
      "https://www.stryker.com/us/en/about/news/2026/a-message-to-our-customers-03-2026.html"
    ],
    blocks: [
      {
        name: "columns",
        instances: [".standaloneimage.aem-GridColumn--default--6"]
      }
    ]
  };
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), { template: PAGE_TEMPLATE });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document, template) {
    const pageBlocks = [];
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) {
          console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
        }
        elements.forEach((element) => {
          pageBlocks.push({
            name: blockDef.name,
            selector,
            element,
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_news_article_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        const parser = parsers[block.name];
        if (parser) {
          try {
            parser(block.element, { document, url, params });
          } catch (e) {
            console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
          }
        } else {
          console.warn(`No parser found for block: ${block.name}`);
        }
      });
      executeTransformers("afterTransform", main, payload);
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const path = WebImporter.FileUtils.sanitizePath(
        new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html$/, "")
      );
      return [{
        element: main,
        path,
        report: {
          title: document.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_news_article_exports);
})();
