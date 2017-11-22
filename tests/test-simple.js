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

    function waitForNextTick() {
        return new Promise(function(resolve, reject) {
            $tw.utils.nextTick(resolve);
        });
    }

    function prepare() {
        return new Promise(function(resolve, reject) {
            var finished = false;

            // XXX wait for nullDriverReady first
            runs(function() {
                var FTSActionGenerateIndexWidget = require('$:/plugins/hoelzro/full-text-search/fts-action-generate-index.js')['fts-action-generate-index'];
                var widget = new FTSActionGenerateIndexWidget(null, {
                    wiki: wiki
                });

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

    var nullDriverReady;

    var initialTitles = Object.create(null);
    for(var title of wiki.compileFilter('[!is[system]]')()) {
        initialTitles[title] = true;
    }

    beforeEach(function() {
        // XXX clear localforage in memory cache?
        require('$:/plugins/hoelzro/full-text-search/shared-index.js').clearIndex();
        wiki.addTiddler({
            title: 'NoModified',
            text: 'No modification date'
        });

        wiki.addTiddler(new $tw.Tiddler(
            wiki.getCreationFields(),
            { title: 'JustSomeText', text: 'This one has a modification date' },
            wiki.getModificationFields()));

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
        // XXX this causes a bunch of events that are handled async =(
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

        it('should pick reason with "reason programming language"', function() {
            prepare().then(function() {
                var text = `
A kind of OCaml that compiles down to JavaScript

https://facebook.github.io/reason/

https://jaredforsyth.com/2017/07/05/a-reason-react-tutorial/
                `;
                $tw.wiki.addTiddler(new $tw.Tiddler(
                    $tw.wiki.getCreationFields(),
                    { title: 'Reason', tags: 'Someday/Maybe Play Coding [[Programming Languages]]', type: 'text/vnd.tiddlywiki', text: text },
                    $tw.wiki.getModificationFields()
                ));
                return waitForNextTick();
            }).then(function() {
                var results = wiki.compileFilter('[ftsearch[reason programming language]]')();
                expect(results).toContain('Reason');
            });
        });

        it('should pick up "twitter" in a URL', function() {
            prepare().then(function() {
                var text = 'https://twitter.com/hoelzro/status/877901644125663232';
                $tw.wiki.addTiddler(new $tw.Tiddler(
                    $tw.wiki.getCreationFields(),
                    { title: 'ContainsTweetLink', type: 'text/vnd.tiddlywiki', text: text },
                    $tw.wiki.getModificationFields()
                ));
                return waitForNextTick();
            }).then(function() {
                var results = wiki.compileFilter('[ftsearch[twitter]]')();
                expect(results).toContain('ContainsTweetLink');
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

        function setupInMemoryDriver() {
            return new Promise(function(resolve, reject) {
                // XXX how do I remove this driver after this test to make sure it doesn't interfere?
                localforage.defineDriver(inMemoryDriver, function() {
                    localforage.setDriver('inMemoryDriver', function() {
                        resolve();
                    }, function(err) {
                        reject(err);
                    });
                }, function(err) {
                    reject(err);
                });
            });
        }

        function buildIndex() {
            return new Promise(function(resolve, reject) {
                var FTSActionGenerateIndexWidget = require('$:/plugins/hoelzro/full-text-search/fts-action-generate-index.js')['fts-action-generate-index'];
                var widget = new FTSActionGenerateIndexWidget(null, {
                    wiki: wiki
                });
                widget.asyncInvokeAction().then(function() {
                    resolve();
                });
            });
        }

        function clearIndex() {
            return new Promise(function(resolve, reject) {
                require('$:/plugins/hoelzro/full-text-search/shared-index.js').clearIndex();
                resolve();
            });
        }

        function freshBuildIndex() {
            return clearIndex().then(buildIndex);
        }

        it('should work with the cache', function() {
            function modifyTiddler() {
                var tiddler = $tw.wiki.getTiddler('JustSomeText');

                return new Promise(function(resolve, reject) {
                    var newTiddler = new $tw.Tiddler(
                        tiddler,
                        {text: "New text without that word we're looking for"},
                        wiki.getModificationFields());
                    wiki.addTiddler(newTiddler);

                    $tw.utils.nextTick(function() {
                        resolve();
                    });
                });
            }

            var finished = false;

            runs(function() {
                setupInMemoryDriver().then(
                localforage.clear).then(
                buildIndex).then(
                modifyTiddler).then(
                freshBuildIndex).then(
                function() { finished = true });
            });

            waitsFor(function() {
                return finished;
            });

            runs(function() {
                var results = wiki.compileFilter('[ftsearch[modification]]')();
                expect(results).not.toContain('JustSomeText');
            });
        });

        it('should not pick up tiddlers deleted between a save and cache load', function() {
            function deleteTiddler() {
                return new Promise(function(resolve, reject) {
                    wiki.deleteTiddler('JustSomeText');
                    $tw.utils.nextTick(function() {
                        resolve();
                    });
                });
            }
            var finished = false;

            runs(function() {
                setupInMemoryDriver().then(
                localforage.clear).then(
                buildIndex).then(
                clearIndex).then(
                deleteTiddler).then(
                buildIndex).then(
                function() { finished = true });
            });

            waitsFor(function() {
                return finished;
            });

            runs(function() {
                var results = wiki.compileFilter('[ftsearch[modification]]')();
                expect(results).not.toContain('JustSomeText');
            });
        });

        it('should not pick up tiddlers deleted and re-added between a save and cache load', function() {
            function deleteTiddler() {
                return new Promise(function(resolve, reject) {
                    wiki.deleteTiddler('JustSomeText');
                    $tw.utils.nextTick(function() {
                        resolve();
                    });
                });
            }

            function readdTiddler() {
                var tiddler = $tw.wiki.getTiddler('JustSomeText');

                return new Promise(function(resolve, reject) {
                    var newTiddler = new $tw.Tiddler(
                        tiddler,
                        {text: "New text without that word we're looking for"},
                        wiki.getModificationFields());
                    wiki.addTiddler(newTiddler);

                    $tw.utils.nextTick(function() {
                        resolve();
                    });
                });
            }

            var finished = false;

            runs(function() {
                setupInMemoryDriver().then(
                localforage.clear).then(
                buildIndex).then(
                clearIndex).then(
                deleteTiddler).then(
                readdTiddler).then(
                buildIndex).then(
                function() { finished = true });
            });

            waitsFor(function() {
                return finished;
            });

            runs(function() {
                var results = wiki.compileFilter('[ftsearch[modification]]')();
                expect(results).not.toContain('JustSomeText');
            });
        });
    });
})();
