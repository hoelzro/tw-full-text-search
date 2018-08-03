/*\
title: $:/plugins/hoelzro/full-text-search/index-worker.js
type: application/javascript
module-type: library

\*/

(async function() {
    async function getNextMessage() {
        return new Promise<any>(function(resolve, reject) {
            onmessage = function(msg) {
                onmessage = function() {};

                resolve(msg.data);
            };
        });
    }

    async function requireFromPage(name) : Promise<any> {
        postMessage({
            type: 'require',
            name: name,
        });

        return getNextMessage().then(function(msg) {
            let mod = { exports: {} };
            self['module'] = mod;
            self['exports'] = mod.exports;
            importScripts(msg);
            delete self['module'];
            delete self['exports'];

            return mod.exports;
        });
    }

    async function getRelatedTerms() {
        postMessage({
            type: 'getRelatedTerms'
        });

        return await getNextMessage();
    }

    async function* readTiddlers() {
        postMessage({ type: 'sendTiddlers' });

        let msg = await getNextMessage();

        while(msg != null) {
            yield JSON.parse(msg);
            msg = await getNextMessage();
        }
    }

    let lunr : any = await requireFromPage('$:/plugins/hoelzro/full-text-search/lunr.min.js');
    let lunrMutable : any = await requireFromPage('$:/plugins/hoelzro/full-text-search/lunr-mutable.js');
    let { generateQueryExpander } = await requireFromPage('$:/plugins/hoelzro/full-text-search/query-expander.js');
    let relatedTerms = await getRelatedTerms();

    let expandQuery = generateQueryExpander(lunr, relatedTerms);

    let builder = new lunrMutable.Builder();

    builder.pipeline.add(
      lunr.trimmer,
      lunr.stopWordFilter,
      expandQuery,
      lunr.stemmer
    );

    builder.searchPipeline.add(
      lunr.stemmer
    );

    let count = 0;
    let previousUpdate = new Date();

    // XXX configurable fields?
    builder.field('title');
    builder.field('tags');
    builder.field('text');

    builder.ref('title');

    for await (let tiddlerFields of readTiddlers()) {
        // XXX duplication sucks
        var fields : any = {
            title: tiddlerFields.title
        };

        if('text' in tiddlerFields) {
            fields.text = tiddlerFields.text;
        }

        if('tags' in tiddlerFields) {
            fields.tags = tiddlerFields.tags.join(' ');
        }

        builder.add(fields);
        count++;
        let now = new Date();
        if((now.getTime() - previousUpdate.getTime()) > 200) {
            previousUpdate = now;
            postMessage({ type: 'progress', count: count });
        }
    }

    postMessage({ type: 'index', index: JSON.stringify(builder.build()) });
    close();
})();

// vim:sts=4:sw=4
