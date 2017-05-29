/*\
title: $:/plugins/hoelzro/full-text-search/cache.js
type: application/javascript
module-type: library

\*/

declare var $tw;
declare var window;
declare var localStorage;

module FTSCache {
  function hasFunctionalCache() {
    if((typeof window) === 'undefined') { // happens when building
      return false;
    }

    if(! ('localStorage' in window && 'JSON' in window)) {
        return false;
    }

    return true;
  }

  function getCacheMetadata() {
    var metaKey = 'tw-fts-index.meta.' + $tw.wiki.getTiddler('$:/SiteTitle').fields.text;
    var cacheMeta = localStorage.getItem(metaKey);
    if(cacheMeta === null) {
      return;
    }
    try {
      cacheMeta = JSON.parse(cacheMeta);
    } catch(e) {
      if(e instanceof SyntaxError) {
        return;
      }
      throw e;
    }

    return cacheMeta;
  }

  function getCacheData() {
    var dataKey = 'tw-fts-index.data.' + $tw.wiki.getTiddler('$:/SiteTitle').fields.text;
    var cacheData = localStorage.getItem(dataKey);

    if(cacheData === null) {
      return null;
    }

    try {
      cacheData = JSON.parse(cacheData);
    } catch(e) {
      if(e instanceof SyntaxError) {
        return null;
      }
      throw e;
    }

    return cacheData;
  }

  export function getAge() {
    if(!hasFunctionalCache()) {
      return 0;
    }

    var cacheMeta = getCacheMetadata();
    if(!cacheMeta) {
      return 0;
    }

    return cacheMeta.age;
  }

  export function load() {
    if(!hasFunctionalCache()) {
      return null;
    }

    var cacheData = getCacheData();
    if(!cacheData) {
      return;
    }

    return cacheData;
  }

  export function save(age, data) {
    data = JSON.stringify(data);
    var dataKey = 'tw-fts-index.data.' + $tw.wiki.getTiddler('$:/SiteTitle').fields.text;
    var metaKey = 'tw-fts-index.meta.' + $tw.wiki.getTiddler('$:/SiteTitle').fields.text;
    localStorage.setItem(dataKey, data);
    localStorage.setItem(metaKey, JSON.stringify({ age: age }));
  }
}

export = FTSCache;
