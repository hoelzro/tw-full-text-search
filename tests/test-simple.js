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

    async function buildIndex() {
        var FTSActionGenerateIndexWidget = require('$:/plugins/hoelzro/full-text-search/fts-action-generate-index.js')['fts-action-generate-index'];
        var widget = new FTSActionGenerateIndexWidget(null, {
            wiki: wiki
        });
        await widget.asyncInvokeAction();
    }

    async function prepare() {
        await buildIndex();
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

    async function setupInMemoryDriver() {
        // XXX how do I remove this driver after this test to make sure it doesn't interfere?
        await localforage.defineDriver(inMemoryDriver);
        await localforage.setDriver('inMemoryDriver');
    }

    function clearIndex() {
        require('$:/plugins/hoelzro/full-text-search/shared-index.js').clearIndex();
        return Promise.resolve();
    }

    var nullDriverReady;

    var initialTitles = Object.create(null);
    for(var title of wiki.compileFilter('[!is[system]]')()) {
        initialTitles[title] = true;
    }

    beforeEach(async function() {
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

        wiki.addTiddler(new $tw.Tiddler(
            {
                title: 'Draft of New Tiddler',
                'draft.of': 'New Tiddler',
                'draft.title': 'New Tiddler',
                text: 'test tiddler',
            },
            wiki.getCreationFields(),
            wiki.getModificationFields()));
        // XXX wait for wiki to settle

        await localforage.defineDriver(nullDriver);
        await localforage.setDriver('nullDriver');
        nullDriverReady = true;

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
        // XXX wait for wiki to settle
    });

    describe('Simple test', function() {
        it('should start with an uninitialized FTS state', function() {
            expect(wiki.getTiddlerText('$:/temp/FTS-state')).toBe('uninitialized');
        });

        it('should find matching documents without a modified field', async function() {
            await prepare();

            expect(wiki.getTiddlerText('$:/temp/FTS-state')).toBe('initialized');
            var results = wiki.compileFilter('[ftsearch[modification]]')();
            expect(results).toContain('NoModified');
        });

        it("should pick up changes to tiddlers' contents", async function() {
            await prepare();

            var tiddler = wiki.getTiddler('NoModified');
            var newTiddler = new $tw.Tiddler(
                tiddler,
                {text: "New text without that word we're looking for"},
                wiki.getModificationFields());
            wiki.addTiddler(newTiddler);

            await waitForNextTick();

            var results = wiki.compileFilter('[ftsearch[modification]]')();
            expect(results).not.toContain('NoModified');

            results = wiki.compileFilter('[ftsearch[looking]]')();
            expect(results).toContain('NoModified');
        });

        it("should pick up on renames after initial index", async function() {
            await prepare();

            $tw.wiki.renameTiddler('NoModified', 'BrandNewName');

            await waitForNextTick();

            var results = wiki.compileFilter('[ftsearch[modification]]')();
            expect(results).toContain('BrandNewName');
        });

        it("should pick up on deletions after initial index", async function() {
            await prepare();

            $tw.wiki.deleteTiddler('NoModified');

            await waitForNextTick();

            var results = wiki.compileFilter('[ftsearch[modification]]')();
            expect(results).not.toContain('NoModified');
        });

        it('should pick reason with "reason programming language"', async function() {
            await prepare();

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
            await waitForNextTick();

            var results = wiki.compileFilter('[ftsearch[reason programming language]]')();
            expect(results).toContain('Reason');
        });

        xit('should pick up "twitter" in a URL', async function() {
            await prepare();
            var text = 'https://twitter.com/hoelzro/status/877901644125663232';
            $tw.wiki.addTiddler(new $tw.Tiddler(
                $tw.wiki.getCreationFields(),
                { title: 'ContainsTweetLink', type: 'text/vnd.tiddlywiki', text: text },
                $tw.wiki.getModificationFields()
            ));
            await waitForNextTick();

            var results = wiki.compileFilter('[ftsearch[twitter]]')();
            expect(results).toContain('ContainsTweetLink');
        });

        it('should not pick up a non-text tiddler on an update', async function() {
            await prepare();

            var newTiddler = new $tw.Tiddler(
                wiki.getCreationFields(),
                {type: 'application/x-tiddler-data', text: 'foo bar', title: 'MyDataTiddler'},
                wiki.getModificationFields());
            wiki.addTiddler(newTiddler);

            await waitForNextTick();

            var results = wiki.compileFilter('[ftsearch[foo]]')();
            expect(results).not.toContain('MyDataTiddler');
        });

        it('should not pick up JavaScript code', async function() {
            await prepare();

            expect(wiki.getTiddlerText('$:/temp/FTS-state')).toBe('initialized');
            var results = wiki.compileFilter('[ftsearch[tag]]')();
            expect(results).not.toContain('test-simple.js');
        });

        it('should not fail upon an incomplete query', async function() {
            await prepare();

            expect(wiki.getTiddlerText('$:/temp/FTS-state')).toBe('initialized');
            try {
                var results = wiki.compileFilter('[ftsearch[date~]]')();
                expect(results.length).toBe(0);
            } catch(e) {
                console.log(e);
                expect(true).toBe(false);
            }
        });

        it('should not index new draft tiddlers', async function() {
            await prepare();

            var draftTiddler = new $tw.Tiddler(
                {
                    title: 'Draft of New Tiddler 2',
                    'draft.of': 'New Tiddler 2',
                    'draft.title': 'New Tiddler 2',
                    text: 'test tiddler',
                },
                wiki.getCreationFields(),
                wiki.getModificationFields());

            wiki.addTiddler(draftTiddler);

            await waitForNextTick();

            var results = wiki.filterTiddlers('[ftsearch[tiddler]has[draft.of]]');
            expect(results.length).toBe(0);
        });

        it('should not index draft tiddlers from the start', async function() {
            await prepare();

            var results = wiki.filterTiddlers('[ftsearch[tiddler]has[draft.of]]');
            expect(results.length).toBe(0);
        });

        it('should order results by query relevance', async function() {
            await prepare();

            var results = wiki.filterTiddlers('[ftsearch[fox]]');
            let foxesFoxesFoxesIndex = results.indexOf('Foxes foxes foxes');
            let foxInGardenIndex = results.indexOf('A fox in the garden');
            expect(foxesFoxesFoxesIndex).not.toBe(-1);
            expect(foxInGardenIndex).not.toBe(-1);
            expect(foxesFoxesFoxesIndex).toBeLessThan(foxInGardenIndex);
        });
    });

    describe('Cache tests', function() {
        function freshBuildIndex() {
            let lunr = require('$:/plugins/hoelzro/full-text-search/lunr.min.js');
            delete lunr.Pipeline.registeredFunctions.expandQuery;
            return clearIndex().then(buildIndex);
        }

        it('should work with the cache', async function() {
            async function modifyTiddler() {
                var tiddler = $tw.wiki.getTiddler('JustSomeText');

                var newTiddler = new $tw.Tiddler(
                    tiddler,
                    {text: "New text without that word we're looking for"},
                    wiki.getModificationFields());
                wiki.addTiddler(newTiddler);

                await waitForNextTick();
            }

            await setupInMemoryDriver();
            await localforage.clear();
            await buildIndex();
            await modifyTiddler();
            await freshBuildIndex();

            var results = wiki.compileFilter('[ftsearch[modification]]')();
            expect(results).not.toContain('JustSomeText');
        });

        it('should not pick up tiddlers deleted between a save and cache load', async function() {
            async function deleteTiddler() {
                wiki.deleteTiddler('JustSomeText');
                await waitForNextTick();
            }

            await setupInMemoryDriver();
            await localforage.clear();
            await buildIndex();
            await clearIndex();
            await deleteTiddler();
            await buildIndex();

            var results = wiki.compileFilter('[ftsearch[modification]]')();
            expect(results).not.toContain('JustSomeText');
        });

        it('should not pick up tiddlers deleted and re-added between a save and cache load', async function() {
            async function deleteTiddler() {
                wiki.deleteTiddler('JustSomeText');
                await waitForNextTick();
            }

            async function readdTiddler() {
                var tiddler = $tw.wiki.getTiddler('JustSomeText');

                var newTiddler = new $tw.Tiddler(
                    tiddler,
                    {text: "New text without that word we're looking for"},
                    wiki.getModificationFields());
                wiki.addTiddler(newTiddler);

                await waitForNextTick();
            }

            await setupInMemoryDriver();
            await localforage.clear();
            await buildIndex();
            await clearIndex();
            await deleteTiddler();
            await readdTiddler();
            await buildIndex();

            var results = wiki.compileFilter('[ftsearch[modification]]')();
            expect(results).not.toContain('JustSomeText');
        });
    });

    describe('Query expansion tests', function() {
        it('should expand change to modification', async function() {
            async function setupRelatedTerms() {
                wiki.addTiddler(new $tw.Tiddler(
                    wiki.getCreationFields(),
                    {title: '$:/plugins/hoelzro/full-text-search/RelatedTerms.json', text: '["modification change"]', type: 'application/json'},
                    wiki.getModificationFields(),
                ));

                await waitForNextTick();
            }

            await setupRelatedTerms();
            await buildIndex();

            expect(wiki.getTiddlerText('$:/temp/FTS-state')).toBe('initialized');
            var results = wiki.compileFilter('[ftsearch[change]]')();
            expect(results).toContain('NoModified');
            expect(results).toContain('JustSomeText');
        });

        it("shouldn't expand anything if the config tiddler has no data", async function() {
            async function clearRelatedTerms() {
                wiki.deleteTiddler('$:/plugins/hoelzro/full-text-search/RelatedTerms.json');

                await waitForNextTick();
            }

            await clearRelatedTerms();
            await buildIndex();

            expect(wiki.getTiddlerText('$:/temp/FTS-state')).toBe('initialized');
            var results = wiki.compileFilter('[ftsearch[change]]')();
            expect(results).not.toContain('NoModified');
            expect(results).not.toContain('JustSomeText');
        });

        it("should invalidate the index if the config tiddler is changed", async function() {
            async function setupRelatedTerms() {
                wiki.addTiddler(new $tw.Tiddler(
                    wiki.getCreationFields(),
                    {title: '$:/plugins/hoelzro/full-text-search/RelatedTerms.json', text: '["modification change"]', type: 'application/json'},
                    wiki.getModificationFields(),
                ));

                await waitForNextTick();
            }

            async function clearRelatedTerms() {
                wiki.deleteTiddler('$:/plugins/hoelzro/full-text-search/RelatedTerms.json');

                await waitForNextTick();
            }

            await setupRelatedTerms();
            await buildIndex();
            await clearRelatedTerms();

            expect(wiki.getTiddlerText('$:/temp/FTS-state')).toBe('uninitialized');
        });

        it('should rebuild the whole index if the config tiddler is changed and loaded from cache', async function() {
            async function setupRelatedTerms() {
                wiki.addTiddler(new $tw.Tiddler(
                    wiki.getCreationFields(),
                    {title: '$:/plugins/hoelzro/full-text-search/RelatedTerms.json', text: '["modification change"]', type: 'application/json'},
                    wiki.getModificationFields(),
                ));

                await waitForNextTick();
            }

            async function clearRelatedTerms() {
                wiki.deleteTiddler('$:/plugins/hoelzro/full-text-search/RelatedTerms.json');

                await waitForNextTick();
            }

            await setupInMemoryDriver();
            await localforage.clear();
            await setupRelatedTerms();
            await buildIndex();
            await clearRelatedTerms();
            await clearIndex();
            await buildIndex();

            expect(wiki.getTiddlerText('$:/temp/FTS-state')).toBe('initialized');
            var results = wiki.compileFilter('[ftsearch[change]]')();
            expect(results).not.toContain('NoModified');
            expect(results).not.toContain('JustSomeText');
        });

        it('should not break the indexer to use Related terms with a number as a member', async function() {
            async function setupRelatedTerms() {
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

                await waitForNextTick();
            }

            await setupRelatedTerms();
            await buildIndex();

            expect(true).toBe(true);
        });
    });

})();
