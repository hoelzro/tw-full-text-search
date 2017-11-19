/*\
title: $:/plugins/hoelzro/full-text-search/hooks.js
type: text/vnd.tiddlywiki
module-type: startup

\*/

declare var $tw;

module SaveTiddlerHook {
    export function startup() {
        var getIndex = require('$:/plugins/hoelzro/full-text-search/shared-index.js').getIndex;

        $tw.hooks.addHook('th-saving-tiddler', function(tiddler) {
            getIndex().update(tiddler.fields);
            return tiddler;
        });

        $tw.hooks.addHook('th-deleting-tiddler', function(tiddler) {
            getIndex().remove({ title: tiddler.fields.title });
        });
    }
}

export = SaveTiddlerHook;

// vim:sts=4:sw=4
