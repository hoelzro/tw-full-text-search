/*\
title: test-simple.js
type: application/javascript
tags: [[$:/tags/test-spec]]

\*/
(function() {
    var wiki = new $tw.Wiki();
    wiki.addTiddler($tw.wiki.getTiddler('$:/plugins/hoelzro/progress-bar'));
    wiki.addTiddler($tw.wiki.getTiddler('$:/plugins/hoelzro/full-text-search'));
    wiki.readPluginInfo();
    wiki.registerPluginTiddlers('plugin');
    wiki.unpackPluginTiddlers();

    wiki.addTiddler({
        title: 'NoModified',
        text: 'No modification date'
    });

    describe('Simple test', function() {
        it('should start with an uninitialized FTS state', function() {
            expect(wiki.getTiddlerText('$:/temp/FTS-state')).toBe('uninitialized');
        });

        var FTSActionGenerateIndexWidget = require('$:/plugins/hoelzro/full-text-search/fts-action-generate-index.js')['fts-action-generate-index'];
        var widget = new FTSActionGenerateIndexWidget(null, {
            wiki: wiki
        });

        it('should find matching documents without a modified field', function() {
            var finished = false;

            runs(function() {
                widget.asyncInvokeAction().then(function() {
                    finished = true;
                }, function(err) {
                    // XXX signal to jasmine that we failed?
                    console.error(err);
                });
            });

            waitsFor(function() {
                return finished;
            });

            runs(function() {
                expect(wiki.getTiddlerText('$:/temp/FTS-state')).toBe('initialized');
                var results = wiki.compileFilter('[ftsearch[modification]]')();
                expect(results).toContain('NoModified');
            });
        });
    });
})();
