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

    async function requireFromPage(name, sandbox?) : Promise<any> {
        postMessage({
            type: 'require',
            name: name,
        });

        return getNextMessage().then(function(msg) {
            let mod = { exports: {} };
            self['module'] = mod;
            self['exports'] = mod.exports;
            if(sandbox != null) {
                for(let k in sandbox) {
                    if(sandbox.hasOwnProperty(k)) {
                        self[k] = sandbox[k];
                    }
                }
            }
            importScripts(msg);
            if(sandbox != null) {
                for(let k in sandbox) {
                    if(sandbox.hasOwnProperty(k)) {
                        delete self[k];
                    }
                }
            }
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

    async function getFuzzySetting() {
        postMessage({
            type: 'getFuzzySetting'
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
    let lunrMutable : any = await requireFromPage('$:/plugins/hoelzro/full-text-search/lunr-mutable.js', {
        require: function(modName) {
            if(modName != '$:/plugins/hoelzro/full-text-search/lunr.min.js') {
                throw new Error("Invalid module name for lunr-mutable!");
            }
            return lunr;
        }
    });
    let { generateQueryExpander } = await requireFromPage('$:/plugins/hoelzro/full-text-search/query-expander.js');
    let relatedTerms = await getRelatedTerms();
    let fuzzySetting = await getFuzzySetting();

    let expandQuery = generateQueryExpander(lunr, relatedTerms);

    let builder = new lunrMutable.Builder();

    let stemmer;

    if(fuzzySetting == 'yes') {
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
})().catch(function(err) {
    postMessage({ type: 'error', error: err.toString() });
});

// vim:sts=4:sw=4
