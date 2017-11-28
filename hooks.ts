/*\
title: $:/plugins/hoelzro/full-text-search/hooks.js
type: text/vnd.tiddlywiki
module-type: startup

\*/

declare var $tw;

module SaveTiddlerHook {
    const RELATED_TERMS_TIDDLER = '$:/plugins/hoelzro/full-text-search/RelatedTerms.json';
    const STATE_TIDDLER = '$:/temp/FTS-state';

    export function startup() {
        var { updateTiddler, getIndex, clearIndex } = require('$:/plugins/hoelzro/full-text-search/shared-index.js');
        let cache = require('$:/plugins/hoelzro/full-text-search/cache.js');

        $tw.wiki.addEventListener('change', function(changes) {
            let index = getIndex();

            for(var title in changes) {
                if(title == RELATED_TERMS_TIDDLER) {
                    clearIndex();
                    let stateTiddler = $tw.wiki.getTiddler(STATE_TIDDLER);
                    $tw.wiki.addTiddler(new $tw.Tiddler(
                        stateTiddler,
                        { text: 'uninitialized' },
                       $tw.wiki.getModificationFields()));
                    cache.invalidate();
                }

                if(!index) {
                    continue;
                }

                if($tw.wiki.isSystemTiddler(title)) {
                    continue;
                }

                var change = changes[title];
                if(change.modified) {
                    var tiddler = $tw.wiki.getTiddler(title);
                    let type = tiddler.fields.type || 'text/vnd.tiddlywiki';
                    if(!type.startsWith('text/')) {
                        continue;
                    }
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
