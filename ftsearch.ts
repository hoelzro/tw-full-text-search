/*\
title: $:/plugins/hoelzro/full-text-search/ftsearch.js
type: application/javascript
module-type: filteroperator

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var getIndex = require('$:/plugins/hoelzro/full-text-search/shared-index.js').getIndex;

/*
Export our filter function
*/
exports.ftsearch = function(source, operator, options) {
    var sourceLookup = {};
    source(function(tiddler, title) {
        sourceLookup[title] = true;
    });

    var index = getIndex();
    var results = index.search(operator.operand);

    return results.filter(function(match) {
        return sourceLookup.hasOwnProperty(match.ref);
    }).map(function(match) {
        return match.ref;
    });
};

})();

