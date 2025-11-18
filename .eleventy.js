const slugify = require("@sindresorhus/slugify");
const markdownIt = require("markdown-it");
const fs = require("fs");
const matter = require("gray-matter");
const faviconsPlugin = require("eleventy-plugin-gen-favicons");
const tocPlugin = require("eleventy-plugin-nesting-toc");
const { parse } = require("node-html-parser");
const htmlMinifier = require("html-minifier-terser");
const pluginRss = require("@11ty/eleventy-plugin-rss");

const { headerToId, namedHeadingsFilter } = require("./src/helpers/utils");
const {
  userMarkdownSetup,
  userEleventySetup,
} = require("./src/helpers/userSetup");

const Image = require("@11ty/eleventy-img");
function transformImage(src, cls, alt, sizes, widths = ["500", "700", "auto"]) {
  let options = {
    widths: widths,
    formats: ["webp", "jpeg"],
    outputDir: "./dist/img/optimized",
    urlPath: "/img/optimized",
  };

  Image(src, options);
  let metadata = Image.statsSync(src, options);
  return metadata;
}

function getAnchorLink(filePath, linkTitle) {
  const { attributes, innerHTML } = getAnchorAttributes(filePath, linkTitle);
  return `<a ${Object.keys(attributes).map(key => `${key}="${attributes[key]}"`).join(" ")}>${innerHTML}</a>`;
}

function getAnchorAttributes(filePath, linkTitle) {
  let fileName = filePath.replaceAll("&amp;", "&");
  let header = "";
  let headerLinkPath = "";
  if (filePath.includes("#")) {
    [fileName, header] = filePath.split("#");
    headerLinkPath = `#${headerToId(header)}`;
  }

  let noteIcon = process.env.NOTE_ICON_DEFAULT;
  const title = linkTitle ? linkTitle : fileName;
  let permalink = `/notes/${slugify(filePath)}`;
  let deadLink = false;
  try {
    const startPath = "./src/site/notes/";
    const fullPath = fileName.endsWith(".md")
      ? `${startPath}${fileName}`
      : `${startPath}${fileName}.md`;
    const file = fs.readFileSync(fullPath, "utf8");
    const frontMatter = matter(file);
    if (frontMatter.data.permalink) {
      permalink = frontMatter.data.permalink;
    }
    if (
      frontMatter.data.tags &&
      frontMatter.data.tags.indexOf("gardenEntry") != -1
    ) {
      permalink = "/";
    }
    if (frontMatter.data.noteIcon) {
      noteIcon = frontMatter.data.noteIcon;
    }
  } catch {
    deadLink = true;
  }

  if (deadLink) {
    return {
      attributes: {
        "class": "internal-link is-unresolved",
        "href": "/404",
        "target": "",
      },
      innerHTML: title,
    };
  }
  return {
    attributes: {
      "class": "internal-link",
      "target": "",
      "data-note-icon": noteIcon,
      "href": `${permalink}${headerLinkPath}`,
    },
    innerHTML: title,
  };
}

const tagRegex = /(^|\s|\>)(#[^\s!@#$%^&*()=+\.,\[{\]};:'"?><]+)(?!([^<]*>))/g;

module.exports = function (eleventyConfig) {
  eleventyConfig.setLiquidOptions({
    dynamicPartials: true,
  });

  let markdownLib = markdownIt({
    breaks: true,
    html: true,
    linkify: true,
  })
    .use(require("markdown-it-anchor"), { slugify: headerToId })
    .use(require("markdown-it-mark"))
    .use(require("markdown-it-footnote"))
    .use(function (md) {
      md.renderer.rules.hashtag_open = function (tokens, idx) {
        return '<a class="tag" onclick="toggleTagSearch(this)">';
      };
    })
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
      const origFenceRule = md.renderer.rules.fence || function (tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options, env, self);
      };

      md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
        const token = tokens[idx];
        if (token.info === "mermaid") {
          const code = token.content.trim();
          return `<pre class="mermaid">${code}</pre>`;
        }
        if (token.info === "transclusion") {
          const code = token.content.trim();
          return `<div class="transclusion">${md.render(code)}</div>`;
        }
        if (token.info.startsWith("ad-")) {
          const code = token.content.trim();
          const parts = code.split("\n");
          let titleLine, collapse, collapsible = false, collapsed = true, icon, color, nbLinesToSkip = 0;
          for (let i = 0; i < 4; i++) {
            if (parts[i] && parts[i].trim()) {
              let line = parts[i].trim().toLowerCase();
              if (line.startsWith("title:")) { titleLine = line.substring(6).trim(); nbLinesToSkip++; }
              else if (line.startsWith("icon:")) { icon = line.substring(5).trim(); nbLinesToSkip++; }
              else if (line.startsWith("collapse:")) {
                collapsible = true;
                collapse = line.substring(9).trim();
                if (collapse === "open") collapsed = false;
                nbLinesToSkip++;
              }
              else if (line.startsWith("color:")) { color = line.substring(6).trim(); nbLinesToSkip++; }
            }
          }
          const foldDiv = collapsible ? `<div class="callout-fold"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-chevron-down"><polyline points="6 9 12 15 18 9"></polyline></svg></div>` : "";
          const titleDiv = titleLine ? `<div class="callout-title"><div class="callout-title-inner">${titleLine}</div>${foldDiv}</div>` : "";
          let collapseClasses = titleLine && collapsible ? "is-collapsible" : "";
          if (collapsible && collapsed) collapseClasses += " is-collapsed";

          return `<div data-callout-metadata class="callout ${collapseClasses}" data-callout="${token.info.substring(3)}">${titleDiv}
<div class="callout-content">${md.render(parts.slice(nbLinesToSkip).join("\n"))}</div></div>`;
        }
        return origFenceRule(tokens, idx, options, env, slf);
      };

      const defaultImageRule = md.renderer.rules.image || function (tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options, env, self);
      };
      md.renderer.rules.image = (tokens, idx, options, env, self) => {
        const imageName = tokens[idx].content;
        const [fileName, ...widthAndMetaData] = imageName.split("|");
        const lastValue = widthAndMetaData[widthAndMetaData.length - 1];
        const lastValueIsNumber = !is
