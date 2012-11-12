/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(function(require, exports, module) {
    var commands = require("ext/commands/commands");
    var console = require("ext/console/console");
    var settings = require("core/settings");

    exports.hook = function() {
        commands.addCommand({
            name: "l10nproject",
            hint: "Configure l10n project: locale [l10n.ini]",
            exec: cmdL10nProject,
            msg: [],
            isAvailable: function() {return true;}
        });
        commands.addCommand({
            name: "nextAnno",
            bindKey: {mac: "Ctrl-Down", win: "Ctrl-Down"},
            exec: cmdGoToNextAnnotation,
            isAvailable: function() {return true;}
        });
        commands.addCommand({
            name: "previousAnno",
            bindKey: {mac: "Ctrl-Up", win: "Ctrl-Up"},
            exec: cmdGoToPreviousAnnotation,
            isAvailable: function() {return true;}
        });
    };
    
    function cmdL10nProject(editor, command) {
        var argv = command.argv, s=settings, node;
        switch (argv.length) {
            case 1:
                console.write("not enough params", command);
                break;
            case 2:
                s.model.setQueryValue("moz/project/@locale", argv[1]);
                s.save(true);
                console.write("set up l10n project with compare-dirs", command);
                break;
            default:
                console.write("set up l10n project with compare-locales and langpack", command);
        }
    }
    
    function cmdGoToNextAnnotation(editor) {
        var cursor = editor.getSelection().getCursor();
        var annos = editor.getDocument().getAnnotations();
        var i = 0, ii = annos.length, rowtogo;
        for (; i < ii; ++i) {
            if (cursor.row < annos[i].row) {
                rowtogo = annos[i].row;
                break;
            }
        }
        if (rowtogo !== undefined) {
            editor.getSelection().moveCursorTo(rowtogo, 0);
            editor.getSelection().selectTo(rowtogo, 0);
        }
    }
    
    function cmdGoToPreviousAnnotation(editor) {
        var cursor = editor.getSelection().getCursor();
        var annos = editor.getDocument().getAnnotations();
        var i = annos.length - 1, rowtogo;
        for (; i >= 0; --i) {
            if (cursor.row > annos[i].row) {
                rowtogo = annos[i].row;
                break;
            }
        }
        if (rowtogo !== undefined) {
            editor.getSelection().selectTo(rowtogo, 0);
            editor.getSelection().moveCursorTo(rowtogo, 0);
        }
    }

});
