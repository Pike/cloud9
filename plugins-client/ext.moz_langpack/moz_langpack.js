/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This extension builds language packs if files are saved,
 * and updates a button to download them.
 */

define(function(require, exports, module) {
    /*global barTools, InstallTrigger */

    var ide = require("core/ide");
    var ext = require("core/ext");
    var fs = require("ext/filesystem/filesystem");
    var menus = require("ext/menus/menus");


    module.exports = ext.register("ext/moz_langpack/moz_langpack", {
        dev: "mozilla.org",
        name: "Language Pack Builder",
        alone: true,
        type: ext.GENERAL,
        deps: [fs],
        nodes: [],

        init: function(amlNode) {
            var self = this;
            this.nodes.push(
            menus.$insertByIndex(barTools, new apf.button({
                skin: "c9-toolbarbutton-glossy",
                tooltip: "Install Language Pack",
                caption: "LangPack",
                onclick: function() {
                    self.maybeBuild();
                }
            })), 20);
        },

        hook: function() {
            var self = this;
            this.cmd_id = 0;
            ide.addEventListener("socketMessage", this.$message.bind(this));
            ide.addEventListener("moz:settings", function(e) {
                self.locale = e.locale;
                self.l10nbase = e.l10nbase;
                self.ini = e.ini;
                console.log('langpack set up');
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

        maybeBuild: function() {
            this.nodes[0].setAttribute("caption", "Building.");
            this.nextProcess = this.doLanguagePack.bind(this);
            this.dispatchCommand(["make", "merge-" + this.locale,
                                  "LOCALE_MERGEDIR=$PWD/mool"]);
        },
        
        doLanguagePack: function(e) {
            this.nodes[0].setAttribute("caption", "Building..");
            this.nextProcess = this.installLanguagePack.bind(this);
            this.dispatchCommand(["make", "langpack-" + this.locale,
                                  "LANGPACK_FILE=$PWD/../../langpack.xpi",
                                  "LOCALE_MERGEDIR=$PWD/mool"]);
        },
        
        installLanguagePack: function(e) {
            this.nodes[0].setAttribute("caption", "Language Pack");
            InstallTrigger.install({
                "Language Pack": ide.davPrefix + "/.build/langpack.xpi"
            });
            delete this.nextProcess;
        },

        dispatchCommand: function(argv) {
            ide.send({
                command: "make",
                argv: argv,
                line: argv.join(" "),
                cwd: ide.workspaceDir + "/.build/browser/locales",
                requireshandling: true,
                extra: {
                    langpack_command_id: ++this.cmd_id,
                    original_line: argv.join(" ")
                }
            });
        },
        
        $message: function(e) {
            if (this.nextProcess === undefined) return;
            var msg = e.message;
            if (msg.type !== "npm-module-exit") return;
            if (msg.extra === undefined) return;
            if (msg.extra.langpack_command_id === undefined) return;
            this.nextProcess(e);
        }
    });

});
