/*\
title: $:/plugins/hoelzro/full-text-search/hooks.js
type: text/vnd.tiddlywiki
module-type: startup

\*/

declare var $tw;

module SaveTiddlerHook {
    export function startup() {
        var { updateTiddler, getIndex } = require('$:/plugins/hoelzro/full-text-search/shared-index.js');

        $tw.wiki.addEventListener('change', function(changes) {
            let index = getIndex();
            if(!index) {
                return;
            }

            for(var title in changes) {
                if($tw.wiki.isSystemTiddler(title)) {
                    continue;
                }

                var change = changes[title];
                if(change.modified) {
                    var tiddler = $tw.wiki.getTiddler(title);
                    if(tiddler !== undefined) {
                        updateTiddler(index, tiddler);
                    }
                } else { // change.deleted
                    index.remove({ title: title });
                }
            }
        });
    }
}

export = SaveTiddlerHook;

// vim:sts=4:sw=4
