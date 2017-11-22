/*\
title: $:/plugins/hoelzro/full-text-search/index-worker.js
type: application/javascript
module-type: library

\*/

declare module lunr {
    export class MutableBuilder {
        pipeline : any;
        searchPipeline : any;
        field : any;
        ref : any;
        add : any;
        build : any;
    }
}

(function() {
    onmessage = function(msg) {
        importScripts(msg.data);

        let builder = new lunr.MutableBuilder();

        builder.pipeline.add(
          lunr.trimmer,
          lunr.stopWordFilter,
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

        let count = 0;
        let previousUpdate = new Date();
        onmessage = function(msg) {
            if(msg.data == '') {
                postMessage(JSON.stringify(builder.build()));
                close();
            } else {
                var tiddlerFields = JSON.parse(msg.data);
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
                    postMessage(count);
                }
            }
        };
    }
})();

// vim:sts=4:sw=4
