/*\
title: $:/plugins/hoelzro/full-text-search/ftsfeedback.js
type: application/javascript
module-type: filteroperator

\*/

declare var require;

module FTSFeedback {
  export function ftsfeedback(source, operator, options) {
    return function(callback) {
      let targetTiddler = operator.operand;
      let listOfFeedback = [];

      source(function(tiddler, title, feedback) {
        if(tiddler == null && title == null) {
          listOfFeedback.push(feedback);
        } else {
          callback(tiddler, title);
        }
      });

      if(listOfFeedback.length > 0) {
        options.wiki.setTiddlerData(targetTiddler, {messages: listOfFeedback});
      }
    };
  }
}

export = FTSFeedback;
