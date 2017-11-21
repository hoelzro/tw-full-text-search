/*\
title: test-simple.js
type: application/javascript
tags: [[$:/tags/test-spec]]

\*/
(function() {
    var localforage = require('$:/plugins/hoelzro/full-text-search/localforage.min.js');
    var wiki = $tw.wiki;

    var nullDriver = {
        _driver: 'nullDriver',
        _initStorage: function(options) {
            return Promise.resolve();
        },
        clear: function(callback) {
            return callback ? callback() : Promise.resolve();
        },
        getItem: function(key, callback) {
            return callback ? callback() : Promise.resolve(null);
        },
        iterate: function(iterator, callback) {
            return callback ? callback() : Promise.resolve();
        },
        key: function(n, callback) {
            return callback ? callback(n) : Promise.resolve(n);
        },
        keys: function(callback) {
            return callback ? callback([]) : Promise.resolve([]);
        },
        length: function(callback) {
            return callback ? callback(0) : Promise.resolve(0);
        },
        removeItem: function(key, callback) {
            return callback ? callback() : Promise.resolve();
        },
        setItem: function(key, value, callback) {
            return callback ? callback(null) : Promise.resolve(null);
        },
        dropInstance: function(options, callback) {
            return callback ? callback() : Promise.resolve();
        }
    };

    var nullDriverReady;

    var initialTitles = Object.create(null);
    for(var title of wiki.compileFilter('[!is[system]]')()) {
        initialTitles[title] = true;
    }

    beforeEach(function() {
        require('$:/plugins/hoelzro/full-text-search/shared-index.js').clearIndex();
        wiki.addTiddler({
            title: 'NoModified',
            text: 'No modification date'
        });

        nullDriverReady = false;
        localforage.defineDriver(nullDriver, function() {
            localforage.setDriver('nullDriver', function() {
                nullDriverReady = true;
            }, function(err) {
                throw err;
            });
        }, function(err) {
            throw err;
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
                    return nullDriverReady && finished;
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
        var fauxStorage = Object.create(null);

        var inMemoryDriver = {
            _driver: 'inMemoryDriver',
            // XXX re-init between tests
            _initStorage: function(options) {
                return Promise.resolve();
            },
            clear: function(callback) {
                fauxStorage = Object.create(null);
                return callback ? callback() : Promise.resolve();
            },
            getItem: function(key, callback) {
                var value = fauxStorage[key];
                if(value != undefined) {
                    value = JSON.parse(value);
                } else {
                    value = null;
                }
                return callback ? callback(value) : Promise.resolve(value);
            },
            iterate: function(iterator, callback) {
                return callback ? callback() : Promise.resolve();
            },
            key: function(n, callback) {
                return callback ? callback(n) : Promise.resolve(n);
            },
            keys: function(callback) {
                return callback ? callback(Object.keys(fauxStorage)) : Promise.resolve(Object.keys(fauxStorage));
            },
            length: function(callback) {
                return callback ? callback(Object.keys(fauxStorage).length) : Promise.resolve(Object.keys(fauxStorage).length);
            },
            removeItem: function(key, callback) {
                delete fauxStorage[key];
                return callback ? callback() : Promise.resolve();
            },
            setItem: function(key, value, callback) {
                var oldValue = fauxStorage[key];
                if(oldValue != undefined) {
                    oldValue = JSON.parse(oldValue);
                } else {
                    oldValue = null;
                }
                fauxStorage[key] = JSON.stringify(value);
                return callback ? callback(oldValue) : Promise.resolve(oldValue);
            },
            dropInstance: function(options, callback) {
                return callback ? callback() : Promise.resolve();
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
