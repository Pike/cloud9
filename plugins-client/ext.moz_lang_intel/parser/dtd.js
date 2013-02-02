define("ext/moz_lang_intel/parser/dtd", ["require", "exports", "module"], function(require, exports, module) {
    var tree = require("treehugger/tree");
    function parse_dtd(content) {
        var state = 0;
        var State = {
            eWaitingLT: ++state,
            eErrorWaitLT: ++state,
            eInComment: ++state,
            eKey: ++state,
            eWaitingQuote: ++state,
            eValueSingle: ++state,
            eValueDouble: ++state,
            eWaitingGT: ++state
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
        state = State.eWaitingLT;
        var children = [], nd1, nd2, toplevel = [];
        var done = content.length;
        while (ci < done) {
            c = content.charAt(ci);
            switch (state) {
                case State.eWaitingLT:
                    switch (c) {
                        case '<':
                            /*
                             * can be one of
                             * <!ENTITY foo "bar">
                             * <!-- some comment -->
                             * CDATA or PI section would be bad
                             */
                            if (content.substr(ci+1, 7) == "!ENTITY") {
                                if (ci > start) {
                                    nd1 = tree.string(content.slice(start, ci));
                                    annotatePos(nd1, ci);
                                    toplevel.push(tree.cons("Whitespace", [nd1]));
                                    start = ci;
                                }
                                nd1 = tree.string(content.slice(ci, ci+8));
                                ci += 8;
                                annotatePos(nd1, ci);
                                nd2 = tree.cons("EntityPrefix", [nd1]);
                                //console.log(nd2);
                                children.push(nd2);
                                start = ci; // gonna get another increment later
                                state = State.eWaitingKey;
                            }
                            else if (content.substr(ci+1, 3) == "!--") {
                                if (ci > start) {
                                    nd1 = tree.string(content.slice(start, ci));
                                    annotatePos(nd1, ci);
                                    start = ci;
                                    //console.log('precomment white', nd1);
                                    toplevel.push(tree.cons("Whitespace", [nd1]));
                                }
                                ci += 3;
                                //start = ci; // gonna get another increment later
                                state = State.eInComment;
                                //console.log('incomment', content.slice(ci-3, 5));
                                // don't add node, we'll do that later
                            }
                            break;
                        case ' ':
                        case '\n':
                        case '\t':
                        case '\r':
                            // whitespace, that's cool
                            break;
                        default:
                            state = State.eErrorWaitLT;
                            // don't add node, we'll do that later
                    }
                    break;
                case State.eErrorWaitLT:
                    break;
                case State.eWaitingKey:
                    switch (c) {
                        case ' ':
                        case '\n':
                        case '\t':
                        case '\r':
                            // whitespace, pass
                            break;
                        default:
                            // XXX be better, for now, just optimistically start key
                            if (ci > start) {
                                nd1 = tree.string(content.slice(start, ci));
                                annotatePos(nd1, ci);
                                children.push(tree.cons("Whitespace", [nd1]));
                            }
                            state = State.eKey;
                            start = ci;
                    }
                    break;
                case State.eKey:
                    switch (c) {
                        case ' ':
                        case '\n':
                        case '\t':
                        case '\r':
                            nd1 = tree.string(content.slice(start, ci));
                            annotatePos(nd1, ci);
                            nd2 = tree.cons("Key", [nd1]);
                            //console.log(nd2);
                            children.push(nd2);
                            state = State.eWaitingQuote;
                            start = ci;
                            break;
                    }
                    break;
                case State.eWaitingQuote:
                    switch (c) {
                        case ' ':
                        case '\n':
                        case '\t':
                        case '\r':
                            break;
                        case '"':
                        case "'":
                            if (ci > start) {
                                nd1 = tree.string(content.slice(start, ci));
                                annotatePos(nd1, ci);
                                start = ci;
                                children.push(tree.cons("Whitespace", [nd1]));
                            }
                            nd1 = tree.string(c);
                            ci += 1;
                            annotatePos(nd1, ci);
                            start = ci;
                            children.push(tree.cons((c=='"' ? "Double" : "Single") + "quote", [nd1]));
                            state = c=='"' ? State.eValueDouble : State.eValueSingle;
                    }
                    break;
                case State.eValueSingle:
                case State.eValueDouble:
                    switch (c) {
                        case '"':
                            if (state === State.eValueDouble) {
                                nd1 = tree.string(content.slice(start, ci));
                                annotatePos(nd1, ci);
                                start = ci;
                                children.push(tree.cons("Value", [nd1]));
                                nd1 = tree.string(c);
                                annotatePos(nd1, ci+1);
                                start = ci;
                                children.push(tree.cons((state === State.eValueDouble ? "Double" : "Single") + "quote", [nd1]));
                                state = State.eWaitingGT;
                            }
                    }
                    break;
                case State.eWaitingGT:
                    switch (c) {
                        case ' ':
                        case '\n':
                        case '\t':
                        case '\r':
                            break;
                        case '>':
                            if (ci > start + 1) {
                                nd1 = tree.string(content.slice(start, ci));
                                annotatePos(nd1, ci);
                                start = ci - 1;
                                children.push(tree.cons("Whitespace", [nd1]));
                            }
                            nd1 = tree.string(c);
                            annotatePos(nd1, ci);
                            start = ci;
                            nd2 = tree.cons("EntityPostfix", [nd1]);
                            //console.log(nd2);
                            children.push(nd2);
                            toplevel.push(tree.cons("Entity", children));
                            //console.log(children);
                            children = [];
                            state = State.eWaitingLT;
                    }
                    break;
                case State.eInComment:
                    if (c === '-' && content.substr(ci, 3) === '-->') {
                        ci += 2
                        nd1 = tree.string(content.slice(start, ci+1));
                        annotatePos(nd1, ci+1);
                        children.push(tree.cons("Comment", [nd1]));
                        //console.log('comment content', nd1);
                        state = State.eWaitingLT;
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
                break;
        }
        var node = tree.cons("Dtd", toplevel);
        return node;
    }
    return parse_dtd;
});
