/*\
title: $:/plugins/hoelzro/full-text-search/fts-action-generate-index.js
type: application/javascript
module-type: widget

\*/

/// <reference path="TiddlyWiki/core/modules/widgets/widget.d.ts"/>
import { widget as Widget } from '$:/core/modules/widgets/widget.js';

declare var require;
declare var $tw;
declare var exports; // XXX until I figure it out

import * as SharedIndex from './shared-index';
var sharedIndex : typeof SharedIndex = require('$:/plugins/hoelzro/full-text-search/shared-index.js');

module FTSActionGenerateIndex {
    const STATE_TIDDLER    = '$:/temp/FTS-state';
    const UPDATE_FREQUENCY = 10;

    class FTSActionGenerateIndexWidget extends Widget {
        constructor(parseTreeNode, options) {
            super();
            this.initialise(parseTreeNode, options);
        }

        render(parent, nextSibling) {
            this.computeAttributes();
            this.execute();
        }

        execute() {
        }

        refresh(changedTiddlers) {
            return this.refreshChildren(changedTiddlers);
        }

        invokeAction(triggeringWidget, event) {
            var filter = '[!is[system]]';
            var tiddlers = this.wiki.compileFilter(filter)();
            var stateTiddler = this.wiki.getTiddler(STATE_TIDDLER);
            var fields = {
                text: 'initializing',
                progressCurrent: 0,
                progressTotal: tiddlers.length
            };
            this.wiki.addTiddler(new $tw.Tiddler(stateTiddler, fields, this.wiki.getModificationFields()));

            var self = this;
            var lastUpdate = 0;
            sharedIndex.buildIndex(tiddlers, function(progressCurrent) {
                if((progressCurrent - lastUpdate) >= UPDATE_FREQUENCY) {
                    var stateTiddler = self.wiki.getTiddler(STATE_TIDDLER);
                    self.wiki.addTiddler(new $tw.Tiddler(stateTiddler, { progressCurrent: progressCurrent }, self.wiki.getModificationFields()));
                    lastUpdate = progressCurrent;
                }
                if(progressCurrent == tiddlers.length) {
                    var stateTiddler = self.wiki.getTiddler(STATE_TIDDLER);
                    self.wiki.addTiddler(new $tw.Tiddler(stateTiddler, { text: 'initialized', progressCurrent: progressCurrent }, self.wiki.getModificationFields()));
                }
            });
        }
    }

    exports['fts-action-generate-index'] = FTSActionGenerateIndexWidget;
}

// vim:sts=4:sw=4
