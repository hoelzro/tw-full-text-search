/*\
title: $:/plugins/hoelzro/full-text-search/query-expander.js
type: application/javascript
module-type: library

\*/


declare var $tw;

module QueryExpander {
    const RELATED_TERMS_TIDDLER = '$:/plugins/hoelzro/full-text-search/RelatedTerms.json';
    let lunr = require('$:/plugins/hoelzro/full-text-search/lunr.min.js');

    function buildAliasTree(listOfAliases) {
        let topTree = [];

        for(let aliases of listOfAliases) {
            for(let i = 0; i < aliases.length; i++) {
                // XXX do you want to run the full pipeline? what if we tweak the tokenizer?
                let iTokens = lunr.tokenizer(aliases[i]).map(token => token.toString());

                for(let j = 0; j < aliases.length; j++) {
                    if(i == j) {
                        continue;
                    }

                    let jTokens = lunr.tokenizer(aliases[j]).map(token => token.toString());

                    let tree = topTree;

                    for(let token of jTokens) {
                        if(! (token in tree)) {
                            tree[token] = [];
                        }
                        tree = tree[token];
                    }
                    for(let token of iTokens) {
                        tree.push(token);
                    }
                }
            }
        }

        return topTree;
    }

    function getTreeTop() {
        return $tw.wiki.getCacheForTiddler(RELATED_TERMS_TIDDLER, 'related-terms-tree', function() {
            let relatedTerms = $tw.wiki.getTiddlerDataCached(RELATED_TERMS_TIDDLER, []);
            relatedTerms = relatedTerms.map($tw.utils.parseStringArray);

            return buildAliasTree(relatedTerms);
        });
    }

    let currentTree;

    export function expandQuery(token) {
        if(token.metadata.index == 0) {
            currentTree = getTreeTop();
        }

        let tokenStr = token.toString();
        if(currentTree.hasOwnProperty(tokenStr)) {
            currentTree = currentTree[tokenStr];
            if(currentTree.length > 0) {
                let originalToken = token;
                let tokens = [ originalToken ];

                for(let token of currentTree) {
                    tokens.push(originalToken.clone(function(str, meta) {
                        return token;
                    }));
                }

                return tokens;
            }
        } else {
            currentTree = getTreeTop();
        }
        return token;
    }

    lunr.Pipeline.registerFunction(expandQuery, 'expandQuery');
}

export = QueryExpander;

// vim:sts=4:sw=4
