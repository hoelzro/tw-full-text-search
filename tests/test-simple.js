/*\
title: test-simple.js
type: application/javascript
tags: [[$:/tags/test-spec]]

\*/
(function() {
    var wiki = $tw.wiki;

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

    describe('Cache tests', function() {
        var localforage = require('localforage');
        var fauxStorage = Object.create(null);

        var inMemoryDriver = {
            _driver: 'inMemoryDriver',
            // XXX re-init between tests
            _initStorage: function(options) {
                return Promise.resolve();
            },
            clear: function(callback) {
                fauxStorage = Object.create(null);
                callback();
            },
            getItem: function(key, callback) {
                callback(fauxStorage[key]);
            },
            iterate: function(iterator, callback) {
                // XXX NYI
                callback();
            },
            key: function(n, callback) {
                // XXX NYI
                callback(n);
            },
            keys: function(callback) {
                callback(Object.keys(fauxStorage));
            },
            length: function(callback) {
                callback(Object.keys(fauxStorage).length);
            },
            removeItem: function(key, callback) {
                delete fauxStorage[key];
                callback();
            },
            setItem: function(key, value, callback) {
                var oldValue = fauxStorage[key];
                fauxStorage[key] = value;
                callback(oldValue);
            },
            dropInstance: function(options, callback) {
                callback();
            }
        };

        var nullDriver = {
            _driver: 'nullDriver',
            _initStorage: function(options) {
                return Promise.resolve();
            },
            clear: function(callback) {
                callback();
            },
            getItem: function(key, callback) {
                callback(null);
            },
            iterate: function(iterator, callback) {
                callback();
            },
            key: function(n, callback) {
                callback(n);
            },
            keys: function(callback) {
                callback([]);
            },
            length: function(callback) {
                callback(0);
            },
            removeItem: function(key, callback) {
                callback();
            },
            setItem: function(key, value, callback) {
                callback(null);
            },
            dropInstance: function(options, callback) {
                callback();
            }
        };

        var inMemoryDriverReady = false;

        // XXX how do I remove this driver after this test to make sure it doesn't interfere?
        localforage.defineDriver(inMemoryDriver, function() {
            localforage.setDriver('inMemoryDriver', function() {
                inMemoryDriverReady = true;
            }, function(err) {
                throw err;
            });
        }, function(err) {
            throw err;
        });
    });
})();
