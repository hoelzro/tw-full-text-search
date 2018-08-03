/*\
title: $:/plugins/hoelzro/full-text-search/query-expander.js
type: application/javascript
module-type: library

\*/


module QueryExpander {
    if(! ('asyncIterator' in Symbol)) {
        (Symbol as any).asyncIterator = (Symbol as any).for('Symbol.asyncIterator');
    }

    function buildAliasTree(lunr, listOfAliases) {
        let topTree : any = {};

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
                            tree[token] = {};
                        }
                        tree = tree[token];
                    }
                    if(! ('.expansion' in tree)) {
                        tree['.expansion'] = [];
                    }
                    for(let token of iTokens) {
                        tree['.expansion'].push(token);
                    }
                }
            }
        }

        return topTree;
    }

    export function generateQueryExpander(lunr, relatedTerms) {
        let treeTop = buildAliasTree(lunr, relatedTerms);
        let currentTree = treeTop;

        let expandQuery = function expandQuery(token) {
            if(token.metadata.index == 0) {
                currentTree = treeTop;
            }

            let tokenStr = token.toString();
            if(currentTree.hasOwnProperty(tokenStr)) {
                currentTree = currentTree[tokenStr];
                if('.expansion' in currentTree) {
                    let originalToken = token;
                    let tokens = [ originalToken ];

                    for(let token of currentTree['.expansion']) {
                        tokens.push(originalToken.clone(function(str, meta) {
                            return token;
                        }));
                    }

                    return tokens;
                }
            } else {
                currentTree = treeTop;
            }
            return token;
        };

        lunr.Pipeline.registerFunction(expandQuery, 'expandQuery');
        return expandQuery;
    }
}

export = QueryExpander;

// vim:sts=4:sw=4
