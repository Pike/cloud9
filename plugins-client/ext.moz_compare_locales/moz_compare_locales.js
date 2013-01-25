/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This extension runs compare-locales or -dirs server side,
 * and displays the results in a panel.
 */

define(function(require, exports, module) {
    /*global barTools,winComparePanel,colLeft*/

    var ext = require("core/ext");
    var ide = require("core/ide");
    var settings = require("core/settings");
    var editors = require("ext/editors/editors");
    var fs = require("ext/filesystem/filesystem");
    var menus = require("ext/menus/menus");
    var panels = require("ext/panels/panels");

    var commands = require("./commands");
    var markup = require("text!ext/moz_compare_locales/panel.xml");
    var updateModel = require("./model").updateModel;

    module.exports = ext.register("ext/moz_compare_locales/moz_compare_locales", {
        dev: "mozilla.org",
        name: "CompareLocales",
        alone: true,
        type: ext.GENERAL,
        deps: [fs],
        markup: markup,
        visible: true,

        defaultWidth: 250,

        model: new apf.model(),

        updateModel: function(locale, details) {
            updateModel(this.model, locale, details);
        },

        open: function(grid) {
            var s = grid.selected;
            if (s.nodeName != 'file') {
                return;
            }
            var segs = s.getAttribute('path').split('/'),
                parent = s;
            while ((parent = parent.parentNode) && parent.nodeName == 'dir') {
                segs = parent.getAttribute('path').split('/').concat(segs);
            }
            segs.unshift('workspace');
            segs.unshift('');
            var path = segs.join('/');
            var webdav = fs.webdav;
            if (!webdav) {
                // we don't have a connection to the server,
                // let's just try and see how this goes
                editors.gotoDocument({
                    path: path
                });
                return;
            }
            // make sure the file exists, and create it if not
            // then gotoDocument.
            exists(segs.length);

            function exists(slice) {
                var p = segs.slice(0, slice).join('/');
                webdav.exists(p, function(doesExist) {
                    if (doesExist) {
                        console.log(p, 'exists');
                        createDirsAndFile(slice);
                    }
                    else {
                        if (slice <= 0) {
                            console.log('bad bunny');
                            return;
                        }
                        exists(slice - 1);
                    }
                });
            }

            function createDirsAndFile(slice) {
                var i, ii = segs.length;
                if (slice == segs.length) {
                    editors.gotoDocument({
                        path: path
                    });
                    return;
                }
                var bp = segs.slice(0, slice).join('/');
                if (slice == segs.length - 1) {
                    console.log('create file', segs[slice], 'in', bp);
                    webdav.exec('create', [bp, segs[slice]], function(data) {
                        createDirsAndFile(slice + 1);
                    });
                    return;
                }
                console.log('create dir', segs[slice], 'in', bp);
                webdav.exec('mkdir', [bp, segs[slice]], function(data) {
                    createDirsAndFile(slice + 1);
                });
            }
        },

        nodes: [],

        init: function(amlNode) {
            var self = this;
            this.nodes.push(
            menus.$insertByIndex(barTools, new apf.button({
                skin: "c9-toolbarbutton-glossy",
                tooltip: "Compare",
                caption: "Compare",
                onclick: function() {
                    self.compare();
                }
            })), 20);
            this.panel = winComparePanel;
            this.nodes.push(winComparePanel);
            ide.addEventListener("socketMessage", function(e) {
                return self.$onMessage(e);
            });

            function onSettings(e) {
                var setLocale = settings.model.queryValue("moz/project/@locale") || null;
                var setIni = settings.model.queryValue("moz/project/@ini") || null;
                var setBase;
                var doCompare = false;
                if (setIni) {
                    if (setIni != self.ini) {
                        self.ini = setIni;
                        doCompare = true;
                    }
                    setBase = settings.model.queryValue("moz/project/@l10nbase");
                    if (setBase != self.l10nbase) {
                        self.l10nbase = setBase;
                        doCompare = true;
                    }
                }
                if (setBase && setBase != self.l10nbase) {
                    self.l10nbase = setBase;
                    doCompare = true;
                }
                if (setLocale && setLocale != self.locale) {
                    self.locale = setLocale;
                    console.log('onSettings', e.name, self.locale);
                    doCompare = true;
                }
                if (doCompare) {
                    self.compare();
                }
            }
            ide.addEventListener("settings.load", onSettings);
            ide.addEventListener("settings.save", onSettings);
            ide.addEventListener("fs.afterfilesave", function(e) {
                if (e.success && self.locale) {
                    self.compare();
                }
            });
        },

        hook: function() {
            commands.hook();
            this.markupInsertionPoint = colLeft;
            panels.register(this, {
                position: 20000,
                caption: "compare-locales",
                "class": "rundebug",
                command: "compare_locales"
            });
            ext.initExtension(this);
        },

        enable: function() {
            this.nodes.each(function(item) {
                item.enable();
            });
        },

        disable: function() {
            this.nodes.each(function(item) {
                item.disable();
            });
        },

        destroy: function() {
            this.nodes.each(function(item) {
                item.destroy(true, true);
            });
            this.nodes = [];
        },

        closeExtensionTemplateWindow: function() {
            this.winExtensionTemplate.hide();
        },

        compare: function() {
            var cmd, argv;
            if (this.ini) {
                cmd = "moz_compare_locales";
                argv = [this.ini, this.l10nbase, this.locale];
            }
            else {
                cmd = "moz_compare_dirs";
                argv = ['en-US', this.locale];
            }
            ide.send({
                command: cmd,
                argv: argv,
                cwd: "/",
                sender: "compare-locales-client"
            });
        },

        $onMessage: function(e) {
            var message = e.message;
            if (message.type != "servermessage") return false;
            var base = this.l10nbase ? this.l10nbase: this.locale;
            updateModel(this.model, base, message.result.details);
            e.stop();
            return true;
        }
    });

});