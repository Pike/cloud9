define("ext/moz_lang_intel/parser/properties", ["require", "exports", "module"], function(require, exports, module) {
    var tree = require("treehugger/tree");
    function parse_properties(content) {
        var state = 0;
        var State = {
            eWaitingKey: ++state,
            eParsingComment: ++state,
            eParsingKey: ++state,
            eWaitingValue: ++state,
            eValue: ++state
        };
        var c, ci = 0, start = 0, end = 0;
        var startline = 0, currentline = 0;
        var startoffset = 0, currentoffset = 0;
        function annotatePos(node, endpos) {
            node.setAnnotation('pos',
                {
                    sl: startline,
                    sc: start - startoffset - 1,
                    el: currentline,
                    ec: endpos - currentoffset - 1
            });
            startline = currentline;
            startoffset = currentoffset;
        }
        state = State.eWaitingKey;
        var children = [], nd1, nd2, toplevel = [];
        var done = content.length;
        while (ci < done) {
            c = content.charAt(ci);
            switch (state) {
                case State.eWaitingKey:
                    switch (c) {
                        case '#':
                        case '!':
                            if (ci > start) {
                                nd1 = tree.string(content.slice(start, ci));
                                annotatePos(nd1, ci);
                                toplevel.push(tree.cons("Whitespace", [nd1]));
                                start = ci;
                            }
                            state = State.eParsingComment;
                            break;
                        case '\n':
                        case ' ':
                        case '\t':
                            break;
                        default:
                            if (ci > start) {
                                nd1 = tree.string(content.slice(start, ci));
                                annotatePos(nd1, ci);
                                toplevel.push(tree.cons("Whitespace", [nd1]));
                                start = ci;
                            }
                            state = State.eParsingKey;
                    }
                    break;
                case State.eParsingComment:
                    switch (c) {
                        case '\n':
                            nd1 = tree.string(content.slice(start, ci));
                            annotatePos(nd1, ci);
                            toplevel.push(tree.cons("Comment", [nd1]));
                            start = ci;
                            state = State.eWaitingKey;
                    }
                    break;
                case State.eParsingKey:
                    switch (c) {
                        case ':':
                        case '=':
                            // skip trailing whitespace
                            end = ci;
                            while (--end > start && (c = content.charAt(end)) &&
                                   (c == ' ') || (c == '\t')) {}
                            nd1 = tree.string(content.slice(start, end + 1));
                            annotatePos(nd1, end + 1);
                            children.push(tree.cons("Key", [nd1]));
                            start = end + 1;
                            state = State.eWaitingValue;
                    }
                    break;
                case State.eWaitingValue:
                    switch (c) {
                        case ' ':
                        case '\t':
                            break;
                        default:
                            nd1 = tree.string(content.slice(start, ci));
                            children.push(tree.cons('Separator', [nd1]));
                            if (c == '\n') {
                                // empty value
                                nd1 = tree.string('');
                                annotatePos(nd1, ci);
                                children.push(tree.cons('Value', [nd1]));
                                nd1 = tree.cons('Entity', children);
                                children = [];
                                toplevel.push(nd1);
                                state = State.eWaitingKey;
                            }
                            else {
                                state = State.eValue;
                            }
                            start = ci;
                    }
                    break;
                case State.eValue:
                    switch (c) {
                        case '\n':
                            // XXX totally do more here
                            nd1 = tree.string(content.slice(start, ci));
                            annotatePos(nd1, ci);
                            children.push(tree.cons('Value', [nd1]));
                            toplevel.push(tree.cons('Entity', children));
                            children = [];
                            start = ci;
                            state = State.eWaitingKey;
                    }
                    break;
            }
            if (c == '\n') {
                ++currentline;
                currentoffset = ci;
            }
            ++ci;
        }
        // wrap up at end of file
        switch (state) {
            case State.eValue:
                nd1 = tree.string(content.slice(start, ci));
                annotatePos(nd1, ci);
                children.push(tree.cons('Value', [nd1]));
                toplevel.push(tree.cons('Entity', children));
                break;
        }
        var node = tree.cons("Properties", toplevel);
        return node;
    }
    return parse_properties;
});
