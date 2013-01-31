/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(function(require, exports, module) {
    var ide = require("core/ide");
    var settings = require("core/settings");
    var commands = require("ext/commands/commands");
    var c9console = require("ext/console/console");

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
        var argv = command.argv, s=settings, ini, localedir;
        switch (argv.length) {
            case 1:
                c9console.write("not enough params", command);
                break;
            case 2:
                s.model.setQueryValue("moz/project/@locale", argv[1]);
                s.save(true);
                c9console.write("set up l10n project with compare-dirs", command);
                break;
            default:
                ini = argv[1];
                localedir = argv[2].split('/');
                s.model.setQueryValue("moz/project/@ini", ini);
                s.model.setQueryValue("moz/project/@locale", localedir.pop());
                s.model.setQueryValue("moz/project/@l10nbase",
                                      localedir.join("/"));
                s.save(true);
                c9console.write("set up l10n project with compare-locales and langpack", command);
        }
    }


    var mozSettings = {};
    function onSettings(e) {
        var setLocale = settings.model.queryValue("moz/project/@locale") || null;
        var setIni = settings.model.queryValue("moz/project/@ini") || null;
        var setBase;
        var dispatchEvent = false;
        if (setIni) {
            if (setIni != mozSettings.ini) {
                mozSettings.ini = setIni;
                dispatchEvent = true;
            }
            setBase = settings.model.queryValue("moz/project/@l10nbase");
            if (setBase != mozSettings.l10nbase) {
                mozSettings.l10nbase = setBase;
                dispatchEvent = true;
            }
        }
        if (setBase && setBase != mozSettings.l10nbase) {
            mozSettings.l10nbase = setBase;
            dispatchEvent = true;
        }
        if (setLocale && setLocale != mozSettings.locale) {
            mozSettings.locale = setLocale;
            dispatchEvent = true;
        }
        if (dispatchEvent) {
            ide.dispatchEvent('moz:settings', mozSettings);
        }
    }
    ide.addEventListener("extload", bootstrapsettings);
    function bootstrapsettings() {
        ide.addEventListener("settings.load", onSettings);
        ide.addEventListener("settings.save", onSettings);
        onSettings();
        ide.removeEventListener("extload", bootstrapsettings);
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
