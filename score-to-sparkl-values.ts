/*\
title: $:/plugins/hoelzro/full-text-search/score-to-sparkl-values.js
type: application/javascript
module-type: macro

\*/

module ScoreToSparklValues {
    export const name : string = 'fts-score-to-sparkl-values';

    export const params = [{name: 'score'}];

    export function run(score) {
        let value = Math.floor(score * 100); // XXX better name
        let numTenBars = Math.floor(value / 10);
        let finalBarHeight = value % 10;
        let result = [];
        for(let i = 0; i < numTenBars; i++) {
            result.push(10);
        }
        result.push(finalBarHeight);
        return result.join(' ');
    }
}

export = ScoreToSparklValues;

// vim:sts=4:sw=4
