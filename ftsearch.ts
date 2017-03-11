/*\
title: $:/plugins/hoelzro/full-text-search/ftsearch.js
type: application/javascript
module-type: filteroperator

\*/

declare var require;

module FTSearch {
    var getIndex = require('$:/plugins/hoelzro/full-text-search/shared-index.js').getIndex;

    export function ftsearch(source, operator, options) {
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

}

export = FTSearch;
