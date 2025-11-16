module.exports = function(eleventyConfig) {
  // Copy images and files inside your folders
  eleventyConfig.addPassthroughCopy("**/*.{png,jpg,jpeg,gif,pdf}");

  // Find ALL .md files in ANY folder
  eleventyConfig.addCollection("allNotes", function(collectionApi) {
    return collectionApi.getFilteredByGlob("**/*.md");
  });

  return {
    dir: {
      input: ".",      // Look everywhere
      output: "dist"   // Put website here
    }
  };
};
