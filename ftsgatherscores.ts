/*\
title: $:/plugins/hoelzro/full-text-search/ftsgatherscores.js
type: application/javascript
module-type: filteroperator

\*/

module FTSGatherScores {
    export function ftsgatherscores(source, operator, options) {
        let targetTiddler = operator.operand;
        return function(callback) {
            let titleToScore = Object.create(null);
            source(function(tiddler, title, score) {
                titleToScore[title] = score;
                callback(tiddler, title);
            });
            options.wiki.setTiddlerData(targetTiddler, titleToScore);
        };
    }
}

export = FTSGatherScores;

// vim:sts=4:sw=4
