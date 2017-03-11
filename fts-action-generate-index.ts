/*\
title: $:/plugins/hoelzro/full-text-search/fts-action-generate-index.js
type: application/javascript
module-type: widget

\*/
(function() {
/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

const STATE_TIDDLER    = '$:/temp/FTS-state';
const UPDATE_FREQUENCY = 10;

var sharedIndex = require('$:/plugins/hoelzro/full-text-search/shared-index.js');

var Widget = require('$:/core/modules/widgets/widget.js').widget;

var FTSActionGenerateIndexWidget = function(parseTreeNode, options) {
    this.initialise(parseTreeNode, options);
};

FTSActionGenerateIndexWidget.prototype = new Widget();

FTSActionGenerateIndexWidget.prototype.render = function render(parent, nextSibling) {
    this.computeAttributes();
    this.execute();
};

FTSActionGenerateIndexWidget.prototype.execute = function execute() {
};

FTSActionGenerateIndexWidget.prototype.refresh = function refresh(changedTiddlers) {
    return this.refreshChildren(changedTiddlers);
};

FTSActionGenerateIndexWidget.prototype.invokeAction = function invokeAction(triggeringWidget, event) {
    var tiddlers = this.wiki.getTiddlers();
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
};

exports['fts-action-generate-index'] = FTSActionGenerateIndexWidget;

})();
