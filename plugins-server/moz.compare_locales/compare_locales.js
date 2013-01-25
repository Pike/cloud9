var util = require("util");

var Plugin = require("../cloud9.core/plugin");
var FilelistLib = require("../cloud9.ide.filelist/filelist");
var Diff_Match_Patch = require("../cloud9.ide.revisions/diff_match_patch");
var Diff = new Diff_Match_Patch();
var diff = require("./diff");
var Tree = require("./tree");

var ProcessManager;
var EventBus;
var Vfs;

var name = "compare_locales";

module.exports = function setup(options, imports, register) {
    ProcessManager = imports["process-manager"];
    EventBus = imports.eventbus;
    imports.ide.register(name, CompareLocalesPlugin, register);
    Vfs = imports.vfs;
};

var CompareLocalesPlugin = function(ide) {
    this.ide   = ide;
    this.hooks = ["command"];
    this.processCount = 0;
    this.pm = ProcessManager;
    this.eventbus = EventBus;
};

util.inherits(CompareLocalesPlugin, Plugin);

(function() {
    this.command = function(user, message, client) {
        if (message.command.indexOf("moz_compare_") !== 0)
            return false;
        var cmd = 'compare-' + message.command.substr(12);
        this.client = client;
        var self = this, stdout = '';
        console.log('cmd called', message);
        this.pm.spawn("shell", {
            command: cmd,
            args: ['--data'].concat(message.argv),
            cwd: this.ide.workspace.workspaceDir,
            encoding: "utf8"
            }, "spawn::compare-result", function(err, pid) {
                if (err) {
                    client.send(err, "Could not spawn process for " + client);
                    console.error(err);
                }
        });
        function onEventBus(msg) {
            //console.log(msg);
            var result = {};
            if (msg.type == "shell-start")
                self.processCount += 1;
            else if (msg.type == "shell-exit") {
                self.processCount -= 1;
                try {
                    result = JSON.parse(stdout);
                } catch (e) {
                    console.error(e);
                    console.log(stdout);
                }
                var clientmsg = {
                    type: 'servermessage',
                    subtype: 'moz:compare-result',
                    result: result
                };
                self.client.send(JSON.stringify(clientmsg), self.name);
                self.eventbus.removeListener('spawn::compare-result',
                    onEventBus);
            }
            else if (msg.stream == "stdout" && msg.data) {
                stdout += msg.data;
            }
        }
        
        this.eventbus.on("spawn::compare-result", onEventBus);
        return true;
    };
}).call(CompareLocalesPlugin.prototype);
