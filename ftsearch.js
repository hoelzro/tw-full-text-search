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
    // XXX make use of source (that filter below won't be needed if you do)
    var index = getIndex();
    var results = index.search(operator.operand);
    // XXX use callback instead?
    return results.map(function(match) {
        return match.ref;
    });
};

})();

