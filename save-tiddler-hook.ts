/*\
title: $:/plugins/hoelzro/full-text-search/save-tiddler-hook.js
type: text/vnd.tiddlywiki
module-type: startup

\*/
(function() {
/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var getIndex = require('$:/plugins/hoelzro/full-text-search/shared-index.js').getIndex;

$tw.hooks.addHook('th-saving-tiddler', function(tiddler) {
    getIndex().update(tiddler.fields);
    return tiddler;
});

})();
