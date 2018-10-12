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

    function prepare() {
        return new Promise(function(resolve, reject) {
            var finished = false;

            // XXX wait for nullDriverReady first
            runs(function() {
                buildIndex().then(function() {
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

    function clearIndex() {
        return new Promise(function(resolve, reject) {
            require('$:/plugins/hoelzro/full-text-search/shared-index.js').clearIndex();
            resolve();
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

        let lunr = require('$:/plugins/hoelzro/full-text-search/lunr.min.js');

        delete lunr.Pipeline.registeredFunctions.expandQuery;
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

        xit('should pick up "twitter" in a URL', function() {
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

        it('should not pick up a non-text tiddler on an update', function() {
            prepare().then(function() {
                var newTiddler = new $tw.Tiddler(
                    wiki.getCreationFields(),
                    {type: 'application/x-tiddler-data', text: 'foo bar', title: 'MyDataTiddler'},
                    wiki.getModificationFields());
                wiki.addTiddler(newTiddler);

                return waitForNextTick();
            }).then(function() {
                var results = wiki.compileFilter('[ftsearch[foo]]')();
                expect(results).not.toContain('MyDataTiddler');
            });
        });

        it('should not fail upon an incomplete query', function() {
            prepare().then(function() {
                expect(wiki.getTiddlerText('$:/temp/FTS-state')).toBe('initialized');
                try {
                    var results = wiki.compileFilter('[ftsearch[date~]]')();
                    expect(results.length).toBe(0);
                } catch(e) {
                    console.log(e);
                    expect(true).toBe(false);
                }
            });
        });

        it('should not index new draft tiddlers', function() {
            prepare().then(function() {
                var draftTiddler = new $tw.Tiddler(
                    {
                        title: 'Draft of New Tiddler',
                        'draft.of': 'New Tiddler',
                        'draft.title': 'New Tiddler',
                        text: 'test tiddler',
                    },
                    wiki.getCreationFields(),
                    wiki.getModificationFields());

                wiki.addTiddler(draftTiddler);

                return waitForNextTick();
            }).then(function() {
                var results = wiki.filterTiddlers('[ftsearch[tiddler]has[draft.of]]');
                expect(results.length).toBe(0);
            });
        });
    });

    describe('Cache tests', function() {
        function freshBuildIndex() {
            let lunr = require('$:/plugins/hoelzro/full-text-search/lunr.min.js');
            delete lunr.Pipeline.registeredFunctions.expandQuery;
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

    describe('Query expansion tests', function() {
        it('should expand change to modification', function() {
            function setupRelatedTerms() {
                wiki.addTiddler(new $tw.Tiddler(
                    wiki.getCreationFields(),
                    {title: '$:/plugins/hoelzro/full-text-search/RelatedTerms.json', text: '["modification change"]', type: 'application/json'},
                    wiki.getModificationFields(),
                ));

                return waitForNextTick();
            }

            var finished = false;
            runs(function() {
                setupRelatedTerms().then(
                buildIndex).then(function() { finished = true });
            });

            waitsFor(function() {
                return finished;
            });

            runs(function() {
                expect(wiki.getTiddlerText('$:/temp/FTS-state')).toBe('initialized');
                var results = wiki.compileFilter('[ftsearch[change]]')();
                expect(results).toContain('NoModified');
                expect(results).toContain('JustSomeText');
            });
        });

        it("shouldn't expand anything if the config tiddler has no data", function() {
            function clearRelatedTerms() {
                wiki.deleteTiddler('$:/plugins/hoelzro/full-text-search/RelatedTerms.json');

                return waitForNextTick();
            }

            var finished = false;
            runs(function() {
                clearRelatedTerms().then(
                buildIndex).then(function() { finished = true });
            });

            waitsFor(function() {
                return finished;
            });

            runs(function() {
                expect(wiki.getTiddlerText('$:/temp/FTS-state')).toBe('initialized');
                var results = wiki.compileFilter('[ftsearch[change]]')();
                expect(results).not.toContain('NoModified');
                expect(results).not.toContain('JustSomeText');
            });
        });

        it("should invalidate the index if the config tiddler is changed", function() {
            function setupRelatedTerms() {
                wiki.addTiddler(new $tw.Tiddler(
                    wiki.getCreationFields(),
                    {title: '$:/plugins/hoelzro/full-text-search/RelatedTerms.json', text: '["modification change"]', type: 'application/json'},
                    wiki.getModificationFields(),
                ));

                return waitForNextTick();
            }

            function clearRelatedTerms() {
                wiki.deleteTiddler('$:/plugins/hoelzro/full-text-search/RelatedTerms.json');

                return waitForNextTick();
            }

            var finished = false;
            runs(function() {
                setupRelatedTerms().then(
                buildIndex).then(
                clearRelatedTerms).then(function() { finished = true });
            });

            waitsFor(function() {
                return finished;
            });

            runs(function() {
                expect(wiki.getTiddlerText('$:/temp/FTS-state')).toBe('uninitialized');
            });
        });

        it('should rebuild the whole index if the config tiddler is changed and loaded from cache', function() {
            function setupRelatedTerms() {
                wiki.addTiddler(new $tw.Tiddler(
                    wiki.getCreationFields(),
                    {title: '$:/plugins/hoelzro/full-text-search/RelatedTerms.json', text: '["modification change"]', type: 'application/json'},
                    wiki.getModificationFields(),
                ));

                return waitForNextTick();
            }

            function clearRelatedTerms() {
                wiki.deleteTiddler('$:/plugins/hoelzro/full-text-search/RelatedTerms.json');

                return waitForNextTick();
            }

            var finished = false;
            runs(function() {
                setupInMemoryDriver().then(
                localforage.clear).then(
                setupRelatedTerms).then(
                buildIndex).then(
                clearRelatedTerms).then(
                clearIndex).then(
                buildIndex).then(function() { finished = true });
            });

            waitsFor(function() {
                return finished;
            });

            runs(function() {
                expect(wiki.getTiddlerText('$:/temp/FTS-state')).toBe('initialized');
                var results = wiki.compileFilter('[ftsearch[change]]')();
                expect(results).not.toContain('NoModified');
                expect(results).not.toContain('JustSomeText');
            });
        });

        it('should not break the indexer to use Related terms with a number as a member', function() {
            function setupRelatedTerms() {
                let relatedTermList = [
                    "foobar [[foo 2]]"
                ];

                wiki.addTiddler(new $tw.Tiddler(
                    wiki.getCreationFields(),
                    {title: '$:/plugins/hoelzro/full-text-search/RelatedTerms.json', text: JSON.stringify(relatedTermList), type: 'application/json'},
                    wiki.getModificationFields(),
                ));

                wiki.addTiddler(new $tw.Tiddler(
                    wiki.getCreationFields(),
                    {title: 'Empty', text: 'foo', type: 'text/vnd.tiddlywiki', tags: ''},
                    wiki.getModificationFields(),
                ));

                return waitForNextTick();
            }

            var finished = false;
            runs(function() {
                setupRelatedTerms().then(
                buildIndex).then(function() { finished = true });
            });

            waitsFor(function() {
                return finished;
            });

            runs(function() {
                expect(true).toBe(true);
            });
        });
    });
})();
