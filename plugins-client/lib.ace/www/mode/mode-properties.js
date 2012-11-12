define('ace/mode/properties', ['require', 'exports', 'module' , 'ace/lib/oop', 'ace/mode/text', 'ace/mode/properties_highlight_rules'], function(require, exports, module) {

var oop = require("../lib/oop");
var PropertiesHighlightRules = require("./properties_highlight_rules").HighlightRules;
var TextMode = require("./text").Mode;
var Tokenizer = require("../tokenizer").Tokenizer;

var Mode = function() {
    this.$tokenizer = new Tokenizer(new PropertiesHighlightRules().getRules(), "i");
};
oop.inherits(Mode, TextMode);

exports.Mode = Mode;

});


define('ace/mode/properties_highlight_rules', ['require', 'exports', 'module' , 'ace/lib/oop', 'ace/mode/text_highlight_rules'], function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

var PropertiesHighlightRules = function() {
    var identifierRe = "[a-zA-Z\u00a1-\uffff]+\\b";

    this.$rules = {
        "eParserState_AwaitingKey": [
            {token: "empty",   regex: /$/},
            {token: "doc.comment", regex: /^[#!].*$/},
            {token: "text",    regex: /^\s*/, next: "eParserState_Key"}
        ],
        eParserState_Key: [
            {token: "keyword.operator", regex: /\s*[:=]\s*/,
             next: "eParserState_Value"},
            {token: "variable", regex: /.*?(?=\s*[:=])/}
        ],
        eParserState_Value: [
            {token: "empty", regex: /$/, next: "eParserState_AwaitingKey"},
            {token: "text", regex: /.*?(?=\s*$)/, next: "eParserState_PostValue"}
        ],
        eParserState_PostValue: [
            {
                token: "invalid.deprecated", regex: /\s*$/,
                next: "eParserState_AwaitingKey"
            },
            {token: "empty", regex: "", next: "eParserState_AwaitingKey"}
        ],
        eParserState_Comment: [] // handled inline in AwaitingKey
    };
    this.$rules.start = this.$rules.eParserState_AwaitingKey;

    var tokenMap = {
    };

    for (var state in this.$rules) {
        var stateRules = this.$rules[state];
        for (var i = stateRules.length; i--; ) {
            var rule = stateRules[i];
            if (rule.include || typeof rule == "string") {
                var args = [i, 1].concat(this.$rules[rule.include || rule]);
                if (rule.noEscape) {
                    args = args.filter(function(x) {
                        return !x.next;
                    });
                }
                stateRules.splice.apply(stateRules, args);
            } else if (rule.token in tokenMap) {
                rule.token = tokenMap[rule.token];
            }
        }
    }
};
oop.inherits(PropertiesHighlightRules, TextHighlightRules);

exports.HighlightRules = PropertiesHighlightRules;
});
