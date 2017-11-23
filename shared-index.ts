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
    var lunr = require('$:/plugins/hoelzro/full-text-search/lunr.min.js');

    let index = null;

    async function delay(millis : number) {
        return new Promise(resolve => {
            setTimeout(resolve, millis);
        });
    }

    async function buildIndexIncremental(wiki, tiddlers, rebuilding, progressCallback) {
        let { generateQueryExpander } = require('$:/plugins/hoelzro/full-text-search/query-expander.js');

        let builder = null;
        if(rebuilding || !index) {
            let relatedTerms = $tw.wiki.getTiddlerDataCached(RELATED_TERMS_TIDDLER, []);
            relatedTerms = relatedTerms.map($tw.utils.parseStringArray);

            let expandQuery = generateQueryExpander(lunr, relatedTerms);

            builder = new lunr.MutableBuilder();

            builder.pipeline.add(
              lunr.trimmer,
              lunr.stopWordFilter,
              expandQuery,
              lunr.stemmer
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

            if(tiddler === undefined) { // avoid drafts that were open when we started
                continue;
            }
            var type = tiddler.fields.type || 'text/vnd.tiddlywiki';
            if(!type.startsWith('text/')) {
                continue;
            }
            updateTiddler(builder, tiddler);
            await progressCallback(++i);
            await delay(1);
        }
        index = builder.build();
        await progressCallback(tiddlers.length);
    }

    async function buildIndexWorker(wiki, tiddlers, progressCallback) {
        var lunrSource = wiki.getTiddlerText('$:/plugins/hoelzro/full-text-search/lunr.min.js');
        var workerSource = wiki.getTiddlerText('$:/plugins/hoelzro/full-text-search/index-worker.js');
        var worker = new Worker(URL.createObjectURL(new Blob([ workerSource ])));
        worker.postMessage(URL.createObjectURL(new Blob([ lunrSource ])));

        var workerFinished = new Promise(function(resolve, reject) {
            worker.onmessage = function(msg) {
                // XXX OW OW OW OW OW
                if(typeof(msg.data) == 'string') {
                    index = lunr.MutableIndex.load(JSON.parse(msg.data));
                    resolve();
                } else {
                    progressCallback(msg.data);
                }
            };

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
            worker.postMessage('');
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
        index = lunr.MutableIndex.load(data);
    }
}
export = SharedIndex;

// vim:sts=4:sw=4
