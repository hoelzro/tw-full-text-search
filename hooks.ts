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

            let isIndexDirty = false;

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
                    if(tiddler !== undefined) {
                        let type = tiddler.fields.type || 'text/vnd.tiddlywiki';
                        if(!type.startsWith('text/')) {
                            continue;
                        }
                        if('draft.of' in tiddler.fields) {
                            continue;
                        }

                        isIndexDirty = true;

                        updateTiddler(index, tiddler);
                    }
                } else { // change.deleted
                    isIndexDirty = true;
                    index.remove({ title: title });
                }
            }

            // Since actual changes are happening to lunr data structures outside of
            // TiddlyWiki, we need to tell TiddlyWiki to rerender the page and any
            // tiddlers whose contents may have changed due to the change in the index
            if(isIndexDirty) {
                let stateTiddler = $tw.wiki.getTiddler(STATE_TIDDLER);
                $tw.wiki.addTiddler(stateTiddler);
            }
        });

    }
}

export = SaveTiddlerHook;

// vim:sts=4:sw=4
