/*\
title: $:/plugins/hoelzro/full-text-search/shared-index.js
type: application/javascript
module-type: library

\*/

declare var require;
declare var $tw;
declare var setTimeout;
declare var setInterval;

module SharedIndex {
    const RELATED_TERMS_TIDDLER = '$:/plugins/hoelzro/full-text-search/RelatedTerms.json';
    const FUZZY_SEARCH_TIDDLER = '$:/plugins/hoelzro/full-text-search/EnableFuzzySearching';
    let lunr = require('$:/plugins/hoelzro/full-text-search/lunr.min.js');
    let lunrMutable = require('$:/plugins/hoelzro/full-text-search/lunr-mutable.js');
    // XXX import?
    let { generateQueryExpander } = require('$:/plugins/hoelzro/full-text-search/query-expander.js');

    lunr.utils.warn = function() {};

    let index = null;

    async function tick() {
        return new Promise(resolve => {
            $tw.utils.nextTick(resolve);
        });
    }

    async function buildIndexIncremental(wiki, tiddlers, rebuilding, progressCallback) {
        let builder = null;
        if(rebuilding || !index) {
            let relatedTerms = $tw.wiki.getTiddlerDataCached(RELATED_TERMS_TIDDLER, []);
            relatedTerms = relatedTerms.map($tw.utils.parseStringArray);

            let expandQuery = generateQueryExpander(lunr, relatedTerms);

            builder = new lunrMutable.Builder();

            let stemmer;

            if(wiki.getTiddlerText(FUZZY_SEARCH_TIDDLER, '') == 'yes') {
                stemmer = function(unstemmedToken) {
                    let stemmedToken = lunr.stemmer(unstemmedToken.clone());

                    return [ unstemmedToken, stemmedToken ];
                };
                lunr.Pipeline.registerFunction(stemmer, 'stemmedAndUnstemmed');
            } else {
                stemmer = lunr.stemmer;
            }

            builder.pipeline.add(
              lunr.trimmer,
              lunr.stopWordFilter,
              expandQuery,
              stemmer
            );

            builder.searchPipeline.add(
              lunr.stemmer
            );

            // XXX configurable fields?
            builder.field('title');
            builder.field('tags');
            builder.field('text');

            builder.ref('title');
        } else {
            builder = index.builder;
        }

        let i = 0;
        for(let title of tiddlers) {
            let tiddler = wiki.getTiddler(title);
            i++;

            if(tiddler === undefined) { // avoid drafts that were open when we started
                continue;
            }
            var type = tiddler.fields.type || 'text/vnd.tiddlywiki';
            if(!type.startsWith('text/')) {
                continue;
            }

            if('draft.of' in tiddler.fields) {
                continue;
            }

            updateTiddler(builder, tiddler);
            await progressCallback(i);
            await tick();
        }
        index = builder.build();
        await progressCallback(tiddlers.length);
    }

    async function buildIndexWorker(wiki, tiddlers, progressCallback) {
        var workerSource = wiki.getTiddlerText('$:/plugins/hoelzro/full-text-search/index-worker.js');
        var worker = new Worker(URL.createObjectURL(new Blob([ workerSource ])));

        // XXX this needs to happen - not great how "action at a distance"y this is
        let relatedTerms = $tw.wiki.getTiddlerDataCached(RELATED_TERMS_TIDDLER, []);
        relatedTerms = relatedTerms.map($tw.utils.parseStringArray);
        let expandQuery = generateQueryExpander(lunr, relatedTerms);

        // more action at a distance =/
        let stemmer = function(unstemmedToken) {
            let stemmedToken = lunr.stemmer(unstemmedToken.clone());

            return [ unstemmedToken, stemmedToken ];
        };
        lunr.Pipeline.registerFunction(stemmer, 'stemmedAndUnstemmed');

        var workerFinished = new Promise(function(resolve, reject) {
            worker.onmessage = function(msg) {
                let payload = msg.data;

                if(payload.type == 'require') {
                    let moduleName = payload.name;
                    let moduleSource = wiki.getTiddlerText(moduleName);

                    worker.postMessage(URL.createObjectURL(new Blob( [ moduleSource ])));
                } else if(payload.type == 'index') {
                    index = lunrMutable.Index.load(JSON.parse(payload.index));
                    resolve();
                } else if(payload.type == 'sendTiddlers') {
                    for(let title of tiddlers) {
                        let tiddler = wiki.getTiddler(title);

                        if(tiddler === undefined) { // avoid drafts that were open when we started
                            continue;
                        }
                        var type = tiddler.fields.type || 'text/vnd.tiddlywiki';
                        if(!type.startsWith('text/')) {
                            continue;
                        }
                        worker.postMessage(JSON.stringify(tiddler.fields));
                    }
                    worker.postMessage(null);
                } else if(payload.type == 'progress') {
                    progressCallback(payload.count);
                } else if(payload.type == 'getRelatedTerms') {
                    worker.postMessage(relatedTerms);
                } else if(payload.type == 'getFuzzySetting') {
                    let fuzzySetting = wiki.getTiddlerText(FUZZY_SEARCH_TIDDLER, '');

                    worker.postMessage(fuzzySetting);
                } else if(payload.type == 'error') {
                    reject(payload.error);
                }
            };
        });

        await workerFinished;
        await progressCallback(tiddlers.length);
    }

    export async function buildIndex(wiki, tiddlers, isFresh, progressCallback) {
        if($tw.browser && isFresh) {
            return buildIndexWorker(wiki, tiddlers, progressCallback);
        } else {
            return buildIndexIncremental(wiki, tiddlers, isFresh, progressCallback);
        }
    }

    export function updateTiddler(builder, tiddler) {
        var fields : any = {
            title: tiddler.fields.title
        };

        if('text' in tiddler.fields) {
            fields.text = tiddler.fields.text;
        }

        if('tags' in tiddler.fields) {
            fields.tags = tiddler.fields.tags.join(' ');
        }

        builder.remove(fields);
        builder.add(fields);
    }

    export function getIndex() {
        return index;
    };

    export function clearIndex() {
        index = null;
    }

    export function load(data) {
        index = lunrMutable.Index.load(data);
    }
}
export = SharedIndex;

// vim:sts=4:sw=4
