/*\
title: test-simple.js
type: application/javascript
tags: [[$:/tags/test-spec]]

\*/
(function() {
    describe('Simple test', function() {
        var wiki = new $tw.Wiki();
        wiki.addTiddler({
            title: 'NoModified',
            text: 'No modification date'
        });

        it('should find tiddlers without a modified field', function() {
            var results = wiki.compileFilter('[ftsearch[modification]]')();
            expect(results).toContain('NoModified');
        });
    });
})();
