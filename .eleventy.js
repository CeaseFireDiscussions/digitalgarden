// Optimized Eleventy configuration
// Heavy transforms removed for Netlify memory limits.

const slugify = require("@sindresorhus/slugify");
const markdownIt = require("markdown-it");
const fs = require("fs");
const matter = require("gray-matter");
const faviconsPlugin = require("eleventy-plugin-gen-favicons");
const tocPlugin = require("eleventy-plugin-nesting-toc");
const { parse } = require("node-html-parser");
const pluginRss = require("@11ty/eleventy-plugin-rss");

const { headerToId, namedHeadingsFilter } = require("./src/helpers/utils");
const {
  userMarkdownSetup,
  userEleventySetup,
} = require("./src/helpers/userSetup");

const tagRegex =
  /(^|\\s|\\>)(#[^\\s!@#$%^&*()=+\\.,\\[{\\]};:'\"?><]+)(?!([^<]*>))/g;

module.exports = function (eleventyConfig) {
  // -----------------------------------------
  // Markdown engine
  // -----------------------------------------
  eleventyConfig.setLiquidOptions({ dynamicPartials: true });

  let markdownLib = markdownIt({ breaks: true, html: true, linkify: true })
    .use(require("markdown-it-anchor"), { slugify: headerToId })
    .use(require("markdown-it-mark"))
    .use(require("markdown-it-footnote"))
    .use(require("markdown-it-mathjax3"), {
      tex: { inlineMath: [["$", "$"]] },
      options: { skipHtmlTags: { "[-]": ["pre"] } },
    })
    .use(require("markdown-it-attrs"))
    .use(require("markdown-it-task-checkbox"), {
      disabled: true,
      divWrap: false,
      divClass: "checkbox",
      idPrefix: "cbx_",
      ulClass: "task-list",
      liClass: "task-list-item",
    })
    .use(require("markdown-it-plantuml"), {
      openMarker: "```plantuml",
      closeMarker: "```",
    })
    .use(namedHeadingsFilter)
    .use(function (md) {
      const origFenceRule =
        md.renderer.rules.fence ||
        function (tokens, idx, options, env, self) {
          return self.renderToken(tokens, idx, options, env, self);
        };

      md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
        const token = tokens[idx];

        if (token.info === "mermaid") {
          return `<pre class="mermaid">${token.content.trim()}</pre>`;
        }

        if (token.info === "transclusion") {
          return `<div class="transclusion">${md.render(
            token.content.trim()
          )}</div>`;
        }

        return origFenceRule(tokens, idx, options, env, slf);
      };
    })
    .use(userMarkdownSetup);

  eleventyConfig.setLibrary("md", markdownLib);

  // -----------------------------------------
  // Filters
  // -----------------------------------------
  eleventyConfig.addFilter("isoDate", (date) => date && date.toISOString());
  eleventyConfig.addFilter("jsonify", (x) => JSON.stringify(x) || "\"\"");
  eleventyConfig.addFilter(
    "dateToZulu",
    (d) => (d ? new Date(d).toISOString() : "")
  );

  eleventyConfig.addFilter("taggify", function (str) {
    return (
      str &&
      str.replace(
        tagRegex,
        (match, precede, tag) =>
          `${precede}<a class="tag" onclick="toggleTagSearch(this)" data-content="${tag}">${tag}</a>`
      )
    );
  });

  // ⭐ FIX 1: missing filter `link`
  eleventyConfig.addFilter("link", function (url = "") {
    return url;
  });

  // ⭐ FIX 2: missing filter `hideDataview`
  eleventyConfig.addFilter("hideDataview", function (content = "") {
    return content;
  });

  // ⭐ FIX 3: missing filter `searchableTags`
  eleventyConfig.addFilter("searchableTags", function (tags = []) {
    if (!Array.isArray(tags)) return "";
    return tags.join(" ");
  });

  // -----------------------------------------
  // REMOVE ALL HEAVY TRANSFORMS
  // -----------------------------------------
  // (all removed to avoid Netlify memory crashes)

  // -----------------------------------------
  // Passthrough assets
  // -----------------------------------------
  eleventyConfig.addPassthroughCopy("src/site/img");
  eleventyConfig.addPassthroughCopy("src/site/scripts");
  eleventyConfig.addPassthroughCopy("src/site/styles/_theme.*.css");

  // -----------------------------------------
  // Plugins
  // -----------------------------------------
  eleventyConfig.addPlugin(faviconsPlugin, { outputDir: "dist" });
  eleventyConfig.addPlugin(tocPlugin, {
    ul: true,
    tags: ["h1", "h2", "h3", "h4", "h5", "h6"],
  });
  eleventyConfig.addPlugin(pluginRss);

  userEleventySetup(eleventyConfig);

  // -----------------------------------------
  // IGNORES
  // -----------------------------------------
  eleventyConfig.ignores.add("**/attachments/**");
  eleventyConfig.ignores.add("**/drafts/**");
  eleventyConfig.ignores.add("**/*.pdf");

  // -----------------------------------------
  // Eleventy return config
  // -----------------------------------------
  return {
    dir: {
      input: "src/site",
      output: "dist",
      data: `_data`,
    },
    templateFormats: ["njk", "md", "11ty.js"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: false,
    passthroughFileCopy: true,
  };
};
