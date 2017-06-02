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

import * as Cache from './cache';
var cache : typeof Cache = require('$:/plugins/hoelzro/full-text-search/cache.js');

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

        async asyncInvokeAction() {
            var rebuilding = this.getAttribute('rebuild') === 'true';
            var filter = '[!is[system]]';
            var tiddlers;

            var cacheData = rebuilding ? null : await cache.load();
            if(cacheData) {
                var cacheAge = await cache.getAge();
                filter += ' +[nsort[modified]]';
                var titles = this.wiki.compileFilter(filter)();
                tiddlers = [];

                for(let i = titles.length - 1; i >= 0; i--) {
                    var title = titles[i];
                    var tiddler = this.wiki.getTiddler(title);
                    if(tiddler.fields.modified < cacheAge) {
                        break;
                    }
                    tiddlers.push(title);
                }
                for(let i = 0; i < titles.length; i++) {
                    var title = titles[i];
                    var tiddler = this.wiki.getTiddler(title);
                    if('modified' in tiddler.fields) {
                        break;
                    }
                    tiddlers.push(title);
                }
                sharedIndex.load(cacheData);
            } else {
                tiddlers = this.wiki.compileFilter(filter)();
            }
            var age = this.wiki.compileFilter(filter + ' +[nsort[modified]last[]get[modified]]')()[0];
            var stateTiddler = this.wiki.getTiddler(STATE_TIDDLER);
            if(tiddlers.length > 0) {
                var fields = {
                    text: 'initializing',
                    progressCurrent: 0,
                    progressTotal: tiddlers.length
                };
                this.wiki.addTiddler(new $tw.Tiddler(stateTiddler, fields, this.wiki.getModificationFields()));

                var self = this;
                var lastUpdate = 0;
                sharedIndex.buildIndex(tiddlers, async function(progressCurrent) {
                    if((progressCurrent - lastUpdate) >= UPDATE_FREQUENCY) {
                        var stateTiddler = self.wiki.getTiddler(STATE_TIDDLER);
                        self.wiki.addTiddler(new $tw.Tiddler(stateTiddler, { progressCurrent: progressCurrent }, self.wiki.getModificationFields()));
                        lastUpdate = progressCurrent;
                    }
                    if(progressCurrent == tiddlers.length) {
                        await cache.save(age, sharedIndex.getIndex().toJSON());
                        var stateTiddler = self.wiki.getTiddler(STATE_TIDDLER);
                        self.wiki.addTiddler(new $tw.Tiddler(stateTiddler, { text: 'initialized', progressCurrent: progressCurrent }, self.wiki.getModificationFields()));
                    }
                });
            } else {
                this.wiki.addTiddler(new $tw.Tiddler(stateTiddler, { text: 'initialized', progressCurrent: 1, progressTotal: 1 }, this.wiki.getModificationFields()));
            }
        }

        invokeAction(triggeringWidget, event) {
            this.asyncInvokeAction();
        }
    }

    exports['fts-action-generate-index'] = FTSActionGenerateIndexWidget;
}

// vim:sts=4:sw=4
