/*\
title: $:/plugins/hoelzro/full-text-search/ftsgatherscores.js
type: application/javascript
module-type: filteroperator

\*/

module FTSGatherScores {
    export function ftsgatherscores(source, operator, options) {
        let targetTiddler = operator.operand;
        let topScore = null;
        return function(callback) {
            let titleToScore = Object.create(null);
            source(function(tiddler, title, score) {
                titleToScore[title] = score;
                if(topScore === null || score > topScore) {
                    topScore = score;
                }
                callback(tiddler, title);
            });
            if(topScore > 1.0) {
                for(let title in titleToScore) {
                    titleToScore[title] /= topScore;
                }
            }
            options.wiki.setTiddlerData(targetTiddler, titleToScore);
        };
    }
}

export = FTSGatherScores;

// vim:sts=4:sw=4
