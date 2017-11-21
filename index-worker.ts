/*\
title: $:/plugins/hoelzro/full-text-search/index-worker.js
type: application/javascript
module-type: library

\*/

(function() {
    onmessage = function(msg) {
        importScripts(msg.data);

        // XXX duplication sucks
        let index = lunr(function() {
            // XXX configurable boost? configurable fields?
            this.field('title', {boost: 10})
            this.field('tags', {boost: 5});
            this.field('text');

            this.ref('title');
        });

        let count = 0;
        let previousUpdate = new Date();
        onmessage = function(msg) {
            if(msg.data == '') {
                postMessage(JSON.stringify(index));
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

                index.update(fields);
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
