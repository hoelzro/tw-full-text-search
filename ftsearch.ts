/*\
title: $:/plugins/hoelzro/full-text-search/ftsearch.js
type: application/javascript
module-type: filteroperator

\*/

declare var require;

module FTSearch {
    const FUZZY_SEARCH_TIDDLER = '$:/plugins/hoelzro/full-text-search/EnableFuzzySearching';
    var lunr = require('$:/plugins/hoelzro/full-text-search/lunr.min.js');
    var getIndex = require('$:/plugins/hoelzro/full-text-search/shared-index.js').getIndex;

    export function ftsearch(source, operator, options) {
        let sourceLookup = Object.create(null);
        source(function(tiddler, title) {
            sourceLookup[title] = tiddler;
        });

        var index = getIndex();
        if(!index) {
            return [];
        }

        return function(callback) {
            let results;

            try {
                let fuzzySearchesEnabled = options.wiki.getTiddlerText(FUZZY_SEARCH_TIDDLER, '') == 'yes';
                if(!fuzzySearchesEnabled) {
                    let qp = new lunr.QueryParser(operator.operand, new lunr.Query(['title', 'tags', 'text']));
                    let query = qp.parse();
                    for(let clause of query.clauses) {
                        if(!clause.usePipeline) {
                            // we're using a wildcard, but the index isn't prepared for
                            // fuzzy searches - so pass information on this down the pipeline
                            return callback(null, null, "It looks like you're trying to perform a wildcard search; you'll need to enable wildcard/fuzzy searching in the FTS settings");
                        }
                        if('editDistance' in clause) {
                            // we're using a fuzzy search, but the index isn't prepared for
                            // fuzzy searches - so pass information on this down the pipeline
                            return callback(null, null, "It looks like you're trying to perform a fuzzy search; you'll need to enable wildcard/fuzzy searching in the FTS settings");
                        }
                    }
                }

                results = index.search(operator.operand);
            } catch(e) {
                if(e instanceof lunr.QueryParseError) {
                    results = [];
                } else {
                    throw e;
                }
            }

            for(let match of results) {
                if(match.ref in sourceLookup) {
                    callback(sourceLookup[match.ref], match.ref);
                }
            }
        };
    };
}

export = FTSearch;

// vim:sts=4:sw=4
