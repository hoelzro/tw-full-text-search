/*\
title: $:/plugins/hoelzro/full-text-search/hooks.js
type: text/vnd.tiddlywiki
module-type: startup

\*/

declare var $tw;

module SaveTiddlerHook {
    export function startup() {
        var getIndex = require('$:/plugins/hoelzro/full-text-search/shared-index.js').getIndex;

        $tw.wiki.addEventListener('change', function(changes) {
            for(var title in changes) {
                if($tw.wiki.isSystemTiddler(title)) {
                    continue;
                }

                var change = changes[title];
                if(change.modified) {
                    var tiddler = $tw.wiki.getTiddler(title);
                    getIndex().update(tiddler.fields);
                } else { // change.deleted
                    getIndex().remove({ title: title });
                }
            }
        });
    }
}

export = SaveTiddlerHook;

// vim:sts=4:sw=4
