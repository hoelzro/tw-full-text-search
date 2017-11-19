/*\
title: test-simple.js
type: application/javascript
tags: [[$:/tags/test-spec]]

\*/
(function() {
    var wiki = $tw.wiki;
    var widget; // XXX remove me soon

    function waitForNextTick() {
        return new Promise(function(resolve, reject) {
            $tw.utils.nextTick(resolve);
        });
    }

    function prepare() {
        return new Promise(function(resolve, reject) {
            var finished = false;

            runs(function() {
                widget.asyncInvokeAction().then(function() {
                    var result = resolve();
                    if(result instanceof Promise) {
                        result.then(function() {
                            // XXX multiple promise chain links, though?
                            finished = true;
                        }, function(err) {
                            reject(err); // XXX will this work?
                        });
                    } else {
                        finished = true;
                    }
                }, function(err) {
                    reject(err);
                });
            });

            waitsFor(function() {
                return finished;
            });

            runs(function() {
                resolve();
            });
        });
    }

    var initialTitles = Object.create(null);
    for(var title of wiki.compileFilter('[!is[system]]')()) {
        initialTitles[title] = true;
    }

    beforeEach(function() {
        wiki.addTiddler({
            title: 'NoModified',
            text: 'No modification date'
        });
    });

    afterEach(function() {
        var titles = wiki.compileFilter('[!is[system]]')();
        for(var title of titles) {
            if(! (title in initialTitles)) {
                wiki.deleteTiddler(title);
            }
        }
    });

    describe('Simple test', function() {
        it('should start with an uninitialized FTS state', function() {
            expect(wiki.getTiddlerText('$:/temp/FTS-state')).toBe('uninitialized');
        });

        var FTSActionGenerateIndexWidget = require('$:/plugins/hoelzro/full-text-search/fts-action-generate-index.js')['fts-action-generate-index'];
        widget = new FTSActionGenerateIndexWidget(null, {
            wiki: wiki
        });

        it('should find matching documents without a modified field', function() {
            prepare().then(function() {
                expect(wiki.getTiddlerText('$:/temp/FTS-state')).toBe('initialized');
                var results = wiki.compileFilter('[ftsearch[modification]]')();
                expect(results).toContain('NoModified');
            });
        });

        it("should pick up changes to tiddlers' contents", function() {
            prepare().then(function() {
                var tiddler = wiki.getTiddler('NoModified');
                var newTiddler = new $tw.Tiddler(
                    tiddler,
                    {text: "New text without that word we're looking for"},
                    wiki.getModificationFields());
                wiki.addTiddler(newTiddler);

                return waitForNextTick();
            }).then(function() {
                var results = wiki.compileFilter('[ftsearch[modification]]')();
                expect(results).not.toContain('NoModified');

                results = wiki.compileFilter('[ftsearch[looking]]')();
                expect(results).toContain('NoModified');
            });
        });

        it("should pick up on renames after initial index", function() {
            prepare().then(function() {
                $tw.wiki.renameTiddler('NoModified', 'BrandNewName');
                return waitForNextTick();
            }).then(function() {
                var results = wiki.compileFilter('[ftsearch[modification]]')();
                expect(results).toContain('BrandNewName');
            });
        });

        it("should pick up on deletions after initial index", function() {
            prepare().then(function() {
                $tw.wiki.deleteTiddler('NoModified');
                return waitForNextTick();
            }).then(function() {
                var results = wiki.compileFilter('[ftsearch[modification]]')();
                expect(results).not.toContain('NoModified');
            });
        });
    });
})();
