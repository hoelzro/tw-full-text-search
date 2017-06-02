/*\
title: $:/plugins/hoelzro/full-text-search/cache.js
type: application/javascript
module-type: library

\*/

declare var $tw;
declare var window;
declare var require;

import * as LocalForageModule from 'localforage';
var localForage : typeof LocalForageModule = require('$:/plugins/hoelzro/full-text-search/localforage.min.js');

module FTSCache {
  function hasFunctionalCache() {
    if((typeof window) === 'undefined') { // happens when building
      return false;
    }

    // XXX check to see if localForage is working

    return true;
  }

  interface CacheMeta {
    age: number;
  }

  async function getCacheMetadata() {
    var metaKey = 'tw-fts-index.meta.' + $tw.wiki.getTiddler('$:/SiteTitle').fields.text;
    // XXX how does TS handle the case where the cache item doesn't have the right keys?
    var cacheMeta = await localForage.getItem<CacheMeta>(metaKey);
    if(cacheMeta === null) {
      return;
    }

    return cacheMeta;
  }

  // XXX what about migrating between lunr versions? what about invalid data under the key?
  async function getCacheData() {
    var dataKey = 'tw-fts-index.data.' + $tw.wiki.getTiddler('$:/SiteTitle').fields.text;
    var cacheData = await localForage.getItem(dataKey);

    if(cacheData === null) {
      return null;
    }

    return cacheData;
  }

  export async function getAge() {
    if(!hasFunctionalCache()) {
      return 0;
    }

    var cacheMeta = await getCacheMetadata();
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
    localForage.setItem(dataKey, data);
    localForage.setItem(metaKey, JSON.stringify({ age: age }));
  }
}

export = FTSCache;
