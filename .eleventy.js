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
