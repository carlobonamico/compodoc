'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var fs = require('fs-extra');
var path = require('path');
var _ = require('lodash');
var LiveServer = require('live-server');
var Handlebars = require('handlebars');
var util = require('util');
var ts = require('typescript');

function __extends(d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var gutil = require('gulp-util');
var c = gutil.colors;
var pkg$1 = require('../package.json');
var LEVEL;
(function (LEVEL) {
    LEVEL[LEVEL["INFO"] = 0] = "INFO";
    LEVEL[LEVEL["DEBUG"] = 1] = "DEBUG";
    LEVEL[LEVEL["ERROR"] = 2] = "ERROR";
    LEVEL[LEVEL["WARN"] = 3] = "WARN";
})(LEVEL || (LEVEL = {}));
var Logger = (function () {
    function Logger() {
        this.name = pkg$1.name;
        this.version = pkg$1.version;
        this.logger = gutil.log;
        this.silent = true;
    }
    Logger.prototype.info = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (!this.silent)
            return;
        this.logger(this.format.apply(this, [LEVEL.INFO].concat(args)));
    };
    Logger.prototype.error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (!this.silent)
            return;
        this.logger(this.format.apply(this, [LEVEL.ERROR].concat(args)));
    };
    Logger.prototype.warn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (!this.silent)
            return;
        this.logger(this.format.apply(this, [LEVEL.WARN].concat(args)));
    };
    Logger.prototype.debug = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (!this.silent)
            return;
        this.logger(this.format.apply(this, [LEVEL.DEBUG].concat(args)));
    };
    Logger.prototype.format = function (level) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var pad = function (s, l, c) {
            if (c === void 0) { c = ''; }
            return s + Array(Math.max(0, l - s.length + 1)).join(c);
        };
        var msg = args.join(' ');
        if (args.length > 1) {
            msg = pad(args.shift(), 15, ' ') + ": " + args.join(' ');
        }
        switch (level) {
            case LEVEL.INFO:
                msg = c.green(msg);
                break;
            case LEVEL.DEBUG:
                msg = c.cyan(msg);
                break;
            case LEVEL.WARN:
                msg = c.yellow(msg);
                break;
            case LEVEL.ERROR:
                msg = c.red(msg);
                break;
        }
        return [
            msg
        ].join('');
    };
    return Logger;
}());
var logger = new Logger();

var AngularAPIs = require('../src/data/api-list.json');
function finderInAngularAPIs(type) {
    var _result = {
        source: 'external',
        data: null
    };
    _.forEach(AngularAPIs, function (angularModuleAPIs, angularModule) {
        var i = 0, len = angularModuleAPIs.length;
        for (i; i < len; i++) {
            if (angularModuleAPIs[i].title === type) {
                _result.data = angularModuleAPIs[i];
            }
        }
    });
    return _result;
}

var DependenciesEngine = (function () {
    function DependenciesEngine() {
        if (DependenciesEngine._instance) {
            throw new Error('Error: Instantiation failed: Use DependenciesEngine.getInstance() instead of new.');
        }
        DependenciesEngine._instance = this;
    }
    DependenciesEngine.getInstance = function () {
        return DependenciesEngine._instance;
    };
    DependenciesEngine.prototype.cleanModules = function (modules) {
        var _m = modules, i = 0, len = modules.length;
        for (i; i < len; i++) {
            var j = 0, leng = _m[i].declarations.length;
            for (j; j < leng; j++) {
                var k = 0, lengt = void 0;
                if (_m[i].declarations[j].jsdoctags) {
                    lengt = _m[i].declarations[j].jsdoctags.length;
                    for (k; k < lengt; k++) {
                        delete _m[i].declarations[j].jsdoctags[k].parent;
                    }
                }
            }
        }
        return _m;
    };
    DependenciesEngine.prototype.init = function (data) {
        this.rawData = data;
        this.modules = _.sortBy(this.rawData.modules, ['name']);
        this.rawModulesForOverview = _.sortBy(_.cloneDeep(this.cleanModules(data.modules)), ['name']);
        this.rawModules = _.sortBy(_.cloneDeep(this.cleanModules(data.modules)), ['name']);
        this.components = _.sortBy(this.rawData.components, ['name']);
        this.directives = _.sortBy(this.rawData.directives, ['name']);
        this.injectables = _.sortBy(this.rawData.injectables, ['name']);
        this.interfaces = _.sortBy(this.rawData.interfaces, ['name']);
        this.pipes = _.sortBy(this.rawData.pipes, ['name']);
        this.classes = _.sortBy(this.rawData.classes, ['name']);
        this.miscellaneous = this.rawData.miscellaneous;
        this.prepareMiscellaneous();
        this.routes = this.rawData.routesTree;
        this.cleanRawModulesForOverview();
    };
    DependenciesEngine.prototype.find = function (type) {
        var finderInCompodocDependencies = function (data) {
            var _result = {
                source: 'internal',
                data: null
            }, i = 0, len = data.length;
            for (i; i < len; i++) {
                if (typeof type !== 'undefined') {
                    if (type.indexOf(data[i].name) !== -1) {
                        _result.data = data[i];
                    }
                }
            }
            return _result;
        }, resultInCompodocInjectables = finderInCompodocDependencies(this.injectables), resultInCompodocInterfaces = finderInCompodocDependencies(this.interfaces), resultInCompodocClasses = finderInCompodocDependencies(this.classes), resultInCompodocComponents = finderInCompodocDependencies(this.components), resultInAngularAPIs = finderInAngularAPIs(type);
        if (resultInCompodocInjectables.data !== null) {
            return resultInCompodocInjectables;
        }
        else if (resultInCompodocInterfaces.data !== null) {
            return resultInCompodocInterfaces;
        }
        else if (resultInCompodocClasses.data !== null) {
            return resultInCompodocClasses;
        }
        else if (resultInCompodocComponents.data !== null) {
            return resultInCompodocComponents;
        }
        else if (resultInAngularAPIs.data !== null) {
            return resultInAngularAPIs;
        }
    };
    DependenciesEngine.prototype.update = function (updatedData) {
        var _this = this;
        if (updatedData.modules.length > 0) {
            _.forEach(updatedData.modules, function (module) {
                var _index = _.findIndex(_this.modules, { 'name': module.name });
                _this.modules[_index] = module;
            });
        }
        if (updatedData.components.length > 0) {
            _.forEach(updatedData.components, function (component) {
                var _index = _.findIndex(_this.components, { 'name': component.name });
                _this.components[_index] = component;
            });
        }
        if (updatedData.directives.length > 0) {
            _.forEach(updatedData.directives, function (directive) {
                var _index = _.findIndex(_this.directives, { 'name': directive.name });
                _this.directives[_index] = directive;
            });
        }
        if (updatedData.injectables.length > 0) {
            _.forEach(updatedData.injectables, function (injectable) {
                var _index = _.findIndex(_this.injectables, { 'name': injectable.name });
                _this.injectables[_index] = injectable;
            });
        }
        if (updatedData.interfaces.length > 0) {
            _.forEach(updatedData.interfaces, function (int) {
                var _index = _.findIndex(_this.interfaces, { 'name': int.name });
                _this.interfaces[_index] = int;
            });
        }
        if (updatedData.pipes.length > 0) {
            _.forEach(updatedData.pipes, function (pipe) {
                var _index = _.findIndex(_this.pipes, { 'name': pipe.name });
                _this.pipes[_index] = pipe;
            });
        }
        if (updatedData.classes.length > 0) {
            _.forEach(updatedData.classes, function (classe) {
                var _index = _.findIndex(_this.classes, { 'name': classe.name });
                _this.classes[_index] = classe;
            });
        }
    };
    DependenciesEngine.prototype.findInCompodoc = function (name) {
        var mergedData = _.concat([], this.modules, this.components, this.directives, this.injectables, this.interfaces, this.pipes, this.classes), result = _.find(mergedData, { 'name': name });
        return result || false;
    };
    DependenciesEngine.prototype.cleanRawModulesForOverview = function () {
        _.forEach(this.rawModulesForOverview, function (module) {
            module.declarations = [];
            module.providers = [];
        });
    };
    DependenciesEngine.prototype.prepareMiscellaneous = function () {
        //group each subgoup by file
        this.miscellaneous.groupedVariables = _.groupBy(this.miscellaneous.variables, 'file');
        this.miscellaneous.groupedFunctions = _.groupBy(this.miscellaneous.functions, 'file');
        this.miscellaneous.groupedEnumerations = _.groupBy(this.miscellaneous.enumerations, 'file');
    };
    DependenciesEngine.prototype.getModule = function (name) {
        return _.find(this.modules, ['name', name]);
    };
    DependenciesEngine.prototype.getRawModule = function (name) {
        return _.find(this.rawModules, ['name', name]);
    };
    DependenciesEngine.prototype.getModules = function () {
        return this.modules;
    };
    DependenciesEngine.prototype.getComponents = function () {
        return this.components;
    };
    DependenciesEngine.prototype.getDirectives = function () {
        return this.directives;
    };
    DependenciesEngine.prototype.getInjectables = function () {
        return this.injectables;
    };
    DependenciesEngine.prototype.getInterfaces = function () {
        return this.interfaces;
    };
    DependenciesEngine.prototype.getRoutes = function () {
        return this.routes;
    };
    DependenciesEngine.prototype.getPipes = function () {
        return this.pipes;
    };
    DependenciesEngine.prototype.getClasses = function () {
        return this.classes;
    };
    DependenciesEngine.prototype.getMiscellaneous = function () {
        return this.miscellaneous;
    };
    return DependenciesEngine;
}());
DependenciesEngine._instance = new DependenciesEngine();

var $dependenciesEngine = DependenciesEngine.getInstance();

function extractLeadingText(string, completeTag) {
    var tagIndex = string.indexOf(completeTag);
    var leadingText = null;
    var leadingTextRegExp = /\[(.+?)\]/g;
    var leadingTextInfo = leadingTextRegExp.exec(string);
    // did we find leading text, and if so, does it immediately precede the tag?
    while (leadingTextInfo && leadingTextInfo.length) {
        if (leadingTextInfo.index + leadingTextInfo[0].length === tagIndex) {
            string = string.replace(leadingTextInfo[0], '');
            leadingText = leadingTextInfo[1];
            break;
        }
        leadingTextInfo = leadingTextRegExp.exec(string);
    }
    return {
        leadingText: leadingText,
        string: string
    };
}
function splitLinkText(text) {
    var linkText;
    var target;
    var splitIndex;
    // if a pipe is not present, we split on the first space
    splitIndex = text.indexOf('|');
    if (splitIndex === -1) {
        splitIndex = text.search(/\s/);
    }
    if (splitIndex !== -1) {
        linkText = text.substr(splitIndex + 1);
        // Normalize subsequent newlines to a single space.
        linkText = linkText.replace(/\n+/, ' ');
        target = text.substr(0, splitIndex);
    }
    return {
        linkText: linkText,
        target: target || text
    };
}
var LinkParser = (function () {
    var processTheLink = function (string, tagInfo) {
        var leading = extractLeadingText(string, tagInfo.completeTag), linkText = leading.leadingText || '', split, target, stringtoReplace;
        split = splitLinkText(tagInfo.text);
        target = split.target;
        if (leading.leadingText !== null) {
            stringtoReplace = '[' + leading.leadingText + ']' + tagInfo.completeTag;
        }
        else if (typeof split.linkText !== 'undefined') {
            stringtoReplace = tagInfo.completeTag;
            linkText = split.linkText;
        }
        return string.replace(stringtoReplace, '[' + linkText + '](' + target + ')');
    };
    /**
     * Convert
     * {@link http://www.google.com|Google} or {@link https://github.com GitHub} to [Github](https://github.com)
     */
    var replaceLinkTag = function (str) {
        var tagRegExp = new RegExp('\\{@link\\s+((?:.|\n)+?)\\}', 'i'), matches, previousString, tagInfo = [];
        function replaceMatch(replacer, tag, match, text) {
            var matchedTag = {
                completeTag: match,
                tag: tag,
                text: text
            };
            tagInfo.push(matchedTag);
            return replacer(str, matchedTag);
        }
        do {
            matches = tagRegExp.exec(str);
            if (matches) {
                previousString = str;
                str = replaceMatch(processTheLink, 'link', matches[0], matches[1]);
            }
        } while (matches && previousString !== str);
        return {
            newString: str
        };
    };
    var _resolveLinks = function (str) {
        return replaceLinkTag(str).newString;
    };
    return {
        resolveLinks: _resolveLinks
    };
})();

var COMPODOC_DEFAULTS = {
    title: 'Application documentation',
    additionalEntryName: 'Additional documentation',
    additionalEntryPath: 'additional-documentation',
    folder: './documentation/',
    port: 8080,
    theme: 'gitbook',
    base: '/',
    defaultCoverageThreshold: 70,
    disableSourceCode: false,
    disableGraph: false,
    disableCoverage: false,
    disablePrivateOrInternalSupport: false,
    PAGE_TYPES: {
        ROOT: 'root',
        INTERNAL: 'internal'
    }
};

var Configuration = (function () {
    function Configuration() {
        this._pages = [];
        this._mainData = {
            output: COMPODOC_DEFAULTS.folder,
            theme: COMPODOC_DEFAULTS.theme,
            extTheme: '',
            serve: false,
            port: COMPODOC_DEFAULTS.port,
            open: false,
            assetsFolder: '',
            documentationMainName: COMPODOC_DEFAULTS.title,
            documentationMainDescription: '',
            base: COMPODOC_DEFAULTS.base,
            hideGenerator: false,
            modules: [],
            readme: '',
            additionalPages: [],
            pipes: [],
            classes: [],
            interfaces: [],
            components: [],
            directives: [],
            injectables: [],
            miscellaneous: [],
            routes: [],
            tsconfig: '',
            toggleMenuItems: [],
            includes: '',
            includesName: COMPODOC_DEFAULTS.additionalEntryName,
            includesFolder: COMPODOC_DEFAULTS.additionalEntryPath,
            disableSourceCode: COMPODOC_DEFAULTS.disableSourceCode,
            disableGraph: COMPODOC_DEFAULTS.disableGraph,
            disableCoverage: COMPODOC_DEFAULTS.disableCoverage,
            disablePrivateOrInternalSupport: COMPODOC_DEFAULTS.disablePrivateOrInternalSupport,
            watch: false,
            mainGraph: '',
            coverageTest: false,
            coverageTestThreshold: COMPODOC_DEFAULTS.defaultCoverageThreshold,
            routesLength: 0,
            angularVersion: ''
        };
        if (Configuration._instance) {
            throw new Error('Error: Instantiation failed: Use Configuration.getInstance() instead of new.');
        }
        Configuration._instance = this;
    }
    Configuration.getInstance = function () {
        return Configuration._instance;
    };
    Configuration.prototype.addPage = function (page) {
        this._pages.push(page);
    };
    Configuration.prototype.addAdditionalPage = function (page) {
        this._mainData.additionalPages.push(page);
    };
    Configuration.prototype.resetPages = function () {
        this._pages = [];
    };
    Configuration.prototype.resetAdditionalPages = function () {
        this._mainData.additionalPages = [];
    };
    Object.defineProperty(Configuration.prototype, "pages", {
        get: function () {
            return this._pages;
        },
        set: function (pages) {
            this._pages = [];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Configuration.prototype, "mainData", {
        get: function () {
            return this._mainData;
        },
        set: function (data) {
            Object.assign(this._mainData, data);
        },
        enumerable: true,
        configurable: true
    });
    return Configuration;
}());
Configuration._instance = new Configuration();

var semver = require('semver');
function cleanVersion(version) {
    return version.replace('~', '')
        .replace('^', '')
        .replace('=', '')
        .replace('<', '')
        .replace('>', '');
}
function getAngularVersionOfProject(packageData) {
    var _result = '';
    if (packageData['dependencies']) {
        var angularCore = packageData['dependencies']['@angular/core'];
        if (angularCore) {
            _result = cleanVersion(angularCore);
        }
    }
    return _result;
}
function isAngularVersionArchived(version) {
    var result;
    try {
        result = semver.compare(version, '2.4.10') <= 0;
    }
    catch (e) { }
    return result;
}
function prefixOfficialDoc(version) {
    return isAngularVersionArchived(version) ? 'v2.' : '';
}

var HtmlEngineHelpers = (function () {
    var init = function () {
        //TODO use this instead : https://github.com/assemble/handlebars-helpers
        Handlebars.registerHelper("compare", function (a, operator, b, options) {
            if (arguments.length < 4) {
                throw new Error('handlebars Helper {{compare}} expects 4 arguments');
            }
            var result;
            switch (operator) {
                case 'indexof':
                    result = (b.indexOf(a) !== -1);
                    break;
                case '===':
                    result = a === b;
                    break;
                case '!==':
                    result = a !== b;
                    break;
                case '>':
                    result = a > b;
                    break;
                default: {
                    throw new Error('helper {{compare}}: invalid operator: `' + operator + '`');
                }
            }
            if (result === false) {
                return options.inverse(this);
            }
            return options.fn(this);
        });
        Handlebars.registerHelper("or", function () {
            var len = arguments.length - 1;
            var options = arguments[len];
            for (var i = 0; i < len; i++) {
                if (arguments[i]) {
                    return options.fn(this);
                }
            }
            return options.inverse(this);
        });
        Handlebars.registerHelper("filterAngular2Modules", function (text, options) {
            var NG2_MODULES = [
                'BrowserModule',
                'FormsModule',
                'HttpModule',
                'RouterModule'
            ], len = NG2_MODULES.length;
            var i = 0, result = false;
            for (i; i < len; i++) {
                if (text.indexOf(NG2_MODULES[i]) > -1) {
                    result = true;
                }
            }
            if (result) {
                return options.fn(this);
            }
            else {
                return options.inverse(this);
            }
        });
        Handlebars.registerHelper("debug", function (optionalValue) {
            console.log("Current Context");
            console.log("====================");
            console.log(this);
            if (optionalValue) {
                console.log("OptionalValue");
                console.log("====================");
                console.log(optionalValue);
            }
        });
        Handlebars.registerHelper('breaklines', function (text) {
            text = Handlebars.Utils.escapeExpression(text);
            text = text.replace(/(\r\n|\n|\r)/gm, '<br>');
            text = text.replace(/ /gm, '&nbsp;');
            text = text.replace(/	/gm, '&nbsp;&nbsp;&nbsp;&nbsp;');
            return new Handlebars.SafeString(text);
        });
        Handlebars.registerHelper('escapeSimpleQuote', function (text) {
            if (!text)
                return;
            var _text = text.replace(/'/g, "\\'");
            _text = _text.replace(/(\r\n|\n|\r)/gm, '');
            return _text;
        });
        Handlebars.registerHelper('breakComma', function (text) {
            text = Handlebars.Utils.escapeExpression(text);
            text = text.replace(/,/g, ',<br>');
            return new Handlebars.SafeString(text);
        });
        Handlebars.registerHelper('modifKind', function (kind) {
            // https://github.com/Microsoft/TypeScript/blob/73ee2feb51c9b7e24a29eb4cee19d7c14b933065/lib/typescript.d.ts#L64
            var _kindText = '';
            switch (kind) {
                case 112:
                    _kindText = 'Private';
                    break;
                case 113:
                    _kindText = 'Protected';
                    break;
                case 114:
                    _kindText = 'Public';
                    break;
                case 115:
                    _kindText = 'Static';
                    break;
            }
            return new Handlebars.SafeString(_kindText);
        });
        Handlebars.registerHelper('modifIcon', function (kind) {
            // https://github.com/Microsoft/TypeScript/blob/73ee2feb51c9b7e24a29eb4cee19d7c14b933065/lib/typescript.d.ts#L64
            var _kindText = '';
            switch (kind) {
                case 112:
                    _kindText = 'lock';
                    break;
                case 113:
                    _kindText = 'circle';
                    break;
                case 115:
                    _kindText = 'square';
                case 83:
                    _kindText = 'export';
                    break;
            }
            return _kindText;
        });
        /**
         * Convert {@link MyClass} to [MyClass](http://localhost:8080/classes/MyClass.html)
         */
        Handlebars.registerHelper('parseDescription', function (description, depth) {
            var tagRegExp = new RegExp('\\{@link\\s+((?:.|\n)+?)\\}', 'i'), matches, previousString, tagInfo = [];
            var processTheLink = function (string, tagInfo) {
                var leading = extractLeadingText(string, tagInfo.completeTag), split, result, newLink, rootPath, stringtoReplace;
                split = splitLinkText(tagInfo.text);
                if (typeof split.linkText !== 'undefined') {
                    result = $dependenciesEngine.findInCompodoc(split.target);
                }
                else {
                    result = $dependenciesEngine.findInCompodoc(tagInfo.text);
                }
                if (result) {
                    if (leading.leadingText !== null) {
                        stringtoReplace = '[' + leading.leadingText + ']' + tagInfo.completeTag;
                    }
                    else if (typeof split.linkText !== 'undefined') {
                        stringtoReplace = tagInfo.completeTag;
                    }
                    else {
                        stringtoReplace = tagInfo.completeTag;
                    }
                    if (result.type === 'class')
                        result.type = 'classe';
                    rootPath = '';
                    switch (depth) {
                        case 0:
                            rootPath = './';
                            break;
                        case 1:
                            rootPath = '../';
                            break;
                        case 2:
                            rootPath = '../../';
                            break;
                    }
                    var label = result.name;
                    if (leading.leadingText !== null) {
                        label = leading.leadingText;
                    }
                    if (typeof split.linkText !== 'undefined') {
                        label = split.linkText;
                    }
                    newLink = "<a href=\"" + rootPath + result.type + "s/" + result.name + ".html\">" + label + "</a>";
                    return string.replace(stringtoReplace, newLink);
                }
                else {
                    return string;
                }
            };
            function replaceMatch(replacer, tag, match, text) {
                var matchedTag = {
                    completeTag: match,
                    tag: tag,
                    text: text
                };
                tagInfo.push(matchedTag);
                return replacer(description, matchedTag);
            }
            description = description.replace(/\n/g, '<br/>');
            do {
                matches = tagRegExp.exec(description);
                if (matches) {
                    previousString = description;
                    description = replaceMatch(processTheLink, 'link', matches[0], matches[1]);
                }
            } while (matches && previousString !== description);
            return description;
        });
        Handlebars.registerHelper('relativeURL', function (currentDepth, context) {
            var result = '';
            switch (currentDepth) {
                case 0:
                    result = './';
                    break;
                case 1:
                    result = '../';
                    break;
                case 2:
                    result = '../../';
                    break;
            }
            /*
            if (typeof context === 'string' && context == 'additional-page') {
                console.log('relativeURL: ', currentDepth, result);
            }
            */
            return result;
        });
        Handlebars.registerHelper('functionSignature', function (method) {
            var args = [], configuration = Configuration.getInstance(), angularDocPrefix = prefixOfficialDoc(configuration.mainData.angularVersion);
            if (method.args) {
                args = method.args.map(function (arg) {
                    var _result = $dependenciesEngine.find(arg.type);
                    if (_result) {
                        if (_result.source === 'internal') {
                            var path$$1 = _result.data.type;
                            if (_result.data.type === 'class')
                                path$$1 = 'classe';
                            return arg.name + ": <a href=\"../" + path$$1 + "s/" + _result.data.name + ".html\">" + arg.type + "</a>";
                        }
                        else {
                            var path$$1 = "https://" + angularDocPrefix + "angular.io/docs/ts/latest/api/" + _result.data.path;
                            return arg.name + ": <a href=\"" + path$$1 + "\" target=\"_blank\">" + arg.type + "</a>";
                        }
                    }
                    else {
                        return arg.name + ": " + arg.type;
                    }
                }).join(', ');
            }
            if (method.name) {
                return method.name + "(" + args + ")";
            }
            else {
                return "(" + args + ")";
            }
        });
        Handlebars.registerHelper('jsdoc-returns-comment', function (jsdocTags, options) {
            var i = 0, len = jsdocTags.length, result;
            for (i; i < len; i++) {
                if (jsdocTags[i].tagName) {
                    if (jsdocTags[i].tagName.text === 'returns') {
                        result = jsdocTags[i].comment;
                        break;
                    }
                }
            }
            return result;
        });
        Handlebars.registerHelper('jsdoc-component-example', function (jsdocTags, options) {
            var i = 0, len = jsdocTags.length, tags = [];
            var cleanTag = function (comment) {
                if (comment.charAt(0) === '*') {
                    comment = comment.substring(1, comment.length);
                }
                if (comment.charAt(0) === ' ') {
                    comment = comment.substring(1, comment.length);
                }
                return comment;
            };
            var type = 'html';
            if (options.hash.type) {
                type = options.hash.type;
            }
            function htmlEntities(str) {
                return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            }
            for (i; i < len; i++) {
                if (jsdocTags[i].tagName) {
                    if (jsdocTags[i].tagName.text === 'example') {
                        var tag = {};
                        if (jsdocTags[i].comment) {
                            tag.comment = "<pre class=\"line-numbers\"><code class=\"language-" + type + "\">" + htmlEntities(cleanTag(jsdocTags[i].comment)) + "</code></pre>";
                        }
                        tags.push(tag);
                    }
                }
            }
            if (tags.length > 0) {
                this.tags = tags;
                return options.fn(this);
            }
        });
        Handlebars.registerHelper('jsdoc-example', function (jsdocTags, options) {
            var i = 0, len = jsdocTags.length, tags = [];
            for (i; i < len; i++) {
                if (jsdocTags[i].tagName) {
                    if (jsdocTags[i].tagName.text === 'example') {
                        var tag = {};
                        if (jsdocTags[i].comment) {
                            tag.comment = jsdocTags[i].comment.replace(/<caption>/g, '<b><i>').replace(/\/caption>/g, '/b></i>');
                        }
                        tags.push(tag);
                    }
                }
            }
            if (tags.length > 0) {
                this.tags = tags;
                return options.fn(this);
            }
        });
        Handlebars.registerHelper('jsdoc-params', function (jsdocTags, options) {
            var i = 0, len = jsdocTags.length, tags = [];
            for (i; i < len; i++) {
                if (jsdocTags[i].tagName) {
                    if (jsdocTags[i].tagName.text === 'param') {
                        var tag = {};
                        if (jsdocTags[i].typeExpression && jsdocTags[i].typeExpression.type.name) {
                            tag.type = jsdocTags[i].typeExpression.type.name.text;
                        }
                        if (jsdocTags[i].comment) {
                            tag.comment = jsdocTags[i].comment;
                        }
                        if (jsdocTags[i].parameterName) {
                            tag.name = jsdocTags[i].parameterName.text;
                        }
                        tags.push(tag);
                    }
                }
            }
            if (tags.length >= 1) {
                this.tags = tags;
                return options.fn(this);
            }
        });
        Handlebars.registerHelper('linkType', function (name, options) {
            var _result = $dependenciesEngine.find(name), configuration = Configuration.getInstance(), angularDocPrefix = prefixOfficialDoc(configuration.mainData.angularVersion);
            if (_result) {
                this.type = {
                    raw: name
                };
                if (_result.source === 'internal') {
                    if (_result.data.type === 'class')
                        _result.data.type = 'classe';
                    this.type.href = '../' + _result.data.type + 's/' + _result.data.name + '.html';
                    this.type.target = '_self';
                }
                else {
                    this.type.href = "https://" + angularDocPrefix + "angular.io/docs/ts/latest/api/" + _result.data.path;
                    this.type.target = '_blank';
                }
                return options.fn(this);
            }
            else {
                return options.inverse(this);
            }
        });
        Handlebars.registerHelper('indexableSignature', function (method) {
            var args = method.args.map(function (arg) { return arg.name + ": " + arg.type; }).join(', ');
            if (method.name) {
                return method.name + "[" + args + "]";
            }
            else {
                return "[" + args + "]";
            }
        });
        Handlebars.registerHelper('object', function (text) {
            text = JSON.stringify(text);
            text = text.replace(/{"/, '{<br>&nbsp;&nbsp;&nbsp;&nbsp;"');
            text = text.replace(/,"/, ',<br>&nbsp;&nbsp;&nbsp;&nbsp;"');
            text = text.replace(/}$/, '<br>}');
            return new Handlebars.SafeString(text);
        });
        Handlebars.registerHelper('isNotToggle', function (type, options) {
            var configuration = Configuration.getInstance(), result = configuration.mainData.toggleMenuItems.indexOf(type);
            if (configuration.mainData.toggleMenuItems.indexOf('all') !== -1) {
                return options.inverse(this);
            }
            else if (result === -1) {
                return options.fn(this);
            }
            else {
                return options.inverse(this);
            }
        });
    };
    return {
        init: init
    };
})();

//import * as helpers from 'handlebars-helpers';
var HtmlEngine = (function () {
    function HtmlEngine() {
        this.cache = {};
        HtmlEngineHelpers.init();
    }
    HtmlEngine.prototype.init = function () {
        var partials = [
            'menu',
            'overview',
            'readme',
            'modules',
            'module',
            'components',
            'component',
            'component-detail',
            'directives',
            'directive',
            'injectables',
            'injectable',
            'pipes',
            'pipe',
            'classes',
            'class',
            'interface',
            'routes',
            'search-results',
            'search-input',
            'link-type',
            'block-method',
            'block-enum',
            'block-property',
            'block-index',
            'block-constructor',
            'coverage-report',
            'miscellaneous',
            'additional-page'
        ], i = 0, len = partials.length, loop = function (resolve$$1, reject) {
            if (i <= len - 1) {
                fs.readFile(path.resolve(__dirname + '/../src/templates/partials/' + partials[i] + '.hbs'), 'utf8', function (err, data) {
                    if (err) {
                        reject();
                    }
                    Handlebars.registerPartial(partials[i], data);
                    i++;
                    loop(resolve$$1, reject);
                });
            }
            else {
                resolve$$1();
            }
        };
        return new Promise(function (resolve$$1, reject) {
            loop(resolve$$1, reject);
        });
    };
    HtmlEngine.prototype.render = function (mainData, page) {
        var o = mainData, that = this;
        Object.assign(o, page);
        return new Promise(function (resolve$$1, reject) {
            if (that.cache['page']) {
                var template = Handlebars.compile(that.cache['page']), result = template({
                    data: o
                });
                resolve$$1(result);
            }
            else {
                fs.readFile(path.resolve(__dirname + '/../src/templates/page.hbs'), 'utf8', function (err, data) {
                    if (err) {
                        reject('Error during index ' + page.name + ' generation');
                    }
                    else {
                        that.cache['page'] = data;
                        var template = Handlebars.compile(data), result = template({
                            data: o
                        });
                        resolve$$1(result);
                    }
                });
            }
        });
    };
    HtmlEngine.prototype.generateCoverageBadge = function (outputFolder, coverageData) {
        return new Promise(function (resolve$$1, reject) {
            fs.readFile(path.resolve(__dirname + '/../src/templates/partials/coverage-badge.hbs'), 'utf8', function (err, data) {
                if (err) {
                    reject('Error during coverage badge generation');
                }
                else {
                    var template = Handlebars.compile(data), result = template({
                        data: coverageData
                    });
                    outputFolder = outputFolder.replace(process.cwd(), '');
                    fs.outputFile(path.resolve(process.cwd() + path.sep + outputFolder + path.sep + '/images/coverage-badge.svg'), result, function (err) {
                        if (err) {
                            logger.error('Error during coverage badge file generation ', err);
                            reject(err);
                        }
                        else {
                            resolve$$1();
                        }
                    });
                }
            });
        });
    };
    return HtmlEngine;
}());

var marked$1 = require('marked');
var MarkdownEngine = (function () {
    function MarkdownEngine() {
        var _this = this;
        var renderer = new marked$1.Renderer();
        renderer.code = function (code, language) {
            var highlighted = code;
            if (!language) {
                language = 'none';
            }
            highlighted = _this.escape(code);
            return "<pre class=\"line-numbers\"><code class=\"language-" + language + "\">" + highlighted + "</code></pre>";
        };
        renderer.table = function (header, body) {
            return '<table class="table table-bordered compodoc-table">\n'
                + '<thead>\n'
                + header
                + '</thead>\n'
                + '<tbody>\n'
                + body
                + '</tbody>\n'
                + '</table>\n';
        };
        renderer.image = function (href, title, text) {
            var out = '<img src="' + href + '" alt="' + text + '" class="img-responsive"';
            if (title) {
                out += ' title="' + title + '"';
            }
            out += this.options.xhtml ? '/>' : '>';
            return out;
        };
        marked$1.setOptions({
            renderer: renderer,
            breaks: false
        });
    }
    MarkdownEngine.prototype.get = function (filepath) {
        return new Promise(function (resolve$$1, reject) {
            fs.readFile(path.resolve(process.cwd() + path.sep + filepath), 'utf8', function (err, data) {
                if (err) {
                    reject('Error during ' + filepath + ' read');
                }
                else {
                    resolve$$1(marked$1(data));
                }
            });
        });
    };
    MarkdownEngine.prototype.getReadmeFile = function () {
        return new Promise(function (resolve$$1, reject) {
            fs.readFile(path.resolve(process.cwd() + '/README.md'), 'utf8', function (err, data) {
                if (err) {
                    reject('Error during README.md file reading');
                }
                else {
                    resolve$$1(marked$1(data));
                }
            });
        });
    };
    MarkdownEngine.prototype.componentHasReadmeFile = function (file) {
        var dirname$$1 = path.dirname(file), readmeFile = dirname$$1 + path.sep + 'README.md', readmeAlternativeFile = dirname$$1 + path.sep + path.basename(file, '.ts') + '.md';
        return fs.existsSync(readmeFile) || fs.existsSync(readmeAlternativeFile);
    };
    MarkdownEngine.prototype.componentReadmeFile = function (file) {
        var dirname$$1 = path.dirname(file), readmeFile = dirname$$1 + path.sep + 'README.md', readmeAlternativeFile = dirname$$1 + path.sep + path.basename(file, '.ts') + '.md', finalPath = '';
        if (fs.existsSync(readmeFile)) {
            finalPath = readmeFile;
        }
        else {
            finalPath = readmeAlternativeFile;
        }
        return finalPath;
    };
    MarkdownEngine.prototype.escape = function (html) {
        return html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/@/g, '&#64;');
    };
    return MarkdownEngine;
}());

var FileEngine = (function () {
    function FileEngine() {
    }
    FileEngine.prototype.get = function (filepath) {
        return new Promise(function (resolve$$1, reject) {
            fs.readFile(path.resolve(process.cwd() + path.sep + filepath), 'utf8', function (err, data) {
                if (err) {
                    reject('Error during ' + filepath + ' read');
                }
                else {
                    resolve$$1(data);
                }
            });
        });
    };
    return FileEngine;
}());

var ngdCr = require('@compodoc/ngd-core');
var ngdT = require('@compodoc/ngd-transformer');
var NgdEngine = (function () {
    function NgdEngine() {
    }
    NgdEngine.prototype.renderGraph = function (filepath, outputpath, type, name) {
        return new Promise(function (resolve$$1, reject) {
            ngdCr.logger.silent = false;
            var engine = new ngdT.DotEngine({
                output: outputpath,
                displayLegend: true,
                outputFormats: 'svg'
            });
            if (type === 'f') {
                engine
                    .generateGraph([$dependenciesEngine.getRawModule(name)])
                    .then(function (file) {
                    resolve$$1();
                }, function (error) {
                    reject(error);
                });
            }
            else {
                engine
                    .generateGraph($dependenciesEngine.rawModulesForOverview)
                    .then(function (file) {
                    resolve$$1();
                }, function (error) {
                    reject(error);
                });
            }
        });
    };
    NgdEngine.prototype.readGraph = function (filepath, name) {
        return new Promise(function (resolve$$1, reject) {
            fs.readFile(path.resolve(filepath), 'utf8', function (err, data) {
                if (err) {
                    reject('Error during graph read ' + name);
                }
                else {
                    resolve$$1(data);
                }
            });
        });
    };
    return NgdEngine;
}());

var lunr = require('lunr');
var cheerio = require('cheerio');
var Entities = require('html-entities').AllHtmlEntities;
var $configuration = Configuration.getInstance();
var Html = new Entities();
var SearchEngine = (function () {
    function SearchEngine() {
        this.documentsStore = {};
    }
    SearchEngine.prototype.getSearchIndex = function () {
        if (!this.searchIndex) {
            this.searchIndex = lunr(function () {
                this.ref('url');
                this.field('title', { boost: 10 });
                this.field('body');
            });
        }
        return this.searchIndex;
    };
    SearchEngine.prototype.indexPage = function (page) {
        var text, $ = cheerio.load(page.rawData);
        text = $('.content').html();
        text = Html.decode(text);
        text = text.replace(/(<([^>]+)>)/ig, '');
        page.url = page.url.replace($configuration.mainData.output, '');
        var doc = {
            url: page.url,
            title: page.infos.context + ' - ' + page.infos.name,
            body: text
        };
        this.documentsStore[doc.url] = doc;
        this.getSearchIndex().add(doc);
    };
    SearchEngine.prototype.generateSearchIndexJson = function (outputFolder) {
        var _this = this;
        return new Promise(function (resolve$$1, reject) {
            fs.readFile(path.resolve(__dirname + '/../src/templates/partials/search-index.hbs'), 'utf8', function (err, data) {
                if (err) {
                    reject('Error during search index generation');
                }
                else {
                    var template = Handlebars.compile(data), result = template({
                        index: JSON.stringify(_this.getSearchIndex()),
                        store: JSON.stringify(_this.documentsStore)
                    });
                    outputFolder = outputFolder.replace(process.cwd(), '');
                    fs.outputFile(path.resolve(process.cwd() + path.sep + outputFolder + path.sep + '/js/search/search_index.js'), result, function (err) {
                        if (err) {
                            logger.error('Error during search index file generation ', err);
                            reject(err);
                        }
                        else {
                            resolve$$1();
                        }
                    });
                }
            });
        });
    };
    return SearchEngine;
}());

function cleanNameWithoutSpaceAndToLowerCase(name) {
    return name.toLowerCase().replace(/ /g, '-');
}
function detectIndent(str, count, indent) {
    var stripIndent = function (str) {
        var match = str.match(/^[ \t]*(?=\S)/gm);
        if (!match) {
            return str;
        }
        // TODO: use spread operator when targeting Node.js 6
        var indent = Math.min.apply(Math, match.map(function (x) { return x.length; })); // eslint-disable-line
        var re = new RegExp("^[ \\t]{" + indent + "}", 'gm');
        return indent > 0 ? str.replace(re, '') : str;
    }, repeating = function (n, str) {
        str = str === undefined ? ' ' : str;
        if (typeof str !== 'string') {
            throw new TypeError("Expected `input` to be a `string`, got `" + typeof str + "`");
        }
        if (n < 0) {
            throw new TypeError("Expected `count` to be a positive finite number, got `" + n + "`");
        }
        var ret = '';
        do {
            if (n & 1) {
                ret += str;
            }
            str += str;
        } while ((n >>= 1));
        return ret;
    }, indentString = function (str, count, indent) {
        indent = indent === undefined ? ' ' : indent;
        count = count === undefined ? 1 : count;
        if (typeof str !== 'string') {
            throw new TypeError("Expected `input` to be a `string`, got `" + typeof str + "`");
        }
        if (typeof count !== 'number') {
            throw new TypeError("Expected `count` to be a `number`, got `" + typeof count + "`");
        }
        if (typeof indent !== 'string') {
            throw new TypeError("Expected `indent` to be a `string`, got `" + typeof indent + "`");
        }
        if (count === 0) {
            return str;
        }
        indent = count > 1 ? repeating(count, indent) : indent;
        return str.replace(/^(?!\s*$)/mg, indent);
    };
    return indentString(stripIndent(str), count || 0, indent);
}
// Create a compilerHost object to allow the compiler to read and write files
function compilerHost(transpileOptions) {
    var inputFileName = transpileOptions.fileName || (transpileOptions.jsx ? 'module.tsx' : 'module.ts');
    var compilerHost = {
        getSourceFile: function (fileName) {
            if (fileName.lastIndexOf('.ts') !== -1) {
                if (fileName === 'lib.d.ts') {
                    return undefined;
                }
                if (fileName.substr(-5) === '.d.ts') {
                    return undefined;
                }
                if (path.isAbsolute(fileName) === false) {
                    fileName = path.join(transpileOptions.tsconfigDirectory, fileName);
                }
                if (!fs.existsSync(fileName)) {
                    return undefined;
                }
                var libSource = '';
                try {
                    libSource = fs.readFileSync(fileName).toString();
                }
                catch (e) {
                    logger.debug(e, fileName);
                }
                return ts.createSourceFile(fileName, libSource, transpileOptions.target, false);
            }
            return undefined;
        },
        writeFile: function (name, text) { },
        getDefaultLibFileName: function () { return 'lib.d.ts'; },
        useCaseSensitiveFileNames: function () { return false; },
        getCanonicalFileName: function (fileName) { return fileName; },
        getCurrentDirectory: function () { return ''; },
        getNewLine: function () { return '\n'; },
        fileExists: function (fileName) { return fileName === inputFileName; },
        readFile: function () { return ''; },
        directoryExists: function () { return true; },
        getDirectories: function () { return []; }
    };
    return compilerHost;
}
function findMainSourceFolder(files) {
    var mainFolder = '', mainFolderCount = 0, rawFolders = files.map(function (filepath) {
        var shortPath = filepath.replace(process.cwd() + path.sep, '');
        return path.dirname(shortPath);
    }), folders = {}, i = 0;
    rawFolders = _.uniq(rawFolders);
    var len = rawFolders.length;
    for (i; i < len; i++) {
        var sep$$1 = rawFolders[i].split(path.sep);
        sep$$1.map(function (folder) {
            if (folders[folder]) {
                folders[folder] += 1;
            }
            else {
                folders[folder] = 1;
            }
        });
    }
    for (var f in folders) {
        if (folders[f] > mainFolderCount) {
            mainFolderCount = folders[f];
            mainFolder = f;
        }
    }
    return mainFolder;
}

var RouterParser = (function () {
    var routes = [], incompleteRoutes = [], modules = [], modulesTree, rootModule, cleanModulesTree, modulesWithRoutes = [], _addRoute = function (route) {
        routes.push(route);
        routes = _.sortBy(_.uniqWith(routes, _.isEqual), ['name']);
    }, _addIncompleteRoute = function (route) {
        incompleteRoutes.push(route);
        incompleteRoutes = _.sortBy(_.uniqWith(incompleteRoutes, _.isEqual), ['name']);
    }, _addModuleWithRoutes = function (moduleName, moduleImports) {
        modulesWithRoutes.push({
            name: moduleName,
            importsNode: moduleImports
        });
        modulesWithRoutes = _.sortBy(_.uniqWith(modulesWithRoutes, _.isEqual), ['name']);
    }, _addModule = function (moduleName, moduleImports) {
        modules.push({
            name: moduleName,
            importsNode: moduleImports
        });
        modules = _.sortBy(_.uniqWith(modules, _.isEqual), ['name']);
    }, _cleanRawRouteParsed = function (route) {
        var routesWithoutSpaces = route.replace(/ /gm, ''), testTrailingComma = routesWithoutSpaces.indexOf('},]');
        if (testTrailingComma != -1) {
            routesWithoutSpaces = routesWithoutSpaces.replace('},]', '}]');
        }
        return JSON.parse(routesWithoutSpaces);
    }, _cleanRawRoute = function (route) {
        var routesWithoutSpaces = route.replace(/ /gm, ''), testTrailingComma = routesWithoutSpaces.indexOf('},]');
        if (testTrailingComma != -1) {
            routesWithoutSpaces = routesWithoutSpaces.replace('},]', '}]');
        }
        return routesWithoutSpaces;
    }, _setRootModule = function (module) {
        rootModule = module;
    }, _hasRouterModuleInImports = function (imports) {
        var result = false, i = 0, len = imports.length;
        for (i; i < len; i++) {
            if (imports[i].name.indexOf('RouterModule.forChild') !== -1 ||
                imports[i].name.indexOf('RouterModule.forRoot') !== -1) {
                result = true;
            }
        }
        return result;
    }, _fixIncompleteRoutes = function (miscellaneousVariables) {
        /*console.log('fixIncompleteRoutes');
        console.log('');
        console.log(routes);
        console.log('');*/
        //console.log(miscellaneousVariables);
        //console.log('');
        var i = 0, len = incompleteRoutes.length, matchingVariables = [];
        // For each incompleteRoute, scan if one misc variable is in code
        // if ok, try recreating complete route
        for (i; i < len; i++) {
            var j = 0, leng = miscellaneousVariables.length;
            for (j; j < leng; j++) {
                if (incompleteRoutes[i].data.indexOf(miscellaneousVariables[j].name) !== -1) {
                    console.log('found one misc var inside incompleteRoute');
                    console.log(miscellaneousVariables[j].name);
                    matchingVariables.push(miscellaneousVariables[j]);
                }
            }
            //Clean incompleteRoute
            incompleteRoutes[i].data = incompleteRoutes[i].data.replace('[', '');
            incompleteRoutes[i].data = incompleteRoutes[i].data.replace(']', '');
        }
        /*console.log(incompleteRoutes);
        console.log('');
        console.log(matchingVariables);
        console.log('');*/
    }, _linkModulesAndRoutes = function () {
        /*console.log('');
        console.log('linkModulesAndRoutes: ');
        //scan each module imports AST for each routes, and link routes with module
        console.log('linkModulesAndRoutes routes: ', routes);
        console.log('');*/
        var i = 0, len = modulesWithRoutes.length;
        for (i; i < len; i++) {
            _.forEach(modulesWithRoutes[i].importsNode, function (node) {
                if (node.initializer) {
                    if (node.initializer.elements) {
                        _.forEach(node.initializer.elements, function (element) {
                            //find element with arguments
                            if (element.arguments) {
                                _.forEach(element.arguments, function (argument) {
                                    _.forEach(routes, function (route) {
                                        if (argument.text && route.name === argument.text) {
                                            route.module = modulesWithRoutes[i].name;
                                        }
                                    });
                                });
                            }
                        });
                    }
                }
            });
        }
        /*console.log('');
        console.log('end linkModulesAndRoutes: ');
        console.log(util.inspect(routes, { depth: 10 }));
        console.log('');*/
    }, foundRouteWithModuleName = function (moduleName) {
        return _.find(routes, { 'module': moduleName });
    }, foundLazyModuleWithPath = function (path$$1) {
        //path is like app/customers/customers.module#CustomersModule
        var split = path$$1.split('#'), lazyModulePath = split[0], lazyModuleName = split[1];
        return lazyModuleName;
    }, _constructRoutesTree = function () {
        //console.log('');
        /*console.log('constructRoutesTree modules: ', modules);
        console.log('');
        console.log('constructRoutesTree modulesWithRoutes: ', modulesWithRoutes);
        console.log('');
        console.log('constructRoutesTree modulesTree: ', util.inspect(modulesTree, { depth: 10 }));
        console.log('');*/
        // routes[] contains routes with module link
        // modulesTree contains modules tree
        // make a final routes tree with that
        cleanModulesTree = _.cloneDeep(modulesTree);
        var modulesCleaner = function (arr) {
            for (var i in arr) {
                if (arr[i].importsNode) {
                    delete arr[i].importsNode;
                }
                if (arr[i].parent) {
                    delete arr[i].parent;
                }
                if (arr[i].children) {
                    modulesCleaner(arr[i].children);
                }
            }
        };
        modulesCleaner(cleanModulesTree);
        //console.log('');
        //console.log('  cleanModulesTree light: ', util.inspect(cleanModulesTree, { depth: 10 }));
        //console.log('');
        //console.log(routes);
        //console.log('');
        var routesTree = {
            name: '<root>',
            kind: 'module',
            className: rootModule,
            children: []
        };
        var loopModulesParser = function (node) {
            if (node.children && node.children.length > 0) {
                //If module has child modules
                //console.log('   If module has child modules');
                for (var i in node.children) {
                    var route = foundRouteWithModuleName(node.children[i].name);
                    if (route && route.data) {
                        route.children = JSON.parse(route.data);
                        delete route.data;
                        route.kind = 'module';
                        routesTree.children.push(route);
                    }
                    if (node.children[i].children) {
                        loopModulesParser(node.children[i]);
                    }
                }
            }
            else {
                //else routes are directly inside the module
                //console.log('   else routes are directly inside the root module');
                var rawRoutes = foundRouteWithModuleName(node.name);
                if (rawRoutes) {
                    var routes_1 = JSON.parse(rawRoutes.data);
                    if (routes_1) {
                        var i_1 = 0, len = routes_1.length;
                        for (i_1; i_1 < len; i_1++) {
                            var route = routes_1[i_1];
                            if (routes_1[i_1].component) {
                                routesTree.children.push({
                                    kind: 'component',
                                    component: routes_1[i_1].component,
                                    path: routes_1[i_1].path
                                });
                            }
                        }
                    }
                }
            }
        };
        //console.log('');
        //console.log('  rootModule: ', rootModule);
        //console.log('');
        var startModule = _.find(cleanModulesTree, { 'name': rootModule });
        if (startModule) {
            loopModulesParser(startModule);
            //Loop twice for routes with lazy loading
            //loopModulesParser(routesTree);
        }
        /*console.log('');
        console.log('  routesTree: ', routesTree);
        console.log('');*/
        var cleanedRoutesTree = null;
        var cleanRoutesTree = function (route) {
            for (var i in route.children) {
                var routes = route.children[i].routes;
            }
            return route;
        };
        cleanedRoutesTree = cleanRoutesTree(routesTree);
        //Try updating routes with lazy loading
        //console.log('');
        //console.log('Try updating routes with lazy loading');
        var loopRoutesParser = function (route) {
            if (route.children) {
                var _loop_1 = function () {
                    if (route.children[i].loadChildren) {
                        var child = foundLazyModuleWithPath(route.children[i].loadChildren), module = _.find(cleanModulesTree, { 'name': child });
                        if (module) {
                            var _rawModule_1 = {};
                            _rawModule_1.kind = 'module';
                            _rawModule_1.children = [];
                            _rawModule_1.module = module.name;
                            var loopInside = function (mod) {
                                if (mod.children) {
                                    for (var i in mod.children) {
                                        var route_1 = foundRouteWithModuleName(mod.children[i].name);
                                        if (typeof route_1 !== 'undefined') {
                                            if (route_1.data) {
                                                route_1.children = JSON.parse(route_1.data);
                                                delete route_1.data;
                                                route_1.kind = 'module';
                                                _rawModule_1.children[i] = route_1;
                                            }
                                        }
                                    }
                                }
                            };
                            loopInside(module);
                            route.children[i].children = [];
                            route.children[i].children.push(_rawModule_1);
                        }
                    }
                    loopRoutesParser(route.children[i]);
                };
                for (var i in route.children) {
                    _loop_1();
                }
            }
        };
        loopRoutesParser(cleanedRoutesTree);
        //console.log('');
        //console.log('  cleanedRoutesTree: ', util.inspect(cleanedRoutesTree, { depth: 10 }));
        return cleanedRoutesTree;
    }, _constructModulesTree = function () {
        //console.log('');
        //console.log('constructModulesTree');
        var getNestedChildren = function (arr, parent) {
            var out = [];
            for (var i in arr) {
                if (arr[i].parent === parent) {
                    var children = getNestedChildren(arr, arr[i].name);
                    if (children.length) {
                        arr[i].children = children;
                    }
                    out.push(arr[i]);
                }
            }
            return out;
        };
        //Scan each module and add parent property
        _.forEach(modules, function (firstLoopModule) {
            _.forEach(firstLoopModule.importsNode, function (importNode) {
                _.forEach(modules, function (module) {
                    if (module.name === importNode.name) {
                        module.parent = firstLoopModule.name;
                    }
                });
            });
        });
        modulesTree = getNestedChildren(modules);
        /*console.log('');
        console.log('end constructModulesTree');
        console.log(modulesTree);*/
    }, _generateRoutesIndex = function (outputFolder, routes) {
        return new Promise(function (resolve$$1, reject) {
            fs.readFile(path.resolve(__dirname + '/../src/templates/partials/routes-index.hbs'), 'utf8', function (err, data) {
                if (err) {
                    reject('Error during routes index generation');
                }
                else {
                    var template = Handlebars.compile(data), result = template({
                        routes: JSON.stringify(routes)
                    });
                    outputFolder = outputFolder.replace(process.cwd(), '');
                    fs.outputFile(path.resolve(process.cwd() + path.sep + outputFolder + path.sep + '/js/routes/routes_index.js'), result, function (err) {
                        if (err) {
                            logger.error('Error during routes index file generation ', err);
                            reject(err);
                        }
                        else {
                            resolve$$1();
                        }
                    });
                }
            });
        });
    }, _routesLength = function () {
        var _n = 0;
        var routesParser = function (route) {
            if (typeof route.path !== 'undefined') {
                _n += 1;
            }
            if (route.children) {
                for (var j in route.children) {
                    routesParser(route.children[j]);
                }
            }
        };
        for (var i in routes) {
            routesParser(routes[i]);
        }
        return _n;
    };
    return {
        incompleteRoutes: incompleteRoutes,
        addRoute: _addRoute,
        addIncompleteRoute: _addIncompleteRoute,
        addModuleWithRoutes: _addModuleWithRoutes,
        addModule: _addModule,
        cleanRawRouteParsed: _cleanRawRouteParsed,
        cleanRawRoute: _cleanRawRoute,
        setRootModule: _setRootModule,
        printRoutes: function () {
            console.log('');
            console.log('printRoutes: ');
            console.log(routes);
        },
        printModulesRoutes: function () {
            console.log('');
            console.log('printModulesRoutes: ');
            console.log(modulesWithRoutes);
        },
        routesLength: _routesLength,
        hasRouterModuleInImports: _hasRouterModuleInImports,
        fixIncompleteRoutes: _fixIncompleteRoutes,
        linkModulesAndRoutes: _linkModulesAndRoutes,
        constructRoutesTree: _constructRoutesTree,
        constructModulesTree: _constructModulesTree,
        generateRoutesIndex: _generateRoutesIndex
    };
})();

function isVariableLike(node) {
    if (node) {
        switch (node.kind) {
            case ts.SyntaxKind.BindingElement:
            case ts.SyntaxKind.EnumMember:
            case ts.SyntaxKind.Parameter:
            case ts.SyntaxKind.PropertyAssignment:
            case ts.SyntaxKind.PropertyDeclaration:
            case ts.SyntaxKind.PropertySignature:
            case ts.SyntaxKind.ShorthandPropertyAssignment:
            case ts.SyntaxKind.VariableDeclaration:
                return true;
        }
    }
    return false;
}
function some(array, predicate) {
    if (array) {
        if (predicate) {
            for (var _i = 0, array_1 = array; _i < array_1.length; _i++) {
                var v = array_1[_i];
                if (predicate(v)) {
                    return true;
                }
            }
        }
        else {
            return array.length > 0;
        }
    }
    return false;
}
function concatenate(array1, array2) {
    if (!some(array2))
        return array1;
    if (!some(array1))
        return array2;
    return array1.concat(array2);
}
function isParameter(node) {
    return node.kind === ts.SyntaxKind.Parameter;
}
function getJSDocParameterTags(param) {
    if (!isParameter(param)) {
        return undefined;
    }
    var func = param.parent;
    var tags = getJSDocTags(func, ts.SyntaxKind.JSDocParameterTag);
    if (!param.name) {
        // this is an anonymous jsdoc param from a `function(type1, type2): type3` specification
        var i = func.parameters.indexOf(param);
        var paramTags = filter(tags, function (tag) { return tag.kind === ts.SyntaxKind.JSDocParameterTag; });
        if (paramTags && 0 <= i && i < paramTags.length) {
            return [paramTags[i]];
        }
    }
    else if (param.name.kind === ts.SyntaxKind.Identifier) {
        var name_1 = param.name.text;
        return filter(tags, function (tag) { return tag.kind === ts.SyntaxKind.JSDocParameterTag && tag.parameterName.text === name_1; });
    }
    else {
        // TODO: it's a destructured parameter, so it should look up an "object type" series of multiple lines
        // But multi-line object types aren't supported yet either
        return undefined;
    }
}
var JSDocTagsParser = (function () {
    var _getJSDocs = function (node) {
        //console.log('getJSDocs: ', node);
        var cache = node.jsDocCache;
        if (!cache) {
            getJSDocsWorker(node);
            node.jsDocCache = cache;
        }
        return cache;
        function getJSDocsWorker(node) {
            var parent = node.parent;
            // Try to recognize this pattern when node is initializer of variable declaration and JSDoc comments are on containing variable statement.
            // /**
            //   * @param {number} name
            //   * @returns {number}
            //   */
            // var x = function(name) { return name.length; }
            var isInitializerOfVariableDeclarationInStatement = isVariableLike(parent) &&
                parent.initializer === node &&
                parent.parent.parent.kind === ts.SyntaxKind.VariableStatement;
            var isVariableOfVariableDeclarationStatement = isVariableLike(node) &&
                parent.parent.kind === ts.SyntaxKind.VariableStatement;
            var variableStatementNode = isInitializerOfVariableDeclarationInStatement ? parent.parent.parent :
                isVariableOfVariableDeclarationStatement ? parent.parent :
                    undefined;
            if (variableStatementNode) {
                getJSDocsWorker(variableStatementNode);
            }
            // Also recognize when the node is the RHS of an assignment expression
            var isSourceOfAssignmentExpressionStatement = parent && parent.parent &&
                parent.kind === ts.SyntaxKind.BinaryExpression &&
                parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
                parent.parent.kind === ts.SyntaxKind.ExpressionStatement;
            if (isSourceOfAssignmentExpressionStatement) {
                getJSDocsWorker(parent.parent);
            }
            var isModuleDeclaration = node.kind === ts.SyntaxKind.ModuleDeclaration &&
                parent && parent.kind === ts.SyntaxKind.ModuleDeclaration;
            var isPropertyAssignmentExpression = parent && parent.kind === ts.SyntaxKind.PropertyAssignment;
            if (isModuleDeclaration || isPropertyAssignmentExpression) {
                getJSDocsWorker(parent);
            }
            // Pull parameter comments from declaring function as well
            if (node.kind === ts.SyntaxKind.Parameter) {
                cache = concatenate(cache, getJSDocParameterTags(node));
            }
            if (isVariableLike(node) && node.initializer) {
                cache = concatenate(cache, node.initializer.jsDoc);
            }
            cache = concatenate(cache, node.jsDoc);
        }
    };
    return {
        getJSDocs: _getJSDocs
    };
})();

var code = [];
var gen = (function () {
    var tmp = [];
    return function (token) {
        if (token === void 0) { token = null; }
        if (!token) {
            //console.log(' ! token');
            return code;
        }
        else if (token === '\n') {
            //console.log(' \n');
            code.push(tmp.join(''));
            tmp = [];
        }
        else {
            code.push(token);
        }
        return code;
    };
}());
function generate(node) {
    code = [];
    visitAndRecognize(node);
    return code.join('');
}
function visitAndRecognize(node, depth) {
    if (depth === void 0) { depth = 0; }
    recognize(node);
    depth++;
    node.getChildren().forEach(function (c) { return visitAndRecognize(c, depth); });
}
function recognize(node) {
    //console.log('recognizing...', ts.SyntaxKind[node.kind+'']);
    switch (node.kind) {
        case ts.SyntaxKind.FirstLiteralToken:
        case ts.SyntaxKind.Identifier:
            gen('\"');
            gen(node.text);
            gen('\"');
            break;
        case ts.SyntaxKind.StringLiteral:
            gen('\"');
            gen(node.text);
            gen('\"');
            break;
        case ts.SyntaxKind.ArrayLiteralExpression:
            break;
        case ts.SyntaxKind.ImportKeyword:
            gen('import');
            gen(' ');
            break;
        case ts.SyntaxKind.FromKeyword:
            gen('from');
            gen(' ');
            break;
        case ts.SyntaxKind.ExportKeyword:
            gen('\n');
            gen('export');
            gen(' ');
            break;
        case ts.SyntaxKind.ClassKeyword:
            gen('class');
            gen(' ');
            break;
        case ts.SyntaxKind.ThisKeyword:
            gen('this');
            break;
        case ts.SyntaxKind.ConstructorKeyword:
            gen('constructor');
            break;
        case ts.SyntaxKind.FalseKeyword:
            gen('false');
            break;
        case ts.SyntaxKind.TrueKeyword:
            gen('true');
            break;
        case ts.SyntaxKind.NullKeyword:
            gen('null');
            break;
        case ts.SyntaxKind.AtToken:
            break;
        case ts.SyntaxKind.PlusToken:
            gen('+');
            break;
        case ts.SyntaxKind.EqualsGreaterThanToken:
            gen(' => ');
            break;
        case ts.SyntaxKind.OpenParenToken:
            gen('(');
            break;
        case ts.SyntaxKind.ImportClause:
        case ts.SyntaxKind.ObjectLiteralExpression:
            gen('{');
            gen(' ');
            break;
        case ts.SyntaxKind.Block:
            gen('{');
            gen('\n');
            break;
        case ts.SyntaxKind.CloseBraceToken:
            gen('}');
            break;
        case ts.SyntaxKind.CloseParenToken:
            gen(')');
            break;
        case ts.SyntaxKind.OpenBracketToken:
            gen('[');
            break;
        case ts.SyntaxKind.CloseBracketToken:
            gen(']');
            break;
        case ts.SyntaxKind.SemicolonToken:
            gen(';');
            gen('\n');
            break;
        case ts.SyntaxKind.CommaToken:
            gen(',');
            gen(' ');
            break;
        case ts.SyntaxKind.ColonToken:
            gen(' ');
            gen(':');
            gen(' ');
            break;
        case ts.SyntaxKind.DotToken:
            gen('.');
            break;
        case ts.SyntaxKind.DoStatement:
            break;
        case ts.SyntaxKind.Decorator:
            break;
        case ts.SyntaxKind.FirstAssignment:
            gen(' = ');
            break;
        case ts.SyntaxKind.FirstPunctuation:
            gen(' ');
            break;
        case ts.SyntaxKind.PrivateKeyword:
            gen('private');
            gen(' ');
            break;
        case ts.SyntaxKind.PublicKeyword:
            gen('public');
            gen(' ');
            break;
        default:
            break;
    }
}

var $ = require('cheerio');
var ComponentsTreeEngine = (function () {
    function ComponentsTreeEngine() {
        this.components = [];
        this.componentsForTree = [];
        if (ComponentsTreeEngine._instance) {
            throw new Error('Error: Instantiation failed: Use ComponentsTreeEngine.getInstance() instead of new.');
        }
        ComponentsTreeEngine._instance = this;
    }
    ComponentsTreeEngine.getInstance = function () {
        return ComponentsTreeEngine._instance;
    };
    ComponentsTreeEngine.prototype.addComponent = function (component) {
        this.components.push(component);
    };
    ComponentsTreeEngine.prototype.readTemplates = function () {
        var _this = this;
        return new Promise(function (resolve$$1, reject) {
            var i = 0, len = _this.componentsForTree.length, $fileengine = new FileEngine(), loop = function () {
                if (i <= len - 1) {
                    if (_this.componentsForTree[i].templateUrl) {
                        $fileengine.get(path.dirname(_this.componentsForTree[i].file) + path.sep + _this.componentsForTree[i].templateUrl).then(function (templateData) {
                            _this.componentsForTree[i].templateData = templateData;
                            i++;
                            loop();
                        }, function (e) {
                            logger.error(e);
                            reject();
                        });
                    }
                    else {
                        _this.componentsForTree[i].templateData = _this.componentsForTree[i].template;
                        i++;
                        loop();
                    }
                }
                else {
                    resolve$$1();
                }
            };
            loop();
        });
    };
    ComponentsTreeEngine.prototype.findChildrenAndParents = function () {
        var _this = this;
        return new Promise(function (resolve$$1, reject) {
            _.forEach(_this.componentsForTree, function (component) {
                var $component = $(component.templateData);
                _.forEach(_this.componentsForTree, function (componentToFind) {
                    if ($component.find(componentToFind.selector).length > 0) {
                        console.log(componentToFind.name + ' found in ' + component.name);
                        component.children.push(componentToFind.name);
                    }
                });
            });
            resolve$$1();
        });
    };
    ComponentsTreeEngine.prototype.createTreesForComponents = function () {
        var _this = this;
        return new Promise(function (resolve$$1, reject) {
            _.forEach(_this.components, function (component) {
                var _component = {
                    name: component.name,
                    file: component.file,
                    selector: component.selector,
                    children: [],
                    template: '',
                    templateUrl: ''
                };
                if (typeof component.template !== 'undefined') {
                    _component.template = component.template;
                }
                if (component.templateUrl.length > 0) {
                    _component.templateUrl = component.templateUrl[0];
                }
                _this.componentsForTree.push(_component);
            });
            _this.readTemplates().then(function () {
                _this.findChildrenAndParents().then(function () {
                    console.log('this.componentsForTree: ', _this.componentsForTree);
                    resolve$$1();
                }, function (e) {
                    logger.error(e);
                    reject();
                });
            }, function (e) {
                logger.error(e);
            });
        });
    };
    return ComponentsTreeEngine;
}());
ComponentsTreeEngine._instance = new ComponentsTreeEngine();

var $componentsTreeEngine = ComponentsTreeEngine.getInstance();

var marked$2 = require('marked');
var Dependencies = (function () {
    function Dependencies(files, options) {
        this.__cache = {};
        this.__nsModule = {};
        this.unknown = '???';
        this.configuration = Configuration.getInstance();
        this.files = files;
        var transpileOptions = {
            target: ts.ScriptTarget.ES5,
            module: ts.ModuleKind.CommonJS,
            tsconfigDirectory: options.tsconfigDirectory
        };
        this.program = ts.createProgram(this.files, transpileOptions, compilerHost(transpileOptions));
    }
    Dependencies.prototype.getDependencies = function () {
        var _this = this;
        var deps = {
            'modules': [],
            'components': [],
            'injectables': [],
            'pipes': [],
            'directives': [],
            'routes': [],
            'classes': [],
            'interfaces': [],
            'miscellaneous': {
                variables: [],
                functions: [],
                typealiases: [],
                enumerations: [],
                types: []
            }
        };
        /*let sourceFiles = this.parseFiles(this.files) || [];
        fs.outputFile('CD.txt', util.inspect(sourceFiles, { showHidden: true, depth: 10 }), err => {
            console.log(err) // => null
        });*/
        var sourceFiles = this.program.getSourceFiles() || [];
        fs.outputFile('TS.txt', util.inspect(sourceFiles, { showHidden: true, depth: 10 }), function (err) {
            console.log(err); // => null
        });
        //process.exit(1);
        sourceFiles.map(function (file) {
            var filePath = file.fileName;
            if (path.extname(filePath) === '.ts') {
                if (filePath.lastIndexOf('.d.ts') === -1 && filePath.lastIndexOf('spec.ts') === -1) {
                    logger.info('parsing', filePath);
                    try {
                        _this.getSourceFileDecorators(file, deps);
                    }
                    catch (e) {
                        logger.error(e, file.fileName);
                    }
                }
            }
            return deps;
        });
        //RouterParser.printModulesRoutes();
        //RouterParser.printRoutes();
        /*if (RouterParser.incompleteRoutes.length > 0) {
            if (deps['miscellaneous']['variables'].length > 0) {
                RouterParser.fixIncompleteRoutes(deps['miscellaneous']['variables']);
            }
        }*/
        //$componentsTreeEngine.createTreesForComponents();
        RouterParser.linkModulesAndRoutes();
        RouterParser.constructModulesTree();
        deps.routesTree = RouterParser.constructRoutesTree();
        return deps;
    };
    Dependencies.prototype.parseFiles = function (fileNames) {
        var _parsedFiles = [];
        fileNames.forEach(function (fileName) {
            var sourceCode = fs.readFileSync(fileName).toString(), sourceFile = ts.createSourceFile(fileName, sourceCode, ts.ScriptTarget.ES5);
            _parsedFiles.push(sourceFile);
        });
        return _parsedFiles;
    };
    Dependencies.prototype.getSourceFileDecorators = function (srcFile, outputSymbols) {
        var _this = this;
        var cleaner = (process.cwd() + path.sep).replace(/\\/g, '/');
        var file = srcFile.fileName.replace(cleaner, '');
        this.programComponent = ts.createProgram([file], {});
        var sourceFile = this.programComponent.getSourceFile(file);
        this.typeCheckerComponent = this.programComponent.getTypeChecker(true);
        ts.forEachChild(srcFile, function (node) {
            var deps = {};
            if (node.decorators) {
                var visitNode = function (visitedNode, index) {
                    var metadata = node.decorators;
                    var name = _this.getSymboleName(node);
                    var props = _this.findProps(visitedNode);
                    var IO = _this.getComponentIO(file, sourceFile, node);
                    if (_this.isModule(metadata)) {
                        deps = {
                            name: name,
                            file: file,
                            providers: _this.getModuleProviders(props),
                            declarations: _this.getModuleDeclations(props),
                            imports: _this.getModuleImports(props),
                            exports: _this.getModuleExports(props),
                            bootstrap: _this.getModuleBootstrap(props),
                            type: 'module',
                            description: IO.description,
                            sourceCode: sourceFile.getText()
                        };
                        if (RouterParser.hasRouterModuleInImports(deps.imports)) {
                            RouterParser.addModuleWithRoutes(name, _this.getModuleImportsRaw(props));
                        }
                        RouterParser.addModule(name, deps.imports);
                        outputSymbols['modules'].push(deps);
                    }
                    else if (_this.isComponent(metadata)) {
                        if (props.length === 0)
                            return;
                        //console.log(util.inspect(props, { showHidden: true, depth: 10 }));
                        deps = {
                            name: name,
                            file: file,
                            //animations?: string[]; // TODO
                            changeDetection: _this.getComponentChangeDetection(props),
                            encapsulation: _this.getComponentEncapsulation(props),
                            //entryComponents?: string; // TODO waiting doc infos
                            exportAs: _this.getComponentExportAs(props),
                            host: _this.getComponentHost(props),
                            inputs: _this.getComponentInputsMetadata(props),
                            //interpolation?: string; // TODO waiting doc infos
                            moduleId: _this.getComponentModuleId(props),
                            outputs: _this.getComponentOutputs(props),
                            providers: _this.getComponentProviders(props),
                            //queries?: Deps[]; // TODO
                            selector: _this.getComponentSelector(props),
                            styleUrls: _this.getComponentStyleUrls(props),
                            styles: _this.getComponentStyles(props),
                            template: _this.getComponentTemplate(props),
                            templateUrl: _this.getComponentTemplateUrl(props),
                            viewProviders: _this.getComponentViewProviders(props),
                            inputsClass: IO.inputs,
                            outputsClass: IO.outputs,
                            propertiesClass: IO.properties,
                            methodsClass: IO.methods,
                            description: IO.description,
                            type: 'component',
                            sourceCode: sourceFile.getText()
                        };
                        if (IO.jsdoctags && IO.jsdoctags.length > 0) {
                            deps.jsdoctags = IO.jsdoctags[0].tags;
                        }
                        if (IO.constructor) {
                            deps.constructorObj = IO.constructor;
                        }
                        if (IO.extends) {
                            deps.extends = IO.extends;
                        }
                        if (IO.implements && IO.implements.length > 0) {
                            deps.implements = IO.implements;
                        }
                        $componentsTreeEngine.addComponent(deps);
                        outputSymbols['components'].push(deps);
                    }
                    else if (_this.isInjectable(metadata)) {
                        deps = {
                            name: name,
                            file: file,
                            type: 'injectable',
                            properties: IO.properties,
                            methods: IO.methods,
                            description: IO.description,
                            sourceCode: sourceFile.getText()
                        };
                        if (IO.constructor) {
                            deps.constructorObj = IO.constructor;
                        }
                        outputSymbols['injectables'].push(deps);
                    }
                    else if (_this.isPipe(metadata)) {
                        deps = {
                            name: name,
                            file: file,
                            type: 'pipe',
                            description: IO.description,
                            sourceCode: sourceFile.getText()
                        };
                        if (IO.jsdoctags && IO.jsdoctags.length > 0) {
                            deps.jsdoctags = IO.jsdoctags[0].tags;
                        }
                        outputSymbols['pipes'].push(deps);
                    }
                    else if (_this.isDirective(metadata)) {
                        if (props.length === 0)
                            return;
                        deps = {
                            name: name,
                            file: file,
                            type: 'directive',
                            description: IO.description,
                            sourceCode: sourceFile.getText(),
                            selector: _this.getComponentSelector(props),
                            providers: _this.getComponentProviders(props),
                            inputsClass: IO.inputs,
                            outputsClass: IO.outputs,
                            propertiesClass: IO.properties,
                            methodsClass: IO.methods
                        };
                        if (IO.jsdoctags && IO.jsdoctags.length > 0) {
                            deps.jsdoctags = IO.jsdoctags[0].tags;
                        }
                        if (IO.implements && IO.implements.length > 0) {
                            deps.implements = IO.implements;
                        }
                        if (IO.constructor) {
                            deps.constructorObj = IO.constructor;
                        }
                        outputSymbols['directives'].push(deps);
                    }
                    _this.debug(deps);
                    _this.__cache[name] = deps;
                };
                var filterByDecorators = function (node) {
                    if (node.expression && node.expression.expression) {
                        return /(NgModule|Component|Injectable|Pipe|Directive)/.test(node.expression.expression.text);
                    }
                    return false;
                };
                node.decorators
                    .filter(filterByDecorators)
                    .forEach(visitNode);
            }
            else if (node.symbol) {
                if (node.symbol.flags === ts.SymbolFlags.Class) {
                    var name = _this.getSymboleName(node);
                    var IO = _this.getClassIO(file, sourceFile, node);
                    deps = {
                        name: name,
                        file: file,
                        type: 'class',
                        sourceCode: sourceFile.getText()
                    };
                    if (IO.constructor) {
                        deps.constructorObj = IO.constructor;
                    }
                    if (IO.properties) {
                        deps.properties = IO.properties;
                    }
                    if (IO.description) {
                        deps.description = IO.description;
                    }
                    if (IO.methods) {
                        deps.methods = IO.methods;
                    }
                    if (IO.extends) {
                        deps.extends = IO.extends;
                    }
                    if (IO.implements && IO.implements.length > 0) {
                        deps.implements = IO.implements;
                    }
                    _this.debug(deps);
                    outputSymbols['classes'].push(deps);
                }
                else if (node.symbol.flags === ts.SymbolFlags.Interface) {
                    var name = _this.getSymboleName(node);
                    var IO = _this.getInterfaceIO(file, sourceFile, node);
                    deps = {
                        name: name,
                        file: file,
                        type: 'interface',
                        sourceCode: sourceFile.getText()
                    };
                    if (IO.properties) {
                        deps.properties = IO.properties;
                    }
                    if (IO.indexSignatures) {
                        deps.indexSignatures = IO.indexSignatures;
                    }
                    if (IO.kind) {
                        deps.kind = IO.kind;
                    }
                    if (IO.description) {
                        deps.description = IO.description;
                    }
                    if (IO.methods) {
                        deps.methods = IO.methods;
                    }
                    _this.debug(deps);
                    outputSymbols['interfaces'].push(deps);
                }
                else if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
                    var infos = _this.visitFunctionDeclaration(node), name = infos.name;
                    deps = {
                        name: name,
                        file: file
                    };
                    if (infos.args) {
                        deps.args = infos.args;
                    }
                    outputSymbols['miscellaneous'].functions.push(deps);
                }
                else if (node.kind === ts.SyntaxKind.EnumDeclaration) {
                    var infos = _this.visitEnumDeclaration(node), name = node.name.text;
                    deps = {
                        name: name,
                        childs: infos,
                        file: file
                    };
                    outputSymbols['miscellaneous'].enumerations.push(deps);
                }
            }
            else {
                var IO = _this.getRouteIO(file, sourceFile);
                if (IO.routes) {
                    var newRoutes = void 0;
                    try {
                        newRoutes = RouterParser.cleanRawRouteParsed(IO.routes);
                    }
                    catch (e) {
                        logger.error('Routes parsing error, maybe a trailing comma or an external variable, trying to fix that later after sources scanning.');
                        newRoutes = IO.routes.replace(/ /gm, '');
                        RouterParser.addIncompleteRoute({
                            data: newRoutes,
                            file: file
                        });
                        return true;
                    }
                    outputSymbols['routes'] = outputSymbols['routes'].concat(newRoutes);
                }
                if (node.kind === ts.SyntaxKind.ClassDeclaration) {
                    var name = _this.getSymboleName(node);
                    var IO_1 = _this.getClassIO(file, sourceFile, node);
                    deps = {
                        name: name,
                        file: file,
                        type: 'class',
                        sourceCode: sourceFile.getText()
                    };
                    if (IO_1.constructor) {
                        deps.constructorObj = IO_1.constructor;
                    }
                    if (IO_1.properties) {
                        deps.properties = IO_1.properties;
                    }
                    if (IO_1.indexSignatures) {
                        deps.indexSignatures = IO_1.indexSignatures;
                    }
                    if (IO_1.description) {
                        deps.description = IO_1.description;
                    }
                    if (IO_1.methods) {
                        deps.methods = IO_1.methods;
                    }
                    if (IO_1.extends) {
                        deps.extends = IO_1.extends;
                    }
                    if (IO_1.implements && IO_1.implements.length > 0) {
                        deps.implements = IO_1.implements;
                    }
                    _this.debug(deps);
                    outputSymbols['classes'].push(deps);
                }
                if (node.kind === ts.SyntaxKind.ExpressionStatement) {
                    var bootstrapModuleReference = 'bootstrapModule';
                    //Find the root module with bootstrapModule call
                    //1. find a simple call : platformBrowserDynamic().bootstrapModule(AppModule);
                    //2. or inside a call :
                    // () => {
                    //     platformBrowserDynamic().bootstrapModule(AppModule);
                    // });
                    //3. with a catch : platformBrowserDynamic().bootstrapModule(AppModule).catch(error => console.error(error));
                    //4. with parameters : platformBrowserDynamic().bootstrapModule(AppModule, {}).catch(error => console.error(error));
                    //Find recusively in expression nodes one with name 'bootstrapModule'
                    var rootModule_1, resultNode = void 0;
                    if (sourceFile.text.indexOf(bootstrapModuleReference) !== -1) {
                        if (node.expression) {
                            resultNode = _this.findExpressionByNameInExpressions(node.expression, 'bootstrapModule');
                        }
                        if (!resultNode) {
                            if (node.expression && node.expression.arguments && node.expression.arguments.length > 0) {
                                resultNode = _this.findExpressionByNameInExpressionArguments(node.expression.arguments, 'bootstrapModule');
                            }
                        }
                        if (resultNode) {
                            if (resultNode.arguments.length > 0) {
                                _.forEach(resultNode.arguments, function (argument) {
                                    if (argument.text) {
                                        rootModule_1 = argument.text;
                                    }
                                });
                            }
                            if (rootModule_1) {
                                RouterParser.setRootModule(rootModule_1);
                            }
                        }
                    }
                }
                if (node.kind === ts.SyntaxKind.VariableStatement && !_this.isVariableRoutes(node)) {
                    var infos = _this.visitVariableDeclaration(node), name = infos.name;
                    deps = {
                        name: name,
                        file: file
                    };
                    deps.type = (infos.type) ? infos.type : '';
                    if (infos.defaultValue) {
                        deps.defaultValue = infos.defaultValue;
                    }
                    if (node.jsDoc && node.jsDoc.length > 0 && node.jsDoc[0].comment) {
                        deps.description = marked$2(node.jsDoc[0].comment);
                    }
                    outputSymbols['miscellaneous'].variables.push(deps);
                }
                if (node.kind === ts.SyntaxKind.TypeAliasDeclaration) {
                    var infos = _this.visitTypeDeclaration(node), name = infos.name;
                    deps = {
                        name: name,
                        file: file
                    };
                    outputSymbols['miscellaneous'].types.push(deps);
                }
                if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
                    var infos = _this.visitFunctionDeclaration(node), name = infos.name;
                    deps = {
                        name: name,
                        file: file
                    };
                    if (infos.args) {
                        deps.args = infos.args;
                    }
                    outputSymbols['miscellaneous'].functions.push(deps);
                }
                if (node.kind === ts.SyntaxKind.EnumDeclaration) {
                    var infos = _this.visitEnumDeclaration(node), name = node.name.text;
                    deps = {
                        name: name,
                        childs: infos,
                        file: file
                    };
                    outputSymbols['miscellaneous'].enumerations.push(deps);
                }
            }
        });
    };
    Dependencies.prototype.debug = function (deps) {
        logger.debug('found', "" + deps.name);
        [
            'imports', 'exports', 'declarations', 'providers', 'bootstrap'
        ].forEach(function (symbols) {
            if (deps[symbols] && deps[symbols].length > 0) {
                logger.debug('', "- " + symbols + ":");
                deps[symbols].map(function (i) { return i.name; }).forEach(function (d) {
                    logger.debug('', "\t- " + d);
                });
            }
        });
    };
    Dependencies.prototype.isVariableRoutes = function (node) {
        var result = false;
        if (node.declarationList.declarations) {
            var i = 0, len = node.declarationList.declarations.length;
            for (i; i < len; i++) {
                if (node.declarationList.declarations[i].type) {
                    if (node.declarationList.declarations[i].type.typeName && node.declarationList.declarations[i].type.typeName.text === 'Routes') {
                        result = true;
                    }
                }
            }
        }
        return result;
    };
    Dependencies.prototype.findExpressionByNameInExpressions = function (entryNode, name) {
        var result, loop = function (node, name) {
            if (node.expression && !node.expression.name) {
                loop(node.expression, name);
            }
            if (node.expression && node.expression.name) {
                if (node.expression.name.text === name) {
                    result = node;
                }
                else {
                    loop(node.expression, name);
                }
            }
        };
        loop(entryNode, name);
        return result;
    };
    Dependencies.prototype.findExpressionByNameInExpressionArguments = function (arg, name) {
        var result, that = this, i = 0, len = arg.length, loop = function (node, name) {
            if (node.body) {
                if (node.body.statements && node.body.statements.length > 0) {
                    var j = 0, leng = node.body.statements.length;
                    for (j; j < leng; j++) {
                        result = that.findExpressionByNameInExpressions(node.body.statements[j], name);
                    }
                }
            }
        };
        for (i; i < len; i++) {
            loop(arg[i], name);
        }
        return result;
    };
    Dependencies.prototype.parseDecorators = function (decorators, type) {
        var result = false;
        if (decorators.length > 1) {
            _.forEach(decorators, function (decorator) {
                if (decorator.expression.expression) {
                    if (decorator.expression.expression.text === type) {
                        result = true;
                    }
                }
            });
        }
        else {
            if (decorators[0].expression.expression) {
                if (decorators[0].expression.expression.text === type) {
                    result = true;
                }
            }
        }
        return result;
    };
    Dependencies.prototype.isComponent = function (metadatas) {
        return this.parseDecorators(metadatas, 'Component');
    };
    Dependencies.prototype.isPipe = function (metadatas) {
        return this.parseDecorators(metadatas, 'Pipe');
    };
    Dependencies.prototype.isDirective = function (metadatas) {
        return this.parseDecorators(metadatas, 'Directive');
    };
    Dependencies.prototype.isInjectable = function (metadatas) {
        return this.parseDecorators(metadatas, 'Injectable');
    };
    Dependencies.prototype.isModule = function (metadatas) {
        return this.parseDecorators(metadatas, 'NgModule');
    };
    Dependencies.prototype.getType = function (name) {
        var type;
        if (name.toLowerCase().indexOf('component') !== -1) {
            type = 'component';
        }
        else if (name.toLowerCase().indexOf('pipe') !== -1) {
            type = 'pipe';
        }
        else if (name.toLowerCase().indexOf('module') !== -1) {
            type = 'module';
        }
        else if (name.toLowerCase().indexOf('directive') !== -1) {
            type = 'directive';
        }
        return type;
    };
    Dependencies.prototype.getSymboleName = function (node) {
        return node.name.text;
    };
    Dependencies.prototype.getComponentSelector = function (props) {
        return this.getSymbolDeps(props, 'selector').pop();
    };
    Dependencies.prototype.getComponentExportAs = function (props) {
        return this.getSymbolDeps(props, 'exportAs').pop();
    };
    Dependencies.prototype.getModuleProviders = function (props) {
        var _this = this;
        return this.getSymbolDeps(props, 'providers').map(function (providerName) {
            return _this.parseDeepIndentifier(providerName);
        });
    };
    Dependencies.prototype.findProps = function (visitedNode) {
        if (visitedNode.expression.arguments.length > 0) {
            return visitedNode.expression.arguments.pop().properties;
        }
        else {
            return '';
        }
    };
    Dependencies.prototype.getModuleDeclations = function (props) {
        var _this = this;
        return this.getSymbolDeps(props, 'declarations').map(function (name) {
            var component = _this.findComponentSelectorByName(name);
            if (component) {
                return component;
            }
            return _this.parseDeepIndentifier(name);
        });
    };
    Dependencies.prototype.getModuleImportsRaw = function (props) {
        return this.getSymbolDepsRaw(props, 'imports');
    };
    Dependencies.prototype.getModuleImports = function (props) {
        var _this = this;
        return this.getSymbolDeps(props, 'imports').map(function (name) {
            return _this.parseDeepIndentifier(name);
        });
    };
    Dependencies.prototype.getModuleExports = function (props) {
        var _this = this;
        return this.getSymbolDeps(props, 'exports').map(function (name) {
            return _this.parseDeepIndentifier(name);
        });
    };
    Dependencies.prototype.getComponentHost = function (props) {
        return this.getSymbolDepsObject(props, 'host');
    };
    Dependencies.prototype.getModuleBootstrap = function (props) {
        var _this = this;
        return this.getSymbolDeps(props, 'bootstrap').map(function (name) {
            return _this.parseDeepIndentifier(name);
        });
    };
    Dependencies.prototype.getComponentInputsMetadata = function (props) {
        return this.getSymbolDeps(props, 'inputs');
    };
    Dependencies.prototype.getDecoratorOfType = function (node, decoratorType) {
        var decorators = node.decorators || [];
        for (var i = 0; i < decorators.length; i++) {
            if (decorators[i].expression.expression) {
                if (decorators[i].expression.expression.text === decoratorType) {
                    return decorators[i];
                }
            }
        }
        return null;
    };
    Dependencies.prototype.visitInput = function (property, inDecorator, sourceFile) {
        var inArgs = inDecorator.expression.arguments, _return = {
            name: inArgs.length ? inArgs[0].text : property.name.text,
            defaultValue: property.initializer ? this.stringifyDefaultValue(property.initializer) : undefined,
            description: marked$2(LinkParser.resolveLinks(ts.displayPartsToString(property.symbol.getDocumentationComment()))),
            line: this.getPosition(property, sourceFile).line + 1
        };
        if (property.type) {
            _return.type = this.visitType(property);
        }
        else {
            // handle NewExpression
            if (property.initializer) {
                if (property.initializer.kind === ts.SyntaxKind.NewExpression) {
                    if (property.initializer.expression) {
                        _return.type = property.initializer.expression.text;
                    }
                }
            }
        }
        return _return;
    };
    Dependencies.prototype.visitType = function (node) {
        /**
         * Copyright https://github.com/ng-bootstrap/ng-bootstrap
         */
        var _return = 'void';
        if (node) {
            try {
                _return = this.typeCheckerComponent.typeToString(this.typeCheckerComponent.getTypeAtLocation(node));
            }
            catch (e) {
                _return = '';
            }
        }
        return _return;
    };
    Dependencies.prototype.visitOutput = function (property, outDecorator, sourceFile) {
        var outArgs = outDecorator.expression.arguments, _return = {
            name: outArgs.length ? outArgs[0].text : property.name.text,
            description: marked$2(LinkParser.resolveLinks(ts.displayPartsToString(property.symbol.getDocumentationComment()))),
            line: this.getPosition(property, sourceFile).line + 1
        };
        if (property.type) {
            _return.type = this.visitType(property);
        }
        else {
            // handle NewExpression
            if (property.initializer) {
                if (property.initializer.kind === ts.SyntaxKind.NewExpression) {
                    if (property.initializer.expression) {
                        _return.type = property.initializer.expression.text;
                    }
                }
            }
        }
        return _return;
    };
    Dependencies.prototype.isPublic = function (member) {
        if (member.modifiers) {
            var isPublic = member.modifiers.some(function (modifier) {
                return modifier.kind === ts.SyntaxKind.PublicKeyword;
            });
            if (isPublic) {
                return true;
            }
        }
        return this.isHiddenMember(member);
    };
    Dependencies.prototype.isPrivate = function (member) {
        /**
         * Copyright https://github.com/ng-bootstrap/ng-bootstrap
         */
        if (member.modifiers) {
            var isPrivate = member.modifiers.some(function (modifier) { return modifier.kind === ts.SyntaxKind.PrivateKeyword; });
            if (isPrivate) {
                return true;
            }
        }
        return this.isHiddenMember(member);
    };
    Dependencies.prototype.isInternal = function (member) {
        /**
         * Copyright https://github.com/ng-bootstrap/ng-bootstrap
         */
        var internalTags = ['internal'];
        if (member.jsDoc) {
            for (var _i = 0, _a = member.jsDoc; _i < _a.length; _i++) {
                var doc = _a[_i];
                if (doc.tags) {
                    for (var _b = 0, _c = doc.tags; _b < _c.length; _b++) {
                        var tag = _c[_b];
                        if (internalTags.indexOf(tag.tagName.text) > -1) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    };
    Dependencies.prototype.isHiddenMember = function (member) {
        /**
         * Copyright https://github.com/ng-bootstrap/ng-bootstrap
         */
        var internalTags = ['hidden'];
        if (member.jsDoc) {
            for (var _i = 0, _a = member.jsDoc; _i < _a.length; _i++) {
                var doc = _a[_i];
                if (doc.tags) {
                    for (var _b = 0, _c = doc.tags; _b < _c.length; _b++) {
                        var tag = _c[_b];
                        if (internalTags.indexOf(tag.tagName.text) > -1) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    };
    Dependencies.prototype.isAngularLifecycleHook = function (methodName) {
        /**
         * Copyright https://github.com/ng-bootstrap/ng-bootstrap
         */
        var ANGULAR_LIFECYCLE_METHODS = [
            'ngOnInit', 'ngOnChanges', 'ngDoCheck', 'ngOnDestroy', 'ngAfterContentInit', 'ngAfterContentChecked',
            'ngAfterViewInit', 'ngAfterViewChecked', 'writeValue', 'registerOnChange', 'registerOnTouched', 'setDisabledState'
        ];
        return ANGULAR_LIFECYCLE_METHODS.indexOf(methodName) >= 0;
    };
    Dependencies.prototype.visitConstructorDeclaration = function (method, sourceFile) {
        var _this = this;
        /**
         * Copyright https://github.com/ng-bootstrap/ng-bootstrap
         */
        var result = {
            name: 'constructor',
            description: marked$2(LinkParser.resolveLinks(ts.displayPartsToString(method.symbol.getDocumentationComment()))),
            args: method.parameters ? method.parameters.map(function (prop) { return _this.visitArgument(prop); }) : [],
            line: this.getPosition(method, sourceFile).line + 1
        }, jsdoctags = JSDocTagsParser.getJSDocs(method), markedtags = function (tags) {
            var mtags = tags;
            _.forEach(mtags, function (tag) {
                tag.comment = marked$2(LinkParser.resolveLinks(tag.comment));
            });
            return mtags;
        };
        if (method.modifiers) {
            if (method.modifiers.length > 0) {
                result.modifierKind = method.modifiers[0].kind;
            }
        }
        if (jsdoctags && jsdoctags.length >= 1) {
            if (jsdoctags[0].tags) {
                result.jsdoctags = markedtags(jsdoctags[0].tags);
            }
        }
        return result;
    };
    Dependencies.prototype.visitConstructorProperties = function (method) {
        var that = this;
        if (method.parameters) {
            var _parameters = [], i = 0, len = method.parameters.length;
            for (i; i < len; i++) {
                if (that.isPublic(method.parameters[i])) {
                    _parameters.push(that.visitArgument(method.parameters[i]));
                }
            }
            return _parameters;
        }
        else {
            return [];
        }
    };
    Dependencies.prototype.visitCallDeclaration = function (method, sourceFile) {
        var _this = this;
        return {
            description: marked$2(LinkParser.resolveLinks(ts.displayPartsToString(method.symbol.getDocumentationComment()))),
            args: method.parameters ? method.parameters.map(function (prop) { return _this.visitArgument(prop); }) : [],
            returnType: this.visitType(method.type),
            line: this.getPosition(method, sourceFile).line + 1
        };
    };
    Dependencies.prototype.visitIndexDeclaration = function (method, sourceFile) {
        var _this = this;
        return {
            description: marked$2(LinkParser.resolveLinks(ts.displayPartsToString(method.symbol.getDocumentationComment()))),
            args: method.parameters ? method.parameters.map(function (prop) { return _this.visitArgument(prop); }) : [],
            returnType: this.visitType(method.type),
            line: this.getPosition(method, sourceFile).line + 1
        };
    };
    Dependencies.prototype.getPosition = function (node, sourceFile) {
        var position;
        if (node['name'] && node['name'].end) {
            position = ts.getLineAndCharacterOfPosition(sourceFile, node['name'].end);
        }
        else {
            position = ts.getLineAndCharacterOfPosition(sourceFile, node.pos);
        }
        return position;
    };
    Dependencies.prototype.visitMethodDeclaration = function (method, sourceFile) {
        var _this = this;
        var result = {
            name: method.name.text,
            args: method.parameters ? method.parameters.map(function (prop) { return _this.visitArgument(prop); }) : [],
            returnType: this.visitType(method.type),
            line: this.getPosition(method, sourceFile).line + 1
        }, jsdoctags = JSDocTagsParser.getJSDocs(method), markedtags = function (tags) {
            var mtags = tags;
            _.forEach(mtags, function (tag) {
                tag.comment = marked$2(LinkParser.resolveLinks(tag.comment));
            });
            return mtags;
        };
        if (method.symbol) {
            result.description = marked$2(LinkParser.resolveLinks(ts.displayPartsToString(method.symbol.getDocumentationComment())));
        }
        if (method.decorators) {
            result.decorators = this.formatDecorators(method.decorators);
        }
        if (method.modifiers) {
            if (method.modifiers.length > 0) {
                result.modifierKind = method.modifiers[0].kind;
            }
        }
        if (jsdoctags && jsdoctags.length >= 1) {
            if (jsdoctags[0].tags) {
                result.jsdoctags = markedtags(jsdoctags[0].tags);
            }
        }
        return result;
    };
    Dependencies.prototype.visitArgument = function (arg) {
        /**
         * Copyright https://github.com/ng-bootstrap/ng-bootstrap
         */
        return {
            name: arg.name.text,
            type: this.visitType(arg)
        };
    };
    Dependencies.prototype.getNamesCompareFn = function (name) {
        /**
         * Copyright https://github.com/ng-bootstrap/ng-bootstrap
         */
        name = name || 'name';
        var t = function (a, b) {
            if (a[name]) {
                return a[name].localeCompare(b[name]);
            }
            else {
                return 0;
            }
        };
        return t;
    };
    Dependencies.prototype.stringifyDefaultValue = function (node) {
        /**
         * Copyright https://github.com/ng-bootstrap/ng-bootstrap
         */
        if (node.text) {
            return node.text;
        }
        else if (node.kind === ts.SyntaxKind.FalseKeyword) {
            return 'false';
        }
        else if (node.kind === ts.SyntaxKind.TrueKeyword) {
            return 'true';
        }
    };
    Dependencies.prototype.formatDecorators = function (decorators) {
        var _decorators = [];
        _.forEach(decorators, function (decorator) {
            if (decorator.expression) {
                if (decorator.expression.text) {
                    _decorators.push({
                        name: decorator.expression.text
                    });
                }
                if (decorator.expression.expression) {
                    var info = {
                        name: decorator.expression.expression.text
                    };
                    if (decorator.expression.expression.arguments) {
                        if (decorator.expression.expression.arguments.length > 0) {
                            info.args = decorator.expression.expression.arguments;
                        }
                    }
                    _decorators.push(info);
                }
            }
        });
        return _decorators;
    };
    Dependencies.prototype.visitProperty = function (property, sourceFile) {
        /**
         * Copyright https://github.com/ng-bootstrap/ng-bootstrap
         */
        var result = {
            name: property.name.text,
            defaultValue: property.initializer ? this.stringifyDefaultValue(property.initializer) : undefined,
            type: this.visitType(property),
            description: marked$2(LinkParser.resolveLinks(ts.displayPartsToString(property.symbol.getDocumentationComment()))),
            line: this.getPosition(property, sourceFile).line + 1
        };
        if (property.decorators) {
            result.decorators = this.formatDecorators(property.decorators);
        }
        if (property.modifiers) {
            if (property.modifiers.length > 0) {
                result.modifierKind = property.modifiers[0].kind;
            }
        }
        return result;
    };
    Dependencies.prototype.visitMembers = function (members, sourceFile) {
        /**
         * Copyright https://github.com/ng-bootstrap/ng-bootstrap
         */
        var inputs = [], outputs = [], methods = [], properties = [], indexSignatures = [], kind, inputDecorator, constructor, outDecorator;
        for (var i = 0; i < members.length; i++) {
            inputDecorator = this.getDecoratorOfType(members[i], 'Input');
            outDecorator = this.getDecoratorOfType(members[i], 'Output');
            kind = members[i].kind;
            if (inputDecorator) {
                inputs.push(this.visitInput(members[i], inputDecorator, sourceFile));
            }
            else if (outDecorator) {
                outputs.push(this.visitOutput(members[i], outDecorator, sourceFile));
            }
            else if (!this.isHiddenMember(members[i])) {
                if ((this.isPrivate(members[i]) || this.isInternal(members[i])) && this.configuration.mainData.disablePrivateOrInternalSupport) { }
                else {
                    if ((members[i].kind === ts.SyntaxKind.MethodDeclaration ||
                        members[i].kind === ts.SyntaxKind.MethodSignature)) {
                        methods.push(this.visitMethodDeclaration(members[i], sourceFile));
                    }
                    else if (members[i].kind === ts.SyntaxKind.PropertyDeclaration ||
                        members[i].kind === ts.SyntaxKind.PropertySignature || members[i].kind === ts.SyntaxKind.GetAccessor) {
                        properties.push(this.visitProperty(members[i], sourceFile));
                    }
                    else if (members[i].kind === ts.SyntaxKind.CallSignature) {
                        properties.push(this.visitCallDeclaration(members[i], sourceFile));
                    }
                    else if (members[i].kind === ts.SyntaxKind.IndexSignature) {
                        indexSignatures.push(this.visitIndexDeclaration(members[i], sourceFile));
                    }
                    else if (members[i].kind === ts.SyntaxKind.Constructor) {
                        var _constructorProperties = this.visitConstructorProperties(members[i]), j = 0, len = _constructorProperties.length;
                        for (j; j < len; j++) {
                            properties.push(_constructorProperties[j]);
                        }
                        constructor = this.visitConstructorDeclaration(members[i], sourceFile);
                    }
                }
            }
        }
        inputs.sort(this.getNamesCompareFn());
        outputs.sort(this.getNamesCompareFn());
        properties.sort(this.getNamesCompareFn());
        indexSignatures.sort(this.getNamesCompareFn());
        return {
            inputs: inputs,
            outputs: outputs,
            methods: methods,
            properties: properties,
            indexSignatures: indexSignatures,
            kind: kind,
            constructor: constructor
        };
    };
    Dependencies.prototype.visitDirectiveDecorator = function (decorator) {
        /**
         * Copyright https://github.com/ng-bootstrap/ng-bootstrap
         */
        var selector;
        var exportAs;
        var properties = decorator.expression.arguments[0].properties;
        for (var i = 0; i < properties.length; i++) {
            if (properties[i].name.text === 'selector') {
                // TODO: this will only work if selector is initialized as a string literal
                selector = properties[i].initializer.text;
            }
            if (properties[i].name.text === 'exportAs') {
                // TODO: this will only work if selector is initialized as a string literal
                exportAs = properties[i].initializer.text;
            }
        }
        return {
            selector: selector,
            exportAs: exportAs
        };
    };
    Dependencies.prototype.isPipeDecorator = function (decorator) {
        return (decorator.expression.expression) ? decorator.expression.expression.text === 'Pipe' : false;
    };
    Dependencies.prototype.isModuleDecorator = function (decorator) {
        return (decorator.expression.expression) ? decorator.expression.expression.text === 'NgModule' : false;
    };
    Dependencies.prototype.isDirectiveDecorator = function (decorator) {
        if (decorator.expression.expression) {
            var decoratorIdentifierText = decorator.expression.expression.text;
            return decoratorIdentifierText === 'Directive' || decoratorIdentifierText === 'Component';
        }
        else {
            return false;
        }
    };
    Dependencies.prototype.isServiceDecorator = function (decorator) {
        return (decorator.expression.expression) ? decorator.expression.expression.text === 'Injectable' : false;
    };
    Dependencies.prototype.visitClassDeclaration = function (fileName, classDeclaration, sourceFile) {
        /**
         * Copyright https://github.com/ng-bootstrap/ng-bootstrap
         */
        var symbol = this.program.getTypeChecker().getSymbolAtLocation(classDeclaration.name);
        var description = marked$2(LinkParser.resolveLinks(ts.displayPartsToString(symbol.getDocumentationComment())));
        var className = classDeclaration.name.text;
        var directiveInfo;
        var members;
        var implementsElements = [];
        var extendsElement;
        var jsdoctags = [];
        if (typeof ts.getClassImplementsHeritageClauseElements !== 'undefined') {
            var implementedTypes = ts.getClassImplementsHeritageClauseElements(classDeclaration);
            if (implementedTypes) {
                var i_1 = 0, len = implementedTypes.length;
                for (i_1; i_1 < len; i_1++) {
                    if (implementedTypes[i_1].expression) {
                        implementsElements.push(implementedTypes[i_1].expression.text);
                    }
                }
            }
        }
        if (typeof ts.getClassExtendsHeritageClauseElement !== 'undefined') {
            var extendsTypes = ts.getClassExtendsHeritageClauseElement(classDeclaration);
            if (extendsTypes) {
                if (extendsTypes.expression) {
                    extendsElement = extendsTypes.expression.text;
                }
            }
        }
        if (symbol.valueDeclaration) {
            jsdoctags = JSDocTagsParser.getJSDocs(symbol.valueDeclaration);
        }
        if (classDeclaration.decorators) {
            for (var i = 0; i < classDeclaration.decorators.length; i++) {
                if (this.isDirectiveDecorator(classDeclaration.decorators[i])) {
                    directiveInfo = this.visitDirectiveDecorator(classDeclaration.decorators[i]);
                    members = this.visitMembers(classDeclaration.members, sourceFile);
                    return {
                        description: description,
                        inputs: members.inputs,
                        outputs: members.outputs,
                        properties: members.properties,
                        methods: members.methods,
                        indexSignatures: members.indexSignatures,
                        kind: members.kind,
                        constructor: members.constructor,
                        jsdoctags: jsdoctags,
                        extends: extendsElement,
                        implements: implementsElements
                    };
                }
                else if (this.isServiceDecorator(classDeclaration.decorators[i])) {
                    members = this.visitMembers(classDeclaration.members, sourceFile);
                    return [{
                            fileName: fileName,
                            className: className,
                            description: description,
                            methods: members.methods,
                            indexSignatures: members.indexSignatures,
                            properties: members.properties,
                            kind: members.kind,
                            constructor: members.constructor,
                            extends: extendsElement,
                            implements: implementsElements
                        }];
                }
                else if (this.isPipeDecorator(classDeclaration.decorators[i]) || this.isModuleDecorator(classDeclaration.decorators[i])) {
                    return [{
                            fileName: fileName,
                            className: className,
                            description: description,
                            jsdoctags: jsdoctags
                        }];
                }
                else {
                    //console.log('custom decorator');
                }
            }
        }
        else if (description) {
            members = this.visitMembers(classDeclaration.members, sourceFile);
            return [{
                    description: description,
                    methods: members.methods,
                    indexSignatures: members.indexSignatures,
                    properties: members.properties,
                    kind: members.kind,
                    constructor: members.constructor,
                    extends: extendsElement,
                    implements: implementsElements
                }];
        }
        else {
            members = this.visitMembers(classDeclaration.members, sourceFile);
            return [{
                    methods: members.methods,
                    indexSignatures: members.indexSignatures,
                    properties: members.properties,
                    kind: members.kind,
                    constructor: members.constructor,
                    extends: extendsElement,
                    implements: implementsElements
                }];
        }
        return [];
    };
    Dependencies.prototype.visitTypeDeclaration = function (type) {
        var result = {
            name: type.name.text
        }, jsdoctags = JSDocTagsParser.getJSDocs(type);
        var markedtags = function (tags) {
            var mtags = tags;
            _.forEach(mtags, function (tag) {
                tag.comment = marked$2(LinkParser.resolveLinks(tag.comment));
            });
            return mtags;
        };
        if (jsdoctags && jsdoctags.length >= 1) {
            if (jsdoctags[0].tags) {
                result.jsdoctags = markedtags(jsdoctags[0].tags);
            }
        }
        return result;
    };
    Dependencies.prototype.visitFunctionDeclaration = function (method) {
        var mapTypes = function (type) {
            switch (type) {
                case 94:
                    return 'Null';
                case 118:
                    return 'Any';
                case 121:
                    return 'Boolean';
                case 129:
                    return 'Never';
                case 132:
                    return 'Number';
                case 134:
                    return 'String';
                case 137:
                    return 'Undefined';
                case 157:
                    return 'TypeReference';
            }
        };
        var visitArgument = function (arg) {
            var result = {
                name: arg.name.text
            };
            if (arg.type) {
                result.type = mapTypes(arg.type.kind);
                if (arg.type.kind === 157) {
                    //try replace TypeReference with typeName
                    if (arg.type.typeName) {
                        result.type = arg.type.typeName.text;
                    }
                }
            }
            return result;
        };
        var result = {
            name: method.name.text,
            args: method.parameters ? method.parameters.map(function (prop) { return visitArgument(prop); }) : []
        }, jsdoctags = JSDocTagsParser.getJSDocs(method);
        var markedtags = function (tags) {
            var mtags = tags;
            _.forEach(mtags, function (tag) {
                tag.comment = marked$2(LinkParser.resolveLinks(tag.comment));
            });
            return mtags;
        };
        if (typeof method.type !== 'undefined') {
            result.returnType = this.visitType(method.type);
        }
        if (method.modifiers) {
            if (method.modifiers.length > 0) {
                result.modifierKind = method.modifiers[0].kind;
            }
        }
        if (jsdoctags && jsdoctags.length >= 1) {
            if (jsdoctags[0].tags) {
                result.jsdoctags = markedtags(jsdoctags[0].tags);
            }
        }
        return result;
    };
    Dependencies.prototype.visitVariableDeclaration = function (node) {
        if (node.declarationList.declarations) {
            var i = 0, len = node.declarationList.declarations.length;
            for (i; i < len; i++) {
                var result = {
                    name: node.declarationList.declarations[i].name.text,
                    defaultValue: node.declarationList.declarations[i].initializer ? this.stringifyDefaultValue(node.declarationList.declarations[i].initializer) : undefined
                };
                if (node.declarationList.declarations[i].type) {
                    result.type = this.visitType(node.declarationList.declarations[i].type);
                }
                return result;
            }
        }
    };
    Dependencies.prototype.visitEnumDeclaration = function (node) {
        var result = [];
        if (node.members) {
            var i = 0, len = node.members.length;
            for (i; i < len; i++) {
                var member = {
                    name: node.members[i].name.text
                };
                if (node.members[i].initializer) {
                    member.value = node.members[i].initializer.text;
                }
                result.push(member);
            }
        }
        return result;
    };
    Dependencies.prototype.visitEnumDeclarationForRoutes = function (fileName, node) {
        if (node.declarationList.declarations) {
            var i = 0, len = node.declarationList.declarations.length;
            for (i; i < len; i++) {
                if (node.declarationList.declarations[i].type) {
                    if (node.declarationList.declarations[i].type.typeName && node.declarationList.declarations[i].type.typeName.text === 'Routes') {
                        var data = generate(node.declarationList.declarations[i].initializer);
                        RouterParser.addRoute({
                            name: node.declarationList.declarations[i].name.text,
                            data: RouterParser.cleanRawRoute(data),
                            file: fileName
                        });
                        return [{
                                routes: data
                            }];
                    }
                }
            }
        }
        return [];
    };
    Dependencies.prototype.getRouteIO = function (filename, sourceFile) {
        var _this = this;
        /**
         * Copyright https://github.com/ng-bootstrap/ng-bootstrap
         */
        var res = sourceFile.statements.reduce(function (directive, statement) {
            if (statement.kind === ts.SyntaxKind.VariableStatement) {
                return directive.concat(_this.visitEnumDeclarationForRoutes(filename, statement));
            }
            return directive;
        }, []);
        return res[0] || {};
    };
    Dependencies.prototype.getComponentIO = function (filename, sourceFile, node) {
        var _this = this;
        /**
         * Copyright https://github.com/ng-bootstrap/ng-bootstrap
         */
        var res = sourceFile.statements.reduce(function (directive, statement) {
            if (statement.kind === ts.SyntaxKind.ClassDeclaration) {
                if (statement.pos === node.pos && statement.end === node.end) {
                    return directive.concat(_this.visitClassDeclaration(filename, statement, sourceFile));
                }
            }
            return directive;
        }, []);
        return res[0] || {};
    };
    Dependencies.prototype.getClassIO = function (filename, sourceFile, node) {
        var _this = this;
        /**
         * Copyright https://github.com/ng-bootstrap/ng-bootstrap
         */
        var res = sourceFile.statements.reduce(function (directive, statement) {
            if (statement.kind === ts.SyntaxKind.ClassDeclaration) {
                if (statement.pos === node.pos && statement.end === node.end) {
                    return directive.concat(_this.visitClassDeclaration(filename, statement, sourceFile));
                }
            }
            return directive;
        }, []);
        return res[0] || {};
    };
    Dependencies.prototype.getInterfaceIO = function (filename, sourceFile, node) {
        var _this = this;
        /**
         * Copyright https://github.com/ng-bootstrap/ng-bootstrap
         */
        var res = sourceFile.statements.reduce(function (directive, statement) {
            if (statement.kind === ts.SyntaxKind.InterfaceDeclaration) {
                if (statement.pos === node.pos && statement.end === node.end) {
                    return directive.concat(_this.visitClassDeclaration(filename, statement, sourceFile));
                }
            }
            return directive;
        }, []);
        return res[0] || {};
    };
    Dependencies.prototype.getComponentOutputs = function (props) {
        return this.getSymbolDeps(props, 'outputs');
    };
    Dependencies.prototype.getComponentProviders = function (props) {
        var _this = this;
        return this.getSymbolDeps(props, 'providers').map(function (name) {
            return _this.parseDeepIndentifier(name);
        });
    };
    Dependencies.prototype.getComponentViewProviders = function (props) {
        var _this = this;
        return this.getSymbolDeps(props, 'viewProviders').map(function (name) {
            return _this.parseDeepIndentifier(name);
        });
    };
    Dependencies.prototype.getComponentDirectives = function (props) {
        var _this = this;
        return this.getSymbolDeps(props, 'directives').map(function (name) {
            var identifier = _this.parseDeepIndentifier(name);
            identifier.selector = _this.findComponentSelectorByName(name);
            identifier.label = '';
            return identifier;
        });
    };
    Dependencies.prototype.parseDeepIndentifier = function (name) {
        var nsModule = name.split('.'), type = this.getType(name);
        if (nsModule.length > 1) {
            // cache deps with the same namespace (i.e Shared.*)
            if (this.__nsModule[nsModule[0]]) {
                this.__nsModule[nsModule[0]].push(name);
            }
            else {
                this.__nsModule[nsModule[0]] = [name];
            }
            return {
                ns: nsModule[0],
                name: name,
                type: type
            };
        }
        return {
            name: name,
            type: type
        };
    };
    Dependencies.prototype.getComponentTemplateUrl = function (props) {
        return this.getSymbolDeps(props, 'templateUrl');
    };
    Dependencies.prototype.getComponentTemplate = function (props) {
        var t = this.getSymbolDeps(props, 'template', true).pop();
        if (t) {
            t = detectIndent(t, 0);
            t = t.replace(/\n/, '');
            t = t.replace(/ +$/gm, '');
        }
        return t;
    };
    Dependencies.prototype.getComponentStyleUrls = function (props) {
        return this.sanitizeUrls(this.getSymbolDeps(props, 'styleUrls'));
    };
    Dependencies.prototype.getComponentStyles = function (props) {
        return this.getSymbolDeps(props, 'styles');
    };
    Dependencies.prototype.getComponentModuleId = function (props) {
        return this.getSymbolDeps(props, 'moduleId').pop();
    };
    Dependencies.prototype.getComponentChangeDetection = function (props) {
        return this.getSymbolDeps(props, 'changeDetection').pop();
    };
    Dependencies.prototype.getComponentEncapsulation = function (props) {
        return this.getSymbolDeps(props, 'encapsulation');
    };
    Dependencies.prototype.sanitizeUrls = function (urls) {
        return urls.map(function (url) { return url.replace('./', ''); });
    };
    Dependencies.prototype.getSymbolDepsObject = function (props, type, multiLine) {
        var deps = props.filter(function (node) {
            return node.name.text === type;
        });
        var parseProperties = function (node) {
            var obj = {};
            (node.initializer.properties || []).forEach(function (prop) {
                obj[prop.name.text] = prop.initializer.text;
            });
            return obj;
        };
        return deps.map(parseProperties).pop();
    };
    Dependencies.prototype.getSymbolDepsRaw = function (props, type, multiLine) {
        var deps = props.filter(function (node) {
            return node.name.text === type;
        });
        return deps || [];
    };
    Dependencies.prototype.getSymbolDeps = function (props, type, multiLine) {
        var _this = this;
        var deps = props.filter(function (node) {
            return node.name.text === type;
        });
        var parseSymbolText = function (text) {
            return [
                text
            ];
        };
        var buildIdentifierName = function (node, name) {
            if (name === void 0) { name = ''; }
            if (node.expression) {
                name = name ? "." + name : name;
                var nodeName = _this.unknown;
                if (node.name) {
                    nodeName = node.name.text;
                }
                else if (node.text) {
                    nodeName = node.text;
                }
                else if (node.expression) {
                    if (node.expression.text) {
                        nodeName = node.expression.text;
                    }
                    else if (node.expression.elements) {
                        if (node.expression.kind === ts.SyntaxKind.ArrayLiteralExpression) {
                            nodeName = node.expression.elements.map(function (el) { return el.text; }).join(', ');
                            nodeName = "[" + nodeName + "]";
                        }
                    }
                }
                if (node.kind === ts.SyntaxKind.SpreadElement) {
                    return "..." + nodeName;
                }
                return "" + buildIdentifierName(node.expression, nodeName) + name;
            }
            return node.text + "." + name;
        };
        var parseProviderConfiguration = function (o) {
            // parse expressions such as:
            // { provide: APP_BASE_HREF, useValue: '/' },
            // or
            // { provide: 'Date', useFactory: (d1, d2) => new Date(), deps: ['d1', 'd2'] }
            var _genProviderName = [];
            var _providerProps = [];
            (o.properties || []).forEach(function (prop) {
                var identifier = prop.initializer.text;
                if (prop.initializer.kind === ts.SyntaxKind.StringLiteral) {
                    identifier = "'" + identifier + "'";
                }
                // lambda function (i.e useFactory)
                if (prop.initializer.body) {
                    var params = (prop.initializer.parameters || []).map(function (params) { return params.name.text; });
                    identifier = "(" + params.join(', ') + ") => {}";
                }
                else if (prop.initializer.elements) {
                    var elements = (prop.initializer.elements || []).map(function (n) {
                        if (n.kind === ts.SyntaxKind.StringLiteral) {
                            return "'" + n.text + "'";
                        }
                        return n.text;
                    });
                    identifier = "[" + elements.join(', ') + "]";
                }
                _providerProps.push([
                    // i.e provide
                    prop.name.text,
                    // i.e OpaqueToken or 'StringToken'
                    identifier
                ].join(': '));
            });
            return "{ " + _providerProps.join(', ') + " }";
        };
        var parseSymbolElements = function (o) {
            // parse expressions such as: AngularFireModule.initializeApp(firebaseConfig)
            if (o.arguments) {
                var className = buildIdentifierName(o.expression);
                // function arguments could be really complexe. There are so
                // many use cases that we can't handle. Just print "args" to indicate
                // that we have arguments.
                var functionArgs = o.arguments.length > 0 ? 'args' : '';
                var text = className + "(" + functionArgs + ")";
                return text;
            }
            else if (o.expression) {
                var identifier = buildIdentifierName(o);
                return identifier;
            }
            return o.text ? o.text : parseProviderConfiguration(o);
        };
        var parseSymbols = function (node) {
            var text = node.initializer.text;
            if (text) {
                return parseSymbolText(text);
            }
            else if (node.initializer.expression) {
                var identifier = parseSymbolElements(node.initializer);
                return [
                    identifier
                ];
            }
            else if (node.initializer.elements) {
                return node.initializer.elements.map(parseSymbolElements);
            }
        };
        return deps.map(parseSymbols).pop() || [];
    };
    Dependencies.prototype.findComponentSelectorByName = function (name) {
        return this.__cache[name];
    };
    return Dependencies;
}());

function promiseSequential(promises) {
    if (!Array.isArray(promises)) {
        throw new Error('First argument need to be an array of Promises');
    }
    return new Promise(function (resolve$$1, reject) {
        var count = 0;
        var results = [];
        var iterateeFunc = function (previousPromise, currentPromise) {
            return previousPromise
                .then(function (result) {
                if (count++ !== 0)
                    results = results.concat(result);
                return currentPromise(result, results, count);
            })
                .catch(function (err) {
                return reject(err);
            });
        };
        promises = promises.concat(function () { return Promise.resolve(); });
        promises
            .reduce(iterateeFunc, Promise.resolve(false))
            .then(function (res) {
            resolve$$1(results);
        });
    });
}

var glob = require('glob');
var marked = require('marked');
var chokidar = require('chokidar');
var pkg = require('../package.json');
var cwd = process.cwd();
var $htmlengine = new HtmlEngine();
var $fileengine = new FileEngine();
var $markdownengine = new MarkdownEngine();
var $ngdengine = new NgdEngine();
var $searchEngine = new SearchEngine();
var startTime = new Date();
var Application = (function () {
    /**
     * Create a new compodoc application instance.
     *
     * @param options An object containing the options that should be used.
     */
    function Application(options) {
        var _this = this;
        /**
         * Boolean for watching status
         * @type {boolean}
         */
        this.isWatching = false;
        this.preparePipes = function (somePipes) {
            logger.info('');
            logger.info('Prepare pipes');
            _this.configuration.mainData.pipes = (somePipes) ? somePipes : $dependenciesEngine.getPipes();
            return new Promise(function (resolve$$1, reject) {
                var i = 0, len = _this.configuration.mainData.pipes.length;
                for (i; i < len; i++) {
                    _this.configuration.addPage({
                        path: 'pipes',
                        name: _this.configuration.mainData.pipes[i].name,
                        context: 'pipe',
                        pipe: _this.configuration.mainData.pipes[i],
                        depth: 1,
                        pageType: COMPODOC_DEFAULTS.PAGE_TYPES.INTERNAL
                    });
                }
                resolve$$1();
            });
        };
        this.prepareClasses = function (someClasses) {
            logger.info('');
            logger.info('Prepare classes');
            _this.configuration.mainData.classes = (someClasses) ? someClasses : $dependenciesEngine.getClasses();
            return new Promise(function (resolve$$1, reject) {
                var i = 0, len = _this.configuration.mainData.classes.length;
                for (i; i < len; i++) {
                    _this.configuration.addPage({
                        path: 'classes',
                        name: _this.configuration.mainData.classes[i].name,
                        context: 'class',
                        class: _this.configuration.mainData.classes[i],
                        depth: 1,
                        pageType: COMPODOC_DEFAULTS.PAGE_TYPES.INTERNAL
                    });
                }
                resolve$$1();
            });
        };
        this.prepareDirectives = function (someDirectives) {
            logger.info('');
            logger.info('Prepare directives');
            _this.configuration.mainData.directives = (someDirectives) ? someDirectives : $dependenciesEngine.getDirectives();
            return new Promise(function (resolve$$1, reject) {
                var i = 0, len = _this.configuration.mainData.directives.length;
                for (i; i < len; i++) {
                    _this.configuration.addPage({
                        path: 'directives',
                        name: _this.configuration.mainData.directives[i].name,
                        context: 'directive',
                        directive: _this.configuration.mainData.directives[i],
                        depth: 1,
                        pageType: COMPODOC_DEFAULTS.PAGE_TYPES.INTERNAL
                    });
                }
                resolve$$1();
            });
        };
        this.configuration = Configuration.getInstance();
        for (var option in options) {
            if (typeof this.configuration.mainData[option] !== 'undefined') {
                this.configuration.mainData[option] = options[option];
            }
        }
    }
    /**
     * Start compodoc process
     */
    Application.prototype.generate = function () {
        var _this = this;
        $htmlengine.init().then(function () {
            _this.processPackageJson();
        });
    };
    /**
     * Start compodoc documentation coverage
     */
    Application.prototype.testCoverage = function () {
        this.getDependenciesData();
    };
    /**
     * Store files for initial processing
     * @param  {Array<string>} files Files found during source folder and tsconfig scan
     */
    Application.prototype.setFiles = function (files) {
        this.files = files;
    };
    /**
     * Store files for watch processing
     * @param  {Array<string>} files Files found during source folder and tsconfig scan
     */
    Application.prototype.setUpdatedFiles = function (files) {
        this.updatedFiles = files;
    };
    /**
     * Return a boolean indicating presence of one TypeScript file in updatedFiles list
     * @return {boolean} Result of scan
     */
    Application.prototype.hasWatchedFilesTSFiles = function () {
        var result = false;
        _.forEach(this.updatedFiles, function (file) {
            if (path.extname(file) === '.ts') {
                result = true;
            }
        });
        return false;
    };
    /**
     * Clear files for watch processing
     */
    Application.prototype.clearUpdatedFiles = function () {
        this.updatedFiles = [];
    };
    Application.prototype.processPackageJson = function () {
        var _this = this;
        logger.info('');
        logger.info('Searching package.json file');
        $fileengine.get('package.json').then(function (packageData) {
            var parsedData = JSON.parse(packageData);
            if (typeof parsedData.name !== 'undefined' && _this.configuration.mainData.documentationMainName === COMPODOC_DEFAULTS.title) {
                _this.configuration.mainData.documentationMainName = parsedData.name + ' documentation';
            }
            if (typeof parsedData.description !== 'undefined') {
                _this.configuration.mainData.documentationMainDescription = parsedData.description;
            }
            _this.configuration.mainData.angularVersion = getAngularVersionOfProject(parsedData);
            logger.info('package.json file found');
            _this.processMarkdown();
        }, function (errorMessage) {
            logger.error(errorMessage);
            logger.error('Continuing without package.json file');
            _this.processMarkdown();
        });
    };
    Application.prototype.processMarkdown = function () {
        var _this = this;
        logger.info('');
        logger.info('Searching README.md file');
        $markdownengine.getReadmeFile().then(function (readmeData) {
            _this.configuration.addPage({
                name: 'index',
                context: 'readme',
                depth: 0,
                pageType: COMPODOC_DEFAULTS.PAGE_TYPES.ROOT
            });
            _this.configuration.addPage({
                name: 'overview',
                context: 'overview',
                pageType: COMPODOC_DEFAULTS.PAGE_TYPES.ROOT
            });
            _this.configuration.mainData.readme = readmeData;
            logger.info('README.md file found');
            _this.getDependenciesData();
        }, function (errorMessage) {
            logger.error(errorMessage);
            logger.error('Continuing without README.md file');
            _this.configuration.addPage({
                name: 'index',
                context: 'overview'
            });
            _this.getDependenciesData();
        });
    };
    /**
     * Get dependency data for small group of updated files during watch process
     */
    Application.prototype.getMicroDependenciesData = function () {
        logger.info('');
        logger.info('Get diff dependencies data');
        var crawler = new Dependencies(this.updatedFiles, {
            tsconfigDirectory: path.dirname(this.configuration.mainData.tsconfig)
        });
        var dependenciesData = crawler.getDependencies();
        $dependenciesEngine.update(dependenciesData);
        this.prepareJustAFewThings(dependenciesData);
    };
    /**
     * Rebuild external documentation during watch process
     */
    Application.prototype.rebuildExternalDocumentation = function () {
        var _this = this;
        logger.info('');
        logger.info('Rebuild external documentation');
        var actions = [];
        this.configuration.resetAdditionalPages();
        if (this.configuration.mainData.includes !== '') {
            actions.push(function () { return _this.prepareExternalIncludes(); });
        }
        promiseSequential(actions)
            .then(function (res) {
            _this.processPages();
            _this.clearUpdatedFiles();
        })
            .catch(function (errorMessage) {
            logger.error(errorMessage);
        });
    };
    Application.prototype.getDependenciesData = function () {
        logger.info('');
        logger.info('Get dependencies data');
        var crawler = new Dependencies(this.files, {
            tsconfigDirectory: path.dirname(this.configuration.mainData.tsconfig)
        });
        //setTimeout(() => {
        var dependenciesData = crawler.getDependencies();
        $dependenciesEngine.init(dependenciesData);
        this.configuration.mainData.routesLength = RouterParser.routesLength();
        this.prepareEverything();
        //}, 5000);
    };
    Application.prototype.prepareJustAFewThings = function (diffCrawledData) {
        var _this = this;
        var actions = [];
        this.configuration.resetPages();
        actions.push(function () { return _this.prepareRoutes(); });
        if (diffCrawledData.modules.length > 0) {
            actions.push(function () { return _this.prepareModules(diffCrawledData.modules); });
        }
        if (diffCrawledData.components.length > 0) {
            actions.push(function () { return _this.prepareComponents(diffCrawledData.components); });
        }
        if (diffCrawledData.directives.length > 0) {
            actions.push(function () { return _this.prepareDirectives(diffCrawledData.directives); });
        }
        if (diffCrawledData.injectables.length > 0) {
            actions.push(function () { return _this.prepareInjectables(diffCrawledData.injectables); });
        }
        if (diffCrawledData.pipes.length > 0) {
            actions.push(function () { return _this.preparePipes(diffCrawledData.pipes); });
        }
        if (diffCrawledData.classes.length > 0) {
            actions.push(function () { return _this.prepareClasses(diffCrawledData.classes); });
        }
        if (diffCrawledData.interfaces.length > 0) {
            actions.push(function () { return _this.prepareInterfaces(diffCrawledData.interfaces); });
        }
        if (diffCrawledData.miscellaneous.variables.length > 0 ||
            diffCrawledData.miscellaneous.functions.length > 0 ||
            diffCrawledData.miscellaneous.typealiases.length > 0 ||
            diffCrawledData.miscellaneous.enumerations.length > 0 ||
            diffCrawledData.miscellaneous.types.length > 0) {
            actions.push(function () { return _this.prepareMiscellaneous(diffCrawledData.miscellaneous); });
        }
        if (!this.configuration.mainData.disableCoverage) {
            actions.push(function () { return _this.prepareCoverage(); });
        }
        promiseSequential(actions)
            .then(function (res) {
            _this.processGraphs();
            _this.clearUpdatedFiles();
        })
            .catch(function (errorMessage) {
            logger.error(errorMessage);
        });
    };
    Application.prototype.prepareEverything = function () {
        var _this = this;
        var actions = [];
        actions.push(function () { return _this.prepareModules(); });
        actions.push(function () { return _this.prepareComponents(); });
        if ($dependenciesEngine.directives.length > 0) {
            actions.push(function () { return _this.prepareDirectives(); });
        }
        if ($dependenciesEngine.injectables.length > 0) {
            actions.push(function () { return _this.prepareInjectables(); });
        }
        if ($dependenciesEngine.routes && $dependenciesEngine.routes.children.length > 0) {
            actions.push(function () { return _this.prepareRoutes(); });
        }
        if ($dependenciesEngine.pipes.length > 0) {
            actions.push(function () { return _this.preparePipes(); });
        }
        if ($dependenciesEngine.classes.length > 0) {
            actions.push(function () { return _this.prepareClasses(); });
        }
        if ($dependenciesEngine.interfaces.length > 0) {
            actions.push(function () { return _this.prepareInterfaces(); });
        }
        if ($dependenciesEngine.miscellaneous.variables.length > 0 ||
            $dependenciesEngine.miscellaneous.functions.length > 0 ||
            $dependenciesEngine.miscellaneous.typealiases.length > 0 ||
            $dependenciesEngine.miscellaneous.enumerations.length > 0 ||
            $dependenciesEngine.miscellaneous.types.length > 0) {
            actions.push(function () { return _this.prepareMiscellaneous(); });
        }
        if (!this.configuration.mainData.disableCoverage) {
            actions.push(function () { return _this.prepareCoverage(); });
        }
        if (this.configuration.mainData.includes !== '') {
            actions.push(function () { return _this.prepareExternalIncludes(); });
        }
        promiseSequential(actions)
            .then(function (res) {
            _this.processGraphs();
        })
            .catch(function (errorMessage) {
            logger.error(errorMessage);
        });
    };
    Application.prototype.prepareExternalIncludes = function () {
        var _this = this;
        logger.info('');
        logger.info('Adding external markdown files');
        //Scan include folder for files detailed in summary.json
        //For each file, add to this.configuration.mainData.additionalPages
        //Each file will be converted to html page, inside COMPODOC_DEFAULTS.additionalEntryPath
        return new Promise(function (resolve$$1, reject) {
            $fileengine.get(_this.configuration.mainData.includes + path.sep + 'summary.json').then(function (summaryData) {
                logger.info('Additional documentation: summary.json file found');
                var parsedSummaryData = JSON.parse(summaryData), i = 0, len = parsedSummaryData.length, loop = function () {
                    if (i <= len - 1) {
                        $markdownengine.get(_this.configuration.mainData.includes + path.sep + parsedSummaryData[i].file).then(function (markedData) {
                            _this.configuration.addAdditionalPage({
                                name: parsedSummaryData[i].title,
                                filename: cleanNameWithoutSpaceAndToLowerCase(parsedSummaryData[i].title),
                                context: 'additional-page',
                                path: _this.configuration.mainData.includesFolder,
                                additionalPage: markedData,
                                depth: 1,
                                pageType: COMPODOC_DEFAULTS.PAGE_TYPES.INTERNAL
                            });
                            if (parsedSummaryData[i].children && parsedSummaryData[i].children.length > 0) {
                                var j_1 = 0, leng_1 = parsedSummaryData[i].children.length, loopChild_1 = function () {
                                    if (j_1 <= leng_1 - 1) {
                                        $markdownengine.get(_this.configuration.mainData.includes + path.sep + parsedSummaryData[i].children[j_1].file).then(function (markedData) {
                                            _this.configuration.addAdditionalPage({
                                                name: parsedSummaryData[i].children[j_1].title,
                                                filename: cleanNameWithoutSpaceAndToLowerCase(parsedSummaryData[i].children[j_1].title),
                                                context: 'additional-page',
                                                path: _this.configuration.mainData.includesFolder + '/' + cleanNameWithoutSpaceAndToLowerCase(parsedSummaryData[i].title),
                                                additionalPage: markedData,
                                                depth: 2,
                                                pageType: COMPODOC_DEFAULTS.PAGE_TYPES.INTERNAL
                                            });
                                            j_1++;
                                            loopChild_1();
                                        }, function (e) {
                                            logger.error(e);
                                        });
                                    }
                                    else {
                                        i++;
                                        loop();
                                    }
                                };
                                loopChild_1();
                            }
                            else {
                                i++;
                                loop();
                            }
                        }, function (e) {
                            logger.error(e);
                        });
                    }
                    else {
                        resolve$$1();
                    }
                };
                loop();
            }, function (errorMessage) {
                logger.error(errorMessage);
                reject('Error during Additional documentation generation');
            });
        });
    };
    Application.prototype.prepareModules = function (someModules) {
        var _this = this;
        logger.info('');
        logger.info('Prepare modules');
        var i = 0, _modules = (someModules) ? someModules : $dependenciesEngine.getModules();
        return new Promise(function (resolve$$1, reject) {
            _this.configuration.mainData.modules = _modules.map(function (ngModule) {
                ['declarations', 'bootstrap', 'imports', 'exports'].forEach(function (metadataType) {
                    ngModule[metadataType] = ngModule[metadataType].filter(function (metaDataItem) {
                        switch (metaDataItem.type) {
                            case 'directive':
                                return $dependenciesEngine.getDirectives().some(function (directive) { return directive.name === metaDataItem.name; });
                            case 'component':
                                return $dependenciesEngine.getComponents().some(function (component) { return component.name === metaDataItem.name; });
                            case 'module':
                                return $dependenciesEngine.getModules().some(function (module) { return module.name === metaDataItem.name; });
                            case 'pipe':
                                return $dependenciesEngine.getPipes().some(function (pipe) { return pipe.name === metaDataItem.name; });
                            default:
                                return true;
                        }
                    });
                });
                ngModule.providers = ngModule.providers.filter(function (provider) {
                    return $dependenciesEngine.getInjectables().some(function (injectable) { return injectable.name === provider.name; });
                });
                return ngModule;
            });
            _this.configuration.addPage({
                name: 'modules',
                context: 'modules',
                depth: 0,
                pageType: COMPODOC_DEFAULTS.PAGE_TYPES.ROOT
            });
            var len = _this.configuration.mainData.modules.length;
            for (i; i < len; i++) {
                _this.configuration.addPage({
                    path: 'modules',
                    name: _this.configuration.mainData.modules[i].name,
                    context: 'module',
                    module: _this.configuration.mainData.modules[i],
                    depth: 1,
                    pageType: COMPODOC_DEFAULTS.PAGE_TYPES.INTERNAL
                });
            }
            resolve$$1();
        });
    };
    Application.prototype.prepareInterfaces = function (someInterfaces) {
        var _this = this;
        logger.info('');
        logger.info('Prepare interfaces');
        this.configuration.mainData.interfaces = (someInterfaces) ? someInterfaces : $dependenciesEngine.getInterfaces();
        return new Promise(function (resolve$$1, reject) {
            var i = 0, len = _this.configuration.mainData.interfaces.length;
            for (i; i < len; i++) {
                _this.configuration.addPage({
                    path: 'interfaces',
                    name: _this.configuration.mainData.interfaces[i].name,
                    context: 'interface',
                    interface: _this.configuration.mainData.interfaces[i],
                    depth: 1,
                    pageType: COMPODOC_DEFAULTS.PAGE_TYPES.INTERNAL
                });
            }
            resolve$$1();
        });
    };
    Application.prototype.prepareMiscellaneous = function (someMisc) {
        var _this = this;
        logger.info('');
        logger.info('Prepare miscellaneous');
        this.configuration.mainData.miscellaneous = (someMisc) ? someMisc : $dependenciesEngine.getMiscellaneous();
        return new Promise(function (resolve$$1, reject) {
            _this.configuration.addPage({
                name: 'miscellaneous',
                context: 'miscellaneous',
                depth: 0,
                pageType: COMPODOC_DEFAULTS.PAGE_TYPES.ROOT
            });
            resolve$$1();
        });
    };
    Application.prototype.prepareComponents = function (someComponents) {
        var _this = this;
        logger.info('');
        logger.info('Prepare components');
        this.configuration.mainData.components = (someComponents) ? someComponents : $dependenciesEngine.getComponents();
        return new Promise(function (mainResolve, reject) {
            var i = 0, len = _this.configuration.mainData.components.length, loop = function () {
                if (i <= len - 1) {
                    var dirname_1 = path.dirname(_this.configuration.mainData.components[i].file), handleTemplateurl_1 = function () {
                        return new Promise(function (resolve$$1, reject) {
                            var templatePath = path.resolve(dirname_1 + path.sep + _this.configuration.mainData.components[i].templateUrl);
                            if (fs.existsSync(templatePath)) {
                                fs.readFile(templatePath, 'utf8', function (err, data) {
                                    if (err) {
                                        logger.error(err);
                                        reject();
                                    }
                                    else {
                                        _this.configuration.mainData.components[i].templateData = data;
                                        resolve$$1();
                                    }
                                });
                            }
                            else {
                                logger.error("Cannot read template for " + _this.configuration.mainData.components[i].name);
                            }
                        });
                    };
                    if ($markdownengine.componentHasReadmeFile(_this.configuration.mainData.components[i].file)) {
                        logger.info(_this.configuration.mainData.components[i].name + " has a README file, include it");
                        var readmeFile = $markdownengine.componentReadmeFile(_this.configuration.mainData.components[i].file);
                        fs.readFile(readmeFile, 'utf8', function (err, data) {
                            if (err)
                                throw err;
                            _this.configuration.mainData.components[i].readme = marked(data);
                            _this.configuration.addPage({
                                path: 'components',
                                name: _this.configuration.mainData.components[i].name,
                                context: 'component',
                                component: _this.configuration.mainData.components[i],
                                depth: 1,
                                pageType: COMPODOC_DEFAULTS.PAGE_TYPES.INTERNAL
                            });
                            if (_this.configuration.mainData.components[i].templateUrl.length > 0) {
                                logger.info(_this.configuration.mainData.components[i].name + " has a templateUrl, include it");
                                handleTemplateurl_1().then(function () {
                                    i++;
                                    loop();
                                }, function (e) {
                                    logger.error(e);
                                });
                            }
                            else {
                                i++;
                                loop();
                            }
                        });
                    }
                    else {
                        _this.configuration.addPage({
                            path: 'components',
                            name: _this.configuration.mainData.components[i].name,
                            context: 'component',
                            component: _this.configuration.mainData.components[i],
                            depth: 1,
                            pageType: COMPODOC_DEFAULTS.PAGE_TYPES.INTERNAL
                        });
                        if (_this.configuration.mainData.components[i].templateUrl.length > 0) {
                            logger.info(_this.configuration.mainData.components[i].name + " has a templateUrl, include it");
                            handleTemplateurl_1().then(function () {
                                i++;
                                loop();
                            }, function (e) {
                                logger.error(e);
                            });
                        }
                        else {
                            i++;
                            loop();
                        }
                    }
                }
                else {
                    mainResolve();
                }
            };
            loop();
        });
    };
    Application.prototype.prepareInjectables = function (someInjectables) {
        var _this = this;
        logger.info('');
        logger.info('Prepare injectables');
        this.configuration.mainData.injectables = (someInjectables) ? someInjectables : $dependenciesEngine.getInjectables();
        return new Promise(function (resolve$$1, reject) {
            var i = 0, len = _this.configuration.mainData.injectables.length;
            for (i; i < len; i++) {
                _this.configuration.addPage({
                    path: 'injectables',
                    name: _this.configuration.mainData.injectables[i].name,
                    context: 'injectable',
                    injectable: _this.configuration.mainData.injectables[i],
                    depth: 1,
                    pageType: COMPODOC_DEFAULTS.PAGE_TYPES.INTERNAL
                });
            }
            resolve$$1();
        });
    };
    Application.prototype.prepareRoutes = function () {
        var _this = this;
        logger.info('');
        logger.info('Process routes');
        this.configuration.mainData.routes = $dependenciesEngine.getRoutes();
        return new Promise(function (resolve$$1, reject) {
            _this.configuration.addPage({
                name: 'routes',
                context: 'routes',
                depth: 0,
                pageType: COMPODOC_DEFAULTS.PAGE_TYPES.ROOT
            });
            RouterParser.generateRoutesIndex(_this.configuration.mainData.output, _this.configuration.mainData.routes).then(function () {
                logger.info('Routes index generated');
                resolve$$1();
            }, function (e) {
                logger.error(e);
                reject();
            });
        });
    };
    Application.prototype.prepareCoverage = function () {
        var _this = this;
        logger.info('');
        logger.info('Process documentation coverage report');
        return new Promise(function (resolve$$1, reject) {
            /*
             * loop with components, classes, injectables, interfaces, pipes
             */
            var files = [], totalProjectStatementDocumented = 0, getStatus = function (percent) {
                var status;
                if (percent <= 25) {
                    status = 'low';
                }
                else if (percent > 25 && percent <= 50) {
                    status = 'medium';
                }
                else if (percent > 50 && percent <= 75) {
                    status = 'good';
                }
                else {
                    status = 'good';
                }
                return status;
            };
            _.forEach(_this.configuration.mainData.components, function (component) {
                if (!component.propertiesClass ||
                    !component.methodsClass ||
                    !component.inputsClass ||
                    !component.outputsClass) {
                    return;
                }
                var cl = {
                    filePath: component.file,
                    type: component.type,
                    linktype: component.type,
                    name: component.name
                }, totalStatementDocumented = 0, totalStatements = component.propertiesClass.length + component.methodsClass.length + component.inputsClass.length + component.outputsClass.length + 1; // +1 for component decorator comment
                if (component.constructorObj) {
                    totalStatements += 1;
                    if (component.constructorObj.description !== '') {
                        totalStatementDocumented += 1;
                    }
                }
                if (component.description !== '') {
                    totalStatementDocumented += 1;
                }
                _.forEach(component.propertiesClass, function (property) {
                    if (property.modifierKind === 111) {
                        totalStatements -= 1;
                    }
                    if (property.description !== '' && property.modifierKind !== 111) {
                        totalStatementDocumented += 1;
                    }
                });
                _.forEach(component.methodsClass, function (method) {
                    if (method.modifierKind === 111) {
                        totalStatements -= 1;
                    }
                    if (method.description !== '' && method.modifierKind !== 111) {
                        totalStatementDocumented += 1;
                    }
                });
                _.forEach(component.inputsClass, function (input) {
                    if (input.modifierKind === 111) {
                        totalStatements -= 1;
                    }
                    if (input.description !== '' && input.modifierKind !== 111) {
                        totalStatementDocumented += 1;
                    }
                });
                _.forEach(component.outputsClass, function (output) {
                    if (output.modifierKind === 111) {
                        totalStatements -= 1;
                    }
                    if (output.description !== '' && output.modifierKind !== 111) {
                        totalStatementDocumented += 1;
                    }
                });
                cl.coveragePercent = Math.floor((totalStatementDocumented / totalStatements) * 100);
                if (totalStatements === 0) {
                    cl.coveragePercent = 0;
                }
                cl.coverageCount = totalStatementDocumented + '/' + totalStatements;
                cl.status = getStatus(cl.coveragePercent);
                totalProjectStatementDocumented += cl.coveragePercent;
                files.push(cl);
            });
            _.forEach(_this.configuration.mainData.classes, function (classe) {
                if (!classe.properties ||
                    !classe.methods) {
                    return;
                }
                var cl = {
                    filePath: classe.file,
                    type: 'class',
                    linktype: 'classe',
                    name: classe.name
                }, totalStatementDocumented = 0, totalStatements = classe.properties.length + classe.methods.length + 1; // +1 for class itself
                if (classe.constructorObj) {
                    totalStatements += 1;
                    if (classe.constructorObj.description !== '') {
                        totalStatementDocumented += 1;
                    }
                }
                if (classe.description !== '') {
                    totalStatementDocumented += 1;
                }
                _.forEach(classe.properties, function (property) {
                    if (property.modifierKind === 111) {
                        totalStatements -= 1;
                    }
                    if (property.description !== '' && property.modifierKind !== 111) {
                        totalStatementDocumented += 1;
                    }
                });
                _.forEach(classe.methods, function (method) {
                    if (method.modifierKind === 111) {
                        totalStatements -= 1;
                    }
                    if (method.description !== '' && method.modifierKind !== 111) {
                        totalStatementDocumented += 1;
                    }
                });
                cl.coveragePercent = Math.floor((totalStatementDocumented / totalStatements) * 100);
                if (totalStatements === 0) {
                    cl.coveragePercent = 0;
                }
                cl.coverageCount = totalStatementDocumented + '/' + totalStatements;
                cl.status = getStatus(cl.coveragePercent);
                totalProjectStatementDocumented += cl.coveragePercent;
                files.push(cl);
            });
            _.forEach(_this.configuration.mainData.injectables, function (injectable) {
                if (!injectable.properties ||
                    !injectable.methods) {
                    return;
                }
                var cl = {
                    filePath: injectable.file,
                    type: injectable.type,
                    linktype: injectable.type,
                    name: injectable.name
                }, totalStatementDocumented = 0, totalStatements = injectable.properties.length + injectable.methods.length + 1; // +1 for injectable itself
                if (injectable.constructorObj) {
                    totalStatements += 1;
                    if (injectable.constructorObj.description !== '') {
                        totalStatementDocumented += 1;
                    }
                }
                if (injectable.description !== '') {
                    totalStatementDocumented += 1;
                }
                _.forEach(injectable.properties, function (property) {
                    if (property.modifierKind === 111) {
                        totalStatements -= 1;
                    }
                    if (property.description !== '' && property.modifierKind !== 111) {
                        totalStatementDocumented += 1;
                    }
                });
                _.forEach(injectable.methods, function (method) {
                    if (method.modifierKind === 111) {
                        totalStatements -= 1;
                    }
                    if (method.description !== '' && method.modifierKind !== 111) {
                        totalStatementDocumented += 1;
                    }
                });
                cl.coveragePercent = Math.floor((totalStatementDocumented / totalStatements) * 100);
                if (totalStatements === 0) {
                    cl.coveragePercent = 0;
                }
                cl.coverageCount = totalStatementDocumented + '/' + totalStatements;
                cl.status = getStatus(cl.coveragePercent);
                totalProjectStatementDocumented += cl.coveragePercent;
                files.push(cl);
            });
            _.forEach(_this.configuration.mainData.interfaces, function (inter) {
                if (!inter.properties ||
                    !inter.methods) {
                    return;
                }
                var cl = {
                    filePath: inter.file,
                    type: inter.type,
                    linktype: inter.type,
                    name: inter.name
                }, totalStatementDocumented = 0, totalStatements = inter.properties.length + inter.methods.length + 1; // +1 for interface itself
                if (inter.constructorObj) {
                    totalStatements += 1;
                    if (inter.constructorObj.description !== '') {
                        totalStatementDocumented += 1;
                    }
                }
                if (inter.description !== '') {
                    totalStatementDocumented += 1;
                }
                _.forEach(inter.properties, function (property) {
                    if (property.modifierKind === 111) {
                        totalStatements -= 1;
                    }
                    if (property.description !== '' && property.modifierKind !== 111) {
                        totalStatementDocumented += 1;
                    }
                });
                _.forEach(inter.methods, function (method) {
                    if (method.modifierKind === 111) {
                        totalStatements -= 1;
                    }
                    if (method.description !== '' && method.modifierKind !== 111) {
                        totalStatementDocumented += 1;
                    }
                });
                cl.coveragePercent = Math.floor((totalStatementDocumented / totalStatements) * 100);
                if (totalStatements === 0) {
                    cl.coveragePercent = 0;
                }
                cl.coverageCount = totalStatementDocumented + '/' + totalStatements;
                cl.status = getStatus(cl.coveragePercent);
                totalProjectStatementDocumented += cl.coveragePercent;
                files.push(cl);
            });
            _.forEach(_this.configuration.mainData.pipes, function (pipe) {
                var cl = {
                    filePath: pipe.file,
                    type: pipe.type,
                    linktype: pipe.type,
                    name: pipe.name
                }, totalStatementDocumented = 0, totalStatements = 1;
                if (pipe.description !== '') {
                    totalStatementDocumented += 1;
                }
                cl.coveragePercent = Math.floor((totalStatementDocumented / totalStatements) * 100);
                cl.coverageCount = totalStatementDocumented + '/' + totalStatements;
                cl.status = getStatus(cl.coveragePercent);
                totalProjectStatementDocumented += cl.coveragePercent;
                files.push(cl);
            });
            files = _.sortBy(files, ['filePath']);
            var coverageData = {
                count: (files.length > 0) ? Math.floor(totalProjectStatementDocumented / files.length) : 0,
                status: ''
            };
            coverageData.status = getStatus(coverageData.count);
            _this.configuration.addPage({
                name: 'coverage',
                context: 'coverage',
                files: files,
                data: coverageData,
                depth: 0,
                pageType: COMPODOC_DEFAULTS.PAGE_TYPES.ROOT
            });
            $htmlengine.generateCoverageBadge(_this.configuration.mainData.output, coverageData);
            if (_this.configuration.mainData.coverageTest) {
                if (coverageData.count >= _this.configuration.mainData.coverageTestThreshold) {
                    logger.info('Documentation coverage is over threshold');
                    process.exit(0);
                }
                else {
                    logger.error('Documentation coverage is not over threshold');
                    process.exit(1);
                }
            }
            else {
                resolve$$1();
            }
        });
    };
    Application.prototype.processPages = function () {
        var _this = this;
        logger.info('');
        logger.info('Process pages');
        var pages = this.configuration.pages, i = 0, len = pages.length, loop = function () {
            if (i <= len - 1) {
                logger.info('Process page', pages[i].name);
                $htmlengine.render(_this.configuration.mainData, pages[i]).then(function (htmlData) {
                    var finalPath = _this.configuration.mainData.output;
                    if (_this.configuration.mainData.output.lastIndexOf('/') === -1) {
                        finalPath += '/';
                    }
                    if (pages[i].path) {
                        finalPath += pages[i].path + '/';
                    }
                    finalPath += pages[i].name + '.html';
                    $searchEngine.indexPage({
                        infos: pages[i],
                        rawData: htmlData,
                        url: finalPath
                    });
                    fs.outputFile(path.resolve(finalPath), htmlData, function (err) {
                        if (err) {
                            logger.error('Error during ' + pages[i].name + ' page generation');
                        }
                        else {
                            i++;
                            loop();
                        }
                    });
                }, function (errorMessage) {
                    logger.error(errorMessage);
                });
            }
            else {
                $searchEngine.generateSearchIndexJson(_this.configuration.mainData.output).then(function () {
                    if (_this.configuration.mainData.additionalPages.length > 0) {
                        _this.processAdditionalPages();
                    }
                    else {
                        if (_this.configuration.mainData.assetsFolder !== '') {
                            _this.processAssetsFolder();
                        }
                        _this.processResources();
                    }
                }, function (e) {
                    logger.error(e);
                });
            }
        };
        loop();
    };
    Application.prototype.processAdditionalPages = function () {
        var _this = this;
        logger.info('');
        logger.info('Process additional pages');
        var pages = this.configuration.mainData.additionalPages, i = 0, len = pages.length, loop = function () {
            if (i <= len - 1) {
                logger.info('Process page', pages[i].name);
                $htmlengine.render(_this.configuration.mainData, pages[i]).then(function (htmlData) {
                    var finalPath = _this.configuration.mainData.output;
                    if (_this.configuration.mainData.output.lastIndexOf('/') === -1) {
                        finalPath += '/';
                    }
                    if (pages[i].path) {
                        finalPath += pages[i].path + '/';
                    }
                    finalPath += pages[i].filename + '.html';
                    $searchEngine.indexPage({
                        infos: pages[i],
                        rawData: htmlData,
                        url: finalPath
                    });
                    fs.outputFile(path.resolve(finalPath), htmlData, function (err) {
                        if (err) {
                            logger.error('Error during ' + pages[i].name + ' page generation');
                        }
                        else {
                            i++;
                            loop();
                        }
                    });
                }, function (errorMessage) {
                    logger.error(errorMessage);
                });
            }
            else {
                $searchEngine.generateSearchIndexJson(_this.configuration.mainData.output).then(function () {
                    if (_this.configuration.mainData.assetsFolder !== '') {
                        _this.processAssetsFolder();
                    }
                    _this.processResources();
                }, function (e) {
                    logger.error(e);
                });
            }
        };
        loop();
    };
    Application.prototype.processAssetsFolder = function () {
        logger.info('');
        logger.info('Copy assets folder');
        if (!fs.existsSync(this.configuration.mainData.assetsFolder)) {
            logger.error("Provided assets folder " + this.configuration.mainData.assetsFolder + " did not exist");
        }
        else {
            fs.copy(path.resolve(this.configuration.mainData.assetsFolder), path.resolve(process.cwd() + path.sep + this.configuration.mainData.output + path.sep + this.configuration.mainData.assetsFolder), function (err) {
                if (err) {
                    logger.error('Error during resources copy ', err);
                }
            });
        }
    };
    Application.prototype.processResources = function () {
        var _this = this;
        logger.info('');
        logger.info('Copy main resources');
        var onComplete = function () {
            var finalTime = (new Date() - startTime) / 1000;
            logger.info('');
            logger.info('Documentation generated in ' + _this.configuration.mainData.output + ' in ' + finalTime + ' seconds using ' + _this.configuration.mainData.theme + ' theme');
            if (_this.configuration.mainData.serve) {
                logger.info("Serving documentation from " + _this.configuration.mainData.output + " at http://127.0.0.1:" + _this.configuration.mainData.port);
                _this.runWebServer(_this.configuration.mainData.output);
            }
        };
        var finalOutput = this.configuration.mainData.output.replace(process.cwd(), '');
        fs.copy(path.resolve(__dirname + '/../src/resources/'), path.resolve(process.cwd() + path.sep + finalOutput), function (err) {
            if (err) {
                logger.error('Error during resources copy ', err);
            }
            else {
                if (_this.configuration.mainData.extTheme) {
                    fs.copy(path.resolve(process.cwd() + path.sep + _this.configuration.mainData.extTheme), path.resolve(process.cwd() + path.sep + finalOutput + '/styles/'), function (err) {
                        if (err) {
                            logger.error('Error during external styling theme copy ', err);
                        }
                        else {
                            logger.info('External styling theme copy succeeded');
                            onComplete();
                        }
                    });
                }
                else {
                    onComplete();
                }
            }
        });
    };
    Application.prototype.processGraphs = function () {
        var _this = this;
        if (this.configuration.mainData.disableGraph) {
            logger.info('');
            logger.info('Graph generation disabled');
            this.processPages();
        }
        else {
            logger.info('');
            logger.info('Process main graph');
            logger.info('');
            var modules_1 = this.configuration.mainData.modules, i_1 = 0, len_1 = modules_1.length, loop_1 = function () {
                if (i_1 <= len_1 - 1) {
                    logger.info('Process module graph', modules_1[i_1].name);
                    var finalPath_1 = _this.configuration.mainData.output;
                    if (_this.configuration.mainData.output.lastIndexOf('/') === -1) {
                        finalPath_1 += '/';
                    }
                    finalPath_1 += 'modules/' + modules_1[i_1].name;
                    $ngdengine.renderGraph(modules_1[i_1].file, finalPath_1, 'f', modules_1[i_1].name).then(function () {
                        $ngdengine.readGraph(path.resolve(finalPath_1 + path.sep + 'dependencies.svg'), modules_1[i_1].name).then(function (data) {
                            modules_1[i_1].graph = data;
                            i_1++;
                            loop_1();
                        }, function (err) {
                            logger.error('Error during graph read: ', err);
                        });
                    }, function (errorMessage) {
                        logger.error(errorMessage);
                    });
                }
                else {
                    _this.processPages();
                }
            };
            var finalMainGraphPath_1 = this.configuration.mainData.output;
            if (finalMainGraphPath_1.lastIndexOf('/') === -1) {
                finalMainGraphPath_1 += '/';
            }
            finalMainGraphPath_1 += 'graph';
            $ngdengine.renderGraph(this.configuration.mainData.tsconfig, path.resolve(finalMainGraphPath_1), 'p').then(function () {
                $ngdengine.readGraph(path.resolve(finalMainGraphPath_1 + path.sep + 'dependencies.svg'), 'Main graph').then(function (data) {
                    _this.configuration.mainData.mainGraph = data;
                    loop_1();
                }, function (err) {
                    logger.error('Error during graph read: ', err);
                });
            }, function (err) {
                logger.error('Error during graph generation: ', err);
            });
        }
    };
    Application.prototype.runWebServer = function (folder) {
        if (!this.isWatching) {
            LiveServer.start({
                root: folder,
                open: this.configuration.mainData.open,
                quiet: true,
                logLevel: 0,
                wait: 1000,
                port: this.configuration.mainData.port
            });
        }
        if (this.configuration.mainData.watch && !this.isWatching) {
            this.runWatch();
        }
        else if (this.configuration.mainData.watch && this.isWatching) {
            var srcFolder = findMainSourceFolder(this.files);
            logger.info('');
            logger.info("Already watching sources in " + srcFolder + " folder");
        }
    };
    Application.prototype.runWatch = function () {
        var _this = this;
        var srcFolder = findMainSourceFolder(this.files), watchChangedFiles = [];
        this.isWatching = true;
        logger.info('');
        logger.info("Watching sources in " + srcFolder + " folder");
        var watcher = chokidar.watch(srcFolder, {
            awaitWriteFinish: true,
            ignored: /(spec|\.d)\.ts/
        }), timerAddAndRemoveRef, timerChangeRef, waiterAddAndRemove = function () {
            clearTimeout(timerAddAndRemoveRef);
            timerAddAndRemoveRef = setTimeout(runnerAddAndRemove, 1000);
        }, runnerAddAndRemove = function () {
            _this.generate();
        }, waiterChange = function () {
            clearTimeout(timerChangeRef);
            timerChangeRef = setTimeout(runnerChange, 1000);
        }, runnerChange = function () {
            _this.setUpdatedFiles(watchChangedFiles);
            if (_this.hasWatchedFilesTSFiles()) {
                _this.getMicroDependenciesData();
            }
            else {
                _this.rebuildExternalDocumentation();
            }
        };
        if (this.configuration.mainData.includes !== '') {
            watcher.add(this.configuration.mainData.includes);
        }
        watcher
            .on('ready', function () {
            watcher
                .on('add', function (file) {
                logger.debug("File " + file + " has been added");
                // Test extension, if ts
                // rescan everything
                if (path.extname(file) === '.ts') {
                    waiterAddAndRemove();
                }
            })
                .on('change', function (file) {
                logger.debug("File " + file + " has been changed");
                // Test extension, if ts
                // rescan only file
                if (path.extname(file) === '.ts') {
                    watchChangedFiles.push(path.join(process.cwd() + path.sep + file));
                    waiterChange();
                }
                if (path.extname(file) === '.md' || path.extname(file) === '.json') {
                    watchChangedFiles.push(path.join(process.cwd() + path.sep + file));
                    waiterChange();
                }
            })
                .on('unlink', function (file) {
                logger.debug("File " + file + " has been removed");
                // Test extension, if ts
                // rescan everything
                if (path.extname(file) === '.ts') {
                    waiterAddAndRemove();
                }
            });
        });
    };
    Object.defineProperty(Application.prototype, "application", {
        /**
         * Return the application / root component instance.
         */
        get: function () {
            return this;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Application.prototype, "isCLI", {
        get: function () {
            return false;
        },
        enumerable: true,
        configurable: true
    });
    return Application;
}());

var getCurrentDirectory = ts.sys.getCurrentDirectory;
var useCaseSensitiveFileNames = ts.sys.useCaseSensitiveFileNames;
var newLine = ts.sys.newLine;
function getNewLine() {
    return newLine;
}
function getCanonicalFileName(fileName) {
    return useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
}
var formatDiagnosticsHost = {
    getCurrentDirectory: getCurrentDirectory,
    getCanonicalFileName: getCanonicalFileName,
    getNewLine: getNewLine
};
function readConfig(configFile) {
    var result = ts.readConfigFile(configFile, ts.sys.readFile);
    if (result.error) {
        var message = ts.formatDiagnostics([result.error], formatDiagnosticsHost);
        throw new Error(message);
    }
    return result.config;
}


function handlePath(files, cwd) {
    var _files = files, i = 0, len = files.length;
    for (i; i < len; i++) {
        if (files[i].indexOf(cwd) === -1) {
            files[i] = path.resolve(cwd + path.sep + files[i]);
        }
    }
    return _files;
}

var pkg$2 = require('../package.json');
var program = require('commander');
var glob$1 = require('glob');
var os = require('os');
var osName = require('os-name');
var files = [];
var cwd$1 = process.cwd();
process.setMaxListeners(0);
var CliApplication = (function (_super) {
    __extends(CliApplication, _super);
    function CliApplication() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * Run compodoc from the command line.
     */
    CliApplication.prototype.generate = function () {
        function list(val) {
            return val.split(',');
        }
        program
            .version(pkg$2.version)
            .usage('<src> [options]')
            .option('-p, --tsconfig [config]', 'A tsconfig.json file')
            .option('-d, --output [folder]', 'Where to store the generated documentation (default: ./documentation)', COMPODOC_DEFAULTS.folder)
            .option('-y, --extTheme [file]', 'External styling theme file')
            .option('-n, --name [name]', 'Title documentation', COMPODOC_DEFAULTS.title)
            .option('-a, --assetsFolder [folder]', 'External assets folder to copy in generated documentation folder')
            .option('-o, --open', 'Open the generated documentation', false)
            .option('-t, --silent', 'In silent mode, log messages aren\'t logged in the console', false)
            .option('-s, --serve', 'Serve generated documentation (default http://localhost:8080/)', false)
            .option('-r, --port [port]', 'Change default serving port', COMPODOC_DEFAULTS.port)
            .option('-w, --watch', 'Watch source files after serve and force documentation rebuild', false)
            .option('--theme [theme]', 'Choose one of available themes, default is \'gitbook\' (laravel, original, postmark, readthedocs, stripe, vagrant)')
            .option('--hideGenerator', 'Do not print the Compodoc link at the bottom of the page', false)
            .option('--toggleMenuItems <items>', 'Close by default items in the menu example: \'all\' or \'modules\',\'components\',\'directives\',\'classes\',\'injectables\',\'interfaces\',\'pipes\',\'additionalPages\'', list)
            .option('--includes [path]', 'Path of external markdown files to include')
            .option('--includesName [name]', 'Name of item menu of externals markdown files (default "Additional documentation")', COMPODOC_DEFAULTS.additionalEntryName)
            .option('--coverageTest [threshold]', 'Test command of documentation coverage with a threshold (default 70)')
            .option('--disableSourceCode', 'Do not add source code tab', false)
            .option('--disableGraph', 'Do not add the dependency graph', false)
            .option('--disableCoverage', 'Do not add the documentation coverage report', false)
            .option('--disablePrivateOrInternalSupport', 'Do not show private or @internal in generated documentation', false)
            .parse(process.argv);
        var outputHelp = function () {
            program.outputHelp();
            process.exit(1);
        };
        if (program.output) {
            this.configuration.mainData.output = program.output;
        }
        if (program.extTheme) {
            this.configuration.mainData.extTheme = program.extTheme;
        }
        if (program.theme) {
            this.configuration.mainData.theme = program.theme;
        }
        if (program.name) {
            this.configuration.mainData.documentationMainName = program.name;
        }
        if (program.assetsFolder) {
            this.configuration.mainData.assetsFolder = program.assetsFolder;
        }
        if (program.open) {
            this.configuration.mainData.open = program.open;
        }
        if (program.toggleMenuItems) {
            this.configuration.mainData.toggleMenuItems = program.toggleMenuItems;
        }
        if (program.includes) {
            this.configuration.mainData.includes = program.includes;
        }
        if (program.includesName) {
            this.configuration.mainData.includesName = program.includesName;
        }
        if (program.silent) {
            logger.silent = false;
        }
        if (program.serve) {
            this.configuration.mainData.serve = program.serve;
        }
        if (program.port) {
            this.configuration.mainData.port = program.port;
        }
        if (program.watch) {
            this.configuration.mainData.watch = program.watch;
        }
        if (program.hideGenerator) {
            this.configuration.mainData.hideGenerator = program.hideGenerator;
        }
        if (program.includes) {
            this.configuration.mainData.includes = program.includes;
        }
        if (program.includesName) {
            this.configuration.mainData.includesName = program.includesName;
        }
        if (program.coverageTest) {
            this.configuration.mainData.coverageTest = true;
            this.configuration.mainData.coverageTestThreshold = (typeof program.coverageTest === 'string') ? parseInt(program.coverageTest) : COMPODOC_DEFAULTS.defaultCoverageThreshold;
        }
        if (program.disableSourceCode) {
            this.configuration.mainData.disableSourceCode = program.disableSourceCode;
        }
        if (program.disableGraph) {
            this.configuration.mainData.disableGraph = program.disableGraph;
        }
        if (program.disableCoverage) {
            this.configuration.mainData.disableCoverage = program.disableCoverage;
        }
        if (program.disablePrivateOrInternalSupport) {
            this.configuration.mainData.disablePrivateOrInternalSupport = program.disablePrivateOrInternalSupport;
        }
        if (!this.isWatching) {
            console.log(fs.readFileSync(path.join(__dirname, '../src/resources/images/banner')).toString());
            console.log(pkg$2.version);
            console.log('');
            console.log("Node.js version : " + process.version);
            console.log('');
            console.log("Operating system : " + osName(os.platform(), os.release()));
            console.log('');
        }
        if (program.serve && !program.tsconfig && program.output) {
            // if -s & -d, serve it
            if (!fs.existsSync(program.output)) {
                logger.error(program.output + " folder doesn't exist");
                process.exit(1);
            }
            else {
                logger.info("Serving documentation from " + program.output + " at http://127.0.0.1:" + program.port);
                _super.prototype.runWebServer.call(this, program.output);
            }
        }
        else if (program.serve && !program.tsconfig && !program.output) {
            // if only -s find ./documentation, if ok serve, else error provide -d
            if (!fs.existsSync(program.output)) {
                logger.error('Provide output generated folder with -d flag');
                process.exit(1);
            }
            else {
                logger.info("Serving documentation from " + program.output + " at http://127.0.0.1:" + program.port);
                _super.prototype.runWebServer.call(this, program.output);
            }
        }
        else {
            if (program.hideGenerator) {
                this.configuration.mainData.hideGenerator = true;
            }
            var defaultWalkFOlder = cwd$1 || '.', walk_1 = function (dir, exclude) {
                var results = [];
                var list = fs.readdirSync(dir);
                list.forEach(function (file) {
                    var excludeTest = _.find(exclude, function (o) {
                        var globFiles = glob$1.sync(o, {
                            cwd: cwd$1
                        });
                        if (globFiles.length > 0) {
                            var fileNameForGlobSearch_1 = path.join(dir, file).replace(cwd$1 + path.sep, ''), resultGlobSearch = globFiles.findIndex(function (element) {
                                return element === fileNameForGlobSearch_1;
                            }), test = resultGlobSearch !== -1;
                            if (test) {
                                logger.warn('Excluding', path.join(dir, file));
                            }
                            return test;
                        }
                        else {
                            var test = path.basename(o) === file;
                            if (test) {
                                logger.warn('Excluding', path.join(dir, file));
                            }
                            return test;
                        }
                    });
                    if (typeof excludeTest === 'undefined' && dir.indexOf('node_modules') < 0) {
                        file = path.join(dir, file);
                        var stat = fs.statSync(file);
                        if (stat && stat.isDirectory()) {
                            results = results.concat(walk_1(file, exclude));
                        }
                        else if (/(spec|\.d)\.ts/.test(file)) {
                            logger.warn('Ignoring', file);
                        }
                        else if (path.extname(file) === '.ts') {
                            logger.debug('Including', file);
                            results.push(file);
                        }
                    }
                });
                return results;
            };
            if (program.tsconfig && program.args.length === 0) {
                this.configuration.mainData.tsconfig = program.tsconfig;
                if (!fs.existsSync(program.tsconfig)) {
                    logger.error("\"" + program.tsconfig + "\" file was not found in the current directory");
                    process.exit(1);
                }
                else {
                    var _file = path.join(path.join(process.cwd(), path.dirname(this.configuration.mainData.tsconfig)), path.basename(this.configuration.mainData.tsconfig));
                    // use the current directory of tsconfig.json as a working directory
                    cwd$1 = _file.split(path.sep).slice(0, -1).join(path.sep);
                    logger.info('Using tsconfig', _file);
                    var tsConfigFile = readConfig(_file);
                    files = tsConfigFile.files;
                    if (files) {
                        files = handlePath(files, cwd$1);
                    }
                    if (!files) {
                        var exclude = tsConfigFile.exclude || [];
                        files = walk_1(cwd$1 || '.', exclude);
                    }
                    _super.prototype.setFiles.call(this, files);
                    _super.prototype.generate.call(this);
                }
            }
            else if (program.tsconfig && program.args.length > 0 && program.coverageTest) {
                logger.info('Run documentation coverage test');
                this.configuration.mainData.tsconfig = program.tsconfig;
                if (!fs.existsSync(program.tsconfig)) {
                    logger.error("\"" + program.tsconfig + "\" file was not found in the current directory");
                    process.exit(1);
                }
                else {
                    var _file = path.join(path.join(process.cwd(), path.dirname(this.configuration.mainData.tsconfig)), path.basename(this.configuration.mainData.tsconfig));
                    // use the current directory of tsconfig.json as a working directory
                    cwd$1 = _file.split(path.sep).slice(0, -1).join(path.sep);
                    logger.info('Using tsconfig', _file);
                    var tsConfigFile = readConfig(_file);
                    files = tsConfigFile.files;
                    if (files) {
                        files = handlePath(files, cwd$1);
                    }
                    if (!files) {
                        var exclude = tsConfigFile.exclude || [];
                        files = walk_1(cwd$1 || '.', exclude);
                    }
                    _super.prototype.setFiles.call(this, files);
                    _super.prototype.testCoverage.call(this);
                }
            }
            else if (program.tsconfig && program.args.length > 0) {
                this.configuration.mainData.tsconfig = program.tsconfig;
                var sourceFolder = program.args[0];
                if (!fs.existsSync(sourceFolder)) {
                    logger.error("Provided source folder " + sourceFolder + " was not found in the current directory");
                    process.exit(1);
                }
                else {
                    logger.info('Using provided source folder');
                    if (!fs.existsSync(program.tsconfig)) {
                        logger.error("\"" + program.tsconfig + "\" file was not found in the current directory");
                        process.exit(1);
                    }
                    else {
                        var tsConfigFile = readConfig(program.tsconfig);
                        var exclude = tsConfigFile.exclude || [];
                        files = walk_1(path.resolve(sourceFolder), exclude);
                        _super.prototype.setFiles.call(this, files);
                        _super.prototype.generate.call(this);
                    }
                }
            }
            else {
                logger.error('tsconfig.json file was not found, please use -p flag');
                outputHelp();
            }
        }
    };
    return CliApplication;
}(Application));

exports.Application = Application;
exports.CliApplication = CliApplication;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uL3NyYy9sb2dnZXIudHMiLCIuLi9zcmMvdXRpbHMvYW5ndWxhci1hcGkudHMiLCIuLi9zcmMvYXBwL2VuZ2luZXMvZGVwZW5kZW5jaWVzLmVuZ2luZS50cyIsIi4uL3NyYy91dGlscy9saW5rLXBhcnNlci50cyIsIi4uL3NyYy91dGlscy9kZWZhdWx0cy50cyIsIi4uL3NyYy9hcHAvY29uZmlndXJhdGlvbi50cyIsIi4uL3NyYy91dGlscy9hbmd1bGFyLXZlcnNpb24udHMiLCIuLi9zcmMvYXBwL2VuZ2luZXMvaHRtbC5lbmdpbmUuaGVscGVycy50cyIsIi4uL3NyYy9hcHAvZW5naW5lcy9odG1sLmVuZ2luZS50cyIsIi4uL3NyYy9hcHAvZW5naW5lcy9tYXJrZG93bi5lbmdpbmUudHMiLCIuLi9zcmMvYXBwL2VuZ2luZXMvZmlsZS5lbmdpbmUudHMiLCIuLi9zcmMvYXBwL2VuZ2luZXMvbmdkLmVuZ2luZS50cyIsIi4uL3NyYy9hcHAvZW5naW5lcy9zZWFyY2guZW5naW5lLnRzIiwiLi4vc3JjL3V0aWxpdGllcy50cyIsIi4uL3NyYy91dGlscy9yb3V0ZXIucGFyc2VyLnRzIiwiLi4vc3JjL3V0aWxzL2pzZG9jLnBhcnNlci50cyIsIi4uL3NyYy9hcHAvY29tcGlsZXIvY29kZWdlbi50cyIsIi4uL3NyYy9hcHAvZW5naW5lcy9jb21wb25lbnRzLXRyZWUuZW5naW5lLnRzIiwiLi4vc3JjL2FwcC9jb21waWxlci9kZXBlbmRlbmNpZXMudHMiLCIuLi9zcmMvdXRpbHMvcHJvbWlzZS1zZXF1ZW50aWFsLnRzIiwiLi4vc3JjL2FwcC9hcHBsaWNhdGlvbi50cyIsIi4uL3NyYy91dGlscy91dGlscy50cyIsIi4uL3NyYy9pbmRleC1jbGkudHMiXSwic291cmNlc0NvbnRlbnQiOlsibGV0IGd1dGlsID0gcmVxdWlyZSgnZ3VscC11dGlsJylcbmxldCBjID0gZ3V0aWwuY29sb3JzO1xubGV0IHBrZyA9IHJlcXVpcmUoJy4uL3BhY2thZ2UuanNvbicpO1xuXG5lbnVtIExFVkVMIHtcblx0SU5GTyxcblx0REVCVUcsXG4gICAgRVJST1IsXG4gICAgV0FSTlxufVxuXG5jbGFzcyBMb2dnZXIge1xuXG5cdG5hbWU7XG5cdGxvZ2dlcjtcblx0dmVyc2lvbjtcblx0c2lsZW50O1xuXG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHRoaXMubmFtZSA9IHBrZy5uYW1lO1xuXHRcdHRoaXMudmVyc2lvbiA9IHBrZy52ZXJzaW9uO1xuXHRcdHRoaXMubG9nZ2VyID0gZ3V0aWwubG9nO1xuXHRcdHRoaXMuc2lsZW50ID0gdHJ1ZTtcblx0fVxuXG5cdGluZm8oLi4uYXJncykge1xuXHRcdGlmKCF0aGlzLnNpbGVudCkgcmV0dXJuO1xuXHRcdHRoaXMubG9nZ2VyKFxuXHRcdFx0dGhpcy5mb3JtYXQoTEVWRUwuSU5GTywgLi4uYXJncylcblx0XHQpO1xuXHR9XG5cblx0ZXJyb3IoLi4uYXJncykge1xuXHRcdGlmKCF0aGlzLnNpbGVudCkgcmV0dXJuO1xuXHRcdHRoaXMubG9nZ2VyKFxuXHRcdFx0dGhpcy5mb3JtYXQoTEVWRUwuRVJST1IsIC4uLmFyZ3MpXG5cdFx0KTtcblx0fVxuXG4gICAgd2FybiguLi5hcmdzKSB7XG5cdFx0aWYoIXRoaXMuc2lsZW50KSByZXR1cm47XG5cdFx0dGhpcy5sb2dnZXIoXG5cdFx0XHR0aGlzLmZvcm1hdChMRVZFTC5XQVJOLCAuLi5hcmdzKVxuXHRcdCk7XG5cdH1cblxuXHRkZWJ1ZyguLi5hcmdzKSB7XG5cdFx0aWYoIXRoaXMuc2lsZW50KSByZXR1cm47XG5cdFx0dGhpcy5sb2dnZXIoXG5cdFx0XHR0aGlzLmZvcm1hdChMRVZFTC5ERUJVRywgLi4uYXJncylcblx0XHQpO1xuXHR9XG5cblx0cHJpdmF0ZSBmb3JtYXQobGV2ZWwsIC4uLmFyZ3MpIHtcblxuXHRcdGxldCBwYWQgPSAocywgbCwgYz0nJykgPT4ge1xuXHRcdFx0cmV0dXJuIHMgKyBBcnJheSggTWF0aC5tYXgoMCwgbCAtIHMubGVuZ3RoICsgMSkpLmpvaW4oIGMgKVxuXHRcdH07XG5cblx0XHRsZXQgbXNnID0gYXJncy5qb2luKCcgJyk7XG5cdFx0aWYoYXJncy5sZW5ndGggPiAxKSB7XG5cdFx0XHRtc2cgPSBgJHsgcGFkKGFyZ3Muc2hpZnQoKSwgMTUsICcgJykgfTogJHsgYXJncy5qb2luKCcgJykgfWA7XG5cdFx0fVxuXG5cblx0XHRzd2l0Y2gobGV2ZWwpIHtcblx0XHRcdGNhc2UgTEVWRUwuSU5GTzpcblx0XHRcdFx0bXNnID0gYy5ncmVlbihtc2cpO1xuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0Y2FzZSBMRVZFTC5ERUJVRzpcblx0XHRcdFx0bXNnID0gYy5jeWFuKG1zZyk7XG5cdFx0XHRcdGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIExFVkVMLldBUk46XG5cdFx0XHRcdG1zZyA9IGMueWVsbG93KG1zZyk7XG5cdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRjYXNlIExFVkVMLkVSUk9SOlxuXHRcdFx0XHRtc2cgPSBjLnJlZChtc2cpO1xuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cblx0XHRyZXR1cm4gW1xuXHRcdFx0bXNnXG5cdFx0XS5qb2luKCcnKTtcblx0fVxufVxuXG5leHBvcnQgbGV0IGxvZ2dlciA9IG5ldyBMb2dnZXIoKTtcbiIsImltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcblxubGV0IEFuZ3VsYXJBUElzID0gcmVxdWlyZSgnLi4vc3JjL2RhdGEvYXBpLWxpc3QuanNvbicpO1xuXG5leHBvcnQgZnVuY3Rpb24gZmluZGVySW5Bbmd1bGFyQVBJcyh0eXBlOiBzdHJpbmcpIHtcbiAgICBsZXQgX3Jlc3VsdCA9IHtcbiAgICAgICAgc291cmNlOiAnZXh0ZXJuYWwnLFxuICAgICAgICBkYXRhOiBudWxsXG4gICAgfTtcblxuICAgIF8uZm9yRWFjaChBbmd1bGFyQVBJcywgZnVuY3Rpb24oYW5ndWxhck1vZHVsZUFQSXMsIGFuZ3VsYXJNb2R1bGUpIHtcbiAgICAgICAgbGV0IGkgPSAwLFxuICAgICAgICAgICAgbGVuID0gYW5ndWxhck1vZHVsZUFQSXMubGVuZ3RoO1xuICAgICAgICBmb3IgKGk7IGk8bGVuOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyTW9kdWxlQVBJc1tpXS50aXRsZSA9PT0gdHlwZSkge1xuICAgICAgICAgICAgICAgIF9yZXN1bHQuZGF0YSA9IGFuZ3VsYXJNb2R1bGVBUElzW2ldXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBfcmVzdWx0O1xufVxuIiwiaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuXG5pbXBvcnQgeyBmaW5kZXJJbkFuZ3VsYXJBUElzIH0gZnJvbSAnLi4vLi4vdXRpbHMvYW5ndWxhci1hcGknO1xuXG5pbXBvcnQgeyBQYXJzZWREYXRhIH0gZnJvbSAnLi4vaW50ZXJmYWNlcy9wYXJzZWQtZGF0YS5pbnRlcmZhY2UnO1xuaW1wb3J0IHsgTWlzY2VsbGFuZW91c0RhdGEgfSBmcm9tICcuLi9pbnRlcmZhY2VzL21pc2NlbGxhbmVvdXMtZGF0YS5pbnRlcmZhY2UnO1xuXG5jbGFzcyBEZXBlbmRlbmNpZXNFbmdpbmUge1xuICAgIHByaXZhdGUgc3RhdGljIF9pbnN0YW5jZTpEZXBlbmRlbmNpZXNFbmdpbmUgPSBuZXcgRGVwZW5kZW5jaWVzRW5naW5lKCk7XG5cbiAgICByYXdEYXRhOiBQYXJzZWREYXRhO1xuICAgIG1vZHVsZXM6IE9iamVjdFtdO1xuICAgIHJhd01vZHVsZXM6IE9iamVjdFtdO1xuICAgIHJhd01vZHVsZXNGb3JPdmVydmlldzogT2JqZWN0W107XG4gICAgY29tcG9uZW50czogT2JqZWN0W107XG4gICAgZGlyZWN0aXZlczogT2JqZWN0W107XG4gICAgaW5qZWN0YWJsZXM6IE9iamVjdFtdO1xuICAgIGludGVyZmFjZXM6IE9iamVjdFtdO1xuICAgIHJvdXRlczogT2JqZWN0W107XG4gICAgcGlwZXM6IE9iamVjdFtdO1xuICAgIGNsYXNzZXM6IE9iamVjdFtdO1xuICAgIG1pc2NlbGxhbmVvdXM6IE1pc2NlbGxhbmVvdXNEYXRhO1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIGlmKERlcGVuZGVuY2llc0VuZ2luZS5faW5zdGFuY2Upe1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdFcnJvcjogSW5zdGFudGlhdGlvbiBmYWlsZWQ6IFVzZSBEZXBlbmRlbmNpZXNFbmdpbmUuZ2V0SW5zdGFuY2UoKSBpbnN0ZWFkIG9mIG5ldy4nKTtcbiAgICAgICAgfVxuICAgICAgICBEZXBlbmRlbmNpZXNFbmdpbmUuX2luc3RhbmNlID0gdGhpcztcbiAgICB9XG4gICAgcHVibGljIHN0YXRpYyBnZXRJbnN0YW5jZSgpOkRlcGVuZGVuY2llc0VuZ2luZVxuICAgIHtcbiAgICAgICAgcmV0dXJuIERlcGVuZGVuY2llc0VuZ2luZS5faW5zdGFuY2U7XG4gICAgfVxuICAgIGNsZWFuTW9kdWxlcyhtb2R1bGVzKSB7XG4gICAgICAgIGxldCBfbSA9IG1vZHVsZXMsXG4gICAgICAgICAgICBpID0gMCxcbiAgICAgICAgICAgIGxlbiA9IG1vZHVsZXMubGVuZ3RoO1xuICAgICAgICBmb3IoaTsgaTxsZW47IGkrKykge1xuICAgICAgICAgICAgbGV0IGogPSAwLFxuICAgICAgICAgICAgICAgIGxlbmcgPSBfbVtpXS5kZWNsYXJhdGlvbnMubGVuZ3RoO1xuICAgICAgICAgICAgZm9yKGo7IGo8bGVuZzsgaisrKSB7XG4gICAgICAgICAgICAgICAgbGV0IGsgPSAwLFxuICAgICAgICAgICAgICAgICAgICBsZW5ndDtcbiAgICAgICAgICAgICAgICBpZiAoX21baV0uZGVjbGFyYXRpb25zW2pdLmpzZG9jdGFncykge1xuICAgICAgICAgICAgICAgICAgICBsZW5ndCA9IF9tW2ldLmRlY2xhcmF0aW9uc1tqXS5qc2RvY3RhZ3MubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBmb3IoazsgazxsZW5ndDsgaysrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgX21baV0uZGVjbGFyYXRpb25zW2pdLmpzZG9jdGFnc1trXS5wYXJlbnQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIF9tO1xuICAgIH1cbiAgICBpbml0KGRhdGE6IFBhcnNlZERhdGEpIHtcbiAgICAgICAgdGhpcy5yYXdEYXRhID0gZGF0YTtcbiAgICAgICAgdGhpcy5tb2R1bGVzID0gXy5zb3J0QnkodGhpcy5yYXdEYXRhLm1vZHVsZXMsIFsnbmFtZSddKTtcbiAgICAgICAgdGhpcy5yYXdNb2R1bGVzRm9yT3ZlcnZpZXcgPSBfLnNvcnRCeShfLmNsb25lRGVlcCh0aGlzLmNsZWFuTW9kdWxlcyhkYXRhLm1vZHVsZXMpKSwgWyduYW1lJ10pO1xuICAgICAgICB0aGlzLnJhd01vZHVsZXMgPSBfLnNvcnRCeShfLmNsb25lRGVlcCh0aGlzLmNsZWFuTW9kdWxlcyhkYXRhLm1vZHVsZXMpKSwgWyduYW1lJ10pO1xuICAgICAgICB0aGlzLmNvbXBvbmVudHMgPSBfLnNvcnRCeSh0aGlzLnJhd0RhdGEuY29tcG9uZW50cywgWyduYW1lJ10pO1xuICAgICAgICB0aGlzLmRpcmVjdGl2ZXMgPSBfLnNvcnRCeSh0aGlzLnJhd0RhdGEuZGlyZWN0aXZlcywgWyduYW1lJ10pO1xuICAgICAgICB0aGlzLmluamVjdGFibGVzID0gXy5zb3J0QnkodGhpcy5yYXdEYXRhLmluamVjdGFibGVzLCBbJ25hbWUnXSk7XG4gICAgICAgIHRoaXMuaW50ZXJmYWNlcyA9IF8uc29ydEJ5KHRoaXMucmF3RGF0YS5pbnRlcmZhY2VzLCBbJ25hbWUnXSk7XG4gICAgICAgIHRoaXMucGlwZXMgPSBfLnNvcnRCeSh0aGlzLnJhd0RhdGEucGlwZXMsIFsnbmFtZSddKTtcbiAgICAgICAgdGhpcy5jbGFzc2VzID0gXy5zb3J0QnkodGhpcy5yYXdEYXRhLmNsYXNzZXMsIFsnbmFtZSddKTtcbiAgICAgICAgdGhpcy5taXNjZWxsYW5lb3VzID0gdGhpcy5yYXdEYXRhLm1pc2NlbGxhbmVvdXM7XG4gICAgICAgIHRoaXMucHJlcGFyZU1pc2NlbGxhbmVvdXMoKTtcbiAgICAgICAgdGhpcy5yb3V0ZXMgPSB0aGlzLnJhd0RhdGEucm91dGVzVHJlZTtcbiAgICAgICAgdGhpcy5jbGVhblJhd01vZHVsZXNGb3JPdmVydmlldygpO1xuICAgIH1cbiAgICBmaW5kKHR5cGU6IHN0cmluZykge1xuICAgICAgICBsZXQgZmluZGVySW5Db21wb2RvY0RlcGVuZGVuY2llcyA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIGxldCBfcmVzdWx0ID0ge1xuICAgICAgICAgICAgICAgICAgICBzb3VyY2U6ICdpbnRlcm5hbCcsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IG51bGxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGkgPSAwLFxuICAgICAgICAgICAgICAgIGxlbiA9IGRhdGEubGVuZ3RoO1xuICAgICAgICAgICAgZm9yIChpOyBpPGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB0eXBlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZS5pbmRleE9mKGRhdGFbaV0ubmFtZSkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfcmVzdWx0LmRhdGEgPSBkYXRhW2ldXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gX3Jlc3VsdDtcbiAgICAgICAgfSxcbiAgICAgICAgICAgIHJlc3VsdEluQ29tcG9kb2NJbmplY3RhYmxlcyA9IGZpbmRlckluQ29tcG9kb2NEZXBlbmRlbmNpZXModGhpcy5pbmplY3RhYmxlcyksXG4gICAgICAgICAgICByZXN1bHRJbkNvbXBvZG9jSW50ZXJmYWNlcyA9IGZpbmRlckluQ29tcG9kb2NEZXBlbmRlbmNpZXModGhpcy5pbnRlcmZhY2VzKSxcbiAgICAgICAgICAgIHJlc3VsdEluQ29tcG9kb2NDbGFzc2VzID0gZmluZGVySW5Db21wb2RvY0RlcGVuZGVuY2llcyh0aGlzLmNsYXNzZXMpLFxuICAgICAgICAgICAgcmVzdWx0SW5Db21wb2RvY0NvbXBvbmVudHMgPSBmaW5kZXJJbkNvbXBvZG9jRGVwZW5kZW5jaWVzKHRoaXMuY29tcG9uZW50cyksXG4gICAgICAgICAgICByZXN1bHRJbkFuZ3VsYXJBUElzID0gZmluZGVySW5Bbmd1bGFyQVBJcyh0eXBlKVxuXG4gICAgICAgIGlmIChyZXN1bHRJbkNvbXBvZG9jSW5qZWN0YWJsZXMuZGF0YSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdEluQ29tcG9kb2NJbmplY3RhYmxlcztcbiAgICAgICAgfSBlbHNlIGlmIChyZXN1bHRJbkNvbXBvZG9jSW50ZXJmYWNlcy5kYXRhICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0SW5Db21wb2RvY0ludGVyZmFjZXM7XG4gICAgICAgIH0gZWxzZSBpZiAocmVzdWx0SW5Db21wb2RvY0NsYXNzZXMuZGF0YSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdEluQ29tcG9kb2NDbGFzc2VzO1xuICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdEluQ29tcG9kb2NDb21wb25lbnRzLmRhdGEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHRJbkNvbXBvZG9jQ29tcG9uZW50cztcbiAgICAgICAgfSBlbHNlIGlmIChyZXN1bHRJbkFuZ3VsYXJBUElzLmRhdGEgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHRJbkFuZ3VsYXJBUElzO1xuICAgICAgICB9XG4gICAgfVxuICAgIHVwZGF0ZSh1cGRhdGVkRGF0YSkge1xuICAgICAgICBpZiAodXBkYXRlZERhdGEubW9kdWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBfLmZvckVhY2godXBkYXRlZERhdGEubW9kdWxlcywgKG1vZHVsZSkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBfaW5kZXggPSBfLmZpbmRJbmRleCh0aGlzLm1vZHVsZXMsIHsnbmFtZSc6IG1vZHVsZS5uYW1lfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5tb2R1bGVzW19pbmRleF0gPSBtb2R1bGU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodXBkYXRlZERhdGEuY29tcG9uZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBfLmZvckVhY2godXBkYXRlZERhdGEuY29tcG9uZW50cywgKGNvbXBvbmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBfaW5kZXggPSBfLmZpbmRJbmRleCh0aGlzLmNvbXBvbmVudHMsIHsnbmFtZSc6IGNvbXBvbmVudC5uYW1lfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5jb21wb25lbnRzW19pbmRleF0gPSBjb21wb25lbnQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodXBkYXRlZERhdGEuZGlyZWN0aXZlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBfLmZvckVhY2godXBkYXRlZERhdGEuZGlyZWN0aXZlcywgKGRpcmVjdGl2ZSkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBfaW5kZXggPSBfLmZpbmRJbmRleCh0aGlzLmRpcmVjdGl2ZXMsIHsnbmFtZSc6IGRpcmVjdGl2ZS5uYW1lfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5kaXJlY3RpdmVzW19pbmRleF0gPSBkaXJlY3RpdmU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodXBkYXRlZERhdGEuaW5qZWN0YWJsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgXy5mb3JFYWNoKHVwZGF0ZWREYXRhLmluamVjdGFibGVzLCAoaW5qZWN0YWJsZSkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBfaW5kZXggPSBfLmZpbmRJbmRleCh0aGlzLmluamVjdGFibGVzLCB7J25hbWUnOiBpbmplY3RhYmxlLm5hbWV9KTtcbiAgICAgICAgICAgICAgICB0aGlzLmluamVjdGFibGVzW19pbmRleF0gPSBpbmplY3RhYmxlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHVwZGF0ZWREYXRhLmludGVyZmFjZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgXy5mb3JFYWNoKHVwZGF0ZWREYXRhLmludGVyZmFjZXMsIChpbnQpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgX2luZGV4ID0gXy5maW5kSW5kZXgodGhpcy5pbnRlcmZhY2VzLCB7J25hbWUnOiBpbnQubmFtZX0pO1xuICAgICAgICAgICAgICAgIHRoaXMuaW50ZXJmYWNlc1tfaW5kZXhdID0gaW50O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHVwZGF0ZWREYXRhLnBpcGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIF8uZm9yRWFjaCh1cGRhdGVkRGF0YS5waXBlcywgKHBpcGUpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgX2luZGV4ID0gXy5maW5kSW5kZXgodGhpcy5waXBlcywgeyduYW1lJzogcGlwZS5uYW1lfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5waXBlc1tfaW5kZXhdID0gcGlwZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh1cGRhdGVkRGF0YS5jbGFzc2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIF8uZm9yRWFjaCh1cGRhdGVkRGF0YS5jbGFzc2VzLCAoY2xhc3NlKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IF9pbmRleCA9IF8uZmluZEluZGV4KHRoaXMuY2xhc3NlcywgeyduYW1lJzogY2xhc3NlLm5hbWV9KTtcbiAgICAgICAgICAgICAgICB0aGlzLmNsYXNzZXNbX2luZGV4XSA9IGNsYXNzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZpbmRJbkNvbXBvZG9jKG5hbWU6IHN0cmluZykge1xuICAgICAgICBsZXQgbWVyZ2VkRGF0YSA9IF8uY29uY2F0KFtdLCB0aGlzLm1vZHVsZXMsIHRoaXMuY29tcG9uZW50cywgdGhpcy5kaXJlY3RpdmVzLCB0aGlzLmluamVjdGFibGVzLCB0aGlzLmludGVyZmFjZXMsIHRoaXMucGlwZXMsIHRoaXMuY2xhc3NlcyksXG4gICAgICAgICAgICByZXN1bHQgPSBfLmZpbmQobWVyZ2VkRGF0YSwgeyduYW1lJzogbmFtZX0pO1xuICAgICAgICByZXR1cm4gcmVzdWx0IHx8IGZhbHNlO1xuICAgIH1cbiAgICBjbGVhblJhd01vZHVsZXNGb3JPdmVydmlldygpIHtcbiAgICAgICAgXy5mb3JFYWNoKHRoaXMucmF3TW9kdWxlc0Zvck92ZXJ2aWV3LCAobW9kdWxlKSA9PiB7XG4gICAgICAgICAgICBtb2R1bGUuZGVjbGFyYXRpb25zID0gW107XG4gICAgICAgICAgICBtb2R1bGUucHJvdmlkZXJzID0gW107XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBwcmVwYXJlTWlzY2VsbGFuZW91cygpIHtcbiAgICAgICAgLy9ncm91cCBlYWNoIHN1YmdvdXAgYnkgZmlsZVxuICAgICAgICB0aGlzLm1pc2NlbGxhbmVvdXMuZ3JvdXBlZFZhcmlhYmxlcyA9IF8uZ3JvdXBCeSh0aGlzLm1pc2NlbGxhbmVvdXMudmFyaWFibGVzLCAnZmlsZScpO1xuICAgICAgICB0aGlzLm1pc2NlbGxhbmVvdXMuZ3JvdXBlZEZ1bmN0aW9ucyA9IF8uZ3JvdXBCeSh0aGlzLm1pc2NlbGxhbmVvdXMuZnVuY3Rpb25zLCAnZmlsZScpO1xuICAgICAgICB0aGlzLm1pc2NlbGxhbmVvdXMuZ3JvdXBlZEVudW1lcmF0aW9ucyA9IF8uZ3JvdXBCeSh0aGlzLm1pc2NlbGxhbmVvdXMuZW51bWVyYXRpb25zLCAnZmlsZScpO1xuICAgIH1cbiAgICBnZXRNb2R1bGUobmFtZTogc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBfLmZpbmQodGhpcy5tb2R1bGVzLCBbJ25hbWUnLCBuYW1lXSk7XG4gICAgfVxuICAgIGdldFJhd01vZHVsZShuYW1lOiBzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIF8uZmluZCh0aGlzLnJhd01vZHVsZXMsIFsnbmFtZScsIG5hbWVdKTtcbiAgICB9XG4gICAgZ2V0TW9kdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubW9kdWxlcztcbiAgICB9XG4gICAgZ2V0Q29tcG9uZW50cygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29tcG9uZW50cztcbiAgICB9XG4gICAgZ2V0RGlyZWN0aXZlcygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGlyZWN0aXZlcztcbiAgICB9XG4gICAgZ2V0SW5qZWN0YWJsZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmluamVjdGFibGVzO1xuICAgIH1cbiAgICBnZXRJbnRlcmZhY2VzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5pbnRlcmZhY2VzO1xuICAgIH1cbiAgICBnZXRSb3V0ZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJvdXRlcztcbiAgICB9XG4gICAgZ2V0UGlwZXMoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGVzO1xuICAgIH1cbiAgICBnZXRDbGFzc2VzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jbGFzc2VzO1xuICAgIH1cbiAgICBnZXRNaXNjZWxsYW5lb3VzKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5taXNjZWxsYW5lb3VzO1xuICAgIH1cbn07XG5cbmV4cG9ydCBjb25zdCAkZGVwZW5kZW5jaWVzRW5naW5lID0gRGVwZW5kZW5jaWVzRW5naW5lLmdldEluc3RhbmNlKCk7XG4iLCJpbXBvcnQgeyAkZGVwZW5kZW5jaWVzRW5naW5lIH0gZnJvbSAnLi4vYXBwL2VuZ2luZXMvZGVwZW5kZW5jaWVzLmVuZ2luZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0TGVhZGluZ1RleHQoc3RyaW5nLCBjb21wbGV0ZVRhZykge1xuICAgIHZhciB0YWdJbmRleCA9IHN0cmluZy5pbmRleE9mKGNvbXBsZXRlVGFnKTtcbiAgICB2YXIgbGVhZGluZ1RleHQgPSBudWxsO1xuICAgIHZhciBsZWFkaW5nVGV4dFJlZ0V4cCA9IC9cXFsoLis/KVxcXS9nO1xuICAgIHZhciBsZWFkaW5nVGV4dEluZm8gPSBsZWFkaW5nVGV4dFJlZ0V4cC5leGVjKHN0cmluZyk7XG5cbiAgICAvLyBkaWQgd2UgZmluZCBsZWFkaW5nIHRleHQsIGFuZCBpZiBzbywgZG9lcyBpdCBpbW1lZGlhdGVseSBwcmVjZWRlIHRoZSB0YWc/XG4gICAgd2hpbGUgKGxlYWRpbmdUZXh0SW5mbyAmJiBsZWFkaW5nVGV4dEluZm8ubGVuZ3RoKSB7XG4gICAgICAgIGlmIChsZWFkaW5nVGV4dEluZm8uaW5kZXggKyBsZWFkaW5nVGV4dEluZm9bMF0ubGVuZ3RoID09PSB0YWdJbmRleCkge1xuICAgICAgICAgICAgc3RyaW5nID0gc3RyaW5nLnJlcGxhY2UobGVhZGluZ1RleHRJbmZvWzBdLCAnJyk7XG4gICAgICAgICAgICBsZWFkaW5nVGV4dCA9IGxlYWRpbmdUZXh0SW5mb1sxXTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgbGVhZGluZ1RleHRJbmZvID0gbGVhZGluZ1RleHRSZWdFeHAuZXhlYyhzdHJpbmcpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGxlYWRpbmdUZXh0OiBsZWFkaW5nVGV4dCxcbiAgICAgICAgc3RyaW5nOiBzdHJpbmdcbiAgICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3BsaXRMaW5rVGV4dCh0ZXh0KSB7XG4gICAgdmFyIGxpbmtUZXh0O1xuICAgIHZhciB0YXJnZXQ7XG4gICAgdmFyIHNwbGl0SW5kZXg7XG5cbiAgICAvLyBpZiBhIHBpcGUgaXMgbm90IHByZXNlbnQsIHdlIHNwbGl0IG9uIHRoZSBmaXJzdCBzcGFjZVxuICAgIHNwbGl0SW5kZXggPSB0ZXh0LmluZGV4T2YoJ3wnKTtcbiAgICBpZiAoc3BsaXRJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgc3BsaXRJbmRleCA9IHRleHQuc2VhcmNoKC9cXHMvKTtcbiAgICB9XG5cbiAgICBpZiAoc3BsaXRJbmRleCAhPT0gLTEpIHtcbiAgICAgICAgbGlua1RleHQgPSB0ZXh0LnN1YnN0cihzcGxpdEluZGV4ICsgMSk7XG4gICAgICAgIC8vIE5vcm1hbGl6ZSBzdWJzZXF1ZW50IG5ld2xpbmVzIHRvIGEgc2luZ2xlIHNwYWNlLlxuICAgICAgICBsaW5rVGV4dCA9IGxpbmtUZXh0LnJlcGxhY2UoL1xcbisvLCAnICcpO1xuICAgICAgICB0YXJnZXQgPSB0ZXh0LnN1YnN0cigwLCBzcGxpdEluZGV4KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBsaW5rVGV4dDogbGlua1RleHQsXG4gICAgICAgIHRhcmdldDogdGFyZ2V0IHx8IHRleHRcbiAgICB9O1xufVxuXG5leHBvcnQgbGV0IExpbmtQYXJzZXIgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgcHJvY2Vzc1RoZUxpbmsgPSBmdW5jdGlvbihzdHJpbmcsIHRhZ0luZm8pIHtcbiAgICAgICAgdmFyIGxlYWRpbmcgPSBleHRyYWN0TGVhZGluZ1RleHQoc3RyaW5nLCB0YWdJbmZvLmNvbXBsZXRlVGFnKSxcbiAgICAgICAgICAgIGxpbmtUZXh0ID0gbGVhZGluZy5sZWFkaW5nVGV4dCB8fCAnJyxcbiAgICAgICAgICAgIHNwbGl0LFxuICAgICAgICAgICAgdGFyZ2V0LFxuICAgICAgICAgICAgc3RyaW5ndG9SZXBsYWNlO1xuXG4gICAgICAgIHNwbGl0ID0gc3BsaXRMaW5rVGV4dCh0YWdJbmZvLnRleHQpO1xuICAgICAgICB0YXJnZXQgPSBzcGxpdC50YXJnZXQ7XG5cbiAgICAgICAgaWYgKGxlYWRpbmcubGVhZGluZ1RleHQgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHN0cmluZ3RvUmVwbGFjZSA9ICdbJyArIGxlYWRpbmcubGVhZGluZ1RleHQgKyAnXScgKyB0YWdJbmZvLmNvbXBsZXRlVGFnO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBzcGxpdC5saW5rVGV4dCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHN0cmluZ3RvUmVwbGFjZSA9IHRhZ0luZm8uY29tcGxldGVUYWc7XG4gICAgICAgICAgICBsaW5rVGV4dCA9IHNwbGl0LmxpbmtUZXh0O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKHN0cmluZ3RvUmVwbGFjZSwgJ1snICsgbGlua1RleHQgKyAnXSgnICsgdGFyZ2V0ICsgJyknKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0XG4gICAgICoge0BsaW5rIGh0dHA6Ly93d3cuZ29vZ2xlLmNvbXxHb29nbGV9IG9yIHtAbGluayBodHRwczovL2dpdGh1Yi5jb20gR2l0SHVifSB0byBbR2l0aHViXShodHRwczovL2dpdGh1Yi5jb20pXG4gICAgICovXG5cbiAgICB2YXIgcmVwbGFjZUxpbmtUYWcgPSBmdW5jdGlvbihzdHI6IHN0cmluZykge1xuXG4gICAgICAgIHZhciB0YWdSZWdFeHAgPSBuZXcgUmVnRXhwKCdcXFxce0BsaW5rXFxcXHMrKCg/Oi58XFxuKSs/KVxcXFx9JywgJ2knKSxcbiAgICAgICAgICAgIG1hdGNoZXMsXG4gICAgICAgICAgICBwcmV2aW91c1N0cmluZyxcbiAgICAgICAgICAgIHRhZ0luZm8gPSBbXTtcblxuICAgICAgICBmdW5jdGlvbiByZXBsYWNlTWF0Y2gocmVwbGFjZXIsIHRhZywgbWF0Y2gsIHRleHQpIHtcbiAgICAgICAgICAgIHZhciBtYXRjaGVkVGFnID0ge1xuICAgICAgICAgICAgICAgIGNvbXBsZXRlVGFnOiBtYXRjaCxcbiAgICAgICAgICAgICAgICB0YWc6IHRhZyxcbiAgICAgICAgICAgICAgICB0ZXh0OiB0ZXh0XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGFnSW5mby5wdXNoKG1hdGNoZWRUYWcpO1xuXG4gICAgICAgICAgICByZXR1cm4gcmVwbGFjZXIoc3RyLCBtYXRjaGVkVGFnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIG1hdGNoZXMgPSB0YWdSZWdFeHAuZXhlYyhzdHIpO1xuICAgICAgICAgICAgaWYgKG1hdGNoZXMpIHtcbiAgICAgICAgICAgICAgICBwcmV2aW91c1N0cmluZyA9IHN0cjtcbiAgICAgICAgICAgICAgICBzdHIgPSByZXBsYWNlTWF0Y2gocHJvY2Vzc1RoZUxpbmssICdsaW5rJywgbWF0Y2hlc1swXSwgbWF0Y2hlc1sxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gd2hpbGUgKG1hdGNoZXMgJiYgcHJldmlvdXNTdHJpbmcgIT09IHN0cik7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5ld1N0cmluZzogc3RyXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgdmFyIF9yZXNvbHZlTGlua3MgPSBmdW5jdGlvbihzdHI6IHN0cmluZykge1xuICAgICAgICByZXR1cm4gcmVwbGFjZUxpbmtUYWcoc3RyKS5uZXdTdHJpbmc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzb2x2ZUxpbmtzOiBfcmVzb2x2ZUxpbmtzXG4gICAgfVxufSkoKTtcbiIsImV4cG9ydCBjb25zdCBDT01QT0RPQ19ERUZBVUxUUyA9IHtcbiAgICB0aXRsZTogJ0FwcGxpY2F0aW9uIGRvY3VtZW50YXRpb24nLFxuICAgIGFkZGl0aW9uYWxFbnRyeU5hbWU6ICdBZGRpdGlvbmFsIGRvY3VtZW50YXRpb24nLFxuICAgIGFkZGl0aW9uYWxFbnRyeVBhdGg6ICdhZGRpdGlvbmFsLWRvY3VtZW50YXRpb24nLFxuICAgIGZvbGRlcjogJy4vZG9jdW1lbnRhdGlvbi8nLFxuICAgIHBvcnQ6IDgwODAsXG4gICAgdGhlbWU6ICdnaXRib29rJyxcbiAgICBiYXNlOiAnLycsXG4gICAgZGVmYXVsdENvdmVyYWdlVGhyZXNob2xkOiA3MCxcbiAgICBkaXNhYmxlU291cmNlQ29kZTogZmFsc2UsXG4gICAgZGlzYWJsZUdyYXBoOiBmYWxzZSxcbiAgICBkaXNhYmxlQ292ZXJhZ2U6IGZhbHNlLFxuICAgIGRpc2FibGVQcml2YXRlT3JJbnRlcm5hbFN1cHBvcnQ6IGZhbHNlLFxuICAgIFBBR0VfVFlQRVM6IHtcbiAgICAgICAgUk9PVDogJ3Jvb3QnLFxuICAgICAgICBJTlRFUk5BTDogJ2ludGVybmFsJ1xuICAgIH1cbn1cbiIsImltcG9ydCB7IENPTVBPRE9DX0RFRkFVTFRTIH0gZnJvbSAnLi4vdXRpbHMvZGVmYXVsdHMnO1xuXG5pbXBvcnQgeyBQYWdlSW50ZXJmYWNlIH0gZnJvbSAnLi9pbnRlcmZhY2VzL3BhZ2UuaW50ZXJmYWNlJztcblxuaW1wb3J0IHsgTWFpbkRhdGFJbnRlcmZhY2UgfSBmcm9tICcuL2ludGVyZmFjZXMvbWFpbi1kYXRhLmludGVyZmFjZSc7XG5cbmltcG9ydCB7IENvbmZpZ3VyYXRpb25JbnRlcmZhY2UgfSBmcm9tICcuL2ludGVyZmFjZXMvY29uZmlndXJhdGlvbi5pbnRlcmZhY2UnO1xuXG5leHBvcnQgY2xhc3MgQ29uZmlndXJhdGlvbiBpbXBsZW1lbnRzIENvbmZpZ3VyYXRpb25JbnRlcmZhY2Uge1xuICAgIHByaXZhdGUgc3RhdGljIF9pbnN0YW5jZTpDb25maWd1cmF0aW9uID0gbmV3IENvbmZpZ3VyYXRpb24oKTtcblxuICAgIHByaXZhdGUgX3BhZ2VzOlBhZ2VJbnRlcmZhY2VbXSA9IFtdO1xuICAgIHByaXZhdGUgX21haW5EYXRhOiBNYWluRGF0YUludGVyZmFjZSA9IHtcbiAgICAgICAgb3V0cHV0OiBDT01QT0RPQ19ERUZBVUxUUy5mb2xkZXIsXG4gICAgICAgIHRoZW1lOiBDT01QT0RPQ19ERUZBVUxUUy50aGVtZSxcbiAgICAgICAgZXh0VGhlbWU6ICcnLFxuICAgICAgICBzZXJ2ZTogZmFsc2UsXG4gICAgICAgIHBvcnQ6IENPTVBPRE9DX0RFRkFVTFRTLnBvcnQsXG4gICAgICAgIG9wZW46IGZhbHNlLFxuICAgICAgICBhc3NldHNGb2xkZXI6ICcnLFxuICAgICAgICBkb2N1bWVudGF0aW9uTWFpbk5hbWU6IENPTVBPRE9DX0RFRkFVTFRTLnRpdGxlLFxuICAgICAgICBkb2N1bWVudGF0aW9uTWFpbkRlc2NyaXB0aW9uOiAnJyxcbiAgICAgICAgYmFzZTogQ09NUE9ET0NfREVGQVVMVFMuYmFzZSxcbiAgICAgICAgaGlkZUdlbmVyYXRvcjogZmFsc2UsXG4gICAgICAgIG1vZHVsZXM6IFtdLFxuICAgICAgICByZWFkbWU6ICcnLFxuICAgICAgICBhZGRpdGlvbmFsUGFnZXM6IFtdLFxuICAgICAgICBwaXBlczogW10sXG4gICAgICAgIGNsYXNzZXM6IFtdLFxuICAgICAgICBpbnRlcmZhY2VzOiBbXSxcbiAgICAgICAgY29tcG9uZW50czogW10sXG4gICAgICAgIGRpcmVjdGl2ZXM6IFtdLFxuICAgICAgICBpbmplY3RhYmxlczogW10sXG4gICAgICAgIG1pc2NlbGxhbmVvdXM6IFtdLFxuICAgICAgICByb3V0ZXM6IFtdLFxuICAgICAgICB0c2NvbmZpZzogJycsXG4gICAgICAgIHRvZ2dsZU1lbnVJdGVtczogW10sXG4gICAgICAgIGluY2x1ZGVzOiAnJyxcbiAgICAgICAgaW5jbHVkZXNOYW1lOiBDT01QT0RPQ19ERUZBVUxUUy5hZGRpdGlvbmFsRW50cnlOYW1lLFxuICAgICAgICBpbmNsdWRlc0ZvbGRlcjogQ09NUE9ET0NfREVGQVVMVFMuYWRkaXRpb25hbEVudHJ5UGF0aCxcbiAgICAgICAgZGlzYWJsZVNvdXJjZUNvZGU6IENPTVBPRE9DX0RFRkFVTFRTLmRpc2FibGVTb3VyY2VDb2RlLFxuICAgICAgICBkaXNhYmxlR3JhcGg6IENPTVBPRE9DX0RFRkFVTFRTLmRpc2FibGVHcmFwaCxcbiAgICAgICAgZGlzYWJsZUNvdmVyYWdlOiBDT01QT0RPQ19ERUZBVUxUUy5kaXNhYmxlQ292ZXJhZ2UsXG4gICAgICAgIGRpc2FibGVQcml2YXRlT3JJbnRlcm5hbFN1cHBvcnQ6IENPTVBPRE9DX0RFRkFVTFRTLmRpc2FibGVQcml2YXRlT3JJbnRlcm5hbFN1cHBvcnQsXG4gICAgICAgIHdhdGNoOiBmYWxzZSxcbiAgICAgICAgbWFpbkdyYXBoOiAnJyxcbiAgICAgICAgY292ZXJhZ2VUZXN0OiBmYWxzZSxcbiAgICAgICAgY292ZXJhZ2VUZXN0VGhyZXNob2xkOiBDT01QT0RPQ19ERUZBVUxUUy5kZWZhdWx0Q292ZXJhZ2VUaHJlc2hvbGQsXG4gICAgICAgIHJvdXRlc0xlbmd0aDogMCxcbiAgICAgICAgYW5ndWxhclZlcnNpb246ICcnXG4gICAgfTtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBpZihDb25maWd1cmF0aW9uLl9pbnN0YW5jZSl7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Vycm9yOiBJbnN0YW50aWF0aW9uIGZhaWxlZDogVXNlIENvbmZpZ3VyYXRpb24uZ2V0SW5zdGFuY2UoKSBpbnN0ZWFkIG9mIG5ldy4nKTtcbiAgICAgICAgfVxuICAgICAgICBDb25maWd1cmF0aW9uLl9pbnN0YW5jZSA9IHRoaXM7XG4gICAgfVxuXG4gICAgcHVibGljIHN0YXRpYyBnZXRJbnN0YW5jZSgpOkNvbmZpZ3VyYXRpb25cbiAgICB7XG4gICAgICAgIHJldHVybiBDb25maWd1cmF0aW9uLl9pbnN0YW5jZTtcbiAgICB9XG5cbiAgICBhZGRQYWdlKHBhZ2U6IFBhZ2VJbnRlcmZhY2UpIHtcbiAgICAgICAgdGhpcy5fcGFnZXMucHVzaChwYWdlKTtcbiAgICB9XG5cbiAgICBhZGRBZGRpdGlvbmFsUGFnZShwYWdlOiBQYWdlSW50ZXJmYWNlKSB7XG4gICAgICAgIHRoaXMuX21haW5EYXRhLmFkZGl0aW9uYWxQYWdlcy5wdXNoKHBhZ2UpO1xuICAgIH1cblxuICAgIHJlc2V0UGFnZXMoKSB7XG4gICAgICAgIHRoaXMuX3BhZ2VzID0gW107XG4gICAgfVxuXG4gICAgcmVzZXRBZGRpdGlvbmFsUGFnZXMoKSB7XG4gICAgICAgIHRoaXMuX21haW5EYXRhLmFkZGl0aW9uYWxQYWdlcyA9IFtdO1xuICAgIH1cblxuICAgIGdldCBwYWdlcygpOlBhZ2VJbnRlcmZhY2VbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYWdlcztcbiAgICB9XG4gICAgc2V0IHBhZ2VzKHBhZ2VzOlBhZ2VJbnRlcmZhY2VbXSkge1xuICAgICAgICB0aGlzLl9wYWdlcyA9IFtdO1xuICAgIH1cblxuICAgIGdldCBtYWluRGF0YSgpOk1haW5EYXRhSW50ZXJmYWNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX21haW5EYXRhO1xuICAgIH1cbiAgICBzZXQgbWFpbkRhdGEoZGF0YTpNYWluRGF0YUludGVyZmFjZSkge1xuICAgICAgICAoPGFueT5PYmplY3QpLmFzc2lnbih0aGlzLl9tYWluRGF0YSwgZGF0YSk7XG4gICAgfVxufTtcbiIsImxldCBzZW12ZXIgPSByZXF1aXJlKCdzZW12ZXInKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFuVmVyc2lvbih2ZXJzaW9uKSB7XG4gICAgcmV0dXJuIHZlcnNpb24ucmVwbGFjZSgnficsICcnKVxuICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoJ14nLCAnJylcbiAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKCc9JywgJycpXG4gICAgICAgICAgICAgICAgICAucmVwbGFjZSgnPCcsICcnKVxuICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoJz4nLCAnJylcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFuZ3VsYXJWZXJzaW9uT2ZQcm9qZWN0KHBhY2thZ2VEYXRhKSB7XG4gICAgbGV0IF9yZXN1bHQgPSAnJztcblxuICAgIGlmIChwYWNrYWdlRGF0YVsnZGVwZW5kZW5jaWVzJ10pIHtcbiAgICAgICAgbGV0IGFuZ3VsYXJDb3JlID0gcGFja2FnZURhdGFbJ2RlcGVuZGVuY2llcyddWydAYW5ndWxhci9jb3JlJ107XG4gICAgICAgIGlmIChhbmd1bGFyQ29yZSkge1xuICAgICAgICAgICAgX3Jlc3VsdCA9IGNsZWFuVmVyc2lvbihhbmd1bGFyQ29yZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gX3Jlc3VsdDtcbn1cblxuZnVuY3Rpb24gaXNBbmd1bGFyVmVyc2lvbkFyY2hpdmVkKHZlcnNpb24pIHtcbiAgICBsZXQgcmVzdWx0O1xuXG4gICAgdHJ5IHtcbiAgICAgICAgcmVzdWx0ID0gc2VtdmVyLmNvbXBhcmUodmVyc2lvbiwgJzIuNC4xMCcpIDw9IDA7XG4gICAgfSBjYXRjaCAoZSkge31cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmVmaXhPZmZpY2lhbERvYyh2ZXJzaW9uKSB7XG4gICAgcmV0dXJuIGlzQW5ndWxhclZlcnNpb25BcmNoaXZlZCh2ZXJzaW9uKSA/ICd2Mi4nIDogJyc7XG59XG4iLCJpbXBvcnQgKiBhcyBIYW5kbGViYXJzIGZyb20gJ2hhbmRsZWJhcnMnO1xuaW1wb3J0IHsgQ09NUE9ET0NfREVGQVVMVFMgfSBmcm9tICcuLi8uLi91dGlscy9kZWZhdWx0cyc7XG5pbXBvcnQgeyAkZGVwZW5kZW5jaWVzRW5naW5lIH0gZnJvbSAnLi9kZXBlbmRlbmNpZXMuZW5naW5lJztcbmltcG9ydCB7IGV4dHJhY3RMZWFkaW5nVGV4dCwgc3BsaXRMaW5rVGV4dCB9IGZyb20gJy4uLy4uL3V0aWxzL2xpbmstcGFyc2VyJztcbmltcG9ydCB7IENvbmZpZ3VyYXRpb24gfSBmcm9tICcuLi9jb25maWd1cmF0aW9uJztcbmltcG9ydCB7IHByZWZpeE9mZmljaWFsRG9jIH0gZnJvbSAnLi4vLi4vdXRpbHMvYW5ndWxhci12ZXJzaW9uJztcblxuaW1wb3J0IHsganNkb2NUYWdJbnRlcmZhY2UgfSBmcm9tICcuLi9pbnRlcmZhY2VzL2pzZG9jLXRhZy5pbnRlcmZhY2UnO1xuXG5leHBvcnQgbGV0IEh0bWxFbmdpbmVIZWxwZXJzID0gKGZ1bmN0aW9uKCkge1xuICAgIGxldCBpbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vVE9ETyB1c2UgdGhpcyBpbnN0ZWFkIDogaHR0cHM6Ly9naXRodWIuY29tL2Fzc2VtYmxlL2hhbmRsZWJhcnMtaGVscGVyc1xuICAgICAgICBIYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCBcImNvbXBhcmVcIiwgZnVuY3Rpb24oYSwgb3BlcmF0b3IsIGIsIG9wdGlvbnMpIHtcbiAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignaGFuZGxlYmFycyBIZWxwZXIge3tjb21wYXJlfX0gZXhwZWN0cyA0IGFyZ3VtZW50cycpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgICAgc3dpdGNoIChvcGVyYXRvcikge1xuICAgICAgICAgICAgY2FzZSAnaW5kZXhvZic6XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gKGIuaW5kZXhPZihhKSAhPT0gLTEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnPT09JzpcbiAgICAgICAgICAgICAgcmVzdWx0ID0gYSA9PT0gYjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICchPT0nOlxuICAgICAgICAgICAgICByZXN1bHQgPSBhICE9PSBiO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJz4nOlxuICAgICAgICAgICAgICByZXN1bHQgPSBhID4gYjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OiB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignaGVscGVyIHt7Y29tcGFyZX19OiBpbnZhbGlkIG9wZXJhdG9yOiBgJyArIG9wZXJhdG9yICsgJ2AnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAocmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIG9wdGlvbnMuZm4odGhpcyk7XG4gICAgICAgIH0pO1xuICAgICAgICBIYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKFwib3JcIiwgZnVuY3Rpb24oLyogYW55LCBhbnksIC4uLiwgb3B0aW9ucyAqLykge1xuICAgICAgICAgICAgdmFyIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGggLSAxO1xuICAgICAgICAgIHZhciBvcHRpb25zID0gYXJndW1lbnRzW2xlbl07XG5cbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoYXJndW1lbnRzW2ldKSB7XG4gICAgICAgICAgICAgIHJldHVybiBvcHRpb25zLmZuKHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgICAgIH0pO1xuICAgICAgICBIYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKFwiZmlsdGVyQW5ndWxhcjJNb2R1bGVzXCIsIGZ1bmN0aW9uKHRleHQsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIGNvbnN0IE5HMl9NT0RVTEVTOnN0cmluZ1tdID0gW1xuICAgICAgICAgICAgICAgICdCcm93c2VyTW9kdWxlJyxcbiAgICAgICAgICAgICAgICAnRm9ybXNNb2R1bGUnLFxuICAgICAgICAgICAgICAgICdIdHRwTW9kdWxlJyxcbiAgICAgICAgICAgICAgICAnUm91dGVyTW9kdWxlJ1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsZW4gPSBORzJfTU9EVUxFUy5sZW5ndGg7XG4gICAgICAgICAgICBsZXQgaSA9IDAsXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICBmb3IgKGk7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIGlmICh0ZXh0LmluZGV4T2YoTkcyX01PRFVMRVNbaV0pID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMuZm4odGhpcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBIYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKFwiZGVidWdcIiwgZnVuY3Rpb24ob3B0aW9uYWxWYWx1ZSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ3VycmVudCBDb250ZXh0XCIpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiPT09PT09PT09PT09PT09PT09PT1cIik7XG4gICAgICAgICAgY29uc29sZS5sb2codGhpcyk7XG5cbiAgICAgICAgICBpZiAob3B0aW9uYWxWYWx1ZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJPcHRpb25hbFZhbHVlXCIpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCI9PT09PT09PT09PT09PT09PT09PVwiKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG9wdGlvbmFsVmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIEhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2JyZWFrbGluZXMnLCBmdW5jdGlvbih0ZXh0KSB7XG4gICAgICAgICAgICB0ZXh0ID0gSGFuZGxlYmFycy5VdGlscy5lc2NhcGVFeHByZXNzaW9uKHRleHQpO1xuICAgICAgICAgICAgdGV4dCA9IHRleHQucmVwbGFjZSgvKFxcclxcbnxcXG58XFxyKS9nbSwgJzxicj4nKTtcbiAgICAgICAgICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoLyAvZ20sICcmbmJzcDsnKTtcbiAgICAgICAgICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL1x0L2dtLCAnJm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jyk7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEhhbmRsZWJhcnMuU2FmZVN0cmluZyh0ZXh0KTtcbiAgICAgICAgfSk7XG4gICAgICAgIEhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2VzY2FwZVNpbXBsZVF1b3RlJywgZnVuY3Rpb24odGV4dCkge1xuICAgICAgICAgICAgaWYoIXRleHQpIHJldHVybjtcbiAgICAgICAgICAgIHZhciBfdGV4dCA9IHRleHQucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpO1xuICAgICAgICAgICAgX3RleHQgPSBfdGV4dC5yZXBsYWNlKC8oXFxyXFxufFxcbnxcXHIpL2dtLCAnJyk7XG4gICAgICAgICAgICByZXR1cm4gX3RleHQ7XG4gICAgICAgIH0pO1xuICAgICAgICBIYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdicmVha0NvbW1hJywgZnVuY3Rpb24odGV4dCkge1xuICAgICAgICAgICAgdGV4dCA9IEhhbmRsZWJhcnMuVXRpbHMuZXNjYXBlRXhwcmVzc2lvbih0ZXh0KTtcbiAgICAgICAgICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoLywvZywgJyw8YnI+Jyk7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEhhbmRsZWJhcnMuU2FmZVN0cmluZyh0ZXh0KTtcbiAgICAgICAgfSk7XG4gICAgICAgIEhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ21vZGlmS2luZCcsIGZ1bmN0aW9uKGtpbmQpIHtcbiAgICAgICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC9ibG9iLzczZWUyZmViNTFjOWI3ZTI0YTI5ZWI0Y2VlMTlkN2MxNGI5MzMwNjUvbGliL3R5cGVzY3JpcHQuZC50cyNMNjRcbiAgICAgICAgICAgIGxldCBfa2luZFRleHQgPSAnJztcbiAgICAgICAgICAgIHN3aXRjaChraW5kKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAxMTI6XG4gICAgICAgICAgICAgICAgICAgIF9raW5kVGV4dCA9ICdQcml2YXRlJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAxMTM6XG4gICAgICAgICAgICAgICAgICAgIF9raW5kVGV4dCA9ICdQcm90ZWN0ZWQnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDExNDpcbiAgICAgICAgICAgICAgICAgICAgX2tpbmRUZXh0ID0gJ1B1YmxpYyc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTE1OlxuICAgICAgICAgICAgICAgICAgICBfa2luZFRleHQgPSAnU3RhdGljJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbmV3IEhhbmRsZWJhcnMuU2FmZVN0cmluZyhfa2luZFRleHQpO1xuICAgICAgICB9KTtcbiAgICAgICAgSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignbW9kaWZJY29uJywgZnVuY3Rpb24oa2luZCkge1xuICAgICAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL01pY3Jvc29mdC9UeXBlU2NyaXB0L2Jsb2IvNzNlZTJmZWI1MWM5YjdlMjRhMjllYjRjZWUxOWQ3YzE0YjkzMzA2NS9saWIvdHlwZXNjcmlwdC5kLnRzI0w2NFxuICAgICAgICAgICAgbGV0IF9raW5kVGV4dCA9ICcnO1xuICAgICAgICAgICAgc3dpdGNoKGtpbmQpIHtcbiAgICAgICAgICAgICAgICBjYXNlIDExMjpcbiAgICAgICAgICAgICAgICAgICAgX2tpbmRUZXh0ID0gJ2xvY2snO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDExMzpcbiAgICAgICAgICAgICAgICAgICAgX2tpbmRUZXh0ID0gJ2NpcmNsZSc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTE1OlxuICAgICAgICAgICAgICAgICAgICBfa2luZFRleHQgPSAnc3F1YXJlJztcbiAgICAgICAgICAgICAgICBjYXNlIDgzOlxuICAgICAgICAgICAgICAgICAgICBfa2luZFRleHQgPSAnZXhwb3J0JztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gX2tpbmRUZXh0O1xuICAgICAgICB9KTtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbnZlcnQge0BsaW5rIE15Q2xhc3N9IHRvIFtNeUNsYXNzXShodHRwOi8vbG9jYWxob3N0OjgwODAvY2xhc3Nlcy9NeUNsYXNzLmh0bWwpXG4gICAgICAgICAqL1xuICAgICAgICBIYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdwYXJzZURlc2NyaXB0aW9uJywgZnVuY3Rpb24oZGVzY3JpcHRpb24sIGRlcHRoKSB7XG4gICAgICAgICAgICBsZXQgdGFnUmVnRXhwID0gbmV3IFJlZ0V4cCgnXFxcXHtAbGlua1xcXFxzKygoPzoufFxcbikrPylcXFxcfScsICdpJyksXG4gICAgICAgICAgICAgICAgbWF0Y2hlcyxcbiAgICAgICAgICAgICAgICBwcmV2aW91c1N0cmluZyxcbiAgICAgICAgICAgICAgICB0YWdJbmZvID0gW11cblxuICAgICAgICAgICAgdmFyIHByb2Nlc3NUaGVMaW5rID0gZnVuY3Rpb24oc3RyaW5nLCB0YWdJbmZvKSB7XG4gICAgICAgICAgICAgICAgdmFyIGxlYWRpbmcgPSBleHRyYWN0TGVhZGluZ1RleHQoc3RyaW5nLCB0YWdJbmZvLmNvbXBsZXRlVGFnKSxcbiAgICAgICAgICAgICAgICAgICAgc3BsaXQsXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCxcbiAgICAgICAgICAgICAgICAgICAgbmV3TGluayxcbiAgICAgICAgICAgICAgICAgICAgcm9vdFBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHN0cmluZ3RvUmVwbGFjZTtcblxuICAgICAgICAgICAgICAgIHNwbGl0ID0gc3BsaXRMaW5rVGV4dCh0YWdJbmZvLnRleHQpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBzcGxpdC5saW5rVGV4dCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gJGRlcGVuZGVuY2llc0VuZ2luZS5maW5kSW5Db21wb2RvYyhzcGxpdC50YXJnZXQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9ICRkZXBlbmRlbmNpZXNFbmdpbmUuZmluZEluQ29tcG9kb2ModGFnSW5mby50ZXh0KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsZWFkaW5nLmxlYWRpbmdUZXh0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmd0b1JlcGxhY2UgPSAnWycgKyBsZWFkaW5nLmxlYWRpbmdUZXh0ICsgJ10nICsgdGFnSW5mby5jb21wbGV0ZVRhZztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygc3BsaXQubGlua1RleHQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmd0b1JlcGxhY2UgPSB0YWdJbmZvLmNvbXBsZXRlVGFnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaW5ndG9SZXBsYWNlID0gdGFnSW5mby5jb21wbGV0ZVRhZztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQudHlwZSA9PT0gJ2NsYXNzJykgcmVzdWx0LnR5cGUgPSAnY2xhc3NlJztcblxuICAgICAgICAgICAgICAgICAgICByb290UGF0aCA9ICcnO1xuXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoZGVwdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb290UGF0aCA9ICcuLyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcm9vdFBhdGggPSAnLi4vJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb290UGF0aCA9ICcuLi8uLi8nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgbGV0IGxhYmVsID0gcmVzdWx0Lm5hbWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsZWFkaW5nLmxlYWRpbmdUZXh0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsYWJlbCA9IGxlYWRpbmcubGVhZGluZ1RleHQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBzcGxpdC5saW5rVGV4dCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsID0gc3BsaXQubGlua1RleHQ7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBuZXdMaW5rID0gYDxhIGhyZWY9XCIke3Jvb3RQYXRofSR7cmVzdWx0LnR5cGV9cy8ke3Jlc3VsdC5uYW1lfS5odG1sXCI+JHtsYWJlbH08L2E+YDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKHN0cmluZ3RvUmVwbGFjZSwgbmV3TGluayk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0cmluZztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHJlcGxhY2VNYXRjaChyZXBsYWNlciwgdGFnLCBtYXRjaCwgdGV4dCkge1xuICAgICAgICAgICAgICAgIHZhciBtYXRjaGVkVGFnID0ge1xuICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZVRhZzogbWF0Y2gsXG4gICAgICAgICAgICAgICAgICAgIHRhZzogdGFnLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiB0ZXh0XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB0YWdJbmZvLnB1c2gobWF0Y2hlZFRhZyk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVwbGFjZXIoZGVzY3JpcHRpb24sIG1hdGNoZWRUYWcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkZXNjcmlwdGlvbiA9IGRlc2NyaXB0aW9uLnJlcGxhY2UoL1xcbi9nLCAnPGJyLz4nKTtcblxuICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgIG1hdGNoZXMgPSB0YWdSZWdFeHAuZXhlYyhkZXNjcmlwdGlvbik7XG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNTdHJpbmcgPSBkZXNjcmlwdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb24gPSByZXBsYWNlTWF0Y2gocHJvY2Vzc1RoZUxpbmssICdsaW5rJywgbWF0Y2hlc1swXSwgbWF0Y2hlc1sxXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSB3aGlsZSAobWF0Y2hlcyAmJiBwcmV2aW91c1N0cmluZyAhPT0gZGVzY3JpcHRpb24pO1xuXG4gICAgICAgICAgICByZXR1cm4gZGVzY3JpcHRpb247XG4gICAgICAgIH0pO1xuXG4gICAgICAgIEhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ3JlbGF0aXZlVVJMJywgZnVuY3Rpb24oY3VycmVudERlcHRoLCBjb250ZXh0KSB7XG4gICAgICAgICAgICBsZXQgcmVzdWx0ID0gJyc7XG5cbiAgICAgICAgICAgIHN3aXRjaCAoY3VycmVudERlcHRoKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSAnLi8nO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9ICcuLi8nO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9ICcuLi8uLi8nO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLypcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29udGV4dCA9PT0gJ3N0cmluZycgJiYgY29udGV4dCA9PSAnYWRkaXRpb25hbC1wYWdlJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdyZWxhdGl2ZVVSTDogJywgY3VycmVudERlcHRoLCByZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgKi9cblxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignZnVuY3Rpb25TaWduYXR1cmUnLCBmdW5jdGlvbihtZXRob2QpIHtcbiAgICAgICAgICAgIGxldCBhcmdzID0gW10sXG4gICAgICAgICAgICAgICAgY29uZmlndXJhdGlvbiA9IENvbmZpZ3VyYXRpb24uZ2V0SW5zdGFuY2UoKSxcbiAgICAgICAgICAgICAgICBhbmd1bGFyRG9jUHJlZml4ID0gcHJlZml4T2ZmaWNpYWxEb2MoY29uZmlndXJhdGlvbi5tYWluRGF0YS5hbmd1bGFyVmVyc2lvbik7XG4gICAgICAgICAgICBpZiAobWV0aG9kLmFyZ3MpIHtcbiAgICAgICAgICAgICAgICBhcmdzID0gbWV0aG9kLmFyZ3MubWFwKGZ1bmN0aW9uKGFyZykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgX3Jlc3VsdCA9ICRkZXBlbmRlbmNpZXNFbmdpbmUuZmluZChhcmcudHlwZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChfcmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX3Jlc3VsdC5zb3VyY2UgPT09ICdpbnRlcm5hbCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcGF0aCA9IF9yZXN1bHQuZGF0YS50eXBlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfcmVzdWx0LmRhdGEudHlwZSA9PT0gJ2NsYXNzJykgcGF0aCA9ICdjbGFzc2UnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBgJHthcmcubmFtZX06IDxhIGhyZWY9XCIuLi8ke3BhdGh9cy8ke19yZXN1bHQuZGF0YS5uYW1lfS5odG1sXCI+JHthcmcudHlwZX08L2E+YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBhdGggPSBgaHR0cHM6Ly8ke2FuZ3VsYXJEb2NQcmVmaXh9YW5ndWxhci5pby9kb2NzL3RzL2xhdGVzdC9hcGkvJHtfcmVzdWx0LmRhdGEucGF0aH1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBgJHthcmcubmFtZX06IDxhIGhyZWY9XCIke3BhdGh9XCIgdGFyZ2V0PVwiX2JsYW5rXCI+JHthcmcudHlwZX08L2E+YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBgJHthcmcubmFtZX06ICR7YXJnLnR5cGV9YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pLmpvaW4oJywgJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWV0aG9kLm5hbWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYCR7bWV0aG9kLm5hbWV9KCR7YXJnc30pYDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGAoJHthcmdzfSlgO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignanNkb2MtcmV0dXJucy1jb21tZW50JywgZnVuY3Rpb24oanNkb2NUYWdzLCBvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgaSA9IDAsXG4gICAgICAgICAgICAgICAgbGVuID0ganNkb2NUYWdzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICByZXN1bHQ7XG4gICAgICAgICAgICBmb3IoaTsgaTxsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChqc2RvY1RhZ3NbaV0udGFnTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoanNkb2NUYWdzW2ldLnRhZ05hbWUudGV4dCA9PT0gJ3JldHVybnMnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBqc2RvY1RhZ3NbaV0uY29tbWVudDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSk7XG4gICAgICAgIEhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2pzZG9jLWNvbXBvbmVudC1leGFtcGxlJywgZnVuY3Rpb24oanNkb2NUYWdzOmpzZG9jVGFnSW50ZXJmYWNlW10sIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIGxldCBpID0gMCxcbiAgICAgICAgICAgICAgICBsZW4gPSBqc2RvY1RhZ3MubGVuZ3RoLFxuICAgICAgICAgICAgICAgIHRhZ3MgPSBbXTtcblxuICAgICAgICAgICAgbGV0IGNsZWFuVGFnID0gZnVuY3Rpb24oY29tbWVudCkge1xuICAgICAgICAgICAgICAgIGlmIChjb21tZW50LmNoYXJBdCgwKSA9PT0gJyonKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgPSBjb21tZW50LnN1YnN0cmluZygxLCBjb21tZW50Lmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjb21tZW50LmNoYXJBdCgwKSA9PT0gJyAnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgPSBjb21tZW50LnN1YnN0cmluZygxLCBjb21tZW50Lmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBjb21tZW50O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgdHlwZSA9ICdodG1sJztcblxuICAgICAgICAgICAgaWYgKG9wdGlvbnMuaGFzaC50eXBlKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9IG9wdGlvbnMuaGFzaC50eXBlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiBodG1sRW50aXRpZXMoc3RyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFN0cmluZyhzdHIpLnJlcGxhY2UoLyYvZywgJyZhbXA7JykucmVwbGFjZSgvPC9nLCAnJmx0OycpLnJlcGxhY2UoLz4vZywgJyZndDsnKS5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7Jyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvcihpOyBpPGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGpzZG9jVGFnc1tpXS50YWdOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChqc2RvY1RhZ3NbaV0udGFnTmFtZS50ZXh0ID09PSAnZXhhbXBsZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0YWcgPSB7fSBhcyBqc2RvY1RhZ0ludGVyZmFjZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChqc2RvY1RhZ3NbaV0uY29tbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhZy5jb21tZW50ID0gYDxwcmUgY2xhc3M9XCJsaW5lLW51bWJlcnNcIj48Y29kZSBjbGFzcz1cImxhbmd1YWdlLSR7dHlwZX1cIj5gICsgaHRtbEVudGl0aWVzKGNsZWFuVGFnKGpzZG9jVGFnc1tpXS5jb21tZW50KSkgKyBgPC9jb2RlPjwvcHJlPmA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0YWdzLnB1c2godGFnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0YWdzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRhZ3MgPSB0YWdzO1xuICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25zLmZuKHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignanNkb2MtZXhhbXBsZScsIGZ1bmN0aW9uKGpzZG9jVGFnczpqc2RvY1RhZ0ludGVyZmFjZVtdLCBvcHRpb25zKSB7XG4gICAgICAgICAgICBsZXQgaSA9IDAsXG4gICAgICAgICAgICAgICAgbGVuID0ganNkb2NUYWdzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICB0YWdzID0gW107XG5cbiAgICAgICAgICAgIGZvcihpOyBpPGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGpzZG9jVGFnc1tpXS50YWdOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChqc2RvY1RhZ3NbaV0udGFnTmFtZS50ZXh0ID09PSAnZXhhbXBsZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0YWcgPSB7fSBhcyBqc2RvY1RhZ0ludGVyZmFjZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChqc2RvY1RhZ3NbaV0uY29tbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhZy5jb21tZW50ID0ganNkb2NUYWdzW2ldLmNvbW1lbnQucmVwbGFjZSgvPGNhcHRpb24+L2csICc8Yj48aT4nKS5yZXBsYWNlKC9cXC9jYXB0aW9uPi9nLCAnL2I+PC9pPicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGFncy5wdXNoKHRhZyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGFncy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50YWdzID0gdGFncztcbiAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIEhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2pzZG9jLXBhcmFtcycsIGZ1bmN0aW9uKGpzZG9jVGFnczpqc2RvY1RhZ0ludGVyZmFjZVtdLCBvcHRpb25zKSB7XG4gICAgICAgICAgICB2YXIgaSA9IDAsXG4gICAgICAgICAgICAgICAgbGVuID0ganNkb2NUYWdzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICB0YWdzID0gW107XG4gICAgICAgICAgICBmb3IoaTsgaTxsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChqc2RvY1RhZ3NbaV0udGFnTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoanNkb2NUYWdzW2ldLnRhZ05hbWUudGV4dCA9PT0gJ3BhcmFtJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRhZyA9IHt9IGFzIGpzZG9jVGFnSW50ZXJmYWNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGpzZG9jVGFnc1tpXS50eXBlRXhwcmVzc2lvbiAmJiBqc2RvY1RhZ3NbaV0udHlwZUV4cHJlc3Npb24udHlwZS5uYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFnLnR5cGUgPSBqc2RvY1RhZ3NbaV0udHlwZUV4cHJlc3Npb24udHlwZS5uYW1lLnRleHRcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChqc2RvY1RhZ3NbaV0uY29tbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhZy5jb21tZW50ID0ganNkb2NUYWdzW2ldLmNvbW1lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChqc2RvY1RhZ3NbaV0ucGFyYW1ldGVyTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhZy5uYW1lID0ganNkb2NUYWdzW2ldLnBhcmFtZXRlck5hbWUudGV4dFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGFncy5wdXNoKHRhZyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGFncy5sZW5ndGggPj0gMSkge1xuICAgICAgICAgICAgICAgIHRoaXMudGFncyA9IHRhZ3M7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMuZm4odGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBIYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdsaW5rVHlwZScsIGZ1bmN0aW9uKG5hbWUsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciBfcmVzdWx0ID0gJGRlcGVuZGVuY2llc0VuZ2luZS5maW5kKG5hbWUpLFxuICAgICAgICAgICAgICAgIGNvbmZpZ3VyYXRpb24gPSBDb25maWd1cmF0aW9uLmdldEluc3RhbmNlKCksXG4gICAgICAgICAgICAgICAgYW5ndWxhckRvY1ByZWZpeCA9IHByZWZpeE9mZmljaWFsRG9jKGNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuYW5ndWxhclZlcnNpb24pO1xuICAgICAgICAgICAgaWYgKF9yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnR5cGUgPSB7XG4gICAgICAgICAgICAgICAgICAgIHJhdzogbmFtZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoX3Jlc3VsdC5zb3VyY2UgPT09ICdpbnRlcm5hbCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9yZXN1bHQuZGF0YS50eXBlID09PSAnY2xhc3MnKSBfcmVzdWx0LmRhdGEudHlwZSA9ICdjbGFzc2UnO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnR5cGUuaHJlZiA9ICcuLi8nICsgX3Jlc3VsdC5kYXRhLnR5cGUgKyAncy8nICsgX3Jlc3VsdC5kYXRhLm5hbWUgKyAnLmh0bWwnO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnR5cGUudGFyZ2V0ID0gJ19zZWxmJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnR5cGUuaHJlZiA9IGBodHRwczovLyR7YW5ndWxhckRvY1ByZWZpeH1hbmd1bGFyLmlvL2RvY3MvdHMvbGF0ZXN0L2FwaS8ke19yZXN1bHQuZGF0YS5wYXRofWA7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudHlwZS50YXJnZXQgPSAnX2JsYW5rJztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIEhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2luZGV4YWJsZVNpZ25hdHVyZScsIGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgICAgICAgICAgY29uc3QgYXJncyA9IG1ldGhvZC5hcmdzLm1hcChhcmcgPT4gYCR7YXJnLm5hbWV9OiAke2FyZy50eXBlfWApLmpvaW4oJywgJyk7XG4gICAgICAgICAgICBpZiAobWV0aG9kLm5hbWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYCR7bWV0aG9kLm5hbWV9WyR7YXJnc31dYDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGBbJHthcmdzfV1gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignb2JqZWN0JywgZnVuY3Rpb24odGV4dCkge1xuICAgICAgICAgICAgdGV4dCA9IEpTT04uc3RyaW5naWZ5KHRleHQpO1xuICAgICAgICAgICAgdGV4dCA9IHRleHQucmVwbGFjZSgve1wiLywgJ3s8YnI+Jm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7XCInKTtcbiAgICAgICAgICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoLyxcIi8sICcsPGJyPiZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwO1wiJyk7XG4gICAgICAgICAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC99JC8sICc8YnI+fScpO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBIYW5kbGViYXJzLlNhZmVTdHJpbmcodGV4dCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIEhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2lzTm90VG9nZ2xlJywgZnVuY3Rpb24odHlwZSwgb3B0aW9ucykge1xuICAgICAgICAgICAgbGV0IGNvbmZpZ3VyYXRpb24gPSBDb25maWd1cmF0aW9uLmdldEluc3RhbmNlKCksXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gY29uZmlndXJhdGlvbi5tYWluRGF0YS50b2dnbGVNZW51SXRlbXMuaW5kZXhPZih0eXBlKTtcbiAgICAgICAgICAgIGlmIChjb25maWd1cmF0aW9uLm1haW5EYXRhLnRvZ2dsZU1lbnVJdGVtcy5pbmRleE9mKCdhbGwnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMuZm4odGhpcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICBpbml0OiBpbml0XG4gICAgfVxufSkoKVxuIiwiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIEhhbmRsZWJhcnMgZnJvbSAnaGFuZGxlYmFycyc7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tICcuLi8uLi9sb2dnZXInO1xuLy9pbXBvcnQgKiBhcyBoZWxwZXJzIGZyb20gJ2hhbmRsZWJhcnMtaGVscGVycyc7XG5pbXBvcnQgeyBIdG1sRW5naW5lSGVscGVycyB9IGZyb20gJy4vaHRtbC5lbmdpbmUuaGVscGVycyc7XG5cbmV4cG9ydCBjbGFzcyBIdG1sRW5naW5lIHtcbiAgICBjYWNoZTogT2JqZWN0ID0ge307XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIEh0bWxFbmdpbmVIZWxwZXJzLmluaXQoKTtcbiAgICB9XG4gICAgaW5pdCgpIHtcbiAgICAgICAgbGV0IHBhcnRpYWxzID0gW1xuICAgICAgICAgICAgJ21lbnUnLFxuICAgICAgICAgICAgJ292ZXJ2aWV3JyxcbiAgICAgICAgICAgICdyZWFkbWUnLFxuICAgICAgICAgICAgJ21vZHVsZXMnLFxuICAgICAgICAgICAgJ21vZHVsZScsXG4gICAgICAgICAgICAnY29tcG9uZW50cycsXG4gICAgICAgICAgICAnY29tcG9uZW50JyxcbiAgICAgICAgICAgICdjb21wb25lbnQtZGV0YWlsJyxcbiAgICAgICAgICAgICdkaXJlY3RpdmVzJyxcbiAgICAgICAgICAgICdkaXJlY3RpdmUnLFxuICAgICAgICAgICAgJ2luamVjdGFibGVzJyxcbiAgICAgICAgICAgICdpbmplY3RhYmxlJyxcbiAgICAgICAgICAgICdwaXBlcycsXG4gICAgICAgICAgICAncGlwZScsXG4gICAgICAgICAgICAnY2xhc3NlcycsXG4gICAgICAgICAgICAnY2xhc3MnLFxuXHQgICAgICAgICdpbnRlcmZhY2UnLFxuICAgICAgICAgICAgJ3JvdXRlcycsXG4gICAgICAgICAgICAnc2VhcmNoLXJlc3VsdHMnLFxuICAgICAgICAgICAgJ3NlYXJjaC1pbnB1dCcsXG4gICAgICAgICAgICAnbGluay10eXBlJyxcbiAgICAgICAgICAgICdibG9jay1tZXRob2QnLFxuICAgICAgICAgICAgJ2Jsb2NrLWVudW0nLFxuICAgICAgICAgICAgJ2Jsb2NrLXByb3BlcnR5JyxcbiAgICAgICAgICAgICdibG9jay1pbmRleCcsXG4gICAgICAgICAgICAnYmxvY2stY29uc3RydWN0b3InLFxuICAgICAgICAgICAgJ2NvdmVyYWdlLXJlcG9ydCcsXG4gICAgICAgICAgICAnbWlzY2VsbGFuZW91cycsXG4gICAgICAgICAgICAnYWRkaXRpb25hbC1wYWdlJ1xuICAgICAgICBdLFxuICAgICAgICAgICAgaSA9IDAsXG4gICAgICAgICAgICBsZW4gPSBwYXJ0aWFscy5sZW5ndGgsXG4gICAgICAgICAgICBsb29wID0gKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmKCBpIDw9IGxlbi0xKSB7XG4gICAgICAgICAgICAgICAgICAgIGZzLnJlYWRGaWxlKHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUgKyAnLy4uL3NyYy90ZW1wbGF0ZXMvcGFydGlhbHMvJyArIHBhcnRpYWxzW2ldICsgJy5oYnMnKSwgJ3V0ZjgnLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7IHJlamVjdCgpOyB9XG4gICAgICAgICAgICAgICAgICAgICAgICBIYW5kbGViYXJzLnJlZ2lzdGVyUGFydGlhbChwYXJ0aWFsc1tpXSwgZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb29wKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBsb29wKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZW5kZXIobWFpbkRhdGE6YW55LCBwYWdlOmFueSkge1xuICAgICAgICB2YXIgbyA9IG1haW5EYXRhLFxuICAgICAgICAgICAgdGhhdCA9IHRoaXM7XG4gICAgICAgICg8YW55Pk9iamVjdCkuYXNzaWduKG8sIHBhZ2UpO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBpZih0aGF0LmNhY2hlWydwYWdlJ10pIHtcbiAgICAgICAgICAgICAgICBsZXQgdGVtcGxhdGU6YW55ID0gSGFuZGxlYmFycy5jb21waWxlKHRoYXQuY2FjaGVbJ3BhZ2UnXSksXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHRlbXBsYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IG9cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmcy5yZWFkRmlsZShwYXRoLnJlc29sdmUoX19kaXJuYW1lICsgJy8uLi9zcmMvdGVtcGxhdGVzL3BhZ2UuaGJzJyksICd1dGY4JywgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCdFcnJvciBkdXJpbmcgaW5kZXggJyArIHBhZ2UubmFtZSArICcgZ2VuZXJhdGlvbicpO1xuICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgIHRoYXQuY2FjaGVbJ3BhZ2UnXSA9IGRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgIGxldCB0ZW1wbGF0ZTphbnkgPSBIYW5kbGViYXJzLmNvbXBpbGUoZGF0YSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB0ZW1wbGF0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogb1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZ2VuZXJhdGVDb3ZlcmFnZUJhZGdlKG91dHB1dEZvbGRlciwgY292ZXJhZ2VEYXRhKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBmcy5yZWFkRmlsZShwYXRoLnJlc29sdmUoX19kaXJuYW1lICsgJy8uLi9zcmMvdGVtcGxhdGVzL3BhcnRpYWxzL2NvdmVyYWdlLWJhZGdlLmhicycpLCAndXRmOCcsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICByZWplY3QoJ0Vycm9yIGR1cmluZyBjb3ZlcmFnZSBiYWRnZSBnZW5lcmF0aW9uJyk7XG4gICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgIGxldCB0ZW1wbGF0ZTphbnkgPSBIYW5kbGViYXJzLmNvbXBpbGUoZGF0YSksXG4gICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHRlbXBsYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IGNvdmVyYWdlRGF0YVxuICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICBvdXRwdXRGb2xkZXIgPSBvdXRwdXRGb2xkZXIucmVwbGFjZShwcm9jZXNzLmN3ZCgpLCAnJyk7XG4gICAgICAgICAgICAgICAgICAgZnMub3V0cHV0RmlsZShwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSArIHBhdGguc2VwICsgb3V0cHV0Rm9sZGVyICsgcGF0aC5zZXAgKyAnL2ltYWdlcy9jb3ZlcmFnZS1iYWRnZS5zdmcnKSwgcmVzdWx0LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgIGlmKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKCdFcnJvciBkdXJpbmcgY292ZXJhZ2UgYmFkZ2UgZmlsZSBnZW5lcmF0aW9uICcsIGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgfVxuICAgICAgICAgICB9KTtcbiAgICAgICB9KTtcbiAgICB9XG59O1xuIiwiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuY29uc3QgbWFya2VkID0gcmVxdWlyZSgnbWFya2VkJyk7XG5cbmV4cG9ydCBjbGFzcyBNYXJrZG93bkVuZ2luZSB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIGNvbnN0IHJlbmRlcmVyID0gbmV3IG1hcmtlZC5SZW5kZXJlcigpO1xuICAgICAgICByZW5kZXJlci5jb2RlID0gKGNvZGUsIGxhbmd1YWdlKSA9PiB7XG4gICAgICAgICAgICBsZXQgaGlnaGxpZ2h0ZWQgPSBjb2RlO1xuICAgICAgICAgICAgaWYgKCFsYW5ndWFnZSkge1xuICAgICAgICAgICAgICAgIGxhbmd1YWdlID0gJ25vbmUnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBoaWdobGlnaHRlZCA9IHRoaXMuZXNjYXBlKGNvZGUpO1xuICAgICAgICAgICAgcmV0dXJuIGA8cHJlIGNsYXNzPVwibGluZS1udW1iZXJzXCI+PGNvZGUgY2xhc3M9XCJsYW5ndWFnZS0ke2xhbmd1YWdlfVwiPiR7aGlnaGxpZ2h0ZWR9PC9jb2RlPjwvcHJlPmA7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmVuZGVyZXIudGFibGUgPSAoaGVhZGVyLCBib2R5KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gJzx0YWJsZSBjbGFzcz1cInRhYmxlIHRhYmxlLWJvcmRlcmVkIGNvbXBvZG9jLXRhYmxlXCI+XFxuJ1xuICAgICAgICAgICAgICAgICsgJzx0aGVhZD5cXG4nXG4gICAgICAgICAgICAgICAgKyBoZWFkZXJcbiAgICAgICAgICAgICAgICArICc8L3RoZWFkPlxcbidcbiAgICAgICAgICAgICAgICArICc8dGJvZHk+XFxuJ1xuICAgICAgICAgICAgICAgICsgYm9keVxuICAgICAgICAgICAgICAgICsgJzwvdGJvZHk+XFxuJ1xuICAgICAgICAgICAgICAgICsgJzwvdGFibGU+XFxuJztcbiAgICAgICAgfVxuXG4gICAgICAgIHJlbmRlcmVyLmltYWdlID0gZnVuY3Rpb24gKGhyZWYsIHRpdGxlLCB0ZXh0KSB7XG4gICAgICAgICAgICB2YXIgb3V0ID0gJzxpbWcgc3JjPVwiJyArIGhyZWYgKyAnXCIgYWx0PVwiJyArIHRleHQgKyAnXCIgY2xhc3M9XCJpbWctcmVzcG9uc2l2ZVwiJztcbiAgICAgICAgICAgIGlmICh0aXRsZSkge1xuICAgICAgICAgICAgICAgIG91dCArPSAnIHRpdGxlPVwiJyArIHRpdGxlICsgJ1wiJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSB0aGlzLm9wdGlvbnMueGh0bWwgPyAnLz4nIDogJz4nO1xuICAgICAgICAgICAgcmV0dXJuIG91dDtcbiAgICAgICAgfTtcblxuICAgICAgICBtYXJrZWQuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICByZW5kZXJlcjogcmVuZGVyZXIsXG4gICAgICAgICAgICBicmVha3M6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXQoZmlsZXBhdGg6IHN0cmluZykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgZnMucmVhZEZpbGUocGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCkgKyBwYXRoLnNlcCArIGZpbGVwYXRoKSwgJ3V0ZjgnLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoJ0Vycm9yIGR1cmluZyAnICsgZmlsZXBhdGggKyAnIHJlYWQnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG1hcmtlZChkYXRhKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBnZXRSZWFkbWVGaWxlKCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgZnMucmVhZEZpbGUocGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCkgKyAnL1JFQURNRS5tZCcpLCAndXRmOCcsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdCgnRXJyb3IgZHVyaW5nIFJFQURNRS5tZCBmaWxlIHJlYWRpbmcnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKG1hcmtlZChkYXRhKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBjb21wb25lbnRIYXNSZWFkbWVGaWxlKGZpbGU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBsZXQgZGlybmFtZSA9IHBhdGguZGlybmFtZShmaWxlKSxcbiAgICAgICAgICAgIHJlYWRtZUZpbGUgPSBkaXJuYW1lICsgcGF0aC5zZXAgKyAnUkVBRE1FLm1kJyxcbiAgICAgICAgICAgIHJlYWRtZUFsdGVybmF0aXZlRmlsZSA9IGRpcm5hbWUgKyBwYXRoLnNlcCArIHBhdGguYmFzZW5hbWUoZmlsZSwgJy50cycpICsgJy5tZCc7XG4gICAgICAgIHJldHVybiBmcy5leGlzdHNTeW5jKHJlYWRtZUZpbGUpIHx8IGZzLmV4aXN0c1N5bmMocmVhZG1lQWx0ZXJuYXRpdmVGaWxlKTtcbiAgICB9XG4gICAgY29tcG9uZW50UmVhZG1lRmlsZShmaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBsZXQgZGlybmFtZSA9IHBhdGguZGlybmFtZShmaWxlKSxcbiAgICAgICAgICAgIHJlYWRtZUZpbGUgPSBkaXJuYW1lICsgcGF0aC5zZXAgKyAnUkVBRE1FLm1kJyxcbiAgICAgICAgICAgIHJlYWRtZUFsdGVybmF0aXZlRmlsZSA9IGRpcm5hbWUgKyBwYXRoLnNlcCArIHBhdGguYmFzZW5hbWUoZmlsZSwgJy50cycpICsgJy5tZCcsXG4gICAgICAgICAgICBmaW5hbFBhdGggPSAnJztcbiAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMocmVhZG1lRmlsZSkpIHtcbiAgICAgICAgICAgIGZpbmFsUGF0aCA9IHJlYWRtZUZpbGU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmaW5hbFBhdGggPSByZWFkbWVBbHRlcm5hdGl2ZUZpbGU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZpbmFsUGF0aDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGVzY2FwZShodG1sKSB7XG4gICAgICAgIHJldHVybiBodG1sXG4gICAgICAgICAgICAucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoLzwvZywgJyZsdDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgJyYjMzk7JylcbiAgICAgICAgICAgIC5yZXBsYWNlKC9AL2csICcmIzY0OycpO1xuICAgIH1cbn07XG4iLCJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgSGFuZGxlYmFycyBmcm9tICdoYW5kbGViYXJzJztcblxuZXhwb3J0IGNsYXNzIEZpbGVFbmdpbmUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuXG4gICAgfVxuICAgIGdldChmaWxlcGF0aDpzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICBmcy5yZWFkRmlsZShwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSArIHBhdGguc2VwICsgZmlsZXBhdGgpLCAndXRmOCcsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICByZWplY3QoJ0Vycm9yIGR1cmluZyAnICsgZmlsZXBhdGggKyAnIHJlYWQnKTtcbiAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG4iLCJpbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgU2hlbGxqcyBmcm9tICdzaGVsbGpzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAndXRpbCc7XG5cbmltcG9ydCB7ICRkZXBlbmRlbmNpZXNFbmdpbmUgfSBmcm9tICcuL2RlcGVuZGVuY2llcy5lbmdpbmUnO1xuXG5pbXBvcnQgaXNHbG9iYWwgZnJvbSAnLi4vLi4vdXRpbHMvZ2xvYmFsLnBhdGgnO1xuXG5sZXQgbmdkQ3IgPSByZXF1aXJlKCdAY29tcG9kb2MvbmdkLWNvcmUnKTtcbmxldCBuZ2RUID0gcmVxdWlyZSgnQGNvbXBvZG9jL25nZC10cmFuc2Zvcm1lcicpO1xuXG5leHBvcnQgY2xhc3MgTmdkRW5naW5lIHtcbiAgICBjb25zdHJ1Y3RvcigpIHt9XG4gICAgcmVuZGVyR3JhcGgoZmlsZXBhdGg6IHN0cmluZywgb3V0cHV0cGF0aDogc3RyaW5nLCB0eXBlOiBzdHJpbmcsIG5hbWU/OiBzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgbmdkQ3IubG9nZ2VyLnNpbGVudCA9IGZhbHNlO1xuICAgICAgICAgICAgbGV0IGVuZ2luZSA9IG5ldyBuZ2RULkRvdEVuZ2luZSh7XG4gICAgICAgICAgICAgICAgb3V0cHV0OiBvdXRwdXRwYXRoLFxuICAgICAgICAgICAgICAgIGRpc3BsYXlMZWdlbmQ6IHRydWUsXG4gICAgICAgICAgICAgICAgb3V0cHV0Rm9ybWF0czogJ3N2ZydcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKHR5cGUgPT09ICdmJykge1xuICAgICAgICAgICAgICAgIGVuZ2luZVxuICAgICAgICAgICAgICAgICAgICAuZ2VuZXJhdGVHcmFwaChbJGRlcGVuZGVuY2llc0VuZ2luZS5nZXRSYXdNb2R1bGUobmFtZSldKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmaWxlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVuZ2luZVxuICAgICAgICAgICAgICAgICAgICAuZ2VuZXJhdGVHcmFwaCgkZGVwZW5kZW5jaWVzRW5naW5lLnJhd01vZHVsZXNGb3JPdmVydmlldylcbiAgICAgICAgICAgICAgICAgICAgLnRoZW4oZmlsZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIGVycm9yID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmVhZEdyYXBoKGZpbGVwYXRoOiBzdHJpbmcsIG5hbWU6IHN0cmluZykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBmcy5yZWFkRmlsZShwYXRoLnJlc29sdmUoZmlsZXBhdGgpLCAndXRmOCcsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICByZWplY3QoJ0Vycm9yIGR1cmluZyBncmFwaCByZWFkICcgKyBuYW1lKTtcbiAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG4iLCJpbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgSGFuZGxlYmFycyBmcm9tICdoYW5kbGViYXJzJztcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gJy4uLy4uL2xvZ2dlcic7XG5pbXBvcnQgeyBDb25maWd1cmF0aW9uIH0gZnJvbSAnLi4vY29uZmlndXJhdGlvbic7XG5cbmNvbnN0IGx1bnI6IGFueSA9IHJlcXVpcmUoJ2x1bnInKSxcbiAgICAgIGNoZWVyaW86IGFueSA9IHJlcXVpcmUoJ2NoZWVyaW8nKSxcbiAgICAgIEVudGl0aWVzOmFueSA9IHJlcXVpcmUoJ2h0bWwtZW50aXRpZXMnKS5BbGxIdG1sRW50aXRpZXMsXG4gICAgICAkY29uZmlndXJhdGlvbiA9IENvbmZpZ3VyYXRpb24uZ2V0SW5zdGFuY2UoKSxcbiAgICAgIEh0bWwgPSBuZXcgRW50aXRpZXMoKTtcblxuZXhwb3J0IGNsYXNzIFNlYXJjaEVuZ2luZSB7XG4gICAgc2VhcmNoSW5kZXg6IGFueTtcbiAgICBkb2N1bWVudHNTdG9yZTogT2JqZWN0ID0ge307XG4gICAgaW5kZXhTaXplOiBudW1iZXI7XG4gICAgY29uc3RydWN0b3IoKSB7fVxuICAgIHByaXZhdGUgZ2V0U2VhcmNoSW5kZXgoKSB7XG4gICAgICAgIGlmICghdGhpcy5zZWFyY2hJbmRleCkge1xuICAgICAgICAgICAgdGhpcy5zZWFyY2hJbmRleCA9IGx1bnIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVmKCd1cmwnKTtcbiAgICAgICAgICAgICAgICB0aGlzLmZpZWxkKCd0aXRsZScsIHsgYm9vc3Q6IDEwIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuZmllbGQoJ2JvZHknKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnNlYXJjaEluZGV4O1xuICAgIH1cbiAgICBpbmRleFBhZ2UocGFnZSkge1xuICAgICAgICB2YXIgdGV4dCxcbiAgICAgICAgICAgICQgPSBjaGVlcmlvLmxvYWQocGFnZS5yYXdEYXRhKTtcblxuICAgICAgICB0ZXh0ID0gJCgnLmNvbnRlbnQnKS5odG1sKCk7XG4gICAgICAgIHRleHQgPSBIdG1sLmRlY29kZSh0ZXh0KTtcbiAgICAgICAgdGV4dCA9IHRleHQucmVwbGFjZSgvKDwoW14+XSspPikvaWcsICcnKTtcblxuICAgICAgICBwYWdlLnVybCA9IHBhZ2UudXJsLnJlcGxhY2UoJGNvbmZpZ3VyYXRpb24ubWFpbkRhdGEub3V0cHV0LCAnJyk7XG5cbiAgICAgICAgdmFyIGRvYyA9IHtcbiAgICAgICAgICAgIHVybDogcGFnZS51cmwsXG4gICAgICAgICAgICB0aXRsZTogcGFnZS5pbmZvcy5jb250ZXh0ICsgJyAtICcgKyBwYWdlLmluZm9zLm5hbWUsXG4gICAgICAgICAgICBib2R5OiB0ZXh0XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kb2N1bWVudHNTdG9yZVtkb2MudXJsXSA9IGRvYztcblxuICAgICAgICB0aGlzLmdldFNlYXJjaEluZGV4KCkuYWRkKGRvYyk7XG4gICAgfVxuICAgIGdlbmVyYXRlU2VhcmNoSW5kZXhKc29uKG91dHB1dEZvbGRlcikge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgZnMucmVhZEZpbGUocGF0aC5yZXNvbHZlKF9fZGlybmFtZSArICcvLi4vc3JjL3RlbXBsYXRlcy9wYXJ0aWFscy9zZWFyY2gtaW5kZXguaGJzJyksICd1dGY4JywgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgIHJlamVjdCgnRXJyb3IgZHVyaW5nIHNlYXJjaCBpbmRleCBnZW5lcmF0aW9uJyk7XG4gICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgIGxldCB0ZW1wbGF0ZTphbnkgPSBIYW5kbGViYXJzLmNvbXBpbGUoZGF0YSksXG4gICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHRlbXBsYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4OiBKU09OLnN0cmluZ2lmeSh0aGlzLmdldFNlYXJjaEluZGV4KCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcmU6IEpTT04uc3RyaW5naWZ5KHRoaXMuZG9jdW1lbnRzU3RvcmUpXG4gICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgIG91dHB1dEZvbGRlciA9IG91dHB1dEZvbGRlci5yZXBsYWNlKHByb2Nlc3MuY3dkKCksICcnKTtcbiAgICAgICAgICAgICAgICAgICBmcy5vdXRwdXRGaWxlKHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpICsgcGF0aC5zZXAgKyBvdXRwdXRGb2xkZXIgKyBwYXRoLnNlcCArICcvanMvc2VhcmNoL3NlYXJjaF9pbmRleC5qcycpLCByZXN1bHQsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgaWYoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoJ0Vycm9yIGR1cmluZyBzZWFyY2ggaW5kZXggZmlsZSBnZW5lcmF0aW9uICcsIGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgfVxuICAgICAgICAgICB9KTtcbiAgICAgICB9KTtcbiAgICB9XG59O1xuIiwiaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICd1dGlsJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcblxuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnLi9sb2dnZXInO1xuXG5jb25zdCBjYXJyaWFnZVJldHVybkxpbmVGZWVkID0gJ1xcclxcbic7XG5jb25zdCBsaW5lRmVlZCA9ICdcXG4nO1xuXG5leHBvcnQgZnVuY3Rpb24gY2xlYW5OYW1lV2l0aG91dFNwYWNlQW5kVG9Mb3dlckNhc2UobmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoLyAvZywgJy0nKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRldGVjdEluZGVudChzdHIsIGNvdW50LCBpbmRlbnQ/KTogc3RyaW5nIHtcbiAgICBsZXQgc3RyaXBJbmRlbnQgPSBmdW5jdGlvbihzdHI6IHN0cmluZykge1xuICAgICAgICBjb25zdCBtYXRjaCA9IHN0ci5tYXRjaCgvXlsgXFx0XSooPz1cXFMpL2dtKTtcblxuICAgICAgICBpZiAoIW1hdGNoKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RyO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVE9ETzogdXNlIHNwcmVhZCBvcGVyYXRvciB3aGVuIHRhcmdldGluZyBOb2RlLmpzIDZcbiAgICAgICAgY29uc3QgaW5kZW50ID0gTWF0aC5taW4uYXBwbHkoTWF0aCwgbWF0Y2gubWFwKHggPT4geC5sZW5ndGgpKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZVxuICAgICAgICBjb25zdCByZSA9IG5ldyBSZWdFeHAoYF5bIFxcXFx0XXske2luZGVudH19YCwgJ2dtJyk7XG5cbiAgICAgICAgcmV0dXJuIGluZGVudCA+IDAgPyBzdHIucmVwbGFjZShyZSwgJycpIDogc3RyO1xuICAgIH0sXG4gICAgICAgIHJlcGVhdGluZyA9IGZ1bmN0aW9uKG4sIHN0cikge1xuICAgICAgICBzdHIgPSBzdHIgPT09IHVuZGVmaW5lZCA/ICcgJyA6IHN0cjtcblxuICAgICAgICBpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIFxcYGlucHV0XFxgIHRvIGJlIGEgXFxgc3RyaW5nXFxgLCBnb3QgXFxgJHt0eXBlb2Ygc3RyfVxcYGApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG4gPCAwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcXGBjb3VudFxcYCB0byBiZSBhIHBvc2l0aXZlIGZpbml0ZSBudW1iZXIsIGdvdCBcXGAke259XFxgYCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcmV0ID0gJyc7XG5cbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgaWYgKG4gJiAxKSB7XG4gICAgICAgICAgICAgICAgcmV0ICs9IHN0cjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3RyICs9IHN0cjtcbiAgICAgICAgfSB3aGlsZSAoKG4gPj49IDEpKTtcblxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG4gICAgaW5kZW50U3RyaW5nID0gZnVuY3Rpb24oc3RyLCBjb3VudCwgaW5kZW50KSB7XG4gICAgICAgIGluZGVudCA9IGluZGVudCA9PT0gdW5kZWZpbmVkID8gJyAnIDogaW5kZW50O1xuICAgICAgICBjb3VudCA9IGNvdW50ID09PSB1bmRlZmluZWQgPyAxIDogY291bnQ7XG5cbiAgICAgICAgaWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcXGBpbnB1dFxcYCB0byBiZSBhIFxcYHN0cmluZ1xcYCwgZ290IFxcYCR7dHlwZW9mIHN0cn1cXGBgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY291bnQgIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcXGBjb3VudFxcYCB0byBiZSBhIFxcYG51bWJlclxcYCwgZ290IFxcYCR7dHlwZW9mIGNvdW50fVxcYGApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBpbmRlbnQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBFeHBlY3RlZCBcXGBpbmRlbnRcXGAgdG8gYmUgYSBcXGBzdHJpbmdcXGAsIGdvdCBcXGAke3R5cGVvZiBpbmRlbnR9XFxgYCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY291bnQgPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBzdHI7XG4gICAgICAgIH1cblxuICAgICAgICBpbmRlbnQgPSBjb3VudCA+IDEgPyByZXBlYXRpbmcoY291bnQsIGluZGVudCkgOiBpbmRlbnQ7XG5cbiAgICAgICAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eKD8hXFxzKiQpL21nLCBpbmRlbnQpO1xuICAgIH1cblxuICAgIHJldHVybiBpbmRlbnRTdHJpbmcoc3RyaXBJbmRlbnQoc3RyKSwgY291bnQgfHwgMCwgaW5kZW50KTtcbn1cblxuLy8gQ3JlYXRlIGEgY29tcGlsZXJIb3N0IG9iamVjdCB0byBhbGxvdyB0aGUgY29tcGlsZXIgdG8gcmVhZCBhbmQgd3JpdGUgZmlsZXNcbmV4cG9ydCBmdW5jdGlvbiBjb21waWxlckhvc3QodHJhbnNwaWxlT3B0aW9uczogYW55KTogdHMuQ29tcGlsZXJIb3N0IHtcblxuICAgIGNvbnN0IGlucHV0RmlsZU5hbWUgPSB0cmFuc3BpbGVPcHRpb25zLmZpbGVOYW1lIHx8ICh0cmFuc3BpbGVPcHRpb25zLmpzeCA/ICdtb2R1bGUudHN4JyA6ICdtb2R1bGUudHMnKTtcblxuICAgIGNvbnN0IGNvbXBpbGVySG9zdDogdHMuQ29tcGlsZXJIb3N0ID0ge1xuICAgICAgICBnZXRTb3VyY2VGaWxlOiAoZmlsZU5hbWUpID0+IHtcbiAgICAgICAgICAgIGlmIChmaWxlTmFtZS5sYXN0SW5kZXhPZignLnRzJykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZpbGVOYW1lID09PSAnbGliLmQudHMnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChmaWxlTmFtZS5zdWJzdHIoLTUpID09PSAnLmQudHMnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHBhdGguaXNBYnNvbHV0ZShmaWxlTmFtZSkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGVOYW1lID0gcGF0aC5qb2luKHRyYW5zcGlsZU9wdGlvbnMudHNjb25maWdEaXJlY3RvcnksIGZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGZpbGVOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGxldCBsaWJTb3VyY2UgPSAnJztcblxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGxpYlNvdXJjZSA9IGZzLnJlYWRGaWxlU3luYyhmaWxlTmFtZSkudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2goZSkge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoZSwgZmlsZU5hbWUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiB0cy5jcmVhdGVTb3VyY2VGaWxlKGZpbGVOYW1lLCBsaWJTb3VyY2UsIHRyYW5zcGlsZU9wdGlvbnMudGFyZ2V0LCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9LFxuICAgICAgICB3cml0ZUZpbGU6IChuYW1lLCB0ZXh0KSA9PiB7fSxcbiAgICAgICAgZ2V0RGVmYXVsdExpYkZpbGVOYW1lOiAoKSA9PiAnbGliLmQudHMnLFxuICAgICAgICB1c2VDYXNlU2Vuc2l0aXZlRmlsZU5hbWVzOiAoKSA9PiBmYWxzZSxcbiAgICAgICAgZ2V0Q2Fub25pY2FsRmlsZU5hbWU6IGZpbGVOYW1lID0+IGZpbGVOYW1lLFxuICAgICAgICBnZXRDdXJyZW50RGlyZWN0b3J5OiAoKSA9PiAnJyxcbiAgICAgICAgZ2V0TmV3TGluZTogKCkgPT4gJ1xcbicsXG4gICAgICAgIGZpbGVFeGlzdHM6IChmaWxlTmFtZSk6IGJvb2xlYW4gPT4gZmlsZU5hbWUgPT09IGlucHV0RmlsZU5hbWUsXG4gICAgICAgIHJlYWRGaWxlOiAoKSA9PiAnJyxcbiAgICAgICAgZGlyZWN0b3J5RXhpc3RzOiAoKSA9PiB0cnVlLFxuICAgICAgICBnZXREaXJlY3RvcmllczogKCkgPT4gW11cbiAgICB9O1xuICAgIHJldHVybiBjb21waWxlckhvc3Q7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kTWFpblNvdXJjZUZvbGRlcihmaWxlczogc3RyaW5nW10pIHtcbiAgICBsZXQgbWFpbkZvbGRlciA9ICcnLFxuICAgICAgICBtYWluRm9sZGVyQ291bnQgPSAwLFxuICAgICAgICByYXdGb2xkZXJzID0gZmlsZXMubWFwKChmaWxlcGF0aCkgPT4ge1xuICAgICAgICAgICAgdmFyIHNob3J0UGF0aCA9IGZpbGVwYXRoLnJlcGxhY2UocHJvY2Vzcy5jd2QoKSArIHBhdGguc2VwLCAnJyk7XG4gICAgICAgICAgICByZXR1cm4gcGF0aC5kaXJuYW1lKHNob3J0UGF0aCk7XG4gICAgICAgIH0pLFxuICAgICAgICBmb2xkZXJzID0ge30sXG4gICAgICAgIGkgPSAwO1xuICAgIHJhd0ZvbGRlcnMgPSBfLnVuaXEocmF3Rm9sZGVycyk7XG4gICAgbGV0IGxlbiA9IHJhd0ZvbGRlcnMubGVuZ3RoO1xuICAgIGZvcihpOyBpPGxlbjsgaSsrKXtcbiAgICAgICAgbGV0IHNlcCA9IHJhd0ZvbGRlcnNbaV0uc3BsaXQocGF0aC5zZXApO1xuICAgICAgICBzZXAubWFwKChmb2xkZXIpID0+IHtcbiAgICAgICAgICAgIGlmIChmb2xkZXJzW2ZvbGRlcl0pIHtcbiAgICAgICAgICAgICAgICBmb2xkZXJzW2ZvbGRlcl0gKz0gMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZm9sZGVyc1tmb2xkZXJdID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9XG4gICAgZm9yIChsZXQgZiBpbiBmb2xkZXJzKSB7XG4gICAgICAgIGlmKGZvbGRlcnNbZl0gPiBtYWluRm9sZGVyQ291bnQpIHtcbiAgICAgICAgICAgIG1haW5Gb2xkZXJDb3VudCA9IGZvbGRlcnNbZl07XG4gICAgICAgICAgICBtYWluRm9sZGVyID0gZjtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWFpbkZvbGRlcjtcbn1cbiIsImltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAndXRpbCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgSGFuZGxlYmFycyBmcm9tICdoYW5kbGViYXJzJztcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gJy4uL2xvZ2dlcic7XG5cbmV4cG9ydCBsZXQgUm91dGVyUGFyc2VyID0gKGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIHJvdXRlczogYW55W10gPSBbXSxcbiAgICAgICAgaW5jb21wbGV0ZVJvdXRlcyA9IFtdLFxuICAgICAgICBtb2R1bGVzID0gW10sXG4gICAgICAgIG1vZHVsZXNUcmVlLFxuICAgICAgICByb290TW9kdWxlLFxuICAgICAgICBjbGVhbk1vZHVsZXNUcmVlLFxuICAgICAgICBtb2R1bGVzV2l0aFJvdXRlcyA9IFtdLFxuXG4gICAgICAgIF9hZGRSb3V0ZSA9IGZ1bmN0aW9uKHJvdXRlKSB7XG4gICAgICAgICAgICByb3V0ZXMucHVzaChyb3V0ZSk7XG4gICAgICAgICAgICByb3V0ZXMgPSBfLnNvcnRCeShfLnVuaXFXaXRoKHJvdXRlcywgXy5pc0VxdWFsKSwgWyduYW1lJ10pO1xuICAgICAgICB9LFxuXG4gICAgICAgIF9hZGRJbmNvbXBsZXRlUm91dGUgPSBmdW5jdGlvbihyb3V0ZSkge1xuICAgICAgICAgICAgaW5jb21wbGV0ZVJvdXRlcy5wdXNoKHJvdXRlKTtcbiAgICAgICAgICAgIGluY29tcGxldGVSb3V0ZXMgPSBfLnNvcnRCeShfLnVuaXFXaXRoKGluY29tcGxldGVSb3V0ZXMsIF8uaXNFcXVhbCksIFsnbmFtZSddKTtcbiAgICAgICAgfSxcblxuICAgICAgICBfYWRkTW9kdWxlV2l0aFJvdXRlcyA9IGZ1bmN0aW9uKG1vZHVsZU5hbWUsIG1vZHVsZUltcG9ydHMpIHtcbiAgICAgICAgICAgIG1vZHVsZXNXaXRoUm91dGVzLnB1c2goe1xuICAgICAgICAgICAgICAgIG5hbWU6IG1vZHVsZU5hbWUsXG4gICAgICAgICAgICAgICAgaW1wb3J0c05vZGU6IG1vZHVsZUltcG9ydHNcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbW9kdWxlc1dpdGhSb3V0ZXMgPSBfLnNvcnRCeShfLnVuaXFXaXRoKG1vZHVsZXNXaXRoUm91dGVzLCBfLmlzRXF1YWwpLCBbJ25hbWUnXSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2FkZE1vZHVsZSA9IGZ1bmN0aW9uKG1vZHVsZU5hbWU6IHN0cmluZywgbW9kdWxlSW1wb3J0cykge1xuICAgICAgICAgICAgbW9kdWxlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICBuYW1lOiBtb2R1bGVOYW1lLFxuICAgICAgICAgICAgICAgIGltcG9ydHNOb2RlOiBtb2R1bGVJbXBvcnRzXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIG1vZHVsZXMgPSBfLnNvcnRCeShfLnVuaXFXaXRoKG1vZHVsZXMsIF8uaXNFcXVhbCksIFsnbmFtZSddKTtcbiAgICAgICAgfSxcblxuICAgICAgICBfY2xlYW5SYXdSb3V0ZVBhcnNlZCA9IGZ1bmN0aW9uKHJvdXRlOiBzdHJpbmcpIHtcbiAgICAgICAgICAgIGxldCByb3V0ZXNXaXRob3V0U3BhY2VzID0gcm91dGUucmVwbGFjZSgvIC9nbSwgJycpLFxuICAgICAgICAgICAgICAgIHRlc3RUcmFpbGluZ0NvbW1hID0gcm91dGVzV2l0aG91dFNwYWNlcy5pbmRleE9mKCd9LF0nKTtcbiAgICAgICAgICAgIGlmICh0ZXN0VHJhaWxpbmdDb21tYSAhPSAtMSkge1xuICAgICAgICAgICAgICAgIHJvdXRlc1dpdGhvdXRTcGFjZXMgPSByb3V0ZXNXaXRob3V0U3BhY2VzLnJlcGxhY2UoJ30sXScsICd9XScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2Uocm91dGVzV2l0aG91dFNwYWNlcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2NsZWFuUmF3Um91dGUgPSBmdW5jdGlvbihyb3V0ZTogc3RyaW5nKSB7XG4gICAgICAgICAgICBsZXQgcm91dGVzV2l0aG91dFNwYWNlcyA9IHJvdXRlLnJlcGxhY2UoLyAvZ20sICcnKSxcbiAgICAgICAgICAgICAgICB0ZXN0VHJhaWxpbmdDb21tYSA9IHJvdXRlc1dpdGhvdXRTcGFjZXMuaW5kZXhPZignfSxdJyk7XG4gICAgICAgICAgICBpZiAodGVzdFRyYWlsaW5nQ29tbWEgIT0gLTEpIHtcbiAgICAgICAgICAgICAgICByb3V0ZXNXaXRob3V0U3BhY2VzID0gcm91dGVzV2l0aG91dFNwYWNlcy5yZXBsYWNlKCd9LF0nLCAnfV0nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByb3V0ZXNXaXRob3V0U3BhY2VzO1xuICAgICAgICB9LFxuXG4gICAgICAgIF9zZXRSb290TW9kdWxlID0gZnVuY3Rpb24obW9kdWxlOiBzdHJpbmcpIHtcbiAgICAgICAgICAgIHJvb3RNb2R1bGUgPSBtb2R1bGU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2hhc1JvdXRlck1vZHVsZUluSW1wb3J0cyA9IGZ1bmN0aW9uKGltcG9ydHMpIHtcbiAgICAgICAgICAgIGxldCByZXN1bHQgPSBmYWxzZSxcbiAgICAgICAgICAgICAgICBpID0gMCxcbiAgICAgICAgICAgICAgICBsZW4gPSBpbXBvcnRzLmxlbmd0aDtcbiAgICAgICAgICAgIGZvcihpOyBpPGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGltcG9ydHNbaV0ubmFtZS5pbmRleE9mKCdSb3V0ZXJNb2R1bGUuZm9yQ2hpbGQnKSAhPT0gLTEgfHxcbiAgICAgICAgICAgICAgICAgICAgaW1wb3J0c1tpXS5uYW1lLmluZGV4T2YoJ1JvdXRlck1vZHVsZS5mb3JSb290JykgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSxcblxuICAgICAgICBfZml4SW5jb21wbGV0ZVJvdXRlcyA9IGZ1bmN0aW9uKG1pc2NlbGxhbmVvdXNWYXJpYWJsZXMpIHtcbiAgICAgICAgICAgIC8qY29uc29sZS5sb2coJ2ZpeEluY29tcGxldGVSb3V0ZXMnKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHJvdXRlcyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnJyk7Ki9cbiAgICAgICAgICAgIC8vY29uc29sZS5sb2cobWlzY2VsbGFuZW91c1ZhcmlhYmxlcyk7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCcnKTtcbiAgICAgICAgICAgIGxldCBpID0gMCxcbiAgICAgICAgICAgICAgICBsZW4gPSBpbmNvbXBsZXRlUm91dGVzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICBtYXRjaGluZ1ZhcmlhYmxlcyA9IFtdO1xuICAgICAgICAgICAgLy8gRm9yIGVhY2ggaW5jb21wbGV0ZVJvdXRlLCBzY2FuIGlmIG9uZSBtaXNjIHZhcmlhYmxlIGlzIGluIGNvZGVcbiAgICAgICAgICAgIC8vIGlmIG9rLCB0cnkgcmVjcmVhdGluZyBjb21wbGV0ZSByb3V0ZVxuICAgICAgICAgICAgZm9yIChpOyBpPGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbGV0IGogPSAwLFxuICAgICAgICAgICAgICAgICAgICBsZW5nID0gbWlzY2VsbGFuZW91c1ZhcmlhYmxlcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgZm9yIChqOyBqPGxlbmc7IGorKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5jb21wbGV0ZVJvdXRlc1tpXS5kYXRhLmluZGV4T2YobWlzY2VsbGFuZW91c1ZhcmlhYmxlc1tqXS5uYW1lKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdmb3VuZCBvbmUgbWlzYyB2YXIgaW5zaWRlIGluY29tcGxldGVSb3V0ZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cobWlzY2VsbGFuZW91c1ZhcmlhYmxlc1tqXS5uYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoaW5nVmFyaWFibGVzLnB1c2gobWlzY2VsbGFuZW91c1ZhcmlhYmxlc1tqXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy9DbGVhbiBpbmNvbXBsZXRlUm91dGVcbiAgICAgICAgICAgICAgICBpbmNvbXBsZXRlUm91dGVzW2ldLmRhdGEgPSBpbmNvbXBsZXRlUm91dGVzW2ldLmRhdGEucmVwbGFjZSgnWycsICcnKTtcbiAgICAgICAgICAgICAgICBpbmNvbXBsZXRlUm91dGVzW2ldLmRhdGEgPSBpbmNvbXBsZXRlUm91dGVzW2ldLmRhdGEucmVwbGFjZSgnXScsICcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8qY29uc29sZS5sb2coaW5jb21wbGV0ZVJvdXRlcyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhtYXRjaGluZ1ZhcmlhYmxlcyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnJyk7Ki9cblxuICAgICAgICB9LFxuXG4gICAgICAgIF9saW5rTW9kdWxlc0FuZFJvdXRlcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLypjb25zb2xlLmxvZygnJyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnbGlua01vZHVsZXNBbmRSb3V0ZXM6ICcpO1xuICAgICAgICAgICAgLy9zY2FuIGVhY2ggbW9kdWxlIGltcG9ydHMgQVNUIGZvciBlYWNoIHJvdXRlcywgYW5kIGxpbmsgcm91dGVzIHdpdGggbW9kdWxlXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnbGlua01vZHVsZXNBbmRSb3V0ZXMgcm91dGVzOiAnLCByb3V0ZXMpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJycpOyovXG4gICAgICAgICAgICBsZXQgaSA9IDAsXG4gICAgICAgICAgICAgICAgbGVuID0gbW9kdWxlc1dpdGhSb3V0ZXMubGVuZ3RoO1xuICAgICAgICAgICAgZm9yKGk7IGk8bGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBfLmZvckVhY2gobW9kdWxlc1dpdGhSb3V0ZXNbaV0uaW1wb3J0c05vZGUsIGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUuaW5pdGlhbGl6ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmluaXRpYWxpemVyLmVsZW1lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKG5vZGUuaW5pdGlhbGl6ZXIuZWxlbWVudHMsIGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9maW5kIGVsZW1lbnQgd2l0aCBhcmd1bWVudHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQuYXJndW1lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmZvckVhY2goZWxlbWVudC5hcmd1bWVudHMsIGZ1bmN0aW9uKGFyZ3VtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKHJvdXRlcywgZnVuY3Rpb24ocm91dGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoYXJndW1lbnQudGV4dCAmJiByb3V0ZS5uYW1lID09PSBhcmd1bWVudC50ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3V0ZS5tb2R1bGUgPSBtb2R1bGVzV2l0aFJvdXRlc1tpXS5uYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qY29uc29sZS5sb2coJycpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2VuZCBsaW5rTW9kdWxlc0FuZFJvdXRlczogJyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyh1dGlsLmluc3BlY3Qocm91dGVzLCB7IGRlcHRoOiAxMCB9KSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnJyk7Ki9cbiAgICAgICAgfSxcblxuICAgICAgICBmb3VuZFJvdXRlV2l0aE1vZHVsZU5hbWUgPSBmdW5jdGlvbihtb2R1bGVOYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gXy5maW5kKHJvdXRlcywgeydtb2R1bGUnOiBtb2R1bGVOYW1lfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZm91bmRMYXp5TW9kdWxlV2l0aFBhdGggPSBmdW5jdGlvbihwYXRoKSB7XG4gICAgICAgICAgICAvL3BhdGggaXMgbGlrZSBhcHAvY3VzdG9tZXJzL2N1c3RvbWVycy5tb2R1bGUjQ3VzdG9tZXJzTW9kdWxlXG4gICAgICAgICAgICBsZXQgc3BsaXQgPSBwYXRoLnNwbGl0KCcjJyksXG4gICAgICAgICAgICAgICAgbGF6eU1vZHVsZVBhdGggPSBzcGxpdFswXSxcbiAgICAgICAgICAgICAgICBsYXp5TW9kdWxlTmFtZSA9IHNwbGl0WzFdO1xuICAgICAgICAgICAgcmV0dXJuIGxhenlNb2R1bGVOYW1lO1xuICAgICAgICB9LFxuXG4gICAgICAgIF9jb25zdHJ1Y3RSb3V0ZXNUcmVlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCcnKTtcbiAgICAgICAgICAgIC8qY29uc29sZS5sb2coJ2NvbnN0cnVjdFJvdXRlc1RyZWUgbW9kdWxlczogJywgbW9kdWxlcyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnY29uc3RydWN0Um91dGVzVHJlZSBtb2R1bGVzV2l0aFJvdXRlczogJywgbW9kdWxlc1dpdGhSb3V0ZXMpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJycpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2NvbnN0cnVjdFJvdXRlc1RyZWUgbW9kdWxlc1RyZWU6ICcsIHV0aWwuaW5zcGVjdChtb2R1bGVzVHJlZSwgeyBkZXB0aDogMTAgfSkpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJycpOyovXG5cbiAgICAgICAgICAgIC8vIHJvdXRlc1tdIGNvbnRhaW5zIHJvdXRlcyB3aXRoIG1vZHVsZSBsaW5rXG4gICAgICAgICAgICAvLyBtb2R1bGVzVHJlZSBjb250YWlucyBtb2R1bGVzIHRyZWVcbiAgICAgICAgICAgIC8vIG1ha2UgYSBmaW5hbCByb3V0ZXMgdHJlZSB3aXRoIHRoYXRcbiAgICAgICAgICAgIGNsZWFuTW9kdWxlc1RyZWUgPSBfLmNsb25lRGVlcChtb2R1bGVzVHJlZSk7XG5cbiAgICAgICAgICAgIGxldCBtb2R1bGVzQ2xlYW5lciA9IGZ1bmN0aW9uKGFycikge1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGkgaW4gYXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJyW2ldLmltcG9ydHNOb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGFycltpXS5pbXBvcnRzTm9kZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcnJbaV0ucGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGFycltpXS5wYXJlbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihhcnJbaV0uY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2R1bGVzQ2xlYW5lcihhcnJbaV0uY2hpbGRyZW4pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBtb2R1bGVzQ2xlYW5lcihjbGVhbk1vZHVsZXNUcmVlKTtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJycpO1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnICBjbGVhbk1vZHVsZXNUcmVlIGxpZ2h0OiAnLCB1dGlsLmluc3BlY3QoY2xlYW5Nb2R1bGVzVHJlZSwgeyBkZXB0aDogMTAgfSkpO1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnJyk7XG5cbiAgICAgICAgICAgIC8vY29uc29sZS5sb2cocm91dGVzKTtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJycpO1xuXG4gICAgICAgICAgICB2YXIgcm91dGVzVHJlZSA9IHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnPHJvb3Q+JyxcbiAgICAgICAgICAgICAgICBraW5kOiAnbW9kdWxlJyxcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU6IHJvb3RNb2R1bGUsXG4gICAgICAgICAgICAgICAgY2hpbGRyZW46IFtdXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBsZXQgbG9vcE1vZHVsZXNQYXJzZXIgPSBmdW5jdGlvbihub2RlKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUuY2hpbGRyZW4gJiYgbm9kZS5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vSWYgbW9kdWxlIGhhcyBjaGlsZCBtb2R1bGVzXG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJyAgIElmIG1vZHVsZSBoYXMgY2hpbGQgbW9kdWxlcycpO1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGkgaW4gbm9kZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJvdXRlID0gZm91bmRSb3V0ZVdpdGhNb2R1bGVOYW1lKG5vZGUuY2hpbGRyZW5baV0ubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocm91dGUgJiYgcm91dGUuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdXRlLmNoaWxkcmVuID0gSlNPTi5wYXJzZShyb3V0ZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgcm91dGUuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3V0ZS5raW5kID0gJ21vZHVsZSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcm91dGVzVHJlZS5jaGlsZHJlbi5wdXNoKHJvdXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmNoaWxkcmVuW2ldLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9vcE1vZHVsZXNQYXJzZXIobm9kZS5jaGlsZHJlbltpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvL2Vsc2Ugcm91dGVzIGFyZSBkaXJlY3RseSBpbnNpZGUgdGhlIG1vZHVsZVxuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCcgICBlbHNlIHJvdXRlcyBhcmUgZGlyZWN0bHkgaW5zaWRlIHRoZSByb290IG1vZHVsZScpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgcmF3Um91dGVzID0gZm91bmRSb3V0ZVdpdGhNb2R1bGVOYW1lKG5vZGUubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyYXdSb3V0ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCByb3V0ZXMgPSBKU09OLnBhcnNlKHJhd1JvdXRlcy5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyb3V0ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgaSA9IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxlbiA9IHJvdXRlcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yKGk7IGk8bGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJvdXRlID0gcm91dGVzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocm91dGVzW2ldLmNvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm91dGVzVHJlZS5jaGlsZHJlbi5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBraW5kOiAnY29tcG9uZW50JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQ6IHJvdXRlc1tpXS5jb21wb25lbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogcm91dGVzW2ldLnBhdGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnJyk7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCcgIHJvb3RNb2R1bGU6ICcsIHJvb3RNb2R1bGUpO1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnJyk7XG5cbiAgICAgICAgICAgIGxldCBzdGFydE1vZHVsZSA9IF8uZmluZChjbGVhbk1vZHVsZXNUcmVlLCB7J25hbWUnOiByb290TW9kdWxlfSk7XG5cbiAgICAgICAgICAgIGlmIChzdGFydE1vZHVsZSkge1xuICAgICAgICAgICAgICAgIGxvb3BNb2R1bGVzUGFyc2VyKHN0YXJ0TW9kdWxlKTtcbiAgICAgICAgICAgICAgICAvL0xvb3AgdHdpY2UgZm9yIHJvdXRlcyB3aXRoIGxhenkgbG9hZGluZ1xuICAgICAgICAgICAgICAgIC8vbG9vcE1vZHVsZXNQYXJzZXIocm91dGVzVHJlZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8qY29uc29sZS5sb2coJycpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJyAgcm91dGVzVHJlZTogJywgcm91dGVzVHJlZSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnJyk7Ki9cblxuICAgICAgICAgICAgdmFyIGNsZWFuZWRSb3V0ZXNUcmVlID0gbnVsbDtcblxuICAgICAgICAgICAgdmFyIGNsZWFuUm91dGVzVHJlZSA9IGZ1bmN0aW9uKHJvdXRlKSB7XG4gICAgICAgICAgICAgICAgZm9yKHZhciBpIGluIHJvdXRlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByb3V0ZXMgPSByb3V0ZS5jaGlsZHJlbltpXS5yb3V0ZXM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByb3V0ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2xlYW5lZFJvdXRlc1RyZWUgPSBjbGVhblJvdXRlc1RyZWUocm91dGVzVHJlZSk7XG5cbiAgICAgICAgICAgIC8vVHJ5IHVwZGF0aW5nIHJvdXRlcyB3aXRoIGxhenkgbG9hZGluZ1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnJyk7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdUcnkgdXBkYXRpbmcgcm91dGVzIHdpdGggbGF6eSBsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIGxldCBsb29wUm91dGVzUGFyc2VyID0gZnVuY3Rpb24ocm91dGUpIHtcbiAgICAgICAgICAgICAgICBpZihyb3V0ZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGkgaW4gcm91dGUuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyb3V0ZS5jaGlsZHJlbltpXS5sb2FkQ2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgY2hpbGQgPSBmb3VuZExhenlNb2R1bGVXaXRoUGF0aChyb3V0ZS5jaGlsZHJlbltpXS5sb2FkQ2hpbGRyZW4pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2R1bGUgPSBfLmZpbmQoY2xlYW5Nb2R1bGVzVHJlZSwgeyduYW1lJzogY2hpbGR9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobW9kdWxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBfcmF3TW9kdWxlOmFueSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcmF3TW9kdWxlLmtpbmQgPSAnbW9kdWxlJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX3Jhd01vZHVsZS5jaGlsZHJlbiA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcmF3TW9kdWxlLm1vZHVsZSA9IG1vZHVsZS5uYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbG9vcEluc2lkZSA9IGZ1bmN0aW9uKG1vZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYobW9kLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBpIGluIG1vZC5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcm91dGUgPSBmb3VuZFJvdXRlV2l0aE1vZHVsZU5hbWUobW9kLmNoaWxkcmVuW2ldLm5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHJvdXRlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJvdXRlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3V0ZS5jaGlsZHJlbiA9IEpTT04ucGFyc2Uocm91dGUuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHJvdXRlLmRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm91dGUua2luZCA9ICdtb2R1bGUnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9yYXdNb2R1bGUuY2hpbGRyZW5baV0gPSByb3V0ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb29wSW5zaWRlKG1vZHVsZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm91dGUuY2hpbGRyZW5baV0uY2hpbGRyZW4gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm91dGUuY2hpbGRyZW5baV0uY2hpbGRyZW4ucHVzaChfcmF3TW9kdWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBsb29wUm91dGVzUGFyc2VyKHJvdXRlLmNoaWxkcmVuW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxvb3BSb3V0ZXNQYXJzZXIoY2xlYW5lZFJvdXRlc1RyZWUpO1xuXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCcnKTtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJyAgY2xlYW5lZFJvdXRlc1RyZWU6ICcsIHV0aWwuaW5zcGVjdChjbGVhbmVkUm91dGVzVHJlZSwgeyBkZXB0aDogMTAgfSkpO1xuXG4gICAgICAgICAgICByZXR1cm4gY2xlYW5lZFJvdXRlc1RyZWU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgX2NvbnN0cnVjdE1vZHVsZXNUcmVlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCcnKTtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ2NvbnN0cnVjdE1vZHVsZXNUcmVlJyk7XG4gICAgICAgICAgICBsZXQgZ2V0TmVzdGVkQ2hpbGRyZW4gPSBmdW5jdGlvbihhcnIsIHBhcmVudD8pIHtcbiAgICAgICAgICAgICAgICB2YXIgb3V0ID0gW11cbiAgICAgICAgICAgICAgICBmb3IodmFyIGkgaW4gYXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKGFycltpXS5wYXJlbnQgPT09IHBhcmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNoaWxkcmVuID0gZ2V0TmVzdGVkQ2hpbGRyZW4oYXJyLCBhcnJbaV0ubmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFycltpXS5jaGlsZHJlbiA9IGNoaWxkcmVuXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQucHVzaChhcnJbaV0pXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG91dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vU2NhbiBlYWNoIG1vZHVsZSBhbmQgYWRkIHBhcmVudCBwcm9wZXJ0eVxuICAgICAgICAgICAgXy5mb3JFYWNoKG1vZHVsZXMsIGZ1bmN0aW9uKGZpcnN0TG9vcE1vZHVsZSkge1xuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChmaXJzdExvb3BNb2R1bGUuaW1wb3J0c05vZGUsIGZ1bmN0aW9uKGltcG9ydE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgXy5mb3JFYWNoKG1vZHVsZXMsIGZ1bmN0aW9uKG1vZHVsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoIG1vZHVsZS5uYW1lID09PSBpbXBvcnROb2RlLm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2R1bGUucGFyZW50ID0gZmlyc3RMb29wTW9kdWxlLm5hbWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIG1vZHVsZXNUcmVlID0gZ2V0TmVzdGVkQ2hpbGRyZW4obW9kdWxlcyk7XG4gICAgICAgICAgICAvKmNvbnNvbGUubG9nKCcnKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdlbmQgY29uc3RydWN0TW9kdWxlc1RyZWUnKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG1vZHVsZXNUcmVlKTsqL1xuICAgICAgICB9LFxuXG4gICAgICAgIF9nZW5lcmF0ZVJvdXRlc0luZGV4ID0gZnVuY3Rpb24ob3V0cHV0Rm9sZGVyLCByb3V0ZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgZnMucmVhZEZpbGUocGF0aC5yZXNvbHZlKF9fZGlybmFtZSArICcvLi4vc3JjL3RlbXBsYXRlcy9wYXJ0aWFscy9yb3V0ZXMtaW5kZXguaGJzJyksICd1dGY4JywgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCdFcnJvciBkdXJpbmcgcm91dGVzIGluZGV4IGdlbmVyYXRpb24nKTtcbiAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGVtcGxhdGU6YW55ID0gSGFuZGxlYmFycy5jb21waWxlKGRhdGEpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gdGVtcGxhdGUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdXRlczogSlNPTi5zdHJpbmdpZnkocm91dGVzKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgIG91dHB1dEZvbGRlciA9IG91dHB1dEZvbGRlci5yZXBsYWNlKHByb2Nlc3MuY3dkKCksICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgZnMub3V0cHV0RmlsZShwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSArIHBhdGguc2VwICsgb3V0cHV0Rm9sZGVyICsgcGF0aC5zZXAgKyAnL2pzL3JvdXRlcy9yb3V0ZXNfaW5kZXguanMnKSwgcmVzdWx0LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBpZihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoJ0Vycm9yIGR1cmluZyByb3V0ZXMgaW5kZXggZmlsZSBnZW5lcmF0aW9uICcsIGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgIH0pO1xuICAgICAgIH0sXG5cbiAgICAgICBfcm91dGVzTGVuZ3RoID0gZnVuY3Rpb24oKTogbnVtYmVyIHtcbiAgICAgICAgICAgdmFyIF9uID0gMDtcblxuICAgICAgICAgICBsZXQgcm91dGVzUGFyc2VyID0gZnVuY3Rpb24ocm91dGUpIHtcbiAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygcm91dGUucGF0aCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICBfbiArPSAxO1xuICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgaWYgKHJvdXRlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgZm9yKHZhciBqIGluIHJvdXRlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgIHJvdXRlc1BhcnNlcihyb3V0ZS5jaGlsZHJlbltqXSk7XG4gICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgfVxuICAgICAgICAgICB9O1xuXG4gICAgICAgICAgIGZvcih2YXIgaSBpbiByb3V0ZXMpIHtcbiAgICAgICAgICAgICAgIHJvdXRlc1BhcnNlcihyb3V0ZXNbaV0pO1xuICAgICAgICAgICB9XG5cbiAgICAgICAgICAgcmV0dXJuIF9uO1xuICAgICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGluY29tcGxldGVSb3V0ZXM6IGluY29tcGxldGVSb3V0ZXMsXG4gICAgICAgIGFkZFJvdXRlOiBfYWRkUm91dGUsXG4gICAgICAgIGFkZEluY29tcGxldGVSb3V0ZTogX2FkZEluY29tcGxldGVSb3V0ZSxcbiAgICAgICAgYWRkTW9kdWxlV2l0aFJvdXRlczogX2FkZE1vZHVsZVdpdGhSb3V0ZXMsXG4gICAgICAgIGFkZE1vZHVsZTogX2FkZE1vZHVsZSxcbiAgICAgICAgY2xlYW5SYXdSb3V0ZVBhcnNlZDogX2NsZWFuUmF3Um91dGVQYXJzZWQsXG4gICAgICAgIGNsZWFuUmF3Um91dGU6IF9jbGVhblJhd1JvdXRlLFxuICAgICAgICBzZXRSb290TW9kdWxlOiBfc2V0Um9vdE1vZHVsZSxcbiAgICAgICAgcHJpbnRSb3V0ZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJycpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3ByaW50Um91dGVzOiAnKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHJvdXRlcyk7XG4gICAgICAgIH0sXG4gICAgICAgIHByaW50TW9kdWxlc1JvdXRlczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygncHJpbnRNb2R1bGVzUm91dGVzOiAnKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG1vZHVsZXNXaXRoUm91dGVzKTtcbiAgICAgICAgfSxcbiAgICAgICAgcm91dGVzTGVuZ3RoOiBfcm91dGVzTGVuZ3RoLFxuICAgICAgICBoYXNSb3V0ZXJNb2R1bGVJbkltcG9ydHM6IF9oYXNSb3V0ZXJNb2R1bGVJbkltcG9ydHMsXG4gICAgICAgIGZpeEluY29tcGxldGVSb3V0ZXM6IF9maXhJbmNvbXBsZXRlUm91dGVzLFxuICAgICAgICBsaW5rTW9kdWxlc0FuZFJvdXRlczogX2xpbmtNb2R1bGVzQW5kUm91dGVzLFxuICAgICAgICBjb25zdHJ1Y3RSb3V0ZXNUcmVlOiBfY29uc3RydWN0Um91dGVzVHJlZSxcbiAgICAgICAgY29uc3RydWN0TW9kdWxlc1RyZWU6IF9jb25zdHJ1Y3RNb2R1bGVzVHJlZSxcbiAgICAgICAgZ2VuZXJhdGVSb3V0ZXNJbmRleDogX2dlbmVyYXRlUm91dGVzSW5kZXhcbiAgICB9XG59KSgpO1xuIiwiaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1ZhcmlhYmxlTGlrZShub2RlOiBOb2RlKTogbm9kZSBpcyBWYXJpYWJsZUxpa2VEZWNsYXJhdGlvbiB7XG4gICBpZiAobm9kZSkge1xuICAgICAgIHN3aXRjaCAobm9kZS5raW5kKSB7XG4gICAgICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5CaW5kaW5nRWxlbWVudDpcbiAgICAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkVudW1NZW1iZXI6XG4gICAgICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5QYXJhbWV0ZXI6XG4gICAgICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5Qcm9wZXJ0eUFzc2lnbm1lbnQ6XG4gICAgICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5Qcm9wZXJ0eURlY2xhcmF0aW9uOlxuICAgICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuUHJvcGVydHlTaWduYXR1cmU6XG4gICAgICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5TaG9ydGhhbmRQcm9wZXJ0eUFzc2lnbm1lbnQ6XG4gICAgICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5WYXJpYWJsZURlY2xhcmF0aW9uOlxuICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgfVxuICAgfVxuICAgcmV0dXJuIGZhbHNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc29tZTxUPihhcnJheTogVFtdLCBwcmVkaWNhdGU/OiAodmFsdWU6IFQpID0+IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgaWYgKHByZWRpY2F0ZSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCB2IG9mIGFycmF5KSB7XG4gICAgICAgICAgICAgICAgaWYgKHByZWRpY2F0ZSh2KSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYXJyYXkubGVuZ3RoID4gMDtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb25jYXRlbmF0ZTxUPihhcnJheTE6IFRbXSwgYXJyYXkyOiBUW10pOiBUW10ge1xuICAgIGlmICghc29tZShhcnJheTIpKSByZXR1cm4gYXJyYXkxO1xuICAgIGlmICghc29tZShhcnJheTEpKSByZXR1cm4gYXJyYXkyO1xuICAgIHJldHVybiBbLi4uYXJyYXkxLCAuLi5hcnJheTJdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNQYXJhbWV0ZXIobm9kZTogTm9kZSk6IG5vZGUgaXMgUGFyYW1ldGVyRGVjbGFyYXRpb24ge1xuICAgIHJldHVybiBub2RlLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuUGFyYW1ldGVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0SlNEb2NQYXJhbWV0ZXJUYWdzKHBhcmFtOiBOb2RlKTogSlNEb2NQYXJhbWV0ZXJUYWdbXSB7XG4gICAgaWYgKCFpc1BhcmFtZXRlcihwYXJhbSkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgZnVuYyA9IHBhcmFtLnBhcmVudCBhcyBGdW5jdGlvbkxpa2VEZWNsYXJhdGlvbjtcbiAgICBjb25zdCB0YWdzID0gZ2V0SlNEb2NUYWdzKGZ1bmMsIHRzLlN5bnRheEtpbmQuSlNEb2NQYXJhbWV0ZXJUYWcpIGFzIEpTRG9jUGFyYW1ldGVyVGFnW107XG4gICAgaWYgKCFwYXJhbS5uYW1lKSB7XG4gICAgICAgIC8vIHRoaXMgaXMgYW4gYW5vbnltb3VzIGpzZG9jIHBhcmFtIGZyb20gYSBgZnVuY3Rpb24odHlwZTEsIHR5cGUyKTogdHlwZTNgIHNwZWNpZmljYXRpb25cbiAgICAgICAgY29uc3QgaSA9IGZ1bmMucGFyYW1ldGVycy5pbmRleE9mKHBhcmFtKTtcbiAgICAgICAgY29uc3QgcGFyYW1UYWdzID0gZmlsdGVyKHRhZ3MsIHRhZyA9PiB0YWcua2luZCA9PT0gdHMuU3ludGF4S2luZC5KU0RvY1BhcmFtZXRlclRhZyk7XG4gICAgICAgIGlmIChwYXJhbVRhZ3MgJiYgMCA8PSBpICYmIGkgPCBwYXJhbVRhZ3MubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gW3BhcmFtVGFnc1tpXV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAocGFyYW0ubmFtZS5raW5kID09PSB0cy5TeW50YXhLaW5kLklkZW50aWZpZXIpIHtcbiAgICAgICAgY29uc3QgbmFtZSA9IChwYXJhbS5uYW1lIGFzIElkZW50aWZpZXIpLnRleHQ7XG4gICAgICAgIHJldHVybiBmaWx0ZXIodGFncywgdGFnID0+IHRhZy5raW5kID09PSB0cy5TeW50YXhLaW5kLkpTRG9jUGFyYW1ldGVyVGFnICYmIHRhZy5wYXJhbWV0ZXJOYW1lLnRleHQgPT09IG5hbWUpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgLy8gVE9ETzogaXQncyBhIGRlc3RydWN0dXJlZCBwYXJhbWV0ZXIsIHNvIGl0IHNob3VsZCBsb29rIHVwIGFuIFwib2JqZWN0IHR5cGVcIiBzZXJpZXMgb2YgbXVsdGlwbGUgbGluZXNcbiAgICAgICAgLy8gQnV0IG11bHRpLWxpbmUgb2JqZWN0IHR5cGVzIGFyZW4ndCBzdXBwb3J0ZWQgeWV0IGVpdGhlclxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbn1cblxuZXhwb3J0IGxldCBKU0RvY1RhZ3NQYXJzZXIgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICBsZXQgX2dldEpTRG9jcyA9IChub2RlOiBOb2RlKTooSlNEb2MgfCBKU0RvY1RhZylbXSA9PiB7XG4gICAgICAgIC8vY29uc29sZS5sb2coJ2dldEpTRG9jczogJywgbm9kZSk7XG4gICAgICAgIGxldCBjYWNoZTogKEpTRG9jIHwgSlNEb2NUYWcpW10gPSBub2RlLmpzRG9jQ2FjaGU7XG4gICAgICAgIGlmICghY2FjaGUpIHtcbiAgICAgICAgICAgIGdldEpTRG9jc1dvcmtlcihub2RlKTtcbiAgICAgICAgICAgIG5vZGUuanNEb2NDYWNoZSA9IGNhY2hlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjYWNoZTtcblxuICAgICAgICBmdW5jdGlvbiBnZXRKU0RvY3NXb3JrZXIobm9kZTogTm9kZSkge1xuICAgICAgICAgICAgY29uc3QgcGFyZW50ID0gbm9kZS5wYXJlbnQ7XG4gICAgICAgICAgICAvLyBUcnkgdG8gcmVjb2duaXplIHRoaXMgcGF0dGVybiB3aGVuIG5vZGUgaXMgaW5pdGlhbGl6ZXIgb2YgdmFyaWFibGUgZGVjbGFyYXRpb24gYW5kIEpTRG9jIGNvbW1lbnRzIGFyZSBvbiBjb250YWluaW5nIHZhcmlhYmxlIHN0YXRlbWVudC5cbiAgICAgICAgICAgIC8vIC8qKlxuICAgICAgICAgICAgLy8gICAqIEBwYXJhbSB7bnVtYmVyfSBuYW1lXG4gICAgICAgICAgICAvLyAgICogQHJldHVybnMge251bWJlcn1cbiAgICAgICAgICAgIC8vICAgKi9cbiAgICAgICAgICAgIC8vIHZhciB4ID0gZnVuY3Rpb24obmFtZSkgeyByZXR1cm4gbmFtZS5sZW5ndGg7IH1cbiAgICAgICAgICAgIGNvbnN0IGlzSW5pdGlhbGl6ZXJPZlZhcmlhYmxlRGVjbGFyYXRpb25JblN0YXRlbWVudCA9XG4gICAgICAgICAgICAgICAgaXNWYXJpYWJsZUxpa2UocGFyZW50KSAmJlxuICAgICAgICAgICAgICAgIHBhcmVudC5pbml0aWFsaXplciA9PT0gbm9kZSAmJlxuICAgICAgICAgICAgICAgIHBhcmVudC5wYXJlbnQucGFyZW50LmtpbmQgPT09IHRzLlN5bnRheEtpbmQuVmFyaWFibGVTdGF0ZW1lbnQ7XG4gICAgICAgICAgICBjb25zdCBpc1ZhcmlhYmxlT2ZWYXJpYWJsZURlY2xhcmF0aW9uU3RhdGVtZW50ID0gaXNWYXJpYWJsZUxpa2Uobm9kZSkgJiZcbiAgICAgICAgICAgICAgICBwYXJlbnQucGFyZW50LmtpbmQgPT09IHRzLlN5bnRheEtpbmQuVmFyaWFibGVTdGF0ZW1lbnQ7XG4gICAgICAgICAgICBjb25zdCB2YXJpYWJsZVN0YXRlbWVudE5vZGUgPVxuICAgICAgICAgICAgICAgIGlzSW5pdGlhbGl6ZXJPZlZhcmlhYmxlRGVjbGFyYXRpb25JblN0YXRlbWVudCA/IHBhcmVudC5wYXJlbnQucGFyZW50IDpcbiAgICAgICAgICAgICAgICBpc1ZhcmlhYmxlT2ZWYXJpYWJsZURlY2xhcmF0aW9uU3RhdGVtZW50ID8gcGFyZW50LnBhcmVudCA6XG4gICAgICAgICAgICAgICAgdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKHZhcmlhYmxlU3RhdGVtZW50Tm9kZSkge1xuICAgICAgICAgICAgICAgIGdldEpTRG9jc1dvcmtlcih2YXJpYWJsZVN0YXRlbWVudE5vZGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBbHNvIHJlY29nbml6ZSB3aGVuIHRoZSBub2RlIGlzIHRoZSBSSFMgb2YgYW4gYXNzaWdubWVudCBleHByZXNzaW9uXG4gICAgICAgICAgICBjb25zdCBpc1NvdXJjZU9mQXNzaWdubWVudEV4cHJlc3Npb25TdGF0ZW1lbnQgPVxuICAgICAgICAgICAgICAgIHBhcmVudCAmJiBwYXJlbnQucGFyZW50ICYmXG4gICAgICAgICAgICAgICAgcGFyZW50LmtpbmQgPT09IHRzLlN5bnRheEtpbmQuQmluYXJ5RXhwcmVzc2lvbiAmJlxuICAgICAgICAgICAgICAgIChwYXJlbnQgYXMgQmluYXJ5RXhwcmVzc2lvbikub3BlcmF0b3JUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuICYmXG4gICAgICAgICAgICAgICAgcGFyZW50LnBhcmVudC5raW5kID09PSB0cy5TeW50YXhLaW5kLkV4cHJlc3Npb25TdGF0ZW1lbnQ7XG4gICAgICAgICAgICBpZiAoaXNTb3VyY2VPZkFzc2lnbm1lbnRFeHByZXNzaW9uU3RhdGVtZW50KSB7XG4gICAgICAgICAgICAgICAgZ2V0SlNEb2NzV29ya2VyKHBhcmVudC5wYXJlbnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBpc01vZHVsZURlY2xhcmF0aW9uID0gbm9kZS5raW5kID09PSB0cy5TeW50YXhLaW5kLk1vZHVsZURlY2xhcmF0aW9uICYmXG4gICAgICAgICAgICAgICAgcGFyZW50ICYmIHBhcmVudC5raW5kID09PSB0cy5TeW50YXhLaW5kLk1vZHVsZURlY2xhcmF0aW9uO1xuICAgICAgICAgICAgY29uc3QgaXNQcm9wZXJ0eUFzc2lnbm1lbnRFeHByZXNzaW9uID0gcGFyZW50ICYmIHBhcmVudC5raW5kID09PSB0cy5TeW50YXhLaW5kLlByb3BlcnR5QXNzaWdubWVudDtcbiAgICAgICAgICAgIGlmIChpc01vZHVsZURlY2xhcmF0aW9uIHx8IGlzUHJvcGVydHlBc3NpZ25tZW50RXhwcmVzc2lvbikge1xuICAgICAgICAgICAgICAgIGdldEpTRG9jc1dvcmtlcihwYXJlbnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBQdWxsIHBhcmFtZXRlciBjb21tZW50cyBmcm9tIGRlY2xhcmluZyBmdW5jdGlvbiBhcyB3ZWxsXG4gICAgICAgICAgICBpZiAobm9kZS5raW5kID09PSB0cy5TeW50YXhLaW5kLlBhcmFtZXRlcikge1xuICAgICAgICAgICAgICAgIGNhY2hlID0gY29uY2F0ZW5hdGUoY2FjaGUsIGdldEpTRG9jUGFyYW1ldGVyVGFncyhub2RlKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChpc1ZhcmlhYmxlTGlrZShub2RlKSAmJiBub2RlLmluaXRpYWxpemVyKSB7XG4gICAgICAgICAgICAgICAgY2FjaGUgPSBjb25jYXRlbmF0ZShjYWNoZSwgbm9kZS5pbml0aWFsaXplci5qc0RvYyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhY2hlID0gY29uY2F0ZW5hdGUoY2FjaGUsIG5vZGUuanNEb2MpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0SlNEb2NzOiBfZ2V0SlNEb2NzXG4gICAgfVxufSkoKTtcbiIsImltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5sZXQgY29kZTogc3RyaW5nW10gPSBbXTtcblxuZXhwb3J0IGxldCBnZW4gPSAoZnVuY3Rpb24gKCkge1xuICAgIGxldCB0bXA6IHR5cGVvZiBjb2RlID0gW107XG5cbiAgICByZXR1cm4gKHRva2VuID0gbnVsbCkgPT4ge1xuICAgICAgICBpZiAoIXRva2VuKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCcgISB0b2tlbicpO1xuICAgICAgICAgICAgcmV0dXJuIGNvZGU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodG9rZW4gPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCcgXFxuJyk7XG4gICAgICAgICAgICBjb2RlLnB1c2godG1wLmpvaW4oJycpKTtcbiAgICAgICAgICAgIHRtcCA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29kZS5wdXNoKHRva2VuKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29kZTtcbiAgICB9XG59ICgpKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlKG5vZGU6IGFueSkge1xuICAgIGNvZGUgPSBbXTtcbiAgICB2aXNpdEFuZFJlY29nbml6ZShub2RlKTtcbiAgICByZXR1cm4gY29kZS5qb2luKCcnKTtcbn1cblxuZnVuY3Rpb24gdmlzaXRBbmRSZWNvZ25pemUobm9kZTogYW55LCBkZXB0aCA9IDApIHtcbiAgICByZWNvZ25pemUobm9kZSk7XG4gICAgZGVwdGgrKztcbiAgICBub2RlLmdldENoaWxkcmVuKCkuZm9yRWFjaChjID0+IHZpc2l0QW5kUmVjb2duaXplKGMsIGRlcHRoKSk7XG59XG5cbmZ1bmN0aW9uIHJlY29nbml6ZShub2RlOiBhbnkpIHtcblxuICAgIC8vY29uc29sZS5sb2coJ3JlY29nbml6aW5nLi4uJywgdHMuU3ludGF4S2luZFtub2RlLmtpbmQrJyddKTtcblxuICAgIHN3aXRjaCAobm9kZS5raW5kKSB7XG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5GaXJzdExpdGVyYWxUb2tlbjpcbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLklkZW50aWZpZXI6XG4gICAgICAgICAgICBnZW4oJ1xcXCInKTtcbiAgICAgICAgICAgIGdlbihub2RlLnRleHQpO1xuICAgICAgICAgICAgZ2VuKCdcXFwiJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWw6XG4gICAgICAgICAgICBnZW4oJ1xcXCInKTtcbiAgICAgICAgICAgIGdlbihub2RlLnRleHQpO1xuICAgICAgICAgICAgZ2VuKCdcXFwiJyk7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbjpcbiAgICAgICAgICAgIGJyZWFrO1xuXG5cbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkltcG9ydEtleXdvcmQ6XG4gICAgICAgICAgICBnZW4oJ2ltcG9ydCcpO1xuICAgICAgICAgICAgZ2VuKCcgJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkZyb21LZXl3b3JkOlxuICAgICAgICAgICAgZ2VuKCdmcm9tJyk7XG4gICAgICAgICAgICBnZW4oJyAnKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuRXhwb3J0S2V5d29yZDpcbiAgICAgICAgICAgIGdlbignXFxuJyk7XG4gICAgICAgICAgICBnZW4oJ2V4cG9ydCcpO1xuICAgICAgICAgICAgZ2VuKCcgJyk7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuQ2xhc3NLZXl3b3JkOlxuICAgICAgICAgICAgZ2VuKCdjbGFzcycpO1xuICAgICAgICAgICAgZ2VuKCcgJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLlRoaXNLZXl3b3JkOlxuICAgICAgICAgICAgZ2VuKCd0aGlzJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkNvbnN0cnVjdG9yS2V5d29yZDpcbiAgICAgICAgICAgIGdlbignY29uc3RydWN0b3InKTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5GYWxzZUtleXdvcmQ6XG4gICAgICAgICAgICBnZW4oJ2ZhbHNlJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLlRydWVLZXl3b3JkOlxuICAgICAgICAgICAgZ2VuKCd0cnVlJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLk51bGxLZXl3b3JkOlxuICAgICAgICAgICAgZ2VuKCdudWxsJyk7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuQXRUb2tlbjpcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuUGx1c1Rva2VuOlxuICAgICAgICAgICAgZ2VuKCcrJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkVxdWFsc0dyZWF0ZXJUaGFuVG9rZW46XG4gICAgICAgICAgICBnZW4oJyA9PiAnKTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5PcGVuUGFyZW5Ub2tlbjpcbiAgICAgICAgICAgIGdlbignKCcpO1xuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkltcG9ydENsYXVzZTpcbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLk9iamVjdExpdGVyYWxFeHByZXNzaW9uOlxuICAgICAgICAgICAgZ2VuKCd7Jyk7XG4gICAgICAgICAgICBnZW4oJyAnKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuQmxvY2s6XG4gICAgICAgICAgICBnZW4oJ3snKTtcbiAgICAgICAgICAgIGdlbignXFxuJyk7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuQ2xvc2VCcmFjZVRva2VuOlxuICAgICAgICAgICAgZ2VuKCd9Jyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkNsb3NlUGFyZW5Ub2tlbjpcbiAgICAgICAgICAgIGdlbignKScpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5PcGVuQnJhY2tldFRva2VuOlxuICAgICAgICAgICAgZ2VuKCdbJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkNsb3NlQnJhY2tldFRva2VuOlxuICAgICAgICAgICAgZ2VuKCddJyk7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuU2VtaWNvbG9uVG9rZW46XG4gICAgICAgICAgICBnZW4oJzsnKTtcbiAgICAgICAgICAgIGdlbignXFxuJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkNvbW1hVG9rZW46XG4gICAgICAgICAgICBnZW4oJywnKTtcbiAgICAgICAgICAgIGdlbignICcpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5Db2xvblRva2VuOlxuICAgICAgICAgICAgZ2VuKCcgJyk7XG4gICAgICAgICAgICBnZW4oJzonKTtcbiAgICAgICAgICAgIGdlbignICcpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5Eb3RUb2tlbjpcbiAgICAgICAgICAgIGdlbignLicpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5Eb1N0YXRlbWVudDpcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIHRzLlN5bnRheEtpbmQuRGVjb3JhdG9yOlxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkZpcnN0QXNzaWdubWVudDpcbiAgICAgICAgICAgIGdlbignID0gJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLkZpcnN0UHVuY3R1YXRpb246XG4gICAgICAgICAgICBnZW4oJyAnKTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgdHMuU3ludGF4S2luZC5Qcml2YXRlS2V5d29yZDpcbiAgICAgICAgICAgIGdlbigncHJpdmF0ZScpO1xuICAgICAgICAgICAgZ2VuKCcgJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSB0cy5TeW50YXhLaW5kLlB1YmxpY0tleXdvcmQ6XG4gICAgICAgICAgICBnZW4oJ3B1YmxpYycpO1xuICAgICAgICAgICAgZ2VuKCcgJyk7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxufVxuIiwiaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IEZpbGVFbmdpbmUgfSBmcm9tICcuL2ZpbGUuZW5naW5lJztcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gJy4uLy4uL2xvZ2dlcic7XG5cbmNvbnN0ICQ6IGFueSA9IHJlcXVpcmUoJ2NoZWVyaW8nKTtcblxuY2xhc3MgQ29tcG9uZW50c1RyZWVFbmdpbmUge1xuICAgIHByaXZhdGUgc3RhdGljIF9pbnN0YW5jZTogQ29tcG9uZW50c1RyZWVFbmdpbmUgPSBuZXcgQ29tcG9uZW50c1RyZWVFbmdpbmUoKTtcbiAgICBjb21wb25lbnRzOiBhbnlbXSA9IFtdO1xuICAgIGNvbXBvbmVudHNGb3JUcmVlOiBhbnlbXSA9IFtdO1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBpZiAoQ29tcG9uZW50c1RyZWVFbmdpbmUuX2luc3RhbmNlKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Vycm9yOiBJbnN0YW50aWF0aW9uIGZhaWxlZDogVXNlIENvbXBvbmVudHNUcmVlRW5naW5lLmdldEluc3RhbmNlKCkgaW5zdGVhZCBvZiBuZXcuJyk7XG4gICAgICAgIH1cbiAgICAgICAgQ29tcG9uZW50c1RyZWVFbmdpbmUuX2luc3RhbmNlID0gdGhpcztcbiAgICB9XG4gICAgcHVibGljIHN0YXRpYyBnZXRJbnN0YW5jZSgpOiBDb21wb25lbnRzVHJlZUVuZ2luZSB7XG4gICAgICAgIHJldHVybiBDb21wb25lbnRzVHJlZUVuZ2luZS5faW5zdGFuY2U7XG4gICAgfVxuICAgIGFkZENvbXBvbmVudChjb21wb25lbnQpIHtcbiAgICAgICAgdGhpcy5jb21wb25lbnRzLnB1c2goY29tcG9uZW50KTtcbiAgICB9XG4gICAgcmVhZFRlbXBsYXRlcygpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGxldCBpID0gMCxcbiAgICAgICAgICAgICAgICBsZW4gPSB0aGlzLmNvbXBvbmVudHNGb3JUcmVlLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAkZmlsZWVuZ2luZSA9IG5ldyBGaWxlRW5naW5lKCksXG4gICAgICAgICAgICAgICAgbG9vcCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPD0gbGVuIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29tcG9uZW50c0ZvclRyZWVbaV0udGVtcGxhdGVVcmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkZmlsZWVuZ2luZS5nZXQocGF0aC5kaXJuYW1lKHRoaXMuY29tcG9uZW50c0ZvclRyZWVbaV0uZmlsZSkgKyBwYXRoLnNlcCArIHRoaXMuY29tcG9uZW50c0ZvclRyZWVbaV0udGVtcGxhdGVVcmwpLnRoZW4oKHRlbXBsYXRlRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbXBvbmVudHNGb3JUcmVlW2ldLnRlbXBsYXRlRGF0YSA9IHRlbXBsYXRlRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbXBvbmVudHNGb3JUcmVlW2ldLnRlbXBsYXRlRGF0YSA9IHRoaXMuY29tcG9uZW50c0ZvclRyZWVbaV0udGVtcGxhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9vcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgbG9vcCgpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgZmluZENoaWxkcmVuQW5kUGFyZW50cygpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIF8uZm9yRWFjaCh0aGlzLmNvbXBvbmVudHNGb3JUcmVlLCAoY29tcG9uZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0ICRjb21wb25lbnQgPSAkKGNvbXBvbmVudC50ZW1wbGF0ZURhdGEpO1xuICAgICAgICAgICAgICAgIF8uZm9yRWFjaCh0aGlzLmNvbXBvbmVudHNGb3JUcmVlLCAoY29tcG9uZW50VG9GaW5kKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkY29tcG9uZW50LmZpbmQoY29tcG9uZW50VG9GaW5kLnNlbGVjdG9yKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhjb21wb25lbnRUb0ZpbmQubmFtZSArICcgZm91bmQgaW4gJyArIGNvbXBvbmVudC5uYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudC5jaGlsZHJlbi5wdXNoKGNvbXBvbmVudFRvRmluZC5uYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBjcmVhdGVUcmVlc0ZvckNvbXBvbmVudHMoKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBfLmZvckVhY2godGhpcy5jb21wb25lbnRzLCAoY29tcG9uZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IF9jb21wb25lbnQgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGNvbXBvbmVudC5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBmaWxlOiBjb21wb25lbnQuZmlsZSxcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3I6IGNvbXBvbmVudC5zZWxlY3RvcixcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IFtdLFxuICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogJycsXG4gICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNvbXBvbmVudC50ZW1wbGF0ZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgX2NvbXBvbmVudC50ZW1wbGF0ZSA9IGNvbXBvbmVudC50ZW1wbGF0ZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50LnRlbXBsYXRlVXJsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgX2NvbXBvbmVudC50ZW1wbGF0ZVVybCA9IGNvbXBvbmVudC50ZW1wbGF0ZVVybFswXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLmNvbXBvbmVudHNGb3JUcmVlLnB1c2goX2NvbXBvbmVudCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRoaXMucmVhZFRlbXBsYXRlcygpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuZmluZENoaWxkcmVuQW5kUGFyZW50cygpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndGhpcy5jb21wb25lbnRzRm9yVHJlZTogJywgdGhpcy5jb21wb25lbnRzRm9yVHJlZSk7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICB9LCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdCgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgKGUpID0+IHtcbiAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuZXhwb3J0IGNvbnN0ICRjb21wb25lbnRzVHJlZUVuZ2luZSA9IENvbXBvbmVudHNUcmVlRW5naW5lLmdldEluc3RhbmNlKCk7XG4iLCJpbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICd1dGlsJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMtZXh0cmEnO1xuXG5pbXBvcnQgeyBjb21waWxlckhvc3QsIGRldGVjdEluZGVudCB9IGZyb20gJy4uLy4uL3V0aWxpdGllcyc7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tICcuLi8uLi9sb2dnZXInO1xuaW1wb3J0IHsgUm91dGVyUGFyc2VyIH0gZnJvbSAnLi4vLi4vdXRpbHMvcm91dGVyLnBhcnNlcic7XG5pbXBvcnQgeyBMaW5rUGFyc2VyIH0gZnJvbSAnLi4vLi4vdXRpbHMvbGluay1wYXJzZXInO1xuaW1wb3J0IHsgSlNEb2NUYWdzUGFyc2VyIH0gZnJvbSAnLi4vLi4vdXRpbHMvanNkb2MucGFyc2VyJztcbmltcG9ydCB7IGdlbmVyYXRlIH0gZnJvbSAnLi9jb2RlZ2VuJztcbmltcG9ydCB7IHN0cmlwQm9tIH0gZnJvbSAnLi4vLi4vdXRpbHMvdXRpbHMnO1xuaW1wb3J0IHsgQ29uZmlndXJhdGlvbiwgSUNvbmZpZ3VyYXRpb24gfSBmcm9tICcuLi9jb25maWd1cmF0aW9uJztcbmltcG9ydCB7ICRjb21wb25lbnRzVHJlZUVuZ2luZSB9IGZyb20gJy4uL2VuZ2luZXMvY29tcG9uZW50cy10cmVlLmVuZ2luZSc7XG5cbmNvbnN0IG1hcmtlZCA9IHJlcXVpcmUoJ21hcmtlZCcpO1xuXG5pbnRlcmZhY2UgTm9kZU9iamVjdCB7XG4gICAga2luZDogTnVtYmVyO1xuICAgIHBvczogTnVtYmVyO1xuICAgIGVuZDogTnVtYmVyO1xuICAgIHRleHQ6IHN0cmluZztcbiAgICBpbml0aWFsaXplcjogTm9kZU9iamVjdCxcbiAgICBuYW1lPzogeyB0ZXh0OiBzdHJpbmcgfTtcbiAgICBleHByZXNzaW9uPzogTm9kZU9iamVjdDtcbiAgICBlbGVtZW50cz86IE5vZGVPYmplY3RbXTtcbiAgICBhcmd1bWVudHM/OiBOb2RlT2JqZWN0W107XG4gICAgcHJvcGVydGllcz86IGFueVtdO1xuICAgIHBhcnNlckNvbnRleHRGbGFncz86IE51bWJlcjtcbiAgICBlcXVhbHNHcmVhdGVyVGhhblRva2VuPzogTm9kZU9iamVjdFtdO1xuICAgIHBhcmFtZXRlcnM/OiBOb2RlT2JqZWN0W107XG4gICAgQ29tcG9uZW50Pzogc3RyaW5nO1xuICAgIGJvZHk/OiB7XG4gICAgICAgIHBvczogTnVtYmVyO1xuICAgICAgICBlbmQ6IE51bWJlcjtcbiAgICAgICAgc3RhdGVtZW50czogTm9kZU9iamVjdFtdO1xuICAgIH1cbn1cblxuaW50ZXJmYWNlIERlcHMge1xuICAgIG5hbWU6IHN0cmluZztcbiAgICB0eXBlOiBzdHJpbmc7XG4gICAgbGFiZWw/OiBzdHJpbmc7XG4gICAgZmlsZT86IHN0cmluZztcbiAgICBzb3VyY2VDb2RlPzogc3RyaW5nO1xuICAgIGRlc2NyaXB0aW9uPzogc3RyaW5nO1xuXG4gICAgLy9Db21wb25lbnRcblxuICAgIGFuaW1hdGlvbnM/OiBzdHJpbmdbXTsgLy8gVE9ET1xuICAgIGNoYW5nZURldGVjdGlvbj86IHN0cmluZztcbiAgICBlbmNhcHN1bGF0aW9uPzogc3RyaW5nO1xuICAgIGVudHJ5Q29tcG9uZW50cz86IHN0cmluZzsgLy8gVE9ET1xuICAgIGV4cG9ydEFzPzogc3RyaW5nO1xuICAgIGhvc3Q/OiBzdHJpbmc7XG4gICAgaW5wdXRzPzogc3RyaW5nW107XG4gICAgaW50ZXJwb2xhdGlvbj86IHN0cmluZzsgLy8gVE9ET1xuICAgIG1vZHVsZUlkPzogc3RyaW5nO1xuICAgIG91dHB1dHM/OiBzdHJpbmdbXTtcbiAgICBxdWVyaWVzPzogRGVwc1tdOyAvLyBUT0RPXG4gICAgc2VsZWN0b3I/OiBzdHJpbmc7XG4gICAgc3R5bGVVcmxzPzogc3RyaW5nW107XG4gICAgc3R5bGVzPzogc3RyaW5nW107XG4gICAgdGVtcGxhdGU/OiBzdHJpbmc7XG4gICAgdGVtcGxhdGVVcmw/OiBzdHJpbmdbXTtcbiAgICB2aWV3UHJvdmlkZXJzPzogc3RyaW5nW107XG5cbiAgICBpbXBsZW1lbnRzPztcbiAgICBleHRlbmRzPztcblxuICAgIGlucHV0c0NsYXNzPzogT2JqZWN0W107XG5cbiAgICAvL2NvbW1vblxuICAgIHByb3ZpZGVycz86IERlcHNbXTtcblxuICAgIC8vbW9kdWxlXG4gICAgZGVjbGFyYXRpb25zPzogRGVwc1tdO1xuICAgIGJvb3RzdHJhcD86IERlcHNbXTtcblxuICAgIGltcG9ydHM/OiBEZXBzW107XG4gICAgZXhwb3J0cz86IERlcHNbXTtcblxuICAgIHJvdXRlc1RyZWU/O1xufVxuXG5pbnRlcmZhY2UgU3ltYm9sRGVwcyB7XG4gICAgZnVsbDogc3RyaW5nO1xuICAgIGFsaWFzOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBEZXBlbmRlbmNpZXMge1xuXG4gICAgcHJpdmF0ZSBmaWxlczogc3RyaW5nW107XG4gICAgcHJpdmF0ZSBwcm9ncmFtOiB0cy5Qcm9ncmFtO1xuICAgIHByaXZhdGUgcHJvZ3JhbUNvbXBvbmVudDogdHMuUHJvZ3JhbTtcbiAgICBwcml2YXRlIHR5cGVDaGVja2VyOiB0cy5UeXBlQ2hlY2tlcjtcbiAgICBwcml2YXRlIHR5cGVDaGVja2VyQ29tcG9uZW50OiB0cy5UeXBlQ2hlY2tlcjtcbiAgICBwcml2YXRlIGVuZ2luZTogYW55O1xuICAgIHByaXZhdGUgX19jYWNoZTogYW55ID0ge307XG4gICAgcHJpdmF0ZSBfX25zTW9kdWxlOiBhbnkgPSB7fTtcbiAgICBwcml2YXRlIHVua25vd24gPSAnPz8/JztcbiAgICBwcml2YXRlIGNvbmZpZ3VyYXRpb24gPSBDb25maWd1cmF0aW9uLmdldEluc3RhbmNlKCk7XG5cbiAgICBjb25zdHJ1Y3RvcihmaWxlczogc3RyaW5nW10sIG9wdGlvbnM6IGFueSkge1xuICAgICAgICB0aGlzLmZpbGVzID0gZmlsZXM7XG4gICAgICAgIGNvbnN0IHRyYW5zcGlsZU9wdGlvbnMgPSB7XG4gICAgICAgICAgICB0YXJnZXQ6IHRzLlNjcmlwdFRhcmdldC5FUzUsXG4gICAgICAgICAgICBtb2R1bGU6IHRzLk1vZHVsZUtpbmQuQ29tbW9uSlMsXG4gICAgICAgICAgICB0c2NvbmZpZ0RpcmVjdG9yeTogb3B0aW9ucy50c2NvbmZpZ0RpcmVjdG9yeVxuICAgICAgICB9O1xuICAgICAgICB0aGlzLnByb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHRoaXMuZmlsZXMsIHRyYW5zcGlsZU9wdGlvbnMsIGNvbXBpbGVySG9zdCh0cmFuc3BpbGVPcHRpb25zKSk7XG4gICAgfVxuXG4gICAgZ2V0RGVwZW5kZW5jaWVzKCkge1xuICAgICAgICBsZXQgZGVwczogYW55ID0ge1xuICAgICAgICAgICAgJ21vZHVsZXMnOiBbXSxcbiAgICAgICAgICAgICdjb21wb25lbnRzJzogW10sXG4gICAgICAgICAgICAnaW5qZWN0YWJsZXMnOiBbXSxcbiAgICAgICAgICAgICdwaXBlcyc6IFtdLFxuICAgICAgICAgICAgJ2RpcmVjdGl2ZXMnOiBbXSxcbiAgICAgICAgICAgICdyb3V0ZXMnOiBbXSxcbiAgICAgICAgICAgICdjbGFzc2VzJzogW10sXG4gICAgICAgICAgICAnaW50ZXJmYWNlcyc6IFtdLFxuICAgICAgICAgICAgJ21pc2NlbGxhbmVvdXMnOiB7XG4gICAgICAgICAgICAgICAgdmFyaWFibGVzOiBbXSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbnM6IFtdLFxuICAgICAgICAgICAgICAgIHR5cGVhbGlhc2VzOiBbXSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhdGlvbnM6IFtdLFxuICAgICAgICAgICAgICAgIHR5cGVzOiBbXVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICAvKmxldCBzb3VyY2VGaWxlcyA9IHRoaXMucGFyc2VGaWxlcyh0aGlzLmZpbGVzKSB8fCBbXTtcbiAgICAgICAgZnMub3V0cHV0RmlsZSgnQ0QudHh0JywgdXRpbC5pbnNwZWN0KHNvdXJjZUZpbGVzLCB7IHNob3dIaWRkZW46IHRydWUsIGRlcHRoOiAxMCB9KSwgZXJyID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycikgLy8gPT4gbnVsbFxuICAgICAgICB9KTsqL1xuXG4gICAgICAgIGxldCBzb3VyY2VGaWxlcyA9IHRoaXMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpIHx8IFtdO1xuICAgICAgICBmcy5vdXRwdXRGaWxlKCdUUy50eHQnLCB1dGlsLmluc3BlY3Qoc291cmNlRmlsZXMsIHsgc2hvd0hpZGRlbjogdHJ1ZSwgZGVwdGg6IDEwIH0pLCBlcnIgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKSAvLyA9PiBudWxsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vcHJvY2Vzcy5leGl0KDEpO1xuXG4gICAgICAgIHNvdXJjZUZpbGVzLm1hcCgoZmlsZTogdHMuU291cmNlRmlsZSkgPT4ge1xuXG4gICAgICAgICAgICBsZXQgZmlsZVBhdGggPSBmaWxlLmZpbGVOYW1lO1xuXG4gICAgICAgICAgICBpZiAocGF0aC5leHRuYW1lKGZpbGVQYXRoKSA9PT0gJy50cycpIHtcblxuICAgICAgICAgICAgICAgIGlmIChmaWxlUGF0aC5sYXN0SW5kZXhPZignLmQudHMnKSA9PT0gLTEgJiYgZmlsZVBhdGgubGFzdEluZGV4T2YoJ3NwZWMudHMnKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ3BhcnNpbmcnLCBmaWxlUGF0aCk7XG5cbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZ2V0U291cmNlRmlsZURlY29yYXRvcnMoZmlsZSwgZGVwcyk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihlLCBmaWxlLmZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZGVwcztcblxuICAgICAgICB9KTtcblxuICAgICAgICAvL1JvdXRlclBhcnNlci5wcmludE1vZHVsZXNSb3V0ZXMoKTtcbiAgICAgICAgLy9Sb3V0ZXJQYXJzZXIucHJpbnRSb3V0ZXMoKTtcblxuICAgICAgICAvKmlmIChSb3V0ZXJQYXJzZXIuaW5jb21wbGV0ZVJvdXRlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAoZGVwc1snbWlzY2VsbGFuZW91cyddWyd2YXJpYWJsZXMnXS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgUm91dGVyUGFyc2VyLmZpeEluY29tcGxldGVSb3V0ZXMoZGVwc1snbWlzY2VsbGFuZW91cyddWyd2YXJpYWJsZXMnXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0qL1xuXG4gICAgICAgIC8vJGNvbXBvbmVudHNUcmVlRW5naW5lLmNyZWF0ZVRyZWVzRm9yQ29tcG9uZW50cygpO1xuXG4gICAgICAgIFJvdXRlclBhcnNlci5saW5rTW9kdWxlc0FuZFJvdXRlcygpO1xuICAgICAgICBSb3V0ZXJQYXJzZXIuY29uc3RydWN0TW9kdWxlc1RyZWUoKTtcblxuICAgICAgICBkZXBzLnJvdXRlc1RyZWUgPSBSb3V0ZXJQYXJzZXIuY29uc3RydWN0Um91dGVzVHJlZSgpO1xuXG4gICAgICAgIHJldHVybiBkZXBzO1xuICAgIH1cblxuICAgIHByaXZhdGUgcGFyc2VGaWxlcyhmaWxlTmFtZXM6IHN0cmluZ1tdKSB7XG5cbiAgICAgICAgbGV0IF9wYXJzZWRGaWxlcyA9IFtdO1xuXG4gICAgICAgIGZpbGVOYW1lcy5mb3JFYWNoKGZpbGVOYW1lID0+IHtcbiAgICAgICAgICAgIGxldCBzb3VyY2VDb2RlID0gcmVhZEZpbGVTeW5jKGZpbGVOYW1lKS50b1N0cmluZygpLFxuICAgICAgICAgICAgICAgIHNvdXJjZUZpbGUgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKGZpbGVOYW1lLCBzb3VyY2VDb2RlLCB0cy5TY3JpcHRUYXJnZXQuRVM1KTtcbiAgICAgICAgICAgIF9wYXJzZWRGaWxlcy5wdXNoKHNvdXJjZUZpbGUpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gX3BhcnNlZEZpbGVzO1xuICAgIH1cblxuXG4gICAgcHJpdmF0ZSBnZXRTb3VyY2VGaWxlRGVjb3JhdG9ycyhzcmNGaWxlOiB0cy5Tb3VyY2VGaWxlLCBvdXRwdXRTeW1ib2xzOiBPYmplY3QpOiB2b2lkIHtcblxuICAgICAgICBsZXQgY2xlYW5lciA9IChwcm9jZXNzLmN3ZCgpICsgcGF0aC5zZXApLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgbGV0IGZpbGUgPSBzcmNGaWxlLmZpbGVOYW1lLnJlcGxhY2UoY2xlYW5lciwgJycpO1xuXG4gICAgICAgIHRoaXMucHJvZ3JhbUNvbXBvbmVudCA9IHRzLmNyZWF0ZVByb2dyYW0oW2ZpbGVdLCB7fSk7XG4gICAgICAgIGxldCBzb3VyY2VGaWxlID0gdGhpcy5wcm9ncmFtQ29tcG9uZW50LmdldFNvdXJjZUZpbGUoZmlsZSk7XG4gICAgICAgIHRoaXMudHlwZUNoZWNrZXJDb21wb25lbnQgPSB0aGlzLnByb2dyYW1Db21wb25lbnQuZ2V0VHlwZUNoZWNrZXIodHJ1ZSk7XG5cbiAgICAgICAgdHMuZm9yRWFjaENoaWxkKHNyY0ZpbGUsIChub2RlOiB0cy5Ob2RlKSA9PiB7XG5cbiAgICAgICAgICAgIGxldCBkZXBzOiBEZXBzID0gPERlcHM+e307XG4gICAgICAgICAgICBpZiAobm9kZS5kZWNvcmF0b3JzKSB7XG4gICAgICAgICAgICAgICAgbGV0IHZpc2l0Tm9kZSA9ICh2aXNpdGVkTm9kZSwgaW5kZXgpID0+IHtcblxuICAgICAgICAgICAgICAgICAgICBsZXQgbWV0YWRhdGEgPSBub2RlLmRlY29yYXRvcnM7XG4gICAgICAgICAgICAgICAgICAgIGxldCBuYW1lID0gdGhpcy5nZXRTeW1ib2xlTmFtZShub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHByb3BzID0gdGhpcy5maW5kUHJvcHModmlzaXRlZE5vZGUpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgSU8gPSB0aGlzLmdldENvbXBvbmVudElPKGZpbGUsIHNvdXJjZUZpbGUsIG5vZGUpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzTW9kdWxlKG1ldGFkYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVwcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGU6IGZpbGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJzOiB0aGlzLmdldE1vZHVsZVByb3ZpZGVycyhwcm9wcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVjbGFyYXRpb25zOiB0aGlzLmdldE1vZHVsZURlY2xhdGlvbnMocHJvcHMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGltcG9ydHM6IHRoaXMuZ2V0TW9kdWxlSW1wb3J0cyhwcm9wcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0czogdGhpcy5nZXRNb2R1bGVFeHBvcnRzKHByb3BzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBib290c3RyYXA6IHRoaXMuZ2V0TW9kdWxlQm9vdHN0cmFwKHByb3BzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbW9kdWxlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogSU8uZGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlQ29kZTogc291cmNlRmlsZS5nZXRUZXh0KClcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoUm91dGVyUGFyc2VyLmhhc1JvdXRlck1vZHVsZUluSW1wb3J0cyhkZXBzLmltcG9ydHMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgUm91dGVyUGFyc2VyLmFkZE1vZHVsZVdpdGhSb3V0ZXMobmFtZSwgdGhpcy5nZXRNb2R1bGVJbXBvcnRzUmF3KHByb3BzKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBSb3V0ZXJQYXJzZXIuYWRkTW9kdWxlKG5hbWUsIGRlcHMuaW1wb3J0cyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXRTeW1ib2xzWydtb2R1bGVzJ10ucHVzaChkZXBzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICh0aGlzLmlzQ29tcG9uZW50KG1ldGFkYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYocHJvcHMubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKHV0aWwuaW5zcGVjdChwcm9wcywgeyBzaG93SGlkZGVuOiB0cnVlLCBkZXB0aDogMTAgfSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVwcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGU6IGZpbGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9hbmltYXRpb25zPzogc3RyaW5nW107IC8vIFRPRE9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2VEZXRlY3Rpb246IHRoaXMuZ2V0Q29tcG9uZW50Q2hhbmdlRGV0ZWN0aW9uKHByb3BzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmNhcHN1bGF0aW9uOiB0aGlzLmdldENvbXBvbmVudEVuY2Fwc3VsYXRpb24ocHJvcHMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vZW50cnlDb21wb25lbnRzPzogc3RyaW5nOyAvLyBUT0RPIHdhaXRpbmcgZG9jIGluZm9zXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0QXM6IHRoaXMuZ2V0Q29tcG9uZW50RXhwb3J0QXMocHJvcHMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvc3Q6IHRoaXMuZ2V0Q29tcG9uZW50SG9zdChwcm9wcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRzOiB0aGlzLmdldENvbXBvbmVudElucHV0c01ldGFkYXRhKHByb3BzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2ludGVycG9sYXRpb24/OiBzdHJpbmc7IC8vIFRPRE8gd2FpdGluZyBkb2MgaW5mb3NcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2R1bGVJZDogdGhpcy5nZXRDb21wb25lbnRNb2R1bGVJZChwcm9wcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0czogdGhpcy5nZXRDb21wb25lbnRPdXRwdXRzKHByb3BzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm92aWRlcnM6IHRoaXMuZ2V0Q29tcG9uZW50UHJvdmlkZXJzKHByb3BzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL3F1ZXJpZXM/OiBEZXBzW107IC8vIFRPRE9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RvcjogdGhpcy5nZXRDb21wb25lbnRTZWxlY3Rvcihwcm9wcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGVVcmxzOiB0aGlzLmdldENvbXBvbmVudFN0eWxlVXJscyhwcm9wcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGVzOiB0aGlzLmdldENvbXBvbmVudFN0eWxlcyhwcm9wcyksIC8vIFRPRE8gZml4IGFyZ3NcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogdGhpcy5nZXRDb21wb25lbnRUZW1wbGF0ZShwcm9wcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRoaXMuZ2V0Q29tcG9uZW50VGVtcGxhdGVVcmwocHJvcHMpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpZXdQcm92aWRlcnM6IHRoaXMuZ2V0Q29tcG9uZW50Vmlld1Byb3ZpZGVycyhwcm9wcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRzQ2xhc3M6IElPLmlucHV0cyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXRzQ2xhc3M6IElPLm91dHB1dHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllc0NsYXNzOiBJTy5wcm9wZXJ0aWVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZHNDbGFzczogSU8ubWV0aG9kcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogSU8uZGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NvbXBvbmVudCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlQ29kZTogc291cmNlRmlsZS5nZXRUZXh0KClcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoSU8uanNkb2N0YWdzICYmIElPLmpzZG9jdGFncy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVwcy5qc2RvY3RhZ3MgPSBJTy5qc2RvY3RhZ3NbMF0udGFnc1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoSU8uY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXBzLmNvbnN0cnVjdG9yT2JqID0gSU8uY29uc3RydWN0b3I7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoSU8uZXh0ZW5kcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlcHMuZXh0ZW5kcyA9IElPLmV4dGVuZHM7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoSU8uaW1wbGVtZW50cyAmJiBJTy5pbXBsZW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXBzLmltcGxlbWVudHMgPSBJTy5pbXBsZW1lbnRzO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgJGNvbXBvbmVudHNUcmVlRW5naW5lLmFkZENvbXBvbmVudChkZXBzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dFN5bWJvbHNbJ2NvbXBvbmVudHMnXS5wdXNoKGRlcHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuaXNJbmplY3RhYmxlKG1ldGFkYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVwcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGU6IGZpbGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2luamVjdGFibGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IElPLnByb3BlcnRpZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kczogSU8ubWV0aG9kcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogSU8uZGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlQ29kZTogc291cmNlRmlsZS5nZXRUZXh0KClcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihJTy5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlcHMuY29uc3RydWN0b3JPYmogPSBJTy5jb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dFN5bWJvbHNbJ2luamVjdGFibGVzJ10ucHVzaChkZXBzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICh0aGlzLmlzUGlwZShtZXRhZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlcHMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlOiBmaWxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdwaXBlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogSU8uZGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlQ29kZTogc291cmNlRmlsZS5nZXRUZXh0KClcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoSU8uanNkb2N0YWdzICYmIElPLmpzZG9jdGFncy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVwcy5qc2RvY3RhZ3MgPSBJTy5qc2RvY3RhZ3NbMF0udGFnc1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0U3ltYm9sc1sncGlwZXMnXS5wdXNoKGRlcHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuaXNEaXJlY3RpdmUobWV0YWRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihwcm9wcy5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlcHMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlOiBmaWxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaXJlY3RpdmUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBJTy5kZXNjcmlwdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2VDb2RlOiBzb3VyY2VGaWxlLmdldFRleHQoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3RvcjogdGhpcy5nZXRDb21wb25lbnRTZWxlY3Rvcihwcm9wcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJzOiB0aGlzLmdldENvbXBvbmVudFByb3ZpZGVycyhwcm9wcyksXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dHNDbGFzczogSU8uaW5wdXRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dHNDbGFzczogSU8ub3V0cHV0cyxcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXNDbGFzczogSU8ucHJvcGVydGllcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRob2RzQ2xhc3M6IElPLm1ldGhvZHNcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoSU8uanNkb2N0YWdzICYmIElPLmpzZG9jdGFncy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVwcy5qc2RvY3RhZ3MgPSBJTy5qc2RvY3RhZ3NbMF0udGFnc1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKElPLmltcGxlbWVudHMgJiYgSU8uaW1wbGVtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVwcy5pbXBsZW1lbnRzID0gSU8uaW1wbGVtZW50cztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKElPLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVwcy5jb25zdHJ1Y3Rvck9iaiA9IElPLmNvbnN0cnVjdG9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0U3ltYm9sc1snZGlyZWN0aXZlcyddLnB1c2goZGVwcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRlYnVnKGRlcHMpO1xuXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX19jYWNoZVtuYW1lXSA9IGRlcHM7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbGV0IGZpbHRlckJ5RGVjb3JhdG9ycyA9IChub2RlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmV4cHJlc3Npb24gJiYgbm9kZS5leHByZXNzaW9uLmV4cHJlc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAvKE5nTW9kdWxlfENvbXBvbmVudHxJbmplY3RhYmxlfFBpcGV8RGlyZWN0aXZlKS8udGVzdChub2RlLmV4cHJlc3Npb24uZXhwcmVzc2lvbi50ZXh0KVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgbm9kZS5kZWNvcmF0b3JzXG4gICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoZmlsdGVyQnlEZWNvcmF0b3JzKVxuICAgICAgICAgICAgICAgICAgICAuZm9yRWFjaCh2aXNpdE5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAobm9kZS5zeW1ib2wpIHtcbiAgICAgICAgICAgICAgICBpZihub2RlLnN5bWJvbC5mbGFncyA9PT0gdHMuU3ltYm9sRmxhZ3MuQ2xhc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5hbWUgPSB0aGlzLmdldFN5bWJvbGVOYW1lKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgSU8gPSB0aGlzLmdldENsYXNzSU8oZmlsZSwgc291cmNlRmlsZSwgbm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIGRlcHMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZTogZmlsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjbGFzcycsXG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2VDb2RlOiBzb3VyY2VGaWxlLmdldFRleHQoKVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBpZihJTy5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVwcy5jb25zdHJ1Y3Rvck9iaiA9IElPLmNvbnN0cnVjdG9yO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmKElPLnByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlcHMucHJvcGVydGllcyA9IElPLnByb3BlcnRpZXM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYoSU8uZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlcHMuZGVzY3JpcHRpb24gPSBJTy5kZXNjcmlwdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZihJTy5tZXRob2RzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXBzLm1ldGhvZHMgPSBJTy5tZXRob2RzO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChJTy5leHRlbmRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXBzLmV4dGVuZHMgPSBJTy5leHRlbmRzO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChJTy5pbXBsZW1lbnRzICYmIElPLmltcGxlbWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVwcy5pbXBsZW1lbnRzID0gSU8uaW1wbGVtZW50cztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRlYnVnKGRlcHMpO1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXRTeW1ib2xzWydjbGFzc2VzJ10ucHVzaChkZXBzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYobm9kZS5zeW1ib2wuZmxhZ3MgPT09IHRzLlN5bWJvbEZsYWdzLkludGVyZmFjZSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgbmFtZSA9IHRoaXMuZ2V0U3ltYm9sZU5hbWUobm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBJTyA9IHRoaXMuZ2V0SW50ZXJmYWNlSU8oZmlsZSwgc291cmNlRmlsZSwgbm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIGRlcHMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZTogZmlsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlcmZhY2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlQ29kZTogc291cmNlRmlsZS5nZXRUZXh0KClcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgaWYoSU8ucHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVwcy5wcm9wZXJ0aWVzID0gSU8ucHJvcGVydGllcztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZihJTy5pbmRleFNpZ25hdHVyZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlcHMuaW5kZXhTaWduYXR1cmVzID0gSU8uaW5kZXhTaWduYXR1cmVzO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmKElPLmtpbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlcHMua2luZCA9IElPLmtpbmQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYoSU8uZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlcHMuZGVzY3JpcHRpb24gPSBJTy5kZXNjcmlwdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZihJTy5tZXRob2RzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXBzLm1ldGhvZHMgPSBJTy5tZXRob2RzO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVidWcoZGVwcyk7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dFN5bWJvbHNbJ2ludGVyZmFjZXMnXS5wdXNoKGRlcHMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobm9kZS5raW5kID09PSB0cy5TeW50YXhLaW5kLkZ1bmN0aW9uRGVjbGFyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGluZm9zID0gdGhpcy52aXNpdEZ1bmN0aW9uRGVjbGFyYXRpb24obm9kZSksXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lID0gaW5mb3MubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgZGVwcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlOiBmaWxlXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZm9zLmFyZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlcHMuYXJncyA9IGluZm9zLmFyZ3M7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0U3ltYm9sc1snbWlzY2VsbGFuZW91cyddLmZ1bmN0aW9ucy5wdXNoKGRlcHMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobm9kZS5raW5kID09PSB0cy5TeW50YXhLaW5kLkVudW1EZWNsYXJhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBsZXQgaW5mb3MgPSB0aGlzLnZpc2l0RW51bURlY2xhcmF0aW9uKG5vZGUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZSA9IG5vZGUubmFtZS50ZXh0O1xuICAgICAgICAgICAgICAgICAgICBkZXBzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkczogaW5mb3MsXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlOiBmaWxlXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0U3ltYm9sc1snbWlzY2VsbGFuZW91cyddLmVudW1lcmF0aW9ucy5wdXNoKGRlcHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGV0IElPID0gdGhpcy5nZXRSb3V0ZUlPKGZpbGUsIHNvdXJjZUZpbGUpO1xuICAgICAgICAgICAgICAgIGlmKElPLnJvdXRlcykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgbmV3Um91dGVzO1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3Um91dGVzID0gUm91dGVyUGFyc2VyLmNsZWFuUmF3Um91dGVQYXJzZWQoSU8ucm91dGVzKTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKCdSb3V0ZXMgcGFyc2luZyBlcnJvciwgbWF5YmUgYSB0cmFpbGluZyBjb21tYSBvciBhbiBleHRlcm5hbCB2YXJpYWJsZSwgdHJ5aW5nIHRvIGZpeCB0aGF0IGxhdGVyIGFmdGVyIHNvdXJjZXMgc2Nhbm5pbmcuJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdSb3V0ZXMgPSBJTy5yb3V0ZXMucmVwbGFjZSgvIC9nbSwgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICBSb3V0ZXJQYXJzZXIuYWRkSW5jb21wbGV0ZVJvdXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBuZXdSb3V0ZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZTogZmlsZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBvdXRwdXRTeW1ib2xzWydyb3V0ZXMnXSA9IFsuLi5vdXRwdXRTeW1ib2xzWydyb3V0ZXMnXSwgLi4ubmV3Um91dGVzXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUua2luZCA9PT0gdHMuU3ludGF4S2luZC5DbGFzc0RlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBuYW1lID0gdGhpcy5nZXRTeW1ib2xlTmFtZShub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IElPID0gdGhpcy5nZXRDbGFzc0lPKGZpbGUsIHNvdXJjZUZpbGUsIG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICBkZXBzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGU6IGZpbGUsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2xhc3MnLFxuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlQ29kZTogc291cmNlRmlsZS5nZXRUZXh0KClcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgaWYoSU8uY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlcHMuY29uc3RydWN0b3JPYmogPSBJTy5jb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZihJTy5wcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXBzLnByb3BlcnRpZXMgPSBJTy5wcm9wZXJ0aWVzO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmKElPLmluZGV4U2lnbmF0dXJlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVwcy5pbmRleFNpZ25hdHVyZXMgPSBJTy5pbmRleFNpZ25hdHVyZXM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYoSU8uZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlcHMuZGVzY3JpcHRpb24gPSBJTy5kZXNjcmlwdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZihJTy5tZXRob2RzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXBzLm1ldGhvZHMgPSBJTy5tZXRob2RzO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChJTy5leHRlbmRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXBzLmV4dGVuZHMgPSBJTy5leHRlbmRzO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChJTy5pbXBsZW1lbnRzICYmIElPLmltcGxlbWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVwcy5pbXBsZW1lbnRzID0gSU8uaW1wbGVtZW50cztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRlYnVnKGRlcHMpO1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXRTeW1ib2xzWydjbGFzc2VzJ10ucHVzaChkZXBzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUua2luZCA9PT0gdHMuU3ludGF4S2luZC5FeHByZXNzaW9uU3RhdGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBib290c3RyYXBNb2R1bGVSZWZlcmVuY2UgPSAnYm9vdHN0cmFwTW9kdWxlJztcbiAgICAgICAgICAgICAgICAgICAgLy9GaW5kIHRoZSByb290IG1vZHVsZSB3aXRoIGJvb3RzdHJhcE1vZHVsZSBjYWxsXG4gICAgICAgICAgICAgICAgICAgIC8vMS4gZmluZCBhIHNpbXBsZSBjYWxsIDogcGxhdGZvcm1Ccm93c2VyRHluYW1pYygpLmJvb3RzdHJhcE1vZHVsZShBcHBNb2R1bGUpO1xuICAgICAgICAgICAgICAgICAgICAvLzIuIG9yIGluc2lkZSBhIGNhbGwgOlxuICAgICAgICAgICAgICAgICAgICAvLyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vICAgICBwbGF0Zm9ybUJyb3dzZXJEeW5hbWljKCkuYm9vdHN0cmFwTW9kdWxlKEFwcE1vZHVsZSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIH0pO1xuICAgICAgICAgICAgICAgICAgICAvLzMuIHdpdGggYSBjYXRjaCA6IHBsYXRmb3JtQnJvd3NlckR5bmFtaWMoKS5ib290c3RyYXBNb2R1bGUoQXBwTW9kdWxlKS5jYXRjaChlcnJvciA9PiBjb25zb2xlLmVycm9yKGVycm9yKSk7XG4gICAgICAgICAgICAgICAgICAgIC8vNC4gd2l0aCBwYXJhbWV0ZXJzIDogcGxhdGZvcm1Ccm93c2VyRHluYW1pYygpLmJvb3RzdHJhcE1vZHVsZShBcHBNb2R1bGUsIHt9KS5jYXRjaChlcnJvciA9PiBjb25zb2xlLmVycm9yKGVycm9yKSk7XG4gICAgICAgICAgICAgICAgICAgIC8vRmluZCByZWN1c2l2ZWx5IGluIGV4cHJlc3Npb24gbm9kZXMgb25lIHdpdGggbmFtZSAnYm9vdHN0cmFwTW9kdWxlJ1xuICAgICAgICAgICAgICAgICAgICBsZXQgcm9vdE1vZHVsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdE5vZGU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzb3VyY2VGaWxlLnRleHQuaW5kZXhPZihib290c3RyYXBNb2R1bGVSZWZlcmVuY2UpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUuZXhwcmVzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdE5vZGUgPSB0aGlzLmZpbmRFeHByZXNzaW9uQnlOYW1lSW5FeHByZXNzaW9ucyhub2RlLmV4cHJlc3Npb24sICdib290c3RyYXBNb2R1bGUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcmVzdWx0Tm9kZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmV4cHJlc3Npb24gJiYgbm9kZS5leHByZXNzaW9uLmFyZ3VtZW50cyAmJiBub2RlLmV4cHJlc3Npb24uYXJndW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0Tm9kZSA9IHRoaXMuZmluZEV4cHJlc3Npb25CeU5hbWVJbkV4cHJlc3Npb25Bcmd1bWVudHMobm9kZS5leHByZXNzaW9uLmFyZ3VtZW50cywgJ2Jvb3RzdHJhcE1vZHVsZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHJlc3VsdE5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihyZXN1bHROb2RlLmFyZ3VtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8uZm9yRWFjaChyZXN1bHROb2RlLmFyZ3VtZW50cywgZnVuY3Rpb24oYXJndW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGFyZ3VtZW50LnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb290TW9kdWxlID0gYXJndW1lbnQudGV4dDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyb290TW9kdWxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFJvdXRlclBhcnNlci5zZXRSb290TW9kdWxlKHJvb3RNb2R1bGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobm9kZS5raW5kID09PSB0cy5TeW50YXhLaW5kLlZhcmlhYmxlU3RhdGVtZW50ICYmICF0aGlzLmlzVmFyaWFibGVSb3V0ZXMobm9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGluZm9zID0gdGhpcy52aXNpdFZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSksXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lID0gaW5mb3MubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgZGVwcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlOiBmaWxlXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZGVwcy50eXBlID0gKGluZm9zLnR5cGUpID8gaW5mb3MudHlwZSA6ICcnO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5mb3MuZGVmYXVsdFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXBzLmRlZmF1bHRWYWx1ZSA9IGluZm9zLmRlZmF1bHRWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5qc0RvYyAmJiBub2RlLmpzRG9jLmxlbmd0aCA+IDAgJiYgbm9kZS5qc0RvY1swXS5jb21tZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXBzLmRlc2NyaXB0aW9uID0gbWFya2VkKG5vZGUuanNEb2NbMF0uY29tbWVudCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0U3ltYm9sc1snbWlzY2VsbGFuZW91cyddLnZhcmlhYmxlcy5wdXNoKGRlcHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobm9kZS5raW5kID09PSB0cy5TeW50YXhLaW5kLlR5cGVBbGlhc0RlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBpbmZvcyA9IHRoaXMudmlzaXRUeXBlRGVjbGFyYXRpb24obm9kZSksXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lID0gaW5mb3MubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgZGVwcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlOiBmaWxlXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0U3ltYm9sc1snbWlzY2VsbGFuZW91cyddLnR5cGVzLnB1c2goZGVwcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChub2RlLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRnVuY3Rpb25EZWNsYXJhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBsZXQgaW5mb3MgPSB0aGlzLnZpc2l0RnVuY3Rpb25EZWNsYXJhdGlvbihub2RlKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWUgPSBpbmZvcy5uYW1lO1xuICAgICAgICAgICAgICAgICAgICBkZXBzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGU6IGZpbGVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5mb3MuYXJncykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVwcy5hcmdzID0gaW5mb3MuYXJncztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBvdXRwdXRTeW1ib2xzWydtaXNjZWxsYW5lb3VzJ10uZnVuY3Rpb25zLnB1c2goZGVwcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChub2RlLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRW51bURlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBpbmZvcyA9IHRoaXMudmlzaXRFbnVtRGVjbGFyYXRpb24obm9kZSksXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lID0gbm9kZS5uYW1lLnRleHQ7XG4gICAgICAgICAgICAgICAgICAgIGRlcHMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRzOiBpbmZvcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGU6IGZpbGVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBvdXRwdXRTeW1ib2xzWydtaXNjZWxsYW5lb3VzJ10uZW51bWVyYXRpb25zLnB1c2goZGVwcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH1cbiAgICBwcml2YXRlIGRlYnVnKGRlcHM6IERlcHMpIHtcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdmb3VuZCcsIGAke2RlcHMubmFtZX1gKTtcbiAgICAgICAgW1xuICAgICAgICAgICAgJ2ltcG9ydHMnLCAnZXhwb3J0cycsICdkZWNsYXJhdGlvbnMnLCAncHJvdmlkZXJzJywgJ2Jvb3RzdHJhcCdcbiAgICAgICAgXS5mb3JFYWNoKHN5bWJvbHMgPT4ge1xuICAgICAgICAgICAgaWYgKGRlcHNbc3ltYm9sc10gJiYgZGVwc1tzeW1ib2xzXS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKCcnLCBgLSAke3N5bWJvbHN9OmApO1xuICAgICAgICAgICAgICAgIGRlcHNbc3ltYm9sc10ubWFwKGkgPT4gaS5uYW1lKS5mb3JFYWNoKGQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJycsIGBcXHQtICR7ZH1gKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGlzVmFyaWFibGVSb3V0ZXMobm9kZSkge1xuICAgICAgICB2YXIgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIGlmKCBub2RlLmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMgKSB7XG4gICAgICAgICAgICBsZXQgaSA9IDAsXG4gICAgICAgICAgICAgICAgbGVuID0gbm9kZS5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLmxlbmd0aDtcbiAgICAgICAgICAgIGZvcihpOyBpPGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYobm9kZS5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zW2ldLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYobm9kZS5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zW2ldLnR5cGUudHlwZU5hbWUgJiYgbm9kZS5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zW2ldLnR5cGUudHlwZU5hbWUudGV4dCA9PT0gJ1JvdXRlcycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGZpbmRFeHByZXNzaW9uQnlOYW1lSW5FeHByZXNzaW9ucyhlbnRyeU5vZGUsIG5hbWUpIHtcbiAgICAgICAgbGV0IHJlc3VsdCxcbiAgICAgICAgICAgIGxvb3AgPSBmdW5jdGlvbihub2RlLCBuYW1lKSB7XG4gICAgICAgICAgICAgICAgaWYobm9kZS5leHByZXNzaW9uICYmICFub2RlLmV4cHJlc3Npb24ubmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBsb29wKG5vZGUuZXhwcmVzc2lvbiwgbmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmKG5vZGUuZXhwcmVzc2lvbiAmJiBub2RlLmV4cHJlc3Npb24ubmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBpZihub2RlLmV4cHJlc3Npb24ubmFtZS50ZXh0ID09PSBuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBub2RlO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9vcChub2RlLmV4cHJlc3Npb24sIG5hbWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBsb29wKGVudHJ5Tm9kZSwgbmFtZSk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBmaW5kRXhwcmVzc2lvbkJ5TmFtZUluRXhwcmVzc2lvbkFyZ3VtZW50cyhhcmcsIG5hbWUpIHtcbiAgICAgICAgbGV0IHJlc3VsdCxcbiAgICAgICAgICAgIHRoYXQgPSB0aGlzLFxuICAgICAgICAgICAgaSA9IDAsXG4gICAgICAgICAgICBsZW4gPSBhcmcubGVuZ3RoLFxuICAgICAgICAgICAgbG9vcCA9IGZ1bmN0aW9uKG5vZGUsIG5hbWUpIHtcbiAgICAgICAgICAgICAgICBpZihub2RlLmJvZHkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUuYm9keS5zdGF0ZW1lbnRzICYmIG5vZGUuYm9keS5zdGF0ZW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBqID0gMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZW5nID0gbm9kZS5ib2R5LnN0YXRlbWVudHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChqOyBqPGxlbmc7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHRoYXQuZmluZEV4cHJlc3Npb25CeU5hbWVJbkV4cHJlc3Npb25zKG5vZGUuYm9keS5zdGF0ZW1lbnRzW2pdLCBuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgZm9yIChpOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIGxvb3AoYXJnW2ldLCBuYW1lKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIHByaXZhdGUgcGFyc2VEZWNvcmF0b3JzKGRlY29yYXRvcnMsIHR5cGU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBsZXQgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIGlmIChkZWNvcmF0b3JzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIF8uZm9yRWFjaChkZWNvcmF0b3JzLCBmdW5jdGlvbihkZWNvcmF0b3IpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVjb3JhdG9yLmV4cHJlc3Npb24uZXhwcmVzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGVjb3JhdG9yLmV4cHJlc3Npb24uZXhwcmVzc2lvbi50ZXh0ID09PSB0eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoZGVjb3JhdG9yc1swXS5leHByZXNzaW9uLmV4cHJlc3Npb24pIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVjb3JhdG9yc1swXS5leHByZXNzaW9uLmV4cHJlc3Npb24udGV4dCA9PT0gdHlwZSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIHByaXZhdGUgaXNDb21wb25lbnQobWV0YWRhdGFzKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnBhcnNlRGVjb3JhdG9ycyhtZXRhZGF0YXMsICdDb21wb25lbnQnKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGlzUGlwZShtZXRhZGF0YXMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGFyc2VEZWNvcmF0b3JzKG1ldGFkYXRhcywgJ1BpcGUnKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGlzRGlyZWN0aXZlKG1ldGFkYXRhcykge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXJzZURlY29yYXRvcnMobWV0YWRhdGFzLCAnRGlyZWN0aXZlJyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpc0luamVjdGFibGUobWV0YWRhdGFzKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnBhcnNlRGVjb3JhdG9ycyhtZXRhZGF0YXMsICdJbmplY3RhYmxlJyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpc01vZHVsZShtZXRhZGF0YXMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGFyc2VEZWNvcmF0b3JzKG1ldGFkYXRhcywgJ05nTW9kdWxlJyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRUeXBlKG5hbWUpIHtcbiAgICAgICAgbGV0IHR5cGU7XG4gICAgICAgIGlmKCBuYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZignY29tcG9uZW50JykgIT09IC0xICkge1xuICAgICAgICAgICAgdHlwZSA9ICdjb21wb25lbnQnO1xuICAgICAgICB9IGVsc2UgaWYoIG5hbWUudG9Mb3dlckNhc2UoKS5pbmRleE9mKCdwaXBlJykgIT09IC0xICkge1xuICAgICAgICAgICAgdHlwZSA9ICdwaXBlJztcbiAgICAgICAgfSBlbHNlIGlmKCBuYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZignbW9kdWxlJykgIT09IC0xICkge1xuICAgICAgICAgICAgdHlwZSA9ICdtb2R1bGUnO1xuICAgICAgICB9IGVsc2UgaWYoIG5hbWUudG9Mb3dlckNhc2UoKS5pbmRleE9mKCdkaXJlY3RpdmUnKSAhPT0gLTEgKSB7XG4gICAgICAgICAgICB0eXBlID0gJ2RpcmVjdGl2ZSc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHR5cGU7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRTeW1ib2xlTmFtZShub2RlKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIG5vZGUubmFtZS50ZXh0O1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0Q29tcG9uZW50U2VsZWN0b3IocHJvcHM6IE5vZGVPYmplY3RbXSk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldFN5bWJvbERlcHMocHJvcHMsICdzZWxlY3RvcicpLnBvcCgpO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0Q29tcG9uZW50RXhwb3J0QXMocHJvcHM6IE5vZGVPYmplY3RbXSk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldFN5bWJvbERlcHMocHJvcHMsICdleHBvcnRBcycpLnBvcCgpO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0TW9kdWxlUHJvdmlkZXJzKHByb3BzOiBOb2RlT2JqZWN0W10pOiBEZXBzW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRTeW1ib2xEZXBzKHByb3BzLCAncHJvdmlkZXJzJykubWFwKChwcm92aWRlck5hbWUpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcnNlRGVlcEluZGVudGlmaWVyKHByb3ZpZGVyTmFtZSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgZmluZFByb3BzKHZpc2l0ZWROb2RlKSB7XG4gICAgICAgIGlmKHZpc2l0ZWROb2RlLmV4cHJlc3Npb24uYXJndW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB2aXNpdGVkTm9kZS5leHByZXNzaW9uLmFyZ3VtZW50cy5wb3AoKS5wcm9wZXJ0aWVzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRNb2R1bGVEZWNsYXRpb25zKHByb3BzOiBOb2RlT2JqZWN0W10pOiBEZXBzW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRTeW1ib2xEZXBzKHByb3BzLCAnZGVjbGFyYXRpb25zJykubWFwKChuYW1lKSA9PiB7XG4gICAgICAgICAgICBsZXQgY29tcG9uZW50ID0gdGhpcy5maW5kQ29tcG9uZW50U2VsZWN0b3JCeU5hbWUobmFtZSk7XG5cbiAgICAgICAgICAgIGlmIChjb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29tcG9uZW50O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJzZURlZXBJbmRlbnRpZmllcihuYW1lKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRNb2R1bGVJbXBvcnRzUmF3KHByb3BzOiBOb2RlT2JqZWN0W10pOiBEZXBzW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRTeW1ib2xEZXBzUmF3KHByb3BzLCAnaW1wb3J0cycpO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0TW9kdWxlSW1wb3J0cyhwcm9wczogTm9kZU9iamVjdFtdKTogRGVwc1tdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0U3ltYm9sRGVwcyhwcm9wcywgJ2ltcG9ydHMnKS5tYXAoKG5hbWUpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcnNlRGVlcEluZGVudGlmaWVyKG5hbWUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldE1vZHVsZUV4cG9ydHMocHJvcHM6IE5vZGVPYmplY3RbXSk6IERlcHNbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldFN5bWJvbERlcHMocHJvcHMsICdleHBvcnRzJykubWFwKChuYW1lKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJzZURlZXBJbmRlbnRpZmllcihuYW1lKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRDb21wb25lbnRIb3N0KHByb3BzOiBOb2RlT2JqZWN0W10pOiBPYmplY3Qge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRTeW1ib2xEZXBzT2JqZWN0KHByb3BzLCAnaG9zdCcpO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0TW9kdWxlQm9vdHN0cmFwKHByb3BzOiBOb2RlT2JqZWN0W10pOiBEZXBzW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRTeW1ib2xEZXBzKHByb3BzLCAnYm9vdHN0cmFwJykubWFwKChuYW1lKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJzZURlZXBJbmRlbnRpZmllcihuYW1lKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRDb21wb25lbnRJbnB1dHNNZXRhZGF0YShwcm9wczogTm9kZU9iamVjdFtdKTogc3RyaW5nW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRTeW1ib2xEZXBzKHByb3BzLCAnaW5wdXRzJyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXREZWNvcmF0b3JPZlR5cGUobm9kZSwgZGVjb3JhdG9yVHlwZSkge1xuICAgICAgdmFyIGRlY29yYXRvcnMgPSBub2RlLmRlY29yYXRvcnMgfHwgW107XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGVjb3JhdG9ycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChkZWNvcmF0b3JzW2ldLmV4cHJlc3Npb24uZXhwcmVzc2lvbikge1xuICAgICAgICAgICAgICBpZiAoZGVjb3JhdG9yc1tpXS5leHByZXNzaW9uLmV4cHJlc3Npb24udGV4dCA9PT0gZGVjb3JhdG9yVHlwZSkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGRlY29yYXRvcnNbaV07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHByaXZhdGUgdmlzaXRJbnB1dChwcm9wZXJ0eSwgaW5EZWNvcmF0b3IsIHNvdXJjZUZpbGU/KSB7XG4gICAgICAgIHZhciBpbkFyZ3MgPSBpbkRlY29yYXRvci5leHByZXNzaW9uLmFyZ3VtZW50cyxcbiAgICAgICAgX3JldHVybiA9IHtcbiAgICAgICAgICAgIG5hbWU6IGluQXJncy5sZW5ndGggPyBpbkFyZ3NbMF0udGV4dCA6IHByb3BlcnR5Lm5hbWUudGV4dCxcbiAgICAgICAgICAgIGRlZmF1bHRWYWx1ZTogcHJvcGVydHkuaW5pdGlhbGl6ZXIgPyB0aGlzLnN0cmluZ2lmeURlZmF1bHRWYWx1ZShwcm9wZXJ0eS5pbml0aWFsaXplcikgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogbWFya2VkKExpbmtQYXJzZXIucmVzb2x2ZUxpbmtzKHRzLmRpc3BsYXlQYXJ0c1RvU3RyaW5nKHByb3BlcnR5LnN5bWJvbC5nZXREb2N1bWVudGF0aW9uQ29tbWVudCgpKSkpLFxuICAgICAgICAgICAgbGluZTogdGhpcy5nZXRQb3NpdGlvbihwcm9wZXJ0eSwgc291cmNlRmlsZSkubGluZSArIDFcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHByb3BlcnR5LnR5cGUpIHtcbiAgICAgICAgICAgIF9yZXR1cm4udHlwZSA9IHRoaXMudmlzaXRUeXBlKHByb3BlcnR5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGhhbmRsZSBOZXdFeHByZXNzaW9uXG4gICAgICAgICAgICBpZiAocHJvcGVydHkuaW5pdGlhbGl6ZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAocHJvcGVydHkuaW5pdGlhbGl6ZXIua2luZCA9PT0gdHMuU3ludGF4S2luZC5OZXdFeHByZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0eS5pbml0aWFsaXplci5leHByZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfcmV0dXJuLnR5cGUgPSBwcm9wZXJ0eS5pbml0aWFsaXplci5leHByZXNzaW9uLnRleHQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIF9yZXR1cm47XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB2aXNpdFR5cGUobm9kZSkge1xuICAgICAgICAvKipcbiAgICAgICAgICogQ29weXJpZ2h0IGh0dHBzOi8vZ2l0aHViLmNvbS9uZy1ib290c3RyYXAvbmctYm9vdHN0cmFwXG4gICAgICAgICAqL1xuICAgICAgICBsZXQgX3JldHVybiA9ICd2b2lkJztcbiAgICAgICAgaWYgKG5vZGUpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgX3JldHVybiA9IHRoaXMudHlwZUNoZWNrZXJDb21wb25lbnQudHlwZVRvU3RyaW5nKHRoaXMudHlwZUNoZWNrZXJDb21wb25lbnQuZ2V0VHlwZUF0TG9jYXRpb24obm9kZSkpXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgX3JldHVybiA9ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBfcmV0dXJuO1xuICAgIH1cblxuICAgIHByaXZhdGUgdmlzaXRPdXRwdXQocHJvcGVydHksIG91dERlY29yYXRvciwgc291cmNlRmlsZT8pIHtcbiAgICAgICAgdmFyIG91dEFyZ3MgPSBvdXREZWNvcmF0b3IuZXhwcmVzc2lvbi5hcmd1bWVudHMsXG4gICAgICAgIF9yZXR1cm4gPSB7XG4gICAgICAgICAgICBuYW1lOiBvdXRBcmdzLmxlbmd0aCA/IG91dEFyZ3NbMF0udGV4dCA6IHByb3BlcnR5Lm5hbWUudGV4dCxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBtYXJrZWQoTGlua1BhcnNlci5yZXNvbHZlTGlua3ModHMuZGlzcGxheVBhcnRzVG9TdHJpbmcocHJvcGVydHkuc3ltYm9sLmdldERvY3VtZW50YXRpb25Db21tZW50KCkpKSksXG4gICAgICAgICAgICBsaW5lOiB0aGlzLmdldFBvc2l0aW9uKHByb3BlcnR5LCBzb3VyY2VGaWxlKS5saW5lICsgMVxuICAgICAgICB9O1xuICAgICAgICBpZiAocHJvcGVydHkudHlwZSkge1xuICAgICAgICAgICAgX3JldHVybi50eXBlID0gdGhpcy52aXNpdFR5cGUocHJvcGVydHkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gaGFuZGxlIE5ld0V4cHJlc3Npb25cbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eS5pbml0aWFsaXplcikge1xuICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0eS5pbml0aWFsaXplci5raW5kID09PSB0cy5TeW50YXhLaW5kLk5ld0V4cHJlc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnR5LmluaXRpYWxpemVyLmV4cHJlc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9yZXR1cm4udHlwZSA9IHByb3BlcnR5LmluaXRpYWxpemVyLmV4cHJlc3Npb24udGV4dDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gX3JldHVybjtcbiAgICB9XG5cbiAgICBwcml2YXRlIGlzUHVibGljKG1lbWJlcik6IGJvb2xlYW4ge1xuICAgICAgICBpZiAobWVtYmVyLm1vZGlmaWVycykge1xuICAgICAgICAgICAgY29uc3QgaXNQdWJsaWM6IGJvb2xlYW4gPSBtZW1iZXIubW9kaWZpZXJzLnNvbWUoZnVuY3Rpb24obW9kaWZpZXIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbW9kaWZpZXIua2luZCA9PT0gdHMuU3ludGF4S2luZC5QdWJsaWNLZXl3b3JkO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoaXNQdWJsaWMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5pc0hpZGRlbk1lbWJlcihtZW1iZXIpO1xuICAgIH1cblxuICAgIHByaXZhdGUgaXNQcml2YXRlKG1lbWJlcik6IGJvb2xlYW4ge1xuICAgICAgICAvKipcbiAgICAgICAgICogQ29weXJpZ2h0IGh0dHBzOi8vZ2l0aHViLmNvbS9uZy1ib290c3RyYXAvbmctYm9vdHN0cmFwXG4gICAgICAgICAqL1xuICAgICAgICBpZiAobWVtYmVyLm1vZGlmaWVycykge1xuICAgICAgICAgICAgY29uc3QgaXNQcml2YXRlOiBib29sZWFuID0gbWVtYmVyLm1vZGlmaWVycy5zb21lKG1vZGlmaWVyID0+IG1vZGlmaWVyLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuUHJpdmF0ZUtleXdvcmQpO1xuICAgICAgICAgICAgaWYgKGlzUHJpdmF0ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmlzSGlkZGVuTWVtYmVyKG1lbWJlcik7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpc0ludGVybmFsKG1lbWJlcik6IGJvb2xlYW4ge1xuICAgICAgICAvKipcbiAgICAgICAgICogQ29weXJpZ2h0IGh0dHBzOi8vZ2l0aHViLmNvbS9uZy1ib290c3RyYXAvbmctYm9vdHN0cmFwXG4gICAgICAgICAqL1xuICAgICAgICBjb25zdCBpbnRlcm5hbFRhZ3M6IHN0cmluZ1tdID0gWydpbnRlcm5hbCddO1xuICAgICAgICBpZiAobWVtYmVyLmpzRG9jKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGRvYyBvZiBtZW1iZXIuanNEb2MpIHtcbiAgICAgICAgICAgICAgICBpZiAoZG9jLnRhZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCB0YWcgb2YgZG9jLnRhZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnRlcm5hbFRhZ3MuaW5kZXhPZih0YWcudGFnTmFtZS50ZXh0KSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHByaXZhdGUgaXNIaWRkZW5NZW1iZXIobWVtYmVyKTogYm9vbGVhbiB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb3B5cmlnaHQgaHR0cHM6Ly9naXRodWIuY29tL25nLWJvb3RzdHJhcC9uZy1ib290c3RyYXBcbiAgICAgICAgICovXG4gICAgICAgIGNvbnN0IGludGVybmFsVGFnczogc3RyaW5nW10gPSBbJ2hpZGRlbiddO1xuICAgICAgICBpZiAobWVtYmVyLmpzRG9jKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGRvYyBvZiBtZW1iZXIuanNEb2MpIHtcbiAgICAgICAgICAgICAgICBpZiAoZG9jLnRhZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCB0YWcgb2YgZG9jLnRhZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnRlcm5hbFRhZ3MuaW5kZXhPZih0YWcudGFnTmFtZS50ZXh0KSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHByaXZhdGUgaXNBbmd1bGFyTGlmZWN5Y2xlSG9vayhtZXRob2ROYW1lKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb3B5cmlnaHQgaHR0cHM6Ly9naXRodWIuY29tL25nLWJvb3RzdHJhcC9uZy1ib290c3RyYXBcbiAgICAgICAgICovXG4gICAgICAgIGNvbnN0IEFOR1VMQVJfTElGRUNZQ0xFX01FVEhPRFMgPSBbXG4gICAgICAgICAgICAnbmdPbkluaXQnLCAnbmdPbkNoYW5nZXMnLCAnbmdEb0NoZWNrJywgJ25nT25EZXN0cm95JywgJ25nQWZ0ZXJDb250ZW50SW5pdCcsICduZ0FmdGVyQ29udGVudENoZWNrZWQnLFxuICAgICAgICAgICAgJ25nQWZ0ZXJWaWV3SW5pdCcsICduZ0FmdGVyVmlld0NoZWNrZWQnLCAnd3JpdGVWYWx1ZScsICdyZWdpc3Rlck9uQ2hhbmdlJywgJ3JlZ2lzdGVyT25Ub3VjaGVkJywgJ3NldERpc2FibGVkU3RhdGUnXG4gICAgICAgIF07XG4gICAgICAgIHJldHVybiBBTkdVTEFSX0xJRkVDWUNMRV9NRVRIT0RTLmluZGV4T2YobWV0aG9kTmFtZSkgPj0gMDtcbiAgICB9XG5cbiAgICBwcml2YXRlIHZpc2l0Q29uc3RydWN0b3JEZWNsYXJhdGlvbihtZXRob2QsIHNvdXJjZUZpbGU/KSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb3B5cmlnaHQgaHR0cHM6Ly9naXRodWIuY29tL25nLWJvb3RzdHJhcC9uZy1ib290c3RyYXBcbiAgICAgICAgICovXG4gICAgICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgICAgICBuYW1lOiAnY29uc3RydWN0b3InLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IG1hcmtlZChMaW5rUGFyc2VyLnJlc29sdmVMaW5rcyh0cy5kaXNwbGF5UGFydHNUb1N0cmluZyhtZXRob2Quc3ltYm9sLmdldERvY3VtZW50YXRpb25Db21tZW50KCkpKSksXG4gICAgICAgICAgICBhcmdzOiBtZXRob2QucGFyYW1ldGVycyA/IG1ldGhvZC5wYXJhbWV0ZXJzLm1hcCgocHJvcCkgPT4gdGhpcy52aXNpdEFyZ3VtZW50KHByb3ApKSA6IFtdLFxuICAgICAgICAgICAgbGluZTogdGhpcy5nZXRQb3NpdGlvbihtZXRob2QsIHNvdXJjZUZpbGUpLmxpbmUgKyAxXG4gICAgICAgIH0sXG4gICAgICAgICAgICBqc2RvY3RhZ3MgPSBKU0RvY1RhZ3NQYXJzZXIuZ2V0SlNEb2NzKG1ldGhvZCksXG5cbiAgICAgICAgICAgIG1hcmtlZHRhZ3MgPSBmdW5jdGlvbih0YWdzKSB7XG4gICAgICAgICAgICAgICAgdmFyIG10YWdzID0gdGFncztcbiAgICAgICAgICAgICAgICBfLmZvckVhY2gobXRhZ3MsICh0YWcpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGFnLmNvbW1lbnQgPSBtYXJrZWQoTGlua1BhcnNlci5yZXNvbHZlTGlua3ModGFnLmNvbW1lbnQpKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbXRhZ3M7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgIGlmIChtZXRob2QubW9kaWZpZXJzKSB7XG4gICAgICAgICAgICBpZiAobWV0aG9kLm1vZGlmaWVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0Lm1vZGlmaWVyS2luZCA9IG1ldGhvZC5tb2RpZmllcnNbMF0ua2luZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoanNkb2N0YWdzICYmIGpzZG9jdGFncy5sZW5ndGggPj0gMSkge1xuICAgICAgICAgICAgaWYgKGpzZG9jdGFnc1swXS50YWdzKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmpzZG9jdGFncyA9IG1hcmtlZHRhZ3MoanNkb2N0YWdzWzBdLnRhZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB2aXNpdENvbnN0cnVjdG9yUHJvcGVydGllcyhtZXRob2QpIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICBpZiAobWV0aG9kLnBhcmFtZXRlcnMpIHtcbiAgICAgICAgICAgIHZhciBfcGFyYW1ldGVycyA9IFtdLFxuICAgICAgICAgICAgICAgIGkgPSAwLFxuICAgICAgICAgICAgICAgIGxlbiA9IG1ldGhvZC5wYXJhbWV0ZXJzLmxlbmd0aDtcbiAgICAgICAgICAgIGZvcihpOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAodGhhdC5pc1B1YmxpYyhtZXRob2QucGFyYW1ldGVyc1tpXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgX3BhcmFtZXRlcnMucHVzaCh0aGF0LnZpc2l0QXJndW1lbnQobWV0aG9kLnBhcmFtZXRlcnNbaV0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gX3BhcmFtZXRlcnM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIHZpc2l0Q2FsbERlY2xhcmF0aW9uKG1ldGhvZCwgc291cmNlRmlsZSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IG1hcmtlZChMaW5rUGFyc2VyLnJlc29sdmVMaW5rcyh0cy5kaXNwbGF5UGFydHNUb1N0cmluZyhtZXRob2Quc3ltYm9sLmdldERvY3VtZW50YXRpb25Db21tZW50KCkpKSksXG4gICAgICAgICAgICBhcmdzOiBtZXRob2QucGFyYW1ldGVycyA/IG1ldGhvZC5wYXJhbWV0ZXJzLm1hcCgocHJvcCkgPT4gdGhpcy52aXNpdEFyZ3VtZW50KHByb3ApKSA6IFtdLFxuICAgICAgICAgICAgcmV0dXJuVHlwZTogdGhpcy52aXNpdFR5cGUobWV0aG9kLnR5cGUpLFxuICAgICAgICAgICAgbGluZTogdGhpcy5nZXRQb3NpdGlvbihtZXRob2QsIHNvdXJjZUZpbGUpLmxpbmUgKyAxXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIHZpc2l0SW5kZXhEZWNsYXJhdGlvbihtZXRob2QsIHNvdXJjZUZpbGU/KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogbWFya2VkKExpbmtQYXJzZXIucmVzb2x2ZUxpbmtzKHRzLmRpc3BsYXlQYXJ0c1RvU3RyaW5nKG1ldGhvZC5zeW1ib2wuZ2V0RG9jdW1lbnRhdGlvbkNvbW1lbnQoKSkpKSxcbiAgICAgICAgICAgIGFyZ3M6IG1ldGhvZC5wYXJhbWV0ZXJzID8gbWV0aG9kLnBhcmFtZXRlcnMubWFwKChwcm9wKSA9PiB0aGlzLnZpc2l0QXJndW1lbnQocHJvcCkpIDogW10sXG4gICAgICAgICAgICByZXR1cm5UeXBlOiB0aGlzLnZpc2l0VHlwZShtZXRob2QudHlwZSksXG4gICAgICAgICAgICBsaW5lOiB0aGlzLmdldFBvc2l0aW9uKG1ldGhvZCwgc291cmNlRmlsZSkubGluZSArIDFcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0UG9zaXRpb24obm9kZSwgc291cmNlRmlsZSk6IHRzLkxpbmVBbmRDaGFyYWN0ZXIge1xuICAgICAgICB2YXIgcG9zaXRpb246dHMuTGluZUFuZENoYXJhY3RlcjtcbiAgICAgICAgaWYgKG5vZGVbJ25hbWUnXSAmJiBub2RlWyduYW1lJ10uZW5kKSB7XG4gICAgICAgICAgICBwb3NpdGlvbiA9IHRzLmdldExpbmVBbmRDaGFyYWN0ZXJPZlBvc2l0aW9uKHNvdXJjZUZpbGUsIG5vZGVbJ25hbWUnXS5lbmQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcG9zaXRpb24gPSB0cy5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihzb3VyY2VGaWxlLCBub2RlLnBvcyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBvc2l0aW9uO1xuICAgIH1cblxuICAgIHByaXZhdGUgdmlzaXRNZXRob2REZWNsYXJhdGlvbihtZXRob2QsIHNvdXJjZUZpbGUpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgICAgIG5hbWU6IG1ldGhvZC5uYW1lLnRleHQsXG4gICAgICAgICAgICBhcmdzOiBtZXRob2QucGFyYW1ldGVycyA/IG1ldGhvZC5wYXJhbWV0ZXJzLm1hcCgocHJvcCkgPT4gdGhpcy52aXNpdEFyZ3VtZW50KHByb3ApKSA6IFtdLFxuICAgICAgICAgICAgcmV0dXJuVHlwZTogdGhpcy52aXNpdFR5cGUobWV0aG9kLnR5cGUpLFxuICAgICAgICAgICAgbGluZTogdGhpcy5nZXRQb3NpdGlvbihtZXRob2QsIHNvdXJjZUZpbGUpLmxpbmUgKyAxXG4gICAgICAgIH0sXG4gICAgICAgICAgICBqc2RvY3RhZ3MgPSBKU0RvY1RhZ3NQYXJzZXIuZ2V0SlNEb2NzKG1ldGhvZCksXG5cbiAgICAgICAgICAgIG1hcmtlZHRhZ3MgPSBmdW5jdGlvbih0YWdzKSB7XG4gICAgICAgICAgICAgICAgdmFyIG10YWdzID0gdGFncztcbiAgICAgICAgICAgICAgICBfLmZvckVhY2gobXRhZ3MsICh0YWcpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGFnLmNvbW1lbnQgPSBtYXJrZWQoTGlua1BhcnNlci5yZXNvbHZlTGlua3ModGFnLmNvbW1lbnQpKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbXRhZ3M7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgIGlmIChtZXRob2Quc3ltYm9sKSB7XG4gICAgICAgICAgICByZXN1bHQuZGVzY3JpcHRpb24gPSBtYXJrZWQoTGlua1BhcnNlci5yZXNvbHZlTGlua3ModHMuZGlzcGxheVBhcnRzVG9TdHJpbmcobWV0aG9kLnN5bWJvbC5nZXREb2N1bWVudGF0aW9uQ29tbWVudCgpKSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1ldGhvZC5kZWNvcmF0b3JzKSB7XG4gICAgICAgICAgICByZXN1bHQuZGVjb3JhdG9ycyA9IHRoaXMuZm9ybWF0RGVjb3JhdG9ycyhtZXRob2QuZGVjb3JhdG9ycyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWV0aG9kLm1vZGlmaWVycykge1xuICAgICAgICAgICAgaWYgKG1ldGhvZC5tb2RpZmllcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5tb2RpZmllcktpbmQgPSBtZXRob2QubW9kaWZpZXJzWzBdLmtpbmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGpzZG9jdGFncyAmJiBqc2RvY3RhZ3MubGVuZ3RoID49IDEpIHtcbiAgICAgICAgICAgIGlmIChqc2RvY3RhZ3NbMF0udGFncykge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5qc2RvY3RhZ3MgPSBtYXJrZWR0YWdzKGpzZG9jdGFnc1swXS50YWdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIHByaXZhdGUgdmlzaXRBcmd1bWVudChhcmcpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvcHlyaWdodCBodHRwczovL2dpdGh1Yi5jb20vbmctYm9vdHN0cmFwL25nLWJvb3RzdHJhcFxuICAgICAgICAgKi9cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5hbWU6IGFyZy5uYW1lLnRleHQsXG4gICAgICAgICAgICB0eXBlOiB0aGlzLnZpc2l0VHlwZShhcmcpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGdldE5hbWVzQ29tcGFyZUZuKG5hbWUpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvcHlyaWdodCBodHRwczovL2dpdGh1Yi5jb20vbmctYm9vdHN0cmFwL25nLWJvb3RzdHJhcFxuICAgICAgICAgKi9cbiAgICAgICAgbmFtZSA9IG5hbWUgfHwgJ25hbWUnO1xuICAgICAgICB2YXIgdCA9IChhLCBiKSA9PiB7XG4gICAgICAgICAgICBpZiAoYVtuYW1lXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhW25hbWVdLmxvY2FsZUNvbXBhcmUoYltuYW1lXSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB0O1xuICAgIH1cblxuICAgIHByaXZhdGUgc3RyaW5naWZ5RGVmYXVsdFZhbHVlKG5vZGUpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvcHlyaWdodCBodHRwczovL2dpdGh1Yi5jb20vbmctYm9vdHN0cmFwL25nLWJvb3RzdHJhcFxuICAgICAgICAgKi9cbiAgICAgICAgaWYgKG5vZGUudGV4dCkge1xuICAgICAgICAgICAgcmV0dXJuIG5vZGUudGV4dDtcbiAgICAgICAgfSBlbHNlIGlmIChub2RlLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRmFsc2VLZXl3b3JkKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2ZhbHNlJztcbiAgICAgICAgfSBlbHNlIGlmIChub2RlLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuVHJ1ZUtleXdvcmQpIHtcbiAgICAgICAgICAgIHJldHVybiAndHJ1ZSc7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGZvcm1hdERlY29yYXRvcnMoZGVjb3JhdG9ycykge1xuICAgICAgICBsZXQgX2RlY29yYXRvcnMgPSBbXTtcblxuICAgICAgICBfLmZvckVhY2goZGVjb3JhdG9ycywgKGRlY29yYXRvcikgPT4ge1xuICAgICAgICAgICAgaWYgKGRlY29yYXRvci5leHByZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRlY29yYXRvci5leHByZXNzaW9uLnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgX2RlY29yYXRvcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBkZWNvcmF0b3IuZXhwcmVzc2lvbi50ZXh0XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZGVjb3JhdG9yLmV4cHJlc3Npb24uZXhwcmVzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaW5mbyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGRlY29yYXRvci5leHByZXNzaW9uLmV4cHJlc3Npb24udGV4dFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZWNvcmF0b3IuZXhwcmVzc2lvbi5leHByZXNzaW9uLmFyZ3VtZW50cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRlY29yYXRvci5leHByZXNzaW9uLmV4cHJlc3Npb24uYXJndW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmZvLmFyZ3MgPSBkZWNvcmF0b3IuZXhwcmVzc2lvbi5leHByZXNzaW9uLmFyZ3VtZW50cztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBfZGVjb3JhdG9ycy5wdXNoKGluZm8pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIF9kZWNvcmF0b3JzO1xuICAgIH1cblxuICAgIHByaXZhdGUgdmlzaXRQcm9wZXJ0eShwcm9wZXJ0eSwgc291cmNlRmlsZSkge1xuICAgICAgICAvKipcbiAgICAgICAgICogQ29weXJpZ2h0IGh0dHBzOi8vZ2l0aHViLmNvbS9uZy1ib290c3RyYXAvbmctYm9vdHN0cmFwXG4gICAgICAgICAqL1xuICAgICAgICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgICAgICBuYW1lOiBwcm9wZXJ0eS5uYW1lLnRleHQsXG4gICAgICAgICAgICAgZGVmYXVsdFZhbHVlOiBwcm9wZXJ0eS5pbml0aWFsaXplciA/IHRoaXMuc3RyaW5naWZ5RGVmYXVsdFZhbHVlKHByb3BlcnR5LmluaXRpYWxpemVyKSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICB0eXBlOiB0aGlzLnZpc2l0VHlwZShwcm9wZXJ0eSksXG4gICAgICAgICAgICAgZGVzY3JpcHRpb246IG1hcmtlZChMaW5rUGFyc2VyLnJlc29sdmVMaW5rcyh0cy5kaXNwbGF5UGFydHNUb1N0cmluZyhwcm9wZXJ0eS5zeW1ib2wuZ2V0RG9jdW1lbnRhdGlvbkNvbW1lbnQoKSkpKSxcbiAgICAgICAgICAgICBsaW5lOiB0aGlzLmdldFBvc2l0aW9uKHByb3BlcnR5LCBzb3VyY2VGaWxlKS5saW5lICsgMVxuICAgICAgICAgfVxuXG4gICAgICAgICBpZiAocHJvcGVydHkuZGVjb3JhdG9ycykge1xuICAgICAgICAgICAgIHJlc3VsdC5kZWNvcmF0b3JzID0gdGhpcy5mb3JtYXREZWNvcmF0b3JzKHByb3BlcnR5LmRlY29yYXRvcnMpO1xuICAgICAgICAgfVxuXG4gICAgICAgICBpZiAocHJvcGVydHkubW9kaWZpZXJzKSB7XG4gICAgICAgICAgICAgaWYgKHByb3BlcnR5Lm1vZGlmaWVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgIHJlc3VsdC5tb2RpZmllcktpbmQgPSBwcm9wZXJ0eS5tb2RpZmllcnNbMF0ua2luZDtcbiAgICAgICAgICAgICB9XG4gICAgICAgICB9XG4gICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIHByaXZhdGUgdmlzaXRNZW1iZXJzKG1lbWJlcnMsIHNvdXJjZUZpbGUpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvcHlyaWdodCBodHRwczovL2dpdGh1Yi5jb20vbmctYm9vdHN0cmFwL25nLWJvb3RzdHJhcFxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIGlucHV0cyA9IFtdLFxuICAgICAgICAgICAgb3V0cHV0cyA9IFtdLFxuICAgICAgICAgICAgbWV0aG9kcyA9IFtdLFxuICAgICAgICAgICAgcHJvcGVydGllcyA9IFtdLFxuICAgICAgICAgICAgaW5kZXhTaWduYXR1cmVzID0gW10sXG4gICAgICAgICAgICBraW5kLFxuICAgICAgICAgICAgaW5wdXREZWNvcmF0b3IsXG4gICAgICAgICAgICBjb25zdHJ1Y3RvcixcbiAgICAgICAgICAgIG91dERlY29yYXRvcjtcblxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVtYmVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaW5wdXREZWNvcmF0b3IgPSB0aGlzLmdldERlY29yYXRvck9mVHlwZShtZW1iZXJzW2ldLCAnSW5wdXQnKTtcbiAgICAgICAgICAgIG91dERlY29yYXRvciA9IHRoaXMuZ2V0RGVjb3JhdG9yT2ZUeXBlKG1lbWJlcnNbaV0sICdPdXRwdXQnKTtcblxuICAgICAgICAgICAga2luZCA9IG1lbWJlcnNbaV0ua2luZDtcblxuICAgICAgICAgICAgaWYgKGlucHV0RGVjb3JhdG9yKSB7XG4gICAgICAgICAgICAgICAgaW5wdXRzLnB1c2godGhpcy52aXNpdElucHV0KG1lbWJlcnNbaV0sIGlucHV0RGVjb3JhdG9yLCBzb3VyY2VGaWxlKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG91dERlY29yYXRvcikge1xuICAgICAgICAgICAgICAgIG91dHB1dHMucHVzaCh0aGlzLnZpc2l0T3V0cHV0KG1lbWJlcnNbaV0sIG91dERlY29yYXRvciwgc291cmNlRmlsZSkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghdGhpcy5pc0hpZGRlbk1lbWJlcihtZW1iZXJzW2ldKSkge1xuXG4gICAgICAgICAgICAgICAgaWYgKCAodGhpcy5pc1ByaXZhdGUobWVtYmVyc1tpXSkgfHwgdGhpcy5pc0ludGVybmFsKG1lbWJlcnNbaV0pKSAmJiB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuZGlzYWJsZVByaXZhdGVPckludGVybmFsU3VwcG9ydCkge30gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICgobWVtYmVyc1tpXS5raW5kID09PSB0cy5TeW50YXhLaW5kLk1ldGhvZERlY2xhcmF0aW9uIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBtZW1iZXJzW2ldLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuTWV0aG9kU2lnbmF0dXJlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kcy5wdXNoKHRoaXMudmlzaXRNZXRob2REZWNsYXJhdGlvbihtZW1iZXJzW2ldLCBzb3VyY2VGaWxlKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgICAgICAgICAgICAgICBtZW1iZXJzW2ldLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuUHJvcGVydHlEZWNsYXJhdGlvbiB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVtYmVyc1tpXS5raW5kID09PSB0cy5TeW50YXhLaW5kLlByb3BlcnR5U2lnbmF0dXJlIHx8IG1lbWJlcnNbaV0ua2luZCA9PT0gdHMuU3ludGF4S2luZC5HZXRBY2Nlc3Nvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllcy5wdXNoKHRoaXMudmlzaXRQcm9wZXJ0eShtZW1iZXJzW2ldLCBzb3VyY2VGaWxlKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobWVtYmVyc1tpXS5raW5kID09PSB0cy5TeW50YXhLaW5kLkNhbGxTaWduYXR1cmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXMucHVzaCh0aGlzLnZpc2l0Q2FsbERlY2xhcmF0aW9uKG1lbWJlcnNbaV0sIHNvdXJjZUZpbGUpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtZW1iZXJzW2ldLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuSW5kZXhTaWduYXR1cmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4U2lnbmF0dXJlcy5wdXNoKHRoaXMudmlzaXRJbmRleERlY2xhcmF0aW9uKG1lbWJlcnNbaV0sIHNvdXJjZUZpbGUpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtZW1iZXJzW2ldLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuQ29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBfY29uc3RydWN0b3JQcm9wZXJ0aWVzID0gdGhpcy52aXNpdENvbnN0cnVjdG9yUHJvcGVydGllcyhtZW1iZXJzW2ldKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBqID0gMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZW4gPSBfY29uc3RydWN0b3JQcm9wZXJ0aWVzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcihqOyBqPGxlbjsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllcy5wdXNoKF9jb25zdHJ1Y3RvclByb3BlcnRpZXNbal0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3RydWN0b3IgPSB0aGlzLnZpc2l0Q29uc3RydWN0b3JEZWNsYXJhdGlvbihtZW1iZXJzW2ldLCBzb3VyY2VGaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlucHV0cy5zb3J0KHRoaXMuZ2V0TmFtZXNDb21wYXJlRm4oKSk7XG4gICAgICAgIG91dHB1dHMuc29ydCh0aGlzLmdldE5hbWVzQ29tcGFyZUZuKCkpO1xuICAgICAgICBwcm9wZXJ0aWVzLnNvcnQodGhpcy5nZXROYW1lc0NvbXBhcmVGbigpKTtcbiAgICAgICAgaW5kZXhTaWduYXR1cmVzLnNvcnQodGhpcy5nZXROYW1lc0NvbXBhcmVGbigpKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaW5wdXRzLFxuICAgICAgICAgICAgb3V0cHV0cyxcbiAgICAgICAgICAgIG1ldGhvZHMsXG4gICAgICAgICAgICBwcm9wZXJ0aWVzLFxuICAgICAgICAgICAgaW5kZXhTaWduYXR1cmVzLFxuICAgICAgICAgICAga2luZCxcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB2aXNpdERpcmVjdGl2ZURlY29yYXRvcihkZWNvcmF0b3IpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvcHlyaWdodCBodHRwczovL2dpdGh1Yi5jb20vbmctYm9vdHN0cmFwL25nLWJvb3RzdHJhcFxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIHNlbGVjdG9yO1xuICAgICAgICB2YXIgZXhwb3J0QXM7XG4gICAgICAgIHZhciBwcm9wZXJ0aWVzID0gZGVjb3JhdG9yLmV4cHJlc3Npb24uYXJndW1lbnRzWzBdLnByb3BlcnRpZXM7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wZXJ0aWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAocHJvcGVydGllc1tpXS5uYW1lLnRleHQgPT09ICdzZWxlY3RvcicpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiB0aGlzIHdpbGwgb25seSB3b3JrIGlmIHNlbGVjdG9yIGlzIGluaXRpYWxpemVkIGFzIGEgc3RyaW5nIGxpdGVyYWxcbiAgICAgICAgICAgICAgICBzZWxlY3RvciA9IHByb3BlcnRpZXNbaV0uaW5pdGlhbGl6ZXIudGV4dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzW2ldLm5hbWUudGV4dCA9PT0gJ2V4cG9ydEFzJykge1xuICAgICAgICAgICAgICAgIC8vIFRPRE86IHRoaXMgd2lsbCBvbmx5IHdvcmsgaWYgc2VsZWN0b3IgaXMgaW5pdGlhbGl6ZWQgYXMgYSBzdHJpbmcgbGl0ZXJhbFxuICAgICAgICAgICAgICAgIGV4cG9ydEFzID0gcHJvcGVydGllc1tpXS5pbml0aWFsaXplci50ZXh0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNlbGVjdG9yLFxuICAgICAgICAgICAgZXhwb3J0QXNcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGlzUGlwZURlY29yYXRvcihkZWNvcmF0b3IpIHtcbiAgICAgICAgcmV0dXJuIChkZWNvcmF0b3IuZXhwcmVzc2lvbi5leHByZXNzaW9uKSA/IGRlY29yYXRvci5leHByZXNzaW9uLmV4cHJlc3Npb24udGV4dCA9PT0gJ1BpcGUnIDogZmFsc2U7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpc01vZHVsZURlY29yYXRvcihkZWNvcmF0b3IpIHtcbiAgICAgICAgcmV0dXJuIChkZWNvcmF0b3IuZXhwcmVzc2lvbi5leHByZXNzaW9uKSA/IGRlY29yYXRvci5leHByZXNzaW9uLmV4cHJlc3Npb24udGV4dCA9PT0gJ05nTW9kdWxlJyA6IGZhbHNlO1xuICAgIH1cblxuICAgIHByaXZhdGUgaXNEaXJlY3RpdmVEZWNvcmF0b3IoZGVjb3JhdG9yKSB7XG4gICAgICAgIGlmIChkZWNvcmF0b3IuZXhwcmVzc2lvbi5leHByZXNzaW9uKSB7XG4gICAgICAgICAgICB2YXIgZGVjb3JhdG9ySWRlbnRpZmllclRleHQgPSBkZWNvcmF0b3IuZXhwcmVzc2lvbi5leHByZXNzaW9uLnRleHQ7XG4gICAgICAgICAgICByZXR1cm4gZGVjb3JhdG9ySWRlbnRpZmllclRleHQgPT09ICdEaXJlY3RpdmUnIHx8IGRlY29yYXRvcklkZW50aWZpZXJUZXh0ID09PSAnQ29tcG9uZW50JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgaXNTZXJ2aWNlRGVjb3JhdG9yKGRlY29yYXRvcikge1xuICAgICAgICByZXR1cm4gKGRlY29yYXRvci5leHByZXNzaW9uLmV4cHJlc3Npb24pID8gZGVjb3JhdG9yLmV4cHJlc3Npb24uZXhwcmVzc2lvbi50ZXh0ID09PSAnSW5qZWN0YWJsZScgOiBmYWxzZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHZpc2l0Q2xhc3NEZWNsYXJhdGlvbihmaWxlTmFtZSwgY2xhc3NEZWNsYXJhdGlvbiwgc291cmNlRmlsZT8pIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvcHlyaWdodCBodHRwczovL2dpdGh1Yi5jb20vbmctYm9vdHN0cmFwL25nLWJvb3RzdHJhcFxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIHN5bWJvbCA9IHRoaXMucHJvZ3JhbS5nZXRUeXBlQ2hlY2tlcigpLmdldFN5bWJvbEF0TG9jYXRpb24oY2xhc3NEZWNsYXJhdGlvbi5uYW1lKTtcbiAgICAgICAgdmFyIGRlc2NyaXB0aW9uID0gbWFya2VkKExpbmtQYXJzZXIucmVzb2x2ZUxpbmtzKHRzLmRpc3BsYXlQYXJ0c1RvU3RyaW5nKHN5bWJvbC5nZXREb2N1bWVudGF0aW9uQ29tbWVudCgpKSkpO1xuICAgICAgICB2YXIgY2xhc3NOYW1lID0gY2xhc3NEZWNsYXJhdGlvbi5uYW1lLnRleHQ7XG4gICAgICAgIHZhciBkaXJlY3RpdmVJbmZvO1xuICAgICAgICB2YXIgbWVtYmVycztcbiAgICAgICAgdmFyIGltcGxlbWVudHNFbGVtZW50cyA9IFtdO1xuICAgICAgICB2YXIgZXh0ZW5kc0VsZW1lbnQ7XG4gICAgICAgIHZhciBqc2RvY3RhZ3MgPSBbXTtcblxuICAgICAgICBpZiAodHlwZW9mIHRzLmdldENsYXNzSW1wbGVtZW50c0hlcml0YWdlQ2xhdXNlRWxlbWVudHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB2YXIgaW1wbGVtZW50ZWRUeXBlcyA9IHRzLmdldENsYXNzSW1wbGVtZW50c0hlcml0YWdlQ2xhdXNlRWxlbWVudHMoY2xhc3NEZWNsYXJhdGlvbik7XG4gICAgICAgICAgICBpZiAoaW1wbGVtZW50ZWRUeXBlcykge1xuICAgICAgICAgICAgICAgIGxldCBpID0gMCxcbiAgICAgICAgICAgICAgICAgICAgbGVuID0gaW1wbGVtZW50ZWRUeXBlcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgZm9yKGk7IGk8bGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGltcGxlbWVudGVkVHlwZXNbaV0uZXhwcmVzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW1wbGVtZW50c0VsZW1lbnRzLnB1c2goaW1wbGVtZW50ZWRUeXBlc1tpXS5leHByZXNzaW9uLnRleHQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiB0cy5nZXRDbGFzc0V4dGVuZHNIZXJpdGFnZUNsYXVzZUVsZW1lbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB2YXIgZXh0ZW5kc1R5cGVzID0gdHMuZ2V0Q2xhc3NFeHRlbmRzSGVyaXRhZ2VDbGF1c2VFbGVtZW50KGNsYXNzRGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgaWYgKGV4dGVuZHNUeXBlcykge1xuICAgICAgICAgICAgICAgIGlmIChleHRlbmRzVHlwZXMuZXhwcmVzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICBleHRlbmRzRWxlbWVudCA9IGV4dGVuZHNUeXBlcy5leHByZXNzaW9uLnRleHRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pIHtcbiAgICAgICAgICAgIGpzZG9jdGFncyA9IEpTRG9jVGFnc1BhcnNlci5nZXRKU0RvY3Moc3ltYm9sLnZhbHVlRGVjbGFyYXRpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNsYXNzRGVjbGFyYXRpb24uZGVjb3JhdG9ycykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjbGFzc0RlY2xhcmF0aW9uLmRlY29yYXRvcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0RpcmVjdGl2ZURlY29yYXRvcihjbGFzc0RlY2xhcmF0aW9uLmRlY29yYXRvcnNbaV0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGRpcmVjdGl2ZUluZm8gPSB0aGlzLnZpc2l0RGlyZWN0aXZlRGVjb3JhdG9yKGNsYXNzRGVjbGFyYXRpb24uZGVjb3JhdG9yc1tpXSk7XG4gICAgICAgICAgICAgICAgICAgIG1lbWJlcnMgPSB0aGlzLnZpc2l0TWVtYmVycyhjbGFzc0RlY2xhcmF0aW9uLm1lbWJlcnMsIHNvdXJjZUZpbGUpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnB1dHM6IG1lbWJlcnMuaW5wdXRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0czogbWVtYmVycy5vdXRwdXRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczogbWVtYmVycy5wcm9wZXJ0aWVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kczogbWVtYmVycy5tZXRob2RzLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXhTaWduYXR1cmVzOiBtZW1iZXJzLmluZGV4U2lnbmF0dXJlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGtpbmQ6IG1lbWJlcnMua2luZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBtZW1iZXJzLmNvbnN0cnVjdG9yLFxuICAgICAgICAgICAgICAgICAgICAgICAganNkb2N0YWdzOiBqc2RvY3RhZ3MsXG4gICAgICAgICAgICAgICAgICAgICAgICBleHRlbmRzOiBleHRlbmRzRWxlbWVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGltcGxlbWVudHM6IGltcGxlbWVudHNFbGVtZW50c1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5pc1NlcnZpY2VEZWNvcmF0b3IoY2xhc3NEZWNsYXJhdGlvbi5kZWNvcmF0b3JzW2ldKSkge1xuICAgICAgICAgICAgICAgICAgICBtZW1iZXJzID0gdGhpcy52aXNpdE1lbWJlcnMoY2xhc3NEZWNsYXJhdGlvbi5tZW1iZXJzLCBzb3VyY2VGaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFt7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kczogbWVtYmVycy5tZXRob2RzLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXhTaWduYXR1cmVzOiBtZW1iZXJzLmluZGV4U2lnbmF0dXJlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IG1lbWJlcnMucHJvcGVydGllcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGtpbmQ6IG1lbWJlcnMua2luZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBtZW1iZXJzLmNvbnN0cnVjdG9yLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5kczogZXh0ZW5kc0VsZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbXBsZW1lbnRzOiBpbXBsZW1lbnRzRWxlbWVudHNcbiAgICAgICAgICAgICAgICAgICAgfV07XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlzUGlwZURlY29yYXRvcihjbGFzc0RlY2xhcmF0aW9uLmRlY29yYXRvcnNbaV0pIHx8IHRoaXMuaXNNb2R1bGVEZWNvcmF0b3IoY2xhc3NEZWNsYXJhdGlvbi5kZWNvcmF0b3JzW2ldKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3tcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBqc2RvY3RhZ3M6IGpzZG9jdGFnc1xuICAgICAgICAgICAgICAgICAgICB9XTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdjdXN0b20gZGVjb3JhdG9yJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBtZW1iZXJzID0gdGhpcy52aXNpdE1lbWJlcnMoY2xhc3NEZWNsYXJhdGlvbi5tZW1iZXJzLCBzb3VyY2VGaWxlKTtcblxuICAgICAgICAgICAgcmV0dXJuIFt7XG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgbWV0aG9kczogbWVtYmVycy5tZXRob2RzLFxuICAgICAgICAgICAgICAgIGluZGV4U2lnbmF0dXJlczogbWVtYmVycy5pbmRleFNpZ25hdHVyZXMsXG4gICAgICAgICAgICAgICAgcHJvcGVydGllczogbWVtYmVycy5wcm9wZXJ0aWVzLFxuICAgICAgICAgICAgICAgIGtpbmQ6IG1lbWJlcnMua2luZCxcbiAgICAgICAgICAgICAgICBjb25zdHJ1Y3RvcjogbWVtYmVycy5jb25zdHJ1Y3RvcixcbiAgICAgICAgICAgICAgICBleHRlbmRzOiBleHRlbmRzRWxlbWVudCxcbiAgICAgICAgICAgICAgICBpbXBsZW1lbnRzOiBpbXBsZW1lbnRzRWxlbWVudHNcbiAgICAgICAgICAgIH1dO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWVtYmVycyA9IHRoaXMudmlzaXRNZW1iZXJzKGNsYXNzRGVjbGFyYXRpb24ubWVtYmVycywgc291cmNlRmlsZSk7XG5cbiAgICAgICAgICAgIHJldHVybiBbe1xuICAgICAgICAgICAgICAgIG1ldGhvZHM6IG1lbWJlcnMubWV0aG9kcyxcbiAgICAgICAgICAgICAgICBpbmRleFNpZ25hdHVyZXM6IG1lbWJlcnMuaW5kZXhTaWduYXR1cmVzLFxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IG1lbWJlcnMucHJvcGVydGllcyxcbiAgICAgICAgICAgICAgICBraW5kOiBtZW1iZXJzLmtpbmQsXG4gICAgICAgICAgICAgICAgY29uc3RydWN0b3I6IG1lbWJlcnMuY29uc3RydWN0b3IsXG4gICAgICAgICAgICAgICAgZXh0ZW5kczogZXh0ZW5kc0VsZW1lbnQsXG4gICAgICAgICAgICAgICAgaW1wbGVtZW50czogaW1wbGVtZW50c0VsZW1lbnRzXG4gICAgICAgICAgICB9XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHZpc2l0VHlwZURlY2xhcmF0aW9uKHR5cGUpIHtcbiAgICAgICAgdmFyIHJlc3VsdDphbnkgPSB7XG4gICAgICAgICAgICAgICAgbmFtZTogdHlwZS5uYW1lLnRleHRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBqc2RvY3RhZ3MgPSBKU0RvY1RhZ3NQYXJzZXIuZ2V0SlNEb2NzKHR5cGUpO1xuXG4gICAgICAgIHZhciBtYXJrZWR0YWdzID0gZnVuY3Rpb24odGFncykge1xuICAgICAgICAgICAgICAgIHZhciBtdGFncyA9IHRhZ3M7XG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKG10YWdzLCAodGFnKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRhZy5jb21tZW50ID0gbWFya2VkKExpbmtQYXJzZXIucmVzb2x2ZUxpbmtzKHRhZy5jb21tZW50KSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG10YWdzO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICBpZiAoanNkb2N0YWdzICYmIGpzZG9jdGFncy5sZW5ndGggPj0gMSkge1xuICAgICAgICAgICAgaWYgKGpzZG9jdGFnc1swXS50YWdzKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmpzZG9jdGFncyA9IG1hcmtlZHRhZ3MoanNkb2N0YWdzWzBdLnRhZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB2aXNpdEZ1bmN0aW9uRGVjbGFyYXRpb24obWV0aG9kKSB7XG4gICAgICAgIGxldCBtYXBUeXBlcyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgOTQ6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnTnVsbCc7XG4gICAgICAgICAgICAgICAgY2FzZSAxMTg6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnQW55JztcbiAgICAgICAgICAgICAgICBjYXNlIDEyMTpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdCb29sZWFuJztcbiAgICAgICAgICAgICAgICBjYXNlIDEyOTpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdOZXZlcic7XG4gICAgICAgICAgICAgICAgY2FzZSAxMzI6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnTnVtYmVyJztcbiAgICAgICAgICAgICAgICBjYXNlIDEzNDpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdTdHJpbmcnO1xuICAgICAgICAgICAgICAgIGNhc2UgMTM3OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ1VuZGVmaW5lZCc7XG4gICAgICAgICAgICAgICAgY2FzZSAxNTc6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnVHlwZVJlZmVyZW5jZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHZpc2l0QXJndW1lbnQgPSBmdW5jdGlvbihhcmcpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQ6IGFueSA9IHtcbiAgICAgICAgICAgICAgICBuYW1lOiBhcmcubmFtZS50ZXh0XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKGFyZy50eXBlKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnR5cGUgPSBtYXBUeXBlcyhhcmcudHlwZS5raW5kKTtcbiAgICAgICAgICAgICAgICBpZiAoYXJnLnR5cGUua2luZCA9PT0gMTU3KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vdHJ5IHJlcGxhY2UgVHlwZVJlZmVyZW5jZSB3aXRoIHR5cGVOYW1lXG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmcudHlwZS50eXBlTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnR5cGUgPSBhcmcudHlwZS50eXBlTmFtZS50ZXh0O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciByZXN1bHQ6YW55ID0ge1xuICAgICAgICAgICAgbmFtZTogbWV0aG9kLm5hbWUudGV4dCxcbiAgICAgICAgICAgIGFyZ3M6IG1ldGhvZC5wYXJhbWV0ZXJzID8gbWV0aG9kLnBhcmFtZXRlcnMubWFwKChwcm9wKSA9PiB2aXNpdEFyZ3VtZW50KHByb3ApKSA6IFtdXG4gICAgICAgIH0sXG4gICAgICAgIGpzZG9jdGFncyA9IEpTRG9jVGFnc1BhcnNlci5nZXRKU0RvY3MobWV0aG9kKTtcblxuICAgICAgICB2YXIgbWFya2VkdGFncyA9IGZ1bmN0aW9uKHRhZ3MpIHtcbiAgICAgICAgICAgICAgICB2YXIgbXRhZ3MgPSB0YWdzO1xuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChtdGFncywgKHRhZykgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0YWcuY29tbWVudCA9IG1hcmtlZChMaW5rUGFyc2VyLnJlc29sdmVMaW5rcyh0YWcuY29tbWVudCkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBtdGFncztcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgaWYgKHR5cGVvZiBtZXRob2QudHlwZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJlc3VsdC5yZXR1cm5UeXBlID0gdGhpcy52aXNpdFR5cGUobWV0aG9kLnR5cGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1ldGhvZC5tb2RpZmllcnMpIHtcbiAgICAgICAgICAgIGlmIChtZXRob2QubW9kaWZpZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICByZXN1bHQubW9kaWZpZXJLaW5kID0gbWV0aG9kLm1vZGlmaWVyc1swXS5raW5kO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChqc2RvY3RhZ3MgJiYganNkb2N0YWdzLmxlbmd0aCA+PSAxKSB7XG4gICAgICAgICAgICBpZiAoanNkb2N0YWdzWzBdLnRhZ3MpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuanNkb2N0YWdzID0gbWFya2VkdGFncyhqc2RvY3RhZ3NbMF0udGFncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBwcml2YXRlIHZpc2l0VmFyaWFibGVEZWNsYXJhdGlvbihub2RlKSB7XG4gICAgICAgIGlmKCBub2RlLmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMgKSB7XG4gICAgICAgICAgICBsZXQgaSA9IDAsXG4gICAgICAgICAgICAgICAgbGVuID0gbm9kZS5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLmxlbmd0aDtcbiAgICAgICAgICAgIGZvcihpOyBpPGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbm9kZS5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zW2ldLm5hbWUudGV4dCxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdFZhbHVlOiBub2RlLmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnNbaV0uaW5pdGlhbGl6ZXIgPyB0aGlzLnN0cmluZ2lmeURlZmF1bHRWYWx1ZShub2RlLmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnNbaV0uaW5pdGlhbGl6ZXIpIDogdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmKG5vZGUuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9uc1tpXS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC50eXBlID0gdGhpcy52aXNpdFR5cGUobm9kZS5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zW2ldLnR5cGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB2aXNpdEVudW1EZWNsYXJhdGlvbihub2RlKSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBbXSxcbiAgICAgICAgaWYoIG5vZGUubWVtYmVycyApIHtcbiAgICAgICAgICAgIGxldCBpID0gMCxcbiAgICAgICAgICAgICAgICBsZW4gPSBub2RlLm1lbWJlcnMubGVuZ3RoO1xuICAgICAgICAgICAgZm9yKGk7IGk8bGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsZXQgbWVtYmVyID0ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBub2RlLm1lbWJlcnNbaV0ubmFtZS50ZXh0XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChub2RlLm1lbWJlcnNbaV0uaW5pdGlhbGl6ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbWVtYmVyLnZhbHVlID0gbm9kZS5tZW1iZXJzW2ldLmluaXRpYWxpemVyLnRleHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKG1lbWJlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBwcml2YXRlIHZpc2l0RW51bURlY2xhcmF0aW9uRm9yUm91dGVzKGZpbGVOYW1lLCBub2RlKSB7XG4gICAgICAgIGlmKCBub2RlLmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnMgKSB7XG4gICAgICAgICAgICBsZXQgaSA9IDAsXG4gICAgICAgICAgICAgICAgbGVuID0gbm9kZS5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zLmxlbmd0aDtcbiAgICAgICAgICAgIGZvcihpOyBpPGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYobm9kZS5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zW2ldLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYobm9kZS5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zW2ldLnR5cGUudHlwZU5hbWUgJiYgbm9kZS5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zW2ldLnR5cGUudHlwZU5hbWUudGV4dCA9PT0gJ1JvdXRlcycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkYXRhID0gZ2VuZXJhdGUobm9kZS5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zW2ldLmluaXRpYWxpemVyKVxuICAgICAgICAgICAgICAgICAgICAgICAgUm91dGVyUGFyc2VyLmFkZFJvdXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBub2RlLmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnNbaV0ubmFtZS50ZXh0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IFJvdXRlclBhcnNlci5jbGVhblJhd1JvdXRlKGRhdGEpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGU6IGZpbGVOYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvdXRlczogZGF0YVxuICAgICAgICAgICAgICAgICAgICAgICAgfV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0Um91dGVJTyhmaWxlbmFtZSwgc291cmNlRmlsZSkge1xuICAgICAgICAvKipcbiAgICAgICAgICogQ29weXJpZ2h0IGh0dHBzOi8vZ2l0aHViLmNvbS9uZy1ib290c3RyYXAvbmctYm9vdHN0cmFwXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgcmVzID0gc291cmNlRmlsZS5zdGF0ZW1lbnRzLnJlZHVjZSgoZGlyZWN0aXZlLCBzdGF0ZW1lbnQpID0+IHtcblxuICAgICAgICAgICAgaWYgKHN0YXRlbWVudC5raW5kID09PSB0cy5TeW50YXhLaW5kLlZhcmlhYmxlU3RhdGVtZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRpcmVjdGl2ZS5jb25jYXQodGhpcy52aXNpdEVudW1EZWNsYXJhdGlvbkZvclJvdXRlcyhmaWxlbmFtZSwgc3RhdGVtZW50KSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBkaXJlY3RpdmU7XG4gICAgICAgIH0sIFtdKVxuXG4gICAgICAgIHJldHVybiByZXNbMF0gfHwge307XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRDb21wb25lbnRJTyhmaWxlbmFtZTogc3RyaW5nLCBzb3VyY2VGaWxlLCBub2RlKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb3B5cmlnaHQgaHR0cHM6Ly9naXRodWIuY29tL25nLWJvb3RzdHJhcC9uZy1ib290c3RyYXBcbiAgICAgICAgICovXG4gICAgICAgIHZhciByZXMgPSBzb3VyY2VGaWxlLnN0YXRlbWVudHMucmVkdWNlKChkaXJlY3RpdmUsIHN0YXRlbWVudCkgPT4ge1xuXG4gICAgICAgICAgICBpZiAoc3RhdGVtZW50LmtpbmQgPT09IHRzLlN5bnRheEtpbmQuQ2xhc3NEZWNsYXJhdGlvbikge1xuICAgICAgICAgICAgICAgIGlmIChzdGF0ZW1lbnQucG9zID09PSBub2RlLnBvcyAmJiBzdGF0ZW1lbnQuZW5kID09PSBub2RlLmVuZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGlyZWN0aXZlLmNvbmNhdCh0aGlzLnZpc2l0Q2xhc3NEZWNsYXJhdGlvbihmaWxlbmFtZSwgc3RhdGVtZW50LCBzb3VyY2VGaWxlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZGlyZWN0aXZlO1xuICAgICAgICB9LCBbXSlcblxuICAgICAgICByZXR1cm4gcmVzWzBdIHx8IHt9O1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0Q2xhc3NJTyhmaWxlbmFtZTogc3RyaW5nLCBzb3VyY2VGaWxlLCBub2RlKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb3B5cmlnaHQgaHR0cHM6Ly9naXRodWIuY29tL25nLWJvb3RzdHJhcC9uZy1ib290c3RyYXBcbiAgICAgICAgICovXG4gICAgICAgIHZhciByZXMgPSBzb3VyY2VGaWxlLnN0YXRlbWVudHMucmVkdWNlKChkaXJlY3RpdmUsIHN0YXRlbWVudCkgPT4ge1xuXG4gICAgICAgICAgICBpZiAoc3RhdGVtZW50LmtpbmQgPT09IHRzLlN5bnRheEtpbmQuQ2xhc3NEZWNsYXJhdGlvbikge1xuICAgICAgICAgICAgICAgIGlmIChzdGF0ZW1lbnQucG9zID09PSBub2RlLnBvcyAmJiBzdGF0ZW1lbnQuZW5kID09PSBub2RlLmVuZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGlyZWN0aXZlLmNvbmNhdCh0aGlzLnZpc2l0Q2xhc3NEZWNsYXJhdGlvbihmaWxlbmFtZSwgc3RhdGVtZW50LCBzb3VyY2VGaWxlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZGlyZWN0aXZlO1xuICAgICAgICB9LCBbXSlcblxuICAgICAgICByZXR1cm4gcmVzWzBdIHx8IHt9O1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0SW50ZXJmYWNlSU8oZmlsZW5hbWU6IHN0cmluZywgc291cmNlRmlsZSwgbm9kZSkge1xuICAgICAgICAvKipcbiAgICAgICAgICogQ29weXJpZ2h0IGh0dHBzOi8vZ2l0aHViLmNvbS9uZy1ib290c3RyYXAvbmctYm9vdHN0cmFwXG4gICAgICAgICAqL1xuICAgICAgICB2YXIgcmVzID0gc291cmNlRmlsZS5zdGF0ZW1lbnRzLnJlZHVjZSgoZGlyZWN0aXZlLCBzdGF0ZW1lbnQpID0+IHtcblxuICAgICAgICAgICAgaWYgKHN0YXRlbWVudC5raW5kID09PSB0cy5TeW50YXhLaW5kLkludGVyZmFjZURlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlbWVudC5wb3MgPT09IG5vZGUucG9zICYmIHN0YXRlbWVudC5lbmQgPT09IG5vZGUuZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkaXJlY3RpdmUuY29uY2F0KHRoaXMudmlzaXRDbGFzc0RlY2xhcmF0aW9uKGZpbGVuYW1lLCBzdGF0ZW1lbnQsIHNvdXJjZUZpbGUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBkaXJlY3RpdmU7XG4gICAgICAgIH0sIFtdKVxuXG4gICAgICAgIHJldHVybiByZXNbMF0gfHwge307XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRDb21wb25lbnRPdXRwdXRzKHByb3BzOiBOb2RlT2JqZWN0W10pOiBzdHJpbmdbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldFN5bWJvbERlcHMocHJvcHMsICdvdXRwdXRzJyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRDb21wb25lbnRQcm92aWRlcnMocHJvcHM6IE5vZGVPYmplY3RbXSk6IERlcHNbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldFN5bWJvbERlcHMocHJvcHMsICdwcm92aWRlcnMnKS5tYXAoKG5hbWUpID0+IHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcnNlRGVlcEluZGVudGlmaWVyKG5hbWUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldENvbXBvbmVudFZpZXdQcm92aWRlcnMocHJvcHM6IE5vZGVPYmplY3RbXSk6IERlcHNbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldFN5bWJvbERlcHMocHJvcHMsICd2aWV3UHJvdmlkZXJzJykubWFwKChuYW1lKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJzZURlZXBJbmRlbnRpZmllcihuYW1lKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRDb21wb25lbnREaXJlY3RpdmVzKHByb3BzOiBOb2RlT2JqZWN0W10pOiBEZXBzW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRTeW1ib2xEZXBzKHByb3BzLCAnZGlyZWN0aXZlcycpLm1hcCgobmFtZSkgPT4ge1xuICAgICAgICAgICAgbGV0IGlkZW50aWZpZXIgPSB0aGlzLnBhcnNlRGVlcEluZGVudGlmaWVyKG5hbWUpO1xuICAgICAgICAgICAgaWRlbnRpZmllci5zZWxlY3RvciA9IHRoaXMuZmluZENvbXBvbmVudFNlbGVjdG9yQnlOYW1lKG5hbWUpO1xuICAgICAgICAgICAgaWRlbnRpZmllci5sYWJlbCA9ICcnO1xuICAgICAgICAgICAgcmV0dXJuIGlkZW50aWZpZXI7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgcGFyc2VEZWVwSW5kZW50aWZpZXIobmFtZTogc3RyaW5nKTogYW55IHtcbiAgICAgICAgbGV0IG5zTW9kdWxlID0gbmFtZS5zcGxpdCgnLicpLFxuICAgICAgICAgICAgdHlwZSA9IHRoaXMuZ2V0VHlwZShuYW1lKTtcbiAgICAgICAgaWYgKG5zTW9kdWxlLmxlbmd0aCA+IDEpIHtcblxuICAgICAgICAgICAgLy8gY2FjaGUgZGVwcyB3aXRoIHRoZSBzYW1lIG5hbWVzcGFjZSAoaS5lIFNoYXJlZC4qKVxuICAgICAgICAgICAgaWYgKHRoaXMuX19uc01vZHVsZVtuc01vZHVsZVswXV0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9fbnNNb2R1bGVbbnNNb2R1bGVbMF1dLnB1c2gobmFtZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuX19uc01vZHVsZVtuc01vZHVsZVswXV0gPSBbbmFtZV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgbnM6IG5zTW9kdWxlWzBdLFxuICAgICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgICAgdHlwZTogdHlwZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgdHlwZTogdHlwZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0Q29tcG9uZW50VGVtcGxhdGVVcmwocHJvcHM6IE5vZGVPYmplY3RbXSk6IHN0cmluZ1tdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0U3ltYm9sRGVwcyhwcm9wcywgJ3RlbXBsYXRlVXJsJyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRDb21wb25lbnRUZW1wbGF0ZShwcm9wczogTm9kZU9iamVjdFtdKTogc3RyaW5nIHtcbiAgICAgICAgbGV0IHQgPSB0aGlzLmdldFN5bWJvbERlcHMocHJvcHMsICd0ZW1wbGF0ZScsIHRydWUpLnBvcCgpXG4gICAgICAgIGlmKHQpIHtcbiAgICAgICAgICAgIHQgPSBkZXRlY3RJbmRlbnQodCwgMCk7XG4gICAgICAgICAgICB0ID0gdC5yZXBsYWNlKC9cXG4vLCAnJyk7XG4gICAgICAgICAgICB0ID0gdC5yZXBsYWNlKC8gKyQvZ20sICcnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldENvbXBvbmVudFN0eWxlVXJscyhwcm9wczogTm9kZU9iamVjdFtdKTogc3RyaW5nW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5zYW5pdGl6ZVVybHModGhpcy5nZXRTeW1ib2xEZXBzKHByb3BzLCAnc3R5bGVVcmxzJykpO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0Q29tcG9uZW50U3R5bGVzKHByb3BzOiBOb2RlT2JqZWN0W10pOiBzdHJpbmdbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldFN5bWJvbERlcHMocHJvcHMsICdzdHlsZXMnKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldENvbXBvbmVudE1vZHVsZUlkKHByb3BzOiBOb2RlT2JqZWN0W10pOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRTeW1ib2xEZXBzKHByb3BzLCAnbW9kdWxlSWQnKS5wb3AoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldENvbXBvbmVudENoYW5nZURldGVjdGlvbihwcm9wczogTm9kZU9iamVjdFtdKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0U3ltYm9sRGVwcyhwcm9wcywgJ2NoYW5nZURldGVjdGlvbicpLnBvcCgpO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0Q29tcG9uZW50RW5jYXBzdWxhdGlvbihwcm9wczogTm9kZU9iamVjdFtdKTogc3RyaW5nW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRTeW1ib2xEZXBzKHByb3BzLCAnZW5jYXBzdWxhdGlvbicpO1xuICAgIH1cblxuICAgIHByaXZhdGUgc2FuaXRpemVVcmxzKHVybHM6IHN0cmluZ1tdKSB7XG4gICAgICAgIHJldHVybiB1cmxzLm1hcCh1cmwgPT4gdXJsLnJlcGxhY2UoJy4vJywgJycpKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldFN5bWJvbERlcHNPYmplY3QocHJvcHM6IE5vZGVPYmplY3RbXSwgdHlwZTogc3RyaW5nLCBtdWx0aUxpbmU/OiBib29sZWFuKTogT2JqZWN0IHtcbiAgICAgICAgbGV0IGRlcHMgPSBwcm9wcy5maWx0ZXIoKG5vZGU6IE5vZGVPYmplY3QpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBub2RlLm5hbWUudGV4dCA9PT0gdHlwZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbGV0IHBhcnNlUHJvcGVydGllcyA9IChub2RlOiBOb2RlT2JqZWN0KTogT2JqZWN0ID0+IHtcbiAgICAgICAgICAgIGxldCBvYmogPSB7fTtcbiAgICAgICAgICAgIChub2RlLmluaXRpYWxpemVyLnByb3BlcnRpZXMgfHwgW10pLmZvckVhY2goKHByb3A6IE5vZGVPYmplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBvYmpbcHJvcC5uYW1lLnRleHRdID0gcHJvcC5pbml0aWFsaXplci50ZXh0O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBkZXBzLm1hcChwYXJzZVByb3BlcnRpZXMpLnBvcCgpO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0U3ltYm9sRGVwc1Jhdyhwcm9wczogTm9kZU9iamVjdFtdLCB0eXBlOiBzdHJpbmcsIG11bHRpTGluZT86IGJvb2xlYW4pOiBhbnkge1xuICAgICAgICBsZXQgZGVwcyA9IHByb3BzLmZpbHRlcigobm9kZTogTm9kZU9iamVjdCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIG5vZGUubmFtZS50ZXh0ID09PSB0eXBlO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGRlcHMgfHwgW107XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRTeW1ib2xEZXBzKHByb3BzOiBOb2RlT2JqZWN0W10sIHR5cGU6IHN0cmluZywgbXVsdGlMaW5lPzogYm9vbGVhbik6IHN0cmluZ1tdIHtcblxuICAgICAgICBsZXQgZGVwcyA9IHByb3BzLmZpbHRlcigobm9kZTogTm9kZU9iamVjdCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIG5vZGUubmFtZS50ZXh0ID09PSB0eXBlO1xuICAgICAgICB9KTtcblxuICAgICAgICBsZXQgcGFyc2VTeW1ib2xUZXh0ID0gKHRleHQ6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICAgICB0ZXh0XG4gICAgICAgICAgICBdO1xuICAgICAgICB9O1xuXG4gICAgICAgIGxldCBidWlsZElkZW50aWZpZXJOYW1lID0gKG5vZGU6IE5vZGVPYmplY3QsIG5hbWUgPSAnJykgPT4ge1xuXG4gICAgICAgICAgICBpZiAobm9kZS5leHByZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9IG5hbWUgPyBgLiR7bmFtZX1gIDogbmFtZTtcblxuICAgICAgICAgICAgICAgIGxldCBub2RlTmFtZSA9IHRoaXMudW5rbm93bjtcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5uYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVOYW1lID0gbm9kZS5uYW1lLnRleHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKG5vZGUudGV4dCkge1xuICAgICAgICAgICAgICAgICAgICBub2RlTmFtZSA9IG5vZGUudGV4dDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAobm9kZS5leHByZXNzaW9uKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUuZXhwcmVzc2lvbi50ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlTmFtZSA9IG5vZGUuZXhwcmVzc2lvbi50ZXh0O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYobm9kZS5leHByZXNzaW9uLmVsZW1lbnRzKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmV4cHJlc3Npb24ua2luZCA9PT0gdHMuU3ludGF4S2luZC5BcnJheUxpdGVyYWxFeHByZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZU5hbWUgPSBub2RlLmV4cHJlc3Npb24uZWxlbWVudHMubWFwKCBlbCA9PiBlbC50ZXh0ICkuam9pbignLCAnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlTmFtZSA9IGBbJHtub2RlTmFtZX1dYDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUua2luZCA9PT0gIHRzLlN5bnRheEtpbmQuU3ByZWFkRWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYC4uLiR7bm9kZU5hbWV9YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGAke2J1aWxkSWRlbnRpZmllck5hbWUobm9kZS5leHByZXNzaW9uLCBub2RlTmFtZSl9JHtuYW1lfWBcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGAke25vZGUudGV4dH0uJHtuYW1lfWA7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcGFyc2VQcm92aWRlckNvbmZpZ3VyYXRpb24gPSAobzogTm9kZU9iamVjdCk6IHN0cmluZyA9PiB7XG4gICAgICAgICAgICAvLyBwYXJzZSBleHByZXNzaW9ucyBzdWNoIGFzOlxuICAgICAgICAgICAgLy8geyBwcm92aWRlOiBBUFBfQkFTRV9IUkVGLCB1c2VWYWx1ZTogJy8nIH0sXG4gICAgICAgICAgICAvLyBvclxuICAgICAgICAgICAgLy8geyBwcm92aWRlOiAnRGF0ZScsIHVzZUZhY3Rvcnk6IChkMSwgZDIpID0+IG5ldyBEYXRlKCksIGRlcHM6IFsnZDEnLCAnZDInXSB9XG5cbiAgICAgICAgICAgIGxldCBfZ2VuUHJvdmlkZXJOYW1lOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICAgICAgbGV0IF9wcm92aWRlclByb3BzOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgICAgICAgICAoby5wcm9wZXJ0aWVzIHx8IFtdKS5mb3JFYWNoKChwcm9wOiBOb2RlT2JqZWN0KSA9PiB7XG5cbiAgICAgICAgICAgICAgICBsZXQgaWRlbnRpZmllciA9IHByb3AuaW5pdGlhbGl6ZXIudGV4dDtcbiAgICAgICAgICAgICAgICBpZiAocHJvcC5pbml0aWFsaXplci5raW5kID09PSB0cy5TeW50YXhLaW5kLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllciA9IGAnJHtpZGVudGlmaWVyfSdgO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGxhbWJkYSBmdW5jdGlvbiAoaS5lIHVzZUZhY3RvcnkpXG4gICAgICAgICAgICAgICAgaWYgKHByb3AuaW5pdGlhbGl6ZXIuYm9keSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgcGFyYW1zID0gKHByb3AuaW5pdGlhbGl6ZXIucGFyYW1ldGVycyB8fCA8YW55PltdKS5tYXAoKHBhcmFtczogTm9kZU9iamVjdCkgPT4gcGFyYW1zLm5hbWUudGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXIgPSBgKCR7cGFyYW1zLmpvaW4oJywgJyl9KSA9PiB7fWA7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gZmFjdG9yeSBkZXBzIGFycmF5XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAocHJvcC5pbml0aWFsaXplci5lbGVtZW50cykge1xuICAgICAgICAgICAgICAgICAgICBsZXQgZWxlbWVudHMgPSAocHJvcC5pbml0aWFsaXplci5lbGVtZW50cyB8fCBbXSkubWFwKChuOiBOb2RlT2JqZWN0KSA9PiB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU3RyaW5nTGl0ZXJhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBgJyR7bi50ZXh0fSdgO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbi50ZXh0O1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllciA9IGBbJHtlbGVtZW50cy5qb2luKCcsICcpfV1gO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIF9wcm92aWRlclByb3BzLnB1c2goW1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGkuZSBwcm92aWRlXG4gICAgICAgICAgICAgICAgICAgIHByb3AubmFtZS50ZXh0LFxuXG4gICAgICAgICAgICAgICAgICAgIC8vIGkuZSBPcGFxdWVUb2tlbiBvciAnU3RyaW5nVG9rZW4nXG4gICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXJcblxuICAgICAgICAgICAgICAgIF0uam9pbignOiAnKSk7XG5cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gYHsgJHtfcHJvdmlkZXJQcm9wcy5qb2luKCcsICcpfSB9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBwYXJzZVN5bWJvbEVsZW1lbnRzID0gKG86IE5vZGVPYmplY3QgfCBhbnkpOiBzdHJpbmcgPT4ge1xuICAgICAgICAgICAgLy8gcGFyc2UgZXhwcmVzc2lvbnMgc3VjaCBhczogQW5ndWxhckZpcmVNb2R1bGUuaW5pdGlhbGl6ZUFwcChmaXJlYmFzZUNvbmZpZylcbiAgICAgICAgICAgIGlmIChvLmFyZ3VtZW50cykge1xuICAgICAgICAgICAgICAgIGxldCBjbGFzc05hbWUgPSBidWlsZElkZW50aWZpZXJOYW1lKG8uZXhwcmVzc2lvbik7XG5cbiAgICAgICAgICAgICAgICAvLyBmdW5jdGlvbiBhcmd1bWVudHMgY291bGQgYmUgcmVhbGx5IGNvbXBsZXhlLiBUaGVyZSBhcmUgc29cbiAgICAgICAgICAgICAgICAvLyBtYW55IHVzZSBjYXNlcyB0aGF0IHdlIGNhbid0IGhhbmRsZS4gSnVzdCBwcmludCBcImFyZ3NcIiB0byBpbmRpY2F0ZVxuICAgICAgICAgICAgICAgIC8vIHRoYXQgd2UgaGF2ZSBhcmd1bWVudHMuXG5cbiAgICAgICAgICAgICAgICBsZXQgZnVuY3Rpb25BcmdzID0gby5hcmd1bWVudHMubGVuZ3RoID4gMCA/ICdhcmdzJyA6ICcnO1xuICAgICAgICAgICAgICAgIGxldCB0ZXh0ID0gYCR7Y2xhc3NOYW1lfSgke2Z1bmN0aW9uQXJnc30pYDtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGV4dDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcGFyc2UgZXhwcmVzc2lvbnMgc3VjaCBhczogU2hhcmVkLk1vZHVsZVxuICAgICAgICAgICAgZWxzZSBpZiAoby5leHByZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgbGV0IGlkZW50aWZpZXIgPSBidWlsZElkZW50aWZpZXJOYW1lKG8pO1xuICAgICAgICAgICAgICAgIHJldHVybiBpZGVudGlmaWVyO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gby50ZXh0ID8gby50ZXh0IDogcGFyc2VQcm92aWRlckNvbmZpZ3VyYXRpb24obyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgbGV0IHBhcnNlU3ltYm9scyA9IChub2RlOiBOb2RlT2JqZWN0KTogc3RyaW5nW10gPT4ge1xuXG4gICAgICAgICAgICBsZXQgdGV4dCA9IG5vZGUuaW5pdGlhbGl6ZXIudGV4dDtcbiAgICAgICAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlU3ltYm9sVGV4dCh0ZXh0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZWxzZSBpZiAobm9kZS5pbml0aWFsaXplci5leHByZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgbGV0IGlkZW50aWZpZXIgPSBwYXJzZVN5bWJvbEVsZW1lbnRzKG5vZGUuaW5pdGlhbGl6ZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXJcbiAgICAgICAgICAgICAgICBdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBlbHNlIGlmIChub2RlLmluaXRpYWxpemVyLmVsZW1lbnRzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGUuaW5pdGlhbGl6ZXIuZWxlbWVudHMubWFwKHBhcnNlU3ltYm9sRWxlbWVudHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBkZXBzLm1hcChwYXJzZVN5bWJvbHMpLnBvcCgpIHx8IFtdO1xuICAgIH1cblxuICAgIHByaXZhdGUgZmluZENvbXBvbmVudFNlbGVjdG9yQnlOYW1lKG5hbWU6IHN0cmluZykge1xuICAgICAgICByZXR1cm4gdGhpcy5fX2NhY2hlW25hbWVdO1xuICAgIH1cblxufVxuIiwiZXhwb3J0IGZ1bmN0aW9uIHByb21pc2VTZXF1ZW50aWFsKHByb21pc2VzKSB7XG5cbiAgICBpZiAoIUFycmF5LmlzQXJyYXkocHJvbWlzZXMpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmlyc3QgYXJndW1lbnQgbmVlZCB0byBiZSBhbiBhcnJheSBvZiBQcm9taXNlcycpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cbiAgICAgICAgbGV0IGNvdW50ID0gMDtcbiAgICAgICAgbGV0IHJlc3VsdHMgPSBbXTtcblxuICAgICAgICBjb25zdCBpdGVyYXRlZUZ1bmMgPSAocHJldmlvdXNQcm9taXNlLCBjdXJyZW50UHJvbWlzZSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHByZXZpb3VzUHJvbWlzZVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY291bnQrKyAhPT0gMCkgcmVzdWx0cyA9IHJlc3VsdHMuY29uY2F0KHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjdXJyZW50UHJvbWlzZShyZXN1bHQsIHJlc3VsdHMsIGNvdW50KTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByb21pc2VzID0gcHJvbWlzZXMuY29uY2F0KCgpID0+IFByb21pc2UucmVzb2x2ZSgpKTtcblxuICAgICAgICBwcm9taXNlc1xuICAgICAgICAgICAgLnJlZHVjZShpdGVyYXRlZUZ1bmMsIFByb21pc2UucmVzb2x2ZShmYWxzZSkpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihyZXMpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdHMpO1xuICAgICAgICAgICAgfSlcblxuICAgIH0pO1xufTtcbiIsImltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIExpdmVTZXJ2ZXIgZnJvbSAnbGl2ZS1zZXJ2ZXInO1xuaW1wb3J0ICogYXMgU2hlbGxqcyBmcm9tICdzaGVsbGpzJztcblxuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnLi4vbG9nZ2VyJztcbmltcG9ydCB7IEh0bWxFbmdpbmUgfSBmcm9tICcuL2VuZ2luZXMvaHRtbC5lbmdpbmUnO1xuaW1wb3J0IHsgTWFya2Rvd25FbmdpbmUgfSBmcm9tICcuL2VuZ2luZXMvbWFya2Rvd24uZW5naW5lJztcbmltcG9ydCB7IEZpbGVFbmdpbmUgfSBmcm9tICcuL2VuZ2luZXMvZmlsZS5lbmdpbmUnO1xuaW1wb3J0IHsgQ29uZmlndXJhdGlvbiB9IGZyb20gJy4vY29uZmlndXJhdGlvbic7XG5pbXBvcnQgeyBDb25maWd1cmF0aW9uSW50ZXJmYWNlIH0gZnJvbSAnLi9pbnRlcmZhY2VzL2NvbmZpZ3VyYXRpb24uaW50ZXJmYWNlJztcbmltcG9ydCB7ICRkZXBlbmRlbmNpZXNFbmdpbmUgfSBmcm9tICcuL2VuZ2luZXMvZGVwZW5kZW5jaWVzLmVuZ2luZSc7XG5pbXBvcnQgeyBOZ2RFbmdpbmUgfSBmcm9tICcuL2VuZ2luZXMvbmdkLmVuZ2luZSc7XG5pbXBvcnQgeyBTZWFyY2hFbmdpbmUgfSBmcm9tICcuL2VuZ2luZXMvc2VhcmNoLmVuZ2luZSc7XG5pbXBvcnQgeyBEZXBlbmRlbmNpZXMgfSBmcm9tICcuL2NvbXBpbGVyL2RlcGVuZGVuY2llcyc7XG5pbXBvcnQgeyBSb3V0ZXJQYXJzZXIgfSBmcm9tICcuLi91dGlscy9yb3V0ZXIucGFyc2VyJztcblxuaW1wb3J0IHsgQ09NUE9ET0NfREVGQVVMVFMgfSBmcm9tICcuLi91dGlscy9kZWZhdWx0cyc7XG5cbmltcG9ydCB7IGdldEFuZ3VsYXJWZXJzaW9uT2ZQcm9qZWN0IH0gZnJvbSAnLi4vdXRpbHMvYW5ndWxhci12ZXJzaW9uJztcblxuaW1wb3J0IHsgY2xlYW5OYW1lV2l0aG91dFNwYWNlQW5kVG9Mb3dlckNhc2UsIGZpbmRNYWluU291cmNlRm9sZGVyIH0gZnJvbSAnLi4vdXRpbGl0aWVzJztcblxuaW1wb3J0IHsgcHJvbWlzZVNlcXVlbnRpYWwgfSBmcm9tICcuLi91dGlscy9wcm9taXNlLXNlcXVlbnRpYWwnO1xuXG5jb25zdCBnbG9iOiBhbnkgPSByZXF1aXJlKCdnbG9iJyksXG4gICAgICBtYXJrZWQgPSByZXF1aXJlKCdtYXJrZWQnKSxcbiAgICAgIGNob2tpZGFyID0gcmVxdWlyZSgnY2hva2lkYXInKTtcblxubGV0IHBrZyA9IHJlcXVpcmUoJy4uL3BhY2thZ2UuanNvbicpLFxuICAgIGN3ZCA9IHByb2Nlc3MuY3dkKCksXG4gICAgJGh0bWxlbmdpbmUgPSBuZXcgSHRtbEVuZ2luZSgpLFxuICAgICRmaWxlZW5naW5lID0gbmV3IEZpbGVFbmdpbmUoKSxcbiAgICAkbWFya2Rvd25lbmdpbmUgPSBuZXcgTWFya2Rvd25FbmdpbmUoKSxcbiAgICAkbmdkZW5naW5lID0gbmV3IE5nZEVuZ2luZSgpLFxuICAgICRzZWFyY2hFbmdpbmUgPSBuZXcgU2VhcmNoRW5naW5lKCksXG4gICAgc3RhcnRUaW1lID0gbmV3IERhdGUoKVxuXG5leHBvcnQgY2xhc3MgQXBwbGljYXRpb24ge1xuICAgIC8qKlxuICAgICAqIEZpbGVzIHByb2Nlc3NlZCBkdXJpbmcgaW5pdGlhbCBzY2FubmluZ1xuICAgICAqL1xuICAgIGZpbGVzOiBBcnJheTxzdHJpbmc+O1xuICAgIC8qKlxuICAgICAqIEZpbGVzIHByb2Nlc3NlZCBkdXJpbmcgd2F0Y2ggc2Nhbm5pbmdcbiAgICAgKi9cbiAgICB1cGRhdGVkRmlsZXM6IEFycmF5PHN0cmluZz47XG4gICAgLyoqXG4gICAgICogQ29tcG9kb2MgY29uZmlndXJhdGlvbiBsb2NhbCByZWZlcmVuY2VcbiAgICAgKi9cbiAgICBjb25maWd1cmF0aW9uOkNvbmZpZ3VyYXRpb25JbnRlcmZhY2U7XG4gICAgLyoqXG4gICAgICogQm9vbGVhbiBmb3Igd2F0Y2hpbmcgc3RhdHVzXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNXYXRjaGluZzogYm9vbGVhbiA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgbmV3IGNvbXBvZG9jIGFwcGxpY2F0aW9uIGluc3RhbmNlLlxuICAgICAqXG4gICAgICogQHBhcmFtIG9wdGlvbnMgQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG9wdGlvbnMgdGhhdCBzaG91bGQgYmUgdXNlZC5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zPzpPYmplY3QpIHtcbiAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uID0gQ29uZmlndXJhdGlvbi5nZXRJbnN0YW5jZSgpO1xuXG4gICAgICAgIGZvciAobGV0IG9wdGlvbiBpbiBvcHRpb25zICkge1xuICAgICAgICAgICAgaWYodHlwZW9mIHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YVtvcHRpb25dICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YVtvcHRpb25dID0gb3B0aW9uc1tvcHRpb25dO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU3RhcnQgY29tcG9kb2MgcHJvY2Vzc1xuICAgICAqL1xuICAgIHByb3RlY3RlZCBnZW5lcmF0ZSgpIHtcbiAgICAgICAgJGh0bWxlbmdpbmUuaW5pdCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5wcm9jZXNzUGFja2FnZUpzb24oKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU3RhcnQgY29tcG9kb2MgZG9jdW1lbnRhdGlvbiBjb3ZlcmFnZVxuICAgICAqL1xuICAgIHByb3RlY3RlZCB0ZXN0Q292ZXJhZ2UoKSB7XG4gICAgICAgIHRoaXMuZ2V0RGVwZW5kZW5jaWVzRGF0YSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFN0b3JlIGZpbGVzIGZvciBpbml0aWFsIHByb2Nlc3NpbmdcbiAgICAgKiBAcGFyYW0gIHtBcnJheTxzdHJpbmc+fSBmaWxlcyBGaWxlcyBmb3VuZCBkdXJpbmcgc291cmNlIGZvbGRlciBhbmQgdHNjb25maWcgc2NhblxuICAgICAqL1xuICAgIHNldEZpbGVzKGZpbGVzOkFycmF5PHN0cmluZz4pIHtcbiAgICAgICAgdGhpcy5maWxlcyA9IGZpbGVzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFN0b3JlIGZpbGVzIGZvciB3YXRjaCBwcm9jZXNzaW5nXG4gICAgICogQHBhcmFtICB7QXJyYXk8c3RyaW5nPn0gZmlsZXMgRmlsZXMgZm91bmQgZHVyaW5nIHNvdXJjZSBmb2xkZXIgYW5kIHRzY29uZmlnIHNjYW5cbiAgICAgKi9cbiAgICBzZXRVcGRhdGVkRmlsZXMoZmlsZXM6QXJyYXk8c3RyaW5nPikge1xuICAgICAgICB0aGlzLnVwZGF0ZWRGaWxlcyA9IGZpbGVzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybiBhIGJvb2xlYW4gaW5kaWNhdGluZyBwcmVzZW5jZSBvZiBvbmUgVHlwZVNjcmlwdCBmaWxlIGluIHVwZGF0ZWRGaWxlcyBsaXN0XG4gICAgICogQHJldHVybiB7Ym9vbGVhbn0gUmVzdWx0IG9mIHNjYW5cbiAgICAgKi9cbiAgICBoYXNXYXRjaGVkRmlsZXNUU0ZpbGVzKCk6IGJvb2xlYW4ge1xuICAgICAgICBsZXQgcmVzdWx0ID0gZmFsc2U7XG5cbiAgICAgICAgXy5mb3JFYWNoKHRoaXMudXBkYXRlZEZpbGVzLCAoZmlsZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHBhdGguZXh0bmFtZShmaWxlKSA9PT0gJy50cycpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2xlYXIgZmlsZXMgZm9yIHdhdGNoIHByb2Nlc3NpbmdcbiAgICAgKi9cbiAgICBjbGVhclVwZGF0ZWRGaWxlcygpIHtcbiAgICAgICAgdGhpcy51cGRhdGVkRmlsZXMgPSBbXTtcbiAgICB9XG5cbiAgICBwcm9jZXNzUGFja2FnZUpzb24oKSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKCcnKTtcbiAgICAgICAgbG9nZ2VyLmluZm8oJ1NlYXJjaGluZyBwYWNrYWdlLmpzb24gZmlsZScpO1xuICAgICAgICAkZmlsZWVuZ2luZS5nZXQoJ3BhY2thZ2UuanNvbicpLnRoZW4oKHBhY2thZ2VEYXRhKSA9PiB7XG4gICAgICAgICAgICBsZXQgcGFyc2VkRGF0YSA9IEpTT04ucGFyc2UocGFja2FnZURhdGEpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwYXJzZWREYXRhLm5hbWUgIT09ICd1bmRlZmluZWQnICYmIHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5kb2N1bWVudGF0aW9uTWFpbk5hbWUgPT09IENPTVBPRE9DX0RFRkFVTFRTLnRpdGxlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmRvY3VtZW50YXRpb25NYWluTmFtZSA9IHBhcnNlZERhdGEubmFtZSArICcgZG9jdW1lbnRhdGlvbic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIHBhcnNlZERhdGEuZGVzY3JpcHRpb24gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmRvY3VtZW50YXRpb25NYWluRGVzY3JpcHRpb24gPSBwYXJzZWREYXRhLmRlc2NyaXB0aW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmFuZ3VsYXJWZXJzaW9uID0gZ2V0QW5ndWxhclZlcnNpb25PZlByb2plY3QocGFyc2VkRGF0YSk7XG4gICAgICAgICAgICBsb2dnZXIuaW5mbygncGFja2FnZS5qc29uIGZpbGUgZm91bmQnKTtcbiAgICAgICAgICAgIHRoaXMucHJvY2Vzc01hcmtkb3duKCk7XG4gICAgICAgIH0sIChlcnJvck1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihlcnJvck1lc3NhZ2UpO1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKCdDb250aW51aW5nIHdpdGhvdXQgcGFja2FnZS5qc29uIGZpbGUnKTtcbiAgICAgICAgICAgIHRoaXMucHJvY2Vzc01hcmtkb3duKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByb2Nlc3NNYXJrZG93bigpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oJycpO1xuICAgICAgICBsb2dnZXIuaW5mbygnU2VhcmNoaW5nIFJFQURNRS5tZCBmaWxlJyk7XG4gICAgICAgICRtYXJrZG93bmVuZ2luZS5nZXRSZWFkbWVGaWxlKCkudGhlbigocmVhZG1lRGF0YTogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmNvbmZpZ3VyYXRpb24uYWRkUGFnZSh7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2luZGV4JyxcbiAgICAgICAgICAgICAgICBjb250ZXh0OiAncmVhZG1lJyxcbiAgICAgICAgICAgICAgICBkZXB0aDogMCxcbiAgICAgICAgICAgICAgICBwYWdlVHlwZTogQ09NUE9ET0NfREVGQVVMVFMuUEFHRV9UWVBFUy5ST09UXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5hZGRQYWdlKHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnb3ZlcnZpZXcnLFxuICAgICAgICAgICAgICAgIGNvbnRleHQ6ICdvdmVydmlldycsXG4gICAgICAgICAgICAgICAgcGFnZVR5cGU6IENPTVBPRE9DX0RFRkFVTFRTLlBBR0VfVFlQRVMuUk9PVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEucmVhZG1lID0gcmVhZG1lRGF0YTtcbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdSRUFETUUubWQgZmlsZSBmb3VuZCcpO1xuICAgICAgICAgICAgdGhpcy5nZXREZXBlbmRlbmNpZXNEYXRhKCk7XG4gICAgICAgIH0sIChlcnJvck1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihlcnJvck1lc3NhZ2UpO1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKCdDb250aW51aW5nIHdpdGhvdXQgUkVBRE1FLm1kIGZpbGUnKTtcbiAgICAgICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5hZGRQYWdlKHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnaW5kZXgnLFxuICAgICAgICAgICAgICAgIGNvbnRleHQ6ICdvdmVydmlldydcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5nZXREZXBlbmRlbmNpZXNEYXRhKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBkZXBlbmRlbmN5IGRhdGEgZm9yIHNtYWxsIGdyb3VwIG9mIHVwZGF0ZWQgZmlsZXMgZHVyaW5nIHdhdGNoIHByb2Nlc3NcbiAgICAgKi9cbiAgICBnZXRNaWNyb0RlcGVuZGVuY2llc0RhdGEoKSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKCcnKTtcbiAgICAgICAgbG9nZ2VyLmluZm8oJ0dldCBkaWZmIGRlcGVuZGVuY2llcyBkYXRhJyk7XG4gICAgICAgIGxldCBjcmF3bGVyID0gbmV3IERlcGVuZGVuY2llcyhcbiAgICAgICAgICB0aGlzLnVwZGF0ZWRGaWxlcywge1xuICAgICAgICAgICAgdHNjb25maWdEaXJlY3Rvcnk6IHBhdGguZGlybmFtZSh0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEudHNjb25maWcpXG4gICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIGxldCBkZXBlbmRlbmNpZXNEYXRhID0gY3Jhd2xlci5nZXREZXBlbmRlbmNpZXMoKTtcblxuICAgICAgICAkZGVwZW5kZW5jaWVzRW5naW5lLnVwZGF0ZShkZXBlbmRlbmNpZXNEYXRhKTtcblxuICAgICAgICB0aGlzLnByZXBhcmVKdXN0QUZld1RoaW5ncyhkZXBlbmRlbmNpZXNEYXRhKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZWJ1aWxkIGV4dGVybmFsIGRvY3VtZW50YXRpb24gZHVyaW5nIHdhdGNoIHByb2Nlc3NcbiAgICAgKi9cbiAgICByZWJ1aWxkRXh0ZXJuYWxEb2N1bWVudGF0aW9uKCkge1xuICAgICAgICBsb2dnZXIuaW5mbygnJyk7XG4gICAgICAgIGxvZ2dlci5pbmZvKCdSZWJ1aWxkIGV4dGVybmFsIGRvY3VtZW50YXRpb24nKTtcblxuICAgICAgICBsZXQgYWN0aW9ucyA9IFtdO1xuXG4gICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5yZXNldEFkZGl0aW9uYWxQYWdlcygpO1xuXG4gICAgICAgIGlmICh0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuaW5jbHVkZXMgIT09ICcnKSB7XG4gICAgICAgICAgICBhY3Rpb25zLnB1c2goKCkgPT4geyByZXR1cm4gdGhpcy5wcmVwYXJlRXh0ZXJuYWxJbmNsdWRlcygpOyB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByb21pc2VTZXF1ZW50aWFsKGFjdGlvbnMpXG4gICAgICAgICAgICAudGhlbihyZXMgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1BhZ2VzKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhclVwZGF0ZWRGaWxlcygpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaChlcnJvck1lc3NhZ2UgPT4ge1xuICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihlcnJvck1lc3NhZ2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZ2V0RGVwZW5kZW5jaWVzRGF0YSgpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oJycpO1xuICAgICAgICBsb2dnZXIuaW5mbygnR2V0IGRlcGVuZGVuY2llcyBkYXRhJyk7XG5cbiAgICAgICAgbGV0IGNyYXdsZXIgPSBuZXcgRGVwZW5kZW5jaWVzKFxuICAgICAgICAgIHRoaXMuZmlsZXMsIHtcbiAgICAgICAgICAgIHRzY29uZmlnRGlyZWN0b3J5OiBwYXRoLmRpcm5hbWUodGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLnRzY29uZmlnKVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICAvL3NldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgbGV0IGRlcGVuZGVuY2llc0RhdGEgPSBjcmF3bGVyLmdldERlcGVuZGVuY2llcygpO1xuXG4gICAgICAgICAgICAkZGVwZW5kZW5jaWVzRW5naW5lLmluaXQoZGVwZW5kZW5jaWVzRGF0YSk7XG5cbiAgICAgICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5yb3V0ZXNMZW5ndGggPSBSb3V0ZXJQYXJzZXIucm91dGVzTGVuZ3RoKCk7XG5cbiAgICAgICAgICAgIHRoaXMucHJlcGFyZUV2ZXJ5dGhpbmcoKTtcbiAgICAgICAgLy99LCA1MDAwKTtcbiAgICB9XG5cbiAgICBwcmVwYXJlSnVzdEFGZXdUaGluZ3MoZGlmZkNyYXdsZWREYXRhKSB7XG4gICAgICAgIGxldCBhY3Rpb25zID0gW107XG5cbiAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLnJlc2V0UGFnZXMoKTtcblxuICAgICAgICBhY3Rpb25zLnB1c2goKCkgPT4geyByZXR1cm4gdGhpcy5wcmVwYXJlUm91dGVzKCk7IH0pO1xuXG4gICAgICAgIGlmIChkaWZmQ3Jhd2xlZERhdGEubW9kdWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBhY3Rpb25zLnB1c2goKCkgPT4geyByZXR1cm4gdGhpcy5wcmVwYXJlTW9kdWxlcyhkaWZmQ3Jhd2xlZERhdGEubW9kdWxlcyk7IH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkaWZmQ3Jhd2xlZERhdGEuY29tcG9uZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBhY3Rpb25zLnB1c2goKCkgPT4geyByZXR1cm4gdGhpcy5wcmVwYXJlQ29tcG9uZW50cyhkaWZmQ3Jhd2xlZERhdGEuY29tcG9uZW50cyk7IH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRpZmZDcmF3bGVkRGF0YS5kaXJlY3RpdmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGFjdGlvbnMucHVzaCgoKSA9PiB7IHJldHVybiB0aGlzLnByZXBhcmVEaXJlY3RpdmVzKGRpZmZDcmF3bGVkRGF0YS5kaXJlY3RpdmVzKTsgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGlmZkNyYXdsZWREYXRhLmluamVjdGFibGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGFjdGlvbnMucHVzaCgoKSA9PiB7IHJldHVybiB0aGlzLnByZXBhcmVJbmplY3RhYmxlcyhkaWZmQ3Jhd2xlZERhdGEuaW5qZWN0YWJsZXMpOyB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkaWZmQ3Jhd2xlZERhdGEucGlwZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgYWN0aW9ucy5wdXNoKCgpID0+IHsgcmV0dXJuIHRoaXMucHJlcGFyZVBpcGVzKGRpZmZDcmF3bGVkRGF0YS5waXBlcyk7IH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRpZmZDcmF3bGVkRGF0YS5jbGFzc2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGFjdGlvbnMucHVzaCgoKSA9PiB7IHJldHVybiB0aGlzLnByZXBhcmVDbGFzc2VzKGRpZmZDcmF3bGVkRGF0YS5jbGFzc2VzKTsgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGlmZkNyYXdsZWREYXRhLmludGVyZmFjZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgYWN0aW9ucy5wdXNoKCgpID0+IHsgcmV0dXJuIHRoaXMucHJlcGFyZUludGVyZmFjZXMoZGlmZkNyYXdsZWREYXRhLmludGVyZmFjZXMpOyB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkaWZmQ3Jhd2xlZERhdGEubWlzY2VsbGFuZW91cy52YXJpYWJsZXMubGVuZ3RoID4gMCB8fFxuICAgICAgICAgICAgZGlmZkNyYXdsZWREYXRhLm1pc2NlbGxhbmVvdXMuZnVuY3Rpb25zLmxlbmd0aCA+IDAgfHxcbiAgICAgICAgICAgIGRpZmZDcmF3bGVkRGF0YS5taXNjZWxsYW5lb3VzLnR5cGVhbGlhc2VzLmxlbmd0aCA+IDAgfHxcbiAgICAgICAgICAgIGRpZmZDcmF3bGVkRGF0YS5taXNjZWxsYW5lb3VzLmVudW1lcmF0aW9ucy5sZW5ndGggPiAwIHx8XG4gICAgICAgICAgICBkaWZmQ3Jhd2xlZERhdGEubWlzY2VsbGFuZW91cy50eXBlcy5sZW5ndGggPiAwICkge1xuICAgICAgICAgICAgYWN0aW9ucy5wdXNoKCgpID0+IHsgcmV0dXJuIHRoaXMucHJlcGFyZU1pc2NlbGxhbmVvdXMoZGlmZkNyYXdsZWREYXRhLm1pc2NlbGxhbmVvdXMpOyB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmRpc2FibGVDb3ZlcmFnZSkge1xuICAgICAgICAgICAgYWN0aW9ucy5wdXNoKCgpID0+IHsgcmV0dXJuIHRoaXMucHJlcGFyZUNvdmVyYWdlKCk7IH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJvbWlzZVNlcXVlbnRpYWwoYWN0aW9ucylcbiAgICAgICAgICAgIC50aGVuKHJlcyA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzR3JhcGhzKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhclVwZGF0ZWRGaWxlcygpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaChlcnJvck1lc3NhZ2UgPT4ge1xuICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihlcnJvck1lc3NhZ2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJlcGFyZUV2ZXJ5dGhpbmcoKSB7XG4gICAgICAgIGxldCBhY3Rpb25zID0gW107XG5cbiAgICAgICAgYWN0aW9ucy5wdXNoKCgpID0+IHsgcmV0dXJuIHRoaXMucHJlcGFyZU1vZHVsZXMoKTsgfSk7XG4gICAgICAgIGFjdGlvbnMucHVzaCgoKSA9PiB7IHJldHVybiB0aGlzLnByZXBhcmVDb21wb25lbnRzKCk7IH0pO1xuXG4gICAgICAgIGlmICgkZGVwZW5kZW5jaWVzRW5naW5lLmRpcmVjdGl2ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgYWN0aW9ucy5wdXNoKCgpID0+IHsgcmV0dXJuIHRoaXMucHJlcGFyZURpcmVjdGl2ZXMoKTsgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJGRlcGVuZGVuY2llc0VuZ2luZS5pbmplY3RhYmxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBhY3Rpb25zLnB1c2goKCkgPT4geyByZXR1cm4gdGhpcy5wcmVwYXJlSW5qZWN0YWJsZXMoKTsgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJGRlcGVuZGVuY2llc0VuZ2luZS5yb3V0ZXMgJiYgJGRlcGVuZGVuY2llc0VuZ2luZS5yb3V0ZXMuY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgYWN0aW9ucy5wdXNoKCgpID0+IHsgcmV0dXJuIHRoaXMucHJlcGFyZVJvdXRlcygpOyB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgkZGVwZW5kZW5jaWVzRW5naW5lLnBpcGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGFjdGlvbnMucHVzaCgoKSA9PiB7IHJldHVybiB0aGlzLnByZXBhcmVQaXBlcygpOyB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgkZGVwZW5kZW5jaWVzRW5naW5lLmNsYXNzZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgYWN0aW9ucy5wdXNoKCgpID0+IHsgcmV0dXJuIHRoaXMucHJlcGFyZUNsYXNzZXMoKTsgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJGRlcGVuZGVuY2llc0VuZ2luZS5pbnRlcmZhY2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGFjdGlvbnMucHVzaCgoKSA9PiB7IHJldHVybiB0aGlzLnByZXBhcmVJbnRlcmZhY2VzKCk7IH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCRkZXBlbmRlbmNpZXNFbmdpbmUubWlzY2VsbGFuZW91cy52YXJpYWJsZXMubGVuZ3RoID4gMCB8fFxuICAgICAgICAgICAgJGRlcGVuZGVuY2llc0VuZ2luZS5taXNjZWxsYW5lb3VzLmZ1bmN0aW9ucy5sZW5ndGggPiAwIHx8XG4gICAgICAgICAgICAkZGVwZW5kZW5jaWVzRW5naW5lLm1pc2NlbGxhbmVvdXMudHlwZWFsaWFzZXMubGVuZ3RoID4gMCB8fFxuICAgICAgICAgICAgJGRlcGVuZGVuY2llc0VuZ2luZS5taXNjZWxsYW5lb3VzLmVudW1lcmF0aW9ucy5sZW5ndGggPiAwIHx8XG4gICAgICAgICAgICAkZGVwZW5kZW5jaWVzRW5naW5lLm1pc2NlbGxhbmVvdXMudHlwZXMubGVuZ3RoID4gMCApIHtcbiAgICAgICAgICAgIGFjdGlvbnMucHVzaCgoKSA9PiB7IHJldHVybiB0aGlzLnByZXBhcmVNaXNjZWxsYW5lb3VzKCk7IH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuZGlzYWJsZUNvdmVyYWdlKSB7XG4gICAgICAgICAgICBhY3Rpb25zLnB1c2goKCkgPT4geyByZXR1cm4gdGhpcy5wcmVwYXJlQ292ZXJhZ2UoKTsgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmluY2x1ZGVzICE9PSAnJykge1xuICAgICAgICAgICAgYWN0aW9ucy5wdXNoKCgpID0+IHsgcmV0dXJuIHRoaXMucHJlcGFyZUV4dGVybmFsSW5jbHVkZXMoKTsgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBwcm9taXNlU2VxdWVudGlhbChhY3Rpb25zKVxuICAgICAgICAgICAgLnRoZW4ocmVzID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NHcmFwaHMoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goZXJyb3JNZXNzYWdlID0+IHtcbiAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByZXBhcmVFeHRlcm5hbEluY2x1ZGVzKCkge1xuICAgICAgICBsb2dnZXIuaW5mbygnJyk7XG4gICAgICAgIGxvZ2dlci5pbmZvKCdBZGRpbmcgZXh0ZXJuYWwgbWFya2Rvd24gZmlsZXMnKTtcbiAgICAgICAgLy9TY2FuIGluY2x1ZGUgZm9sZGVyIGZvciBmaWxlcyBkZXRhaWxlZCBpbiBzdW1tYXJ5Lmpzb25cbiAgICAgICAgLy9Gb3IgZWFjaCBmaWxlLCBhZGQgdG8gdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmFkZGl0aW9uYWxQYWdlc1xuICAgICAgICAvL0VhY2ggZmlsZSB3aWxsIGJlIGNvbnZlcnRlZCB0byBodG1sIHBhZ2UsIGluc2lkZSBDT01QT0RPQ19ERUZBVUxUUy5hZGRpdGlvbmFsRW50cnlQYXRoXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICRmaWxlZW5naW5lLmdldCh0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuaW5jbHVkZXMgKyBwYXRoLnNlcCArICdzdW1tYXJ5Lmpzb24nKS50aGVuKChzdW1tYXJ5RGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ0FkZGl0aW9uYWwgZG9jdW1lbnRhdGlvbjogc3VtbWFyeS5qc29uIGZpbGUgZm91bmQnKTtcblxuICAgICAgICAgICAgICAgbGV0IHBhcnNlZFN1bW1hcnlEYXRhID0gSlNPTi5wYXJzZShzdW1tYXJ5RGF0YSksXG4gICAgICAgICAgICAgICAgICAgaSA9IDAsXG4gICAgICAgICAgICAgICAgICAgbGVuID0gcGFyc2VkU3VtbWFyeURhdGEubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgIGxvb3AgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgaWYoIGkgPD0gbGVuLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJG1hcmtkb3duZW5naW5lLmdldCh0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuaW5jbHVkZXMgKyBwYXRoLnNlcCArIHBhcnNlZFN1bW1hcnlEYXRhW2ldLmZpbGUpLnRoZW4oKG1hcmtlZERhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5hZGRBZGRpdGlvbmFsUGFnZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogcGFyc2VkU3VtbWFyeURhdGFbaV0udGl0bGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZW5hbWU6IGNsZWFuTmFtZVdpdGhvdXRTcGFjZUFuZFRvTG93ZXJDYXNlKHBhcnNlZFN1bW1hcnlEYXRhW2ldLnRpdGxlKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0OiAnYWRkaXRpb25hbC1wYWdlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuaW5jbHVkZXNGb2xkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkaXRpb25hbFBhZ2U6IG1hcmtlZERhdGEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVwdGg6IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFnZVR5cGU6IENPTVBPRE9DX0RFRkFVTFRTLlBBR0VfVFlQRVMuSU5URVJOQUxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyc2VkU3VtbWFyeURhdGFbaV0uY2hpbGRyZW4gJiYgcGFyc2VkU3VtbWFyeURhdGFbaV0uY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBqID0gMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVuZyA9IHBhcnNlZFN1bW1hcnlEYXRhW2ldLmNoaWxkcmVuLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvb3BDaGlsZCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiggaiA8PSBsZW5nLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJG1hcmtkb3duZW5naW5lLmdldCh0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuaW5jbHVkZXMgKyBwYXRoLnNlcCArIHBhcnNlZFN1bW1hcnlEYXRhW2ldLmNoaWxkcmVuW2pdLmZpbGUpLnRoZW4oKG1hcmtlZERhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5hZGRBZGRpdGlvbmFsUGFnZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogcGFyc2VkU3VtbWFyeURhdGFbaV0uY2hpbGRyZW5bal0udGl0bGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZW5hbWU6IGNsZWFuTmFtZVdpdGhvdXRTcGFjZUFuZFRvTG93ZXJDYXNlKHBhcnNlZFN1bW1hcnlEYXRhW2ldLmNoaWxkcmVuW2pdLnRpdGxlKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0OiAnYWRkaXRpb25hbC1wYWdlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuaW5jbHVkZXNGb2xkZXIgKyAnLycgKyBjbGVhbk5hbWVXaXRob3V0U3BhY2VBbmRUb0xvd2VyQ2FzZShwYXJzZWRTdW1tYXJ5RGF0YVtpXS50aXRsZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkaXRpb25hbFBhZ2U6IG1hcmtlZERhdGEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVwdGg6IDIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFnZVR5cGU6IENPTVBPRE9DX0RFRkFVTFRTLlBBR0VfVFlQRVMuSU5URVJOQUxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaisrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9vcENoaWxkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9vcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvb3BDaGlsZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9vcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0sIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgbG9vcCgpO1xuICAgICAgICAgICB9LCAoZXJyb3JNZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgICAgICAgIHJlamVjdCgnRXJyb3IgZHVyaW5nIEFkZGl0aW9uYWwgZG9jdW1lbnRhdGlvbiBnZW5lcmF0aW9uJyk7XG4gICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcmVwYXJlTW9kdWxlcyhzb21lTW9kdWxlcz8pIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oJycpO1xuICAgICAgICBsb2dnZXIuaW5mbygnUHJlcGFyZSBtb2R1bGVzJyk7XG4gICAgICAgIGxldCBpID0gMCxcbiAgICAgICAgICAgIF9tb2R1bGVzID0gKHNvbWVNb2R1bGVzKSA/IHNvbWVNb2R1bGVzIDogJGRlcGVuZGVuY2llc0VuZ2luZS5nZXRNb2R1bGVzKCk7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblxuICAgICAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLm1vZHVsZXMgPSBfbW9kdWxlcy5tYXAobmdNb2R1bGUgPT4ge1xuICAgICAgICAgICAgICAgIFsnZGVjbGFyYXRpb25zJywgJ2Jvb3RzdHJhcCcsICdpbXBvcnRzJywgJ2V4cG9ydHMnXS5mb3JFYWNoKG1ldGFkYXRhVHlwZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIG5nTW9kdWxlW21ldGFkYXRhVHlwZV0gPSBuZ01vZHVsZVttZXRhZGF0YVR5cGVdLmZpbHRlcihtZXRhRGF0YUl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChtZXRhRGF0YUl0ZW0udHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2RpcmVjdGl2ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAkZGVwZW5kZW5jaWVzRW5naW5lLmdldERpcmVjdGl2ZXMoKS5zb21lKGRpcmVjdGl2ZSA9PiBkaXJlY3RpdmUubmFtZSA9PT0gbWV0YURhdGFJdGVtLm5hbWUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnY29tcG9uZW50JzpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRkZXBlbmRlbmNpZXNFbmdpbmUuZ2V0Q29tcG9uZW50cygpLnNvbWUoY29tcG9uZW50ID0+IGNvbXBvbmVudC5uYW1lID09PSBtZXRhRGF0YUl0ZW0ubmFtZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdtb2R1bGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJGRlcGVuZGVuY2llc0VuZ2luZS5nZXRNb2R1bGVzKCkuc29tZShtb2R1bGUgPT4gbW9kdWxlLm5hbWUgPT09IG1ldGFEYXRhSXRlbS5uYW1lKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3BpcGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJGRlcGVuZGVuY2llc0VuZ2luZS5nZXRQaXBlcygpLnNvbWUocGlwZSA9PiBwaXBlLm5hbWUgPT09IG1ldGFEYXRhSXRlbS5uYW1lKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBuZ01vZHVsZS5wcm92aWRlcnMgPSBuZ01vZHVsZS5wcm92aWRlcnMuZmlsdGVyKHByb3ZpZGVyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRkZXBlbmRlbmNpZXNFbmdpbmUuZ2V0SW5qZWN0YWJsZXMoKS5zb21lKGluamVjdGFibGUgPT4gaW5qZWN0YWJsZS5uYW1lID09PSBwcm92aWRlci5uYW1lKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmdNb2R1bGU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5hZGRQYWdlKHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnbW9kdWxlcycsXG4gICAgICAgICAgICAgICAgY29udGV4dDogJ21vZHVsZXMnLFxuICAgICAgICAgICAgICAgIGRlcHRoOiAwLFxuICAgICAgICAgICAgICAgIHBhZ2VUeXBlOiBDT01QT0RPQ19ERUZBVUxUUy5QQUdFX1RZUEVTLlJPT1RcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBsZXQgbGVuID0gdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLm1vZHVsZXMubGVuZ3RoO1xuXG4gICAgICAgICAgICBmb3IoaTsgaTxsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5hZGRQYWdlKHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogJ21vZHVsZXMnLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEubW9kdWxlc1tpXS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBjb250ZXh0OiAnbW9kdWxlJyxcbiAgICAgICAgICAgICAgICAgICAgbW9kdWxlOiB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEubW9kdWxlc1tpXSxcbiAgICAgICAgICAgICAgICAgICAgZGVwdGg6IDEsXG4gICAgICAgICAgICAgICAgICAgIHBhZ2VUeXBlOiBDT01QT0RPQ19ERUZBVUxUUy5QQUdFX1RZUEVTLklOVEVSTkFMXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJlcGFyZVBpcGVzID0gKHNvbWVQaXBlcz8pID0+IHtcbiAgICAgICAgbG9nZ2VyLmluZm8oJycpO1xuICAgICAgICBsb2dnZXIuaW5mbygnUHJlcGFyZSBwaXBlcycpO1xuICAgICAgICB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEucGlwZXMgPSAoc29tZVBpcGVzKSA/IHNvbWVQaXBlcyA6ICRkZXBlbmRlbmNpZXNFbmdpbmUuZ2V0UGlwZXMoKTtcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgbGV0IGkgPSAwLFxuICAgICAgICAgICAgICAgIGxlbiA9IHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5waXBlcy5sZW5ndGg7XG5cbiAgICAgICAgICAgIGZvcihpOyBpPGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLmFkZFBhZ2Uoe1xuICAgICAgICAgICAgICAgICAgICBwYXRoOiAncGlwZXMnLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEucGlwZXNbaV0ubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dDogJ3BpcGUnLFxuICAgICAgICAgICAgICAgICAgICBwaXBlOiB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEucGlwZXNbaV0sXG4gICAgICAgICAgICAgICAgICAgIGRlcHRoOiAxLFxuICAgICAgICAgICAgICAgICAgICBwYWdlVHlwZTogQ09NUE9ET0NfREVGQVVMVFMuUEFHRV9UWVBFUy5JTlRFUk5BTFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcmVwYXJlQ2xhc3NlcyA9IChzb21lQ2xhc3Nlcz8pID0+IHtcbiAgICAgICAgbG9nZ2VyLmluZm8oJycpO1xuICAgICAgICBsb2dnZXIuaW5mbygnUHJlcGFyZSBjbGFzc2VzJyk7XG4gICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5jbGFzc2VzID0gKHNvbWVDbGFzc2VzKSA/IHNvbWVDbGFzc2VzIDogJGRlcGVuZGVuY2llc0VuZ2luZS5nZXRDbGFzc2VzKCk7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGxldCBpID0gMCxcbiAgICAgICAgICAgICAgICBsZW4gPSB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuY2xhc3Nlcy5sZW5ndGg7XG5cbiAgICAgICAgICAgIGZvcihpOyBpPGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLmFkZFBhZ2Uoe1xuICAgICAgICAgICAgICAgICAgICBwYXRoOiAnY2xhc3NlcycsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5jbGFzc2VzW2ldLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQ6ICdjbGFzcycsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuY2xhc3Nlc1tpXSxcbiAgICAgICAgICAgICAgICAgICAgZGVwdGg6IDEsXG4gICAgICAgICAgICAgICAgICAgIHBhZ2VUeXBlOiBDT01QT0RPQ19ERUZBVUxUUy5QQUdFX1RZUEVTLklOVEVSTkFMXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByZXBhcmVJbnRlcmZhY2VzKHNvbWVJbnRlcmZhY2VzPykge1xuICAgICAgICBsb2dnZXIuaW5mbygnJyk7XG4gICAgICAgIGxvZ2dlci5pbmZvKCdQcmVwYXJlIGludGVyZmFjZXMnKTtcbiAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmludGVyZmFjZXMgPSAoc29tZUludGVyZmFjZXMpID8gc29tZUludGVyZmFjZXMgOiAkZGVwZW5kZW5jaWVzRW5naW5lLmdldEludGVyZmFjZXMoKTtcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgbGV0IGkgPSAwLFxuICAgICAgICAgICAgICAgIGxlbiA9IHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5pbnRlcmZhY2VzLmxlbmd0aDtcbiAgICAgICAgICAgIGZvcihpOyBpPGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLmFkZFBhZ2Uoe1xuICAgICAgICAgICAgICAgICAgICBwYXRoOiAnaW50ZXJmYWNlcycsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5pbnRlcmZhY2VzW2ldLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQ6ICdpbnRlcmZhY2UnLFxuICAgICAgICAgICAgICAgICAgICBpbnRlcmZhY2U6IHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5pbnRlcmZhY2VzW2ldLFxuICAgICAgICAgICAgICAgICAgICBkZXB0aDogMSxcbiAgICAgICAgICAgICAgICAgICAgcGFnZVR5cGU6IENPTVBPRE9DX0RFRkFVTFRTLlBBR0VfVFlQRVMuSU5URVJOQUxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJlcGFyZU1pc2NlbGxhbmVvdXMoc29tZU1pc2M/KSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKCcnKTtcbiAgICAgICAgbG9nZ2VyLmluZm8oJ1ByZXBhcmUgbWlzY2VsbGFuZW91cycpO1xuICAgICAgICB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEubWlzY2VsbGFuZW91cyA9IChzb21lTWlzYykgPyBzb21lTWlzYyA6ICRkZXBlbmRlbmNpZXNFbmdpbmUuZ2V0TWlzY2VsbGFuZW91cygpO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICB0aGlzLmNvbmZpZ3VyYXRpb24uYWRkUGFnZSh7XG4gICAgICAgICAgICAgICAgbmFtZTogJ21pc2NlbGxhbmVvdXMnLFxuICAgICAgICAgICAgICAgIGNvbnRleHQ6ICdtaXNjZWxsYW5lb3VzJyxcbiAgICAgICAgICAgICAgICBkZXB0aDogMCxcbiAgICAgICAgICAgICAgICBwYWdlVHlwZTogQ09NUE9ET0NfREVGQVVMVFMuUEFHRV9UWVBFUy5ST09UXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJlcGFyZUNvbXBvbmVudHMoc29tZUNvbXBvbmVudHM/KSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKCcnKTtcbiAgICAgICAgbG9nZ2VyLmluZm8oJ1ByZXBhcmUgY29tcG9uZW50cycpO1xuICAgICAgICB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuY29tcG9uZW50cyA9IChzb21lQ29tcG9uZW50cykgPyBzb21lQ29tcG9uZW50cyA6ICRkZXBlbmRlbmNpZXNFbmdpbmUuZ2V0Q29tcG9uZW50cygpO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgobWFpblJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgbGV0IGkgPSAwLFxuICAgICAgICAgICAgICAgIGxlbiA9IHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5jb21wb25lbnRzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICBsb29wID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiggaSA8PSBsZW4tMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRpcm5hbWUgPSBwYXRoLmRpcm5hbWUodGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmNvbXBvbmVudHNbaV0uZmlsZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlVGVtcGxhdGV1cmwgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGVtcGxhdGVQYXRoID0gcGF0aC5yZXNvbHZlKGRpcm5hbWUgKyBwYXRoLnNlcCArIHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5jb21wb25lbnRzW2ldLnRlbXBsYXRlVXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHRlbXBsYXRlUGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcy5yZWFkRmlsZSh0ZW1wbGF0ZVBhdGgsICd1dGY4JywgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmNvbXBvbmVudHNbaV0udGVtcGxhdGVEYXRhID0gZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoYENhbm5vdCByZWFkIHRlbXBsYXRlIGZvciAke3RoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5jb21wb25lbnRzW2ldLm5hbWV9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJG1hcmtkb3duZW5naW5lLmNvbXBvbmVudEhhc1JlYWRtZUZpbGUodGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmNvbXBvbmVudHNbaV0uZmlsZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgJHt0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuY29tcG9uZW50c1tpXS5uYW1lfSBoYXMgYSBSRUFETUUgZmlsZSwgaW5jbHVkZSBpdGApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCByZWFkbWVGaWxlID0gJG1hcmtkb3duZW5naW5lLmNvbXBvbmVudFJlYWRtZUZpbGUodGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmNvbXBvbmVudHNbaV0uZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnMucmVhZEZpbGUocmVhZG1lRmlsZSwgJ3V0ZjgnLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHRocm93IGVycjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmNvbXBvbmVudHNbaV0ucmVhZG1lID0gbWFya2VkKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZ3VyYXRpb24uYWRkUGFnZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiAnY29tcG9uZW50cycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuY29tcG9uZW50c1tpXS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dDogJ2NvbXBvbmVudCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQ6IHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5jb21wb25lbnRzW2ldLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVwdGg6IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWdlVHlwZTogQ09NUE9ET0NfREVGQVVMVFMuUEFHRV9UWVBFUy5JTlRFUk5BTFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5jb21wb25lbnRzW2ldLnRlbXBsYXRlVXJsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGAke3RoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5jb21wb25lbnRzW2ldLm5hbWV9IGhhcyBhIHRlbXBsYXRlVXJsLCBpbmNsdWRlIGl0YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVUZW1wbGF0ZXVybCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb29wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb29wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLmFkZFBhZ2Uoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiAnY29tcG9uZW50cycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5jb21wb25lbnRzW2ldLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQ6ICdjb21wb25lbnQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQ6IHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5jb21wb25lbnRzW2ldLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXB0aDogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFnZVR5cGU6IENPTVBPRE9DX0RFRkFVTFRTLlBBR0VfVFlQRVMuSU5URVJOQUxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmNvbXBvbmVudHNbaV0udGVtcGxhdGVVcmwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgJHt0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuY29tcG9uZW50c1tpXS5uYW1lfSBoYXMgYSB0ZW1wbGF0ZVVybCwgaW5jbHVkZSBpdGApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVUZW1wbGF0ZXVybCgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9vcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9vcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haW5SZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgbG9vcCgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcmVwYXJlRGlyZWN0aXZlcyA9IChzb21lRGlyZWN0aXZlcz8pID0+IHtcbiAgICAgICAgbG9nZ2VyLmluZm8oJycpO1xuICAgICAgICBsb2dnZXIuaW5mbygnUHJlcGFyZSBkaXJlY3RpdmVzJyk7XG5cbiAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmRpcmVjdGl2ZXMgPSAoc29tZURpcmVjdGl2ZXMpID8gc29tZURpcmVjdGl2ZXMgOiAkZGVwZW5kZW5jaWVzRW5naW5lLmdldERpcmVjdGl2ZXMoKTtcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgbGV0IGkgPSAwLFxuICAgICAgICAgICAgICAgIGxlbiA9IHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5kaXJlY3RpdmVzLmxlbmd0aDtcblxuICAgICAgICAgICAgZm9yKGk7IGk8bGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZ3VyYXRpb24uYWRkUGFnZSh7XG4gICAgICAgICAgICAgICAgICAgIHBhdGg6ICdkaXJlY3RpdmVzJyxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmRpcmVjdGl2ZXNbaV0ubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dDogJ2RpcmVjdGl2ZScsXG4gICAgICAgICAgICAgICAgICAgIGRpcmVjdGl2ZTogdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmRpcmVjdGl2ZXNbaV0sXG4gICAgICAgICAgICAgICAgICAgIGRlcHRoOiAxLFxuICAgICAgICAgICAgICAgICAgICBwYWdlVHlwZTogQ09NUE9ET0NfREVGQVVMVFMuUEFHRV9UWVBFUy5JTlRFUk5BTFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcmVwYXJlSW5qZWN0YWJsZXMoc29tZUluamVjdGFibGVzPykge1xuICAgICAgICBsb2dnZXIuaW5mbygnJyk7XG4gICAgICAgIGxvZ2dlci5pbmZvKCdQcmVwYXJlIGluamVjdGFibGVzJyk7XG5cbiAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmluamVjdGFibGVzID0gKHNvbWVJbmplY3RhYmxlcykgPyBzb21lSW5qZWN0YWJsZXMgOiAkZGVwZW5kZW5jaWVzRW5naW5lLmdldEluamVjdGFibGVzKCk7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGxldCBpID0gMCxcbiAgICAgICAgICAgICAgICBsZW4gPSB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuaW5qZWN0YWJsZXMubGVuZ3RoO1xuXG4gICAgICAgICAgICBmb3IoaTsgaTxsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5hZGRQYWdlKHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogJ2luamVjdGFibGVzJyxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmluamVjdGFibGVzW2ldLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQ6ICdpbmplY3RhYmxlJyxcbiAgICAgICAgICAgICAgICAgICAgaW5qZWN0YWJsZTogdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmluamVjdGFibGVzW2ldLFxuICAgICAgICAgICAgICAgICAgICBkZXB0aDogMSxcbiAgICAgICAgICAgICAgICAgICAgcGFnZVR5cGU6IENPTVBPRE9DX0RFRkFVTFRTLlBBR0VfVFlQRVMuSU5URVJOQUxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJlcGFyZVJvdXRlcygpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oJycpO1xuICAgICAgICBsb2dnZXIuaW5mbygnUHJvY2VzcyByb3V0ZXMnKTtcbiAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLnJvdXRlcyA9ICRkZXBlbmRlbmNpZXNFbmdpbmUuZ2V0Um91dGVzKCk7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblxuICAgICAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLmFkZFBhZ2Uoe1xuICAgICAgICAgICAgICAgIG5hbWU6ICdyb3V0ZXMnLFxuICAgICAgICAgICAgICAgIGNvbnRleHQ6ICdyb3V0ZXMnLFxuICAgICAgICAgICAgICAgIGRlcHRoOiAwLFxuICAgICAgICAgICAgICAgIHBhZ2VUeXBlOiBDT01QT0RPQ19ERUZBVUxUUy5QQUdFX1RZUEVTLlJPT1RcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBSb3V0ZXJQYXJzZXIuZ2VuZXJhdGVSb3V0ZXNJbmRleCh0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEub3V0cHV0LCB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEucm91dGVzKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbygnUm91dGVzIGluZGV4IGdlbmVyYXRlZCcpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgIH0sIChlKSA9PsKge1xuICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihlKTtcbiAgICAgICAgICAgICAgICByZWplY3QoKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByZXBhcmVDb3ZlcmFnZSgpIHtcbiAgICAgICAgbG9nZ2VyLmluZm8oJycpO1xuICAgICAgICBsb2dnZXIuaW5mbygnUHJvY2VzcyBkb2N1bWVudGF0aW9uIGNvdmVyYWdlIHJlcG9ydCcpO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgICogbG9vcCB3aXRoIGNvbXBvbmVudHMsIGNsYXNzZXMsIGluamVjdGFibGVzLCBpbnRlcmZhY2VzLCBwaXBlc1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB2YXIgZmlsZXMgPSBbXSxcbiAgICAgICAgICAgICAgICB0b3RhbFByb2plY3RTdGF0ZW1lbnREb2N1bWVudGVkID0gMCxcbiAgICAgICAgICAgICAgICBnZXRTdGF0dXMgPSBmdW5jdGlvbihwZXJjZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzdGF0dXM7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwZXJjZW50IDw9IDI1KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXMgPSAnbG93JztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwZXJjZW50ID4gMjUgJiYgcGVyY2VudCA8PSA1MCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzID0gJ21lZGl1bSc7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocGVyY2VudCA+IDUwICYmIHBlcmNlbnQgPD0gNzUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1cyA9ICdnb29kJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1cyA9ICdnb29kJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3RhdHVzO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIF8uZm9yRWFjaCh0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuY29tcG9uZW50cywgKGNvbXBvbmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghY29tcG9uZW50LnByb3BlcnRpZXNDbGFzcyB8fFxuICAgICAgICAgICAgICAgICAgICAhY29tcG9uZW50Lm1ldGhvZHNDbGFzcyB8fFxuICAgICAgICAgICAgICAgICAgICAhY29tcG9uZW50LmlucHV0c0NsYXNzIHx8XG4gICAgICAgICAgICAgICAgICAgICFjb21wb25lbnQub3V0cHV0c0NsYXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsZXQgY2w6YW55ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZVBhdGg6IGNvbXBvbmVudC5maWxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogY29tcG9uZW50LnR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5rdHlwZTogY29tcG9uZW50LnR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBjb21wb25lbnQubmFtZVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB0b3RhbFN0YXRlbWVudERvY3VtZW50ZWQgPSAwLFxuICAgICAgICAgICAgICAgICAgICB0b3RhbFN0YXRlbWVudHMgPSBjb21wb25lbnQucHJvcGVydGllc0NsYXNzLmxlbmd0aCArIGNvbXBvbmVudC5tZXRob2RzQ2xhc3MubGVuZ3RoICsgY29tcG9uZW50LmlucHV0c0NsYXNzLmxlbmd0aCArIGNvbXBvbmVudC5vdXRwdXRzQ2xhc3MubGVuZ3RoICsgMTsgLy8gKzEgZm9yIGNvbXBvbmVudCBkZWNvcmF0b3IgY29tbWVudFxuXG4gICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5jb25zdHJ1Y3Rvck9iaikge1xuICAgICAgICAgICAgICAgICAgICB0b3RhbFN0YXRlbWVudHMgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5jb25zdHJ1Y3Rvck9iai5kZXNjcmlwdGlvbiAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsU3RhdGVtZW50RG9jdW1lbnRlZCArPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnQuZGVzY3JpcHRpb24gIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvdGFsU3RhdGVtZW50RG9jdW1lbnRlZCArPSAxO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChjb21wb25lbnQucHJvcGVydGllc0NsYXNzLCAocHJvcGVydHkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnR5Lm1vZGlmaWVyS2luZCA9PT0gMTExKSB7IC8vIERvZXNuJ3QgaGFuZGxlIHByaXZhdGUgZm9yIGNvdmVyYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICB0b3RhbFN0YXRlbWVudHMgLT0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZihwcm9wZXJ0eS5kZXNjcmlwdGlvbiAhPT0gJycgJiYgcHJvcGVydHkubW9kaWZpZXJLaW5kICE9PSAxMTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsU3RhdGVtZW50RG9jdW1lbnRlZCArPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKGNvbXBvbmVudC5tZXRob2RzQ2xhc3MsIChtZXRob2QpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1ldGhvZC5tb2RpZmllcktpbmQgPT09IDExMSkgeyAvLyBEb2Vzbid0IGhhbmRsZSBwcml2YXRlIGZvciBjb3ZlcmFnZVxuICAgICAgICAgICAgICAgICAgICAgICAgdG90YWxTdGF0ZW1lbnRzIC09IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYobWV0aG9kLmRlc2NyaXB0aW9uICE9PSAnJyAmJiBtZXRob2QubW9kaWZpZXJLaW5kICE9PSAxMTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsU3RhdGVtZW50RG9jdW1lbnRlZCArPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKGNvbXBvbmVudC5pbnB1dHNDbGFzcywgKGlucHV0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5tb2RpZmllcktpbmQgPT09IDExMSkgeyAvLyBEb2Vzbid0IGhhbmRsZSBwcml2YXRlIGZvciBjb3ZlcmFnZVxuICAgICAgICAgICAgICAgICAgICAgICAgdG90YWxTdGF0ZW1lbnRzIC09IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYoaW5wdXQuZGVzY3JpcHRpb24gIT09ICcnICYmIGlucHV0Lm1vZGlmaWVyS2luZCAhPT0gMTExKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b3RhbFN0YXRlbWVudERvY3VtZW50ZWQgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChjb21wb25lbnQub3V0cHV0c0NsYXNzLCAob3V0cHV0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvdXRwdXQubW9kaWZpZXJLaW5kID09PSAxMTEpIHsgLy8gRG9lc24ndCBoYW5kbGUgcHJpdmF0ZSBmb3IgY292ZXJhZ2VcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsU3RhdGVtZW50cyAtPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmKG91dHB1dC5kZXNjcmlwdGlvbiAhPT0gJycgJiYgb3V0cHV0Lm1vZGlmaWVyS2luZCAhPT0gMTExKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b3RhbFN0YXRlbWVudERvY3VtZW50ZWQgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgY2wuY292ZXJhZ2VQZXJjZW50ID0gTWF0aC5mbG9vcigodG90YWxTdGF0ZW1lbnREb2N1bWVudGVkIC8gdG90YWxTdGF0ZW1lbnRzKSAqIDEwMCk7XG4gICAgICAgICAgICAgICAgaWYodG90YWxTdGF0ZW1lbnRzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsLmNvdmVyYWdlUGVyY2VudCA9IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNsLmNvdmVyYWdlQ291bnQgPSB0b3RhbFN0YXRlbWVudERvY3VtZW50ZWQgKyAnLycgKyB0b3RhbFN0YXRlbWVudHM7XG4gICAgICAgICAgICAgICAgY2wuc3RhdHVzID0gZ2V0U3RhdHVzKGNsLmNvdmVyYWdlUGVyY2VudCk7XG4gICAgICAgICAgICAgICAgdG90YWxQcm9qZWN0U3RhdGVtZW50RG9jdW1lbnRlZCArPSBjbC5jb3ZlcmFnZVBlcmNlbnQ7XG4gICAgICAgICAgICAgICAgZmlsZXMucHVzaChjbCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgXy5mb3JFYWNoKHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5jbGFzc2VzLCAoY2xhc3NlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFjbGFzc2UucHJvcGVydGllcyB8fFxuICAgICAgICAgICAgICAgICAgICAhY2xhc3NlLm1ldGhvZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGxldCBjbDphbnkgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlUGF0aDogY2xhc3NlLmZpbGUsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2xhc3MnLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGlua3R5cGU6ICdjbGFzc2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogY2xhc3NlLm5hbWVcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxTdGF0ZW1lbnREb2N1bWVudGVkID0gMCxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxTdGF0ZW1lbnRzID0gY2xhc3NlLnByb3BlcnRpZXMubGVuZ3RoICsgY2xhc3NlLm1ldGhvZHMubGVuZ3RoICsgMTsgLy8gKzEgZm9yIGNsYXNzIGl0c2VsZlxuXG4gICAgICAgICAgICAgICAgaWYgKGNsYXNzZS5jb25zdHJ1Y3Rvck9iaikge1xuICAgICAgICAgICAgICAgICAgICB0b3RhbFN0YXRlbWVudHMgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNsYXNzZS5jb25zdHJ1Y3Rvck9iai5kZXNjcmlwdGlvbiAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsU3RhdGVtZW50RG9jdW1lbnRlZCArPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjbGFzc2UuZGVzY3JpcHRpb24gIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvdGFsU3RhdGVtZW50RG9jdW1lbnRlZCArPSAxO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChjbGFzc2UucHJvcGVydGllcywgKHByb3BlcnR5KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0eS5tb2RpZmllcktpbmQgPT09IDExMSkgeyAvLyBEb2Vzbid0IGhhbmRsZSBwcml2YXRlIGZvciBjb3ZlcmFnZVxuICAgICAgICAgICAgICAgICAgICAgICAgdG90YWxTdGF0ZW1lbnRzIC09IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYocHJvcGVydHkuZGVzY3JpcHRpb24gIT09ICcnICYmIHByb3BlcnR5Lm1vZGlmaWVyS2luZCAhPT0gMTExKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b3RhbFN0YXRlbWVudERvY3VtZW50ZWQgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChjbGFzc2UubWV0aG9kcywgKG1ldGhvZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAobWV0aG9kLm1vZGlmaWVyS2luZCA9PT0gMTExKSB7IC8vIERvZXNuJ3QgaGFuZGxlIHByaXZhdGUgZm9yIGNvdmVyYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICB0b3RhbFN0YXRlbWVudHMgLT0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZihtZXRob2QuZGVzY3JpcHRpb24gIT09ICcnICYmIG1ldGhvZC5tb2RpZmllcktpbmQgIT09IDExMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdG90YWxTdGF0ZW1lbnREb2N1bWVudGVkICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGNsLmNvdmVyYWdlUGVyY2VudCA9IE1hdGguZmxvb3IoKHRvdGFsU3RhdGVtZW50RG9jdW1lbnRlZCAvIHRvdGFsU3RhdGVtZW50cykgKiAxMDApO1xuICAgICAgICAgICAgICAgIGlmKHRvdGFsU3RhdGVtZW50cyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBjbC5jb3ZlcmFnZVBlcmNlbnQgPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjbC5jb3ZlcmFnZUNvdW50ID0gdG90YWxTdGF0ZW1lbnREb2N1bWVudGVkICsgJy8nICsgdG90YWxTdGF0ZW1lbnRzO1xuICAgICAgICAgICAgICAgIGNsLnN0YXR1cyA9IGdldFN0YXR1cyhjbC5jb3ZlcmFnZVBlcmNlbnQpO1xuICAgICAgICAgICAgICAgIHRvdGFsUHJvamVjdFN0YXRlbWVudERvY3VtZW50ZWQgKz0gY2wuY292ZXJhZ2VQZXJjZW50O1xuICAgICAgICAgICAgICAgIGZpbGVzLnB1c2goY2wpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBfLmZvckVhY2godGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmluamVjdGFibGVzLCAoaW5qZWN0YWJsZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghaW5qZWN0YWJsZS5wcm9wZXJ0aWVzIHx8XG4gICAgICAgICAgICAgICAgICAgICFpbmplY3RhYmxlLm1ldGhvZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGxldCBjbDphbnkgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlUGF0aDogaW5qZWN0YWJsZS5maWxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogaW5qZWN0YWJsZS50eXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGlua3R5cGU6IGluamVjdGFibGUudHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGluamVjdGFibGUubmFtZVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB0b3RhbFN0YXRlbWVudERvY3VtZW50ZWQgPSAwLFxuICAgICAgICAgICAgICAgICAgICB0b3RhbFN0YXRlbWVudHMgPSBpbmplY3RhYmxlLnByb3BlcnRpZXMubGVuZ3RoICsgaW5qZWN0YWJsZS5tZXRob2RzLmxlbmd0aCArIDE7IC8vICsxIGZvciBpbmplY3RhYmxlIGl0c2VsZlxuXG4gICAgICAgICAgICAgICAgaWYgKGluamVjdGFibGUuY29uc3RydWN0b3JPYmopIHtcbiAgICAgICAgICAgICAgICAgICAgdG90YWxTdGF0ZW1lbnRzICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmplY3RhYmxlLmNvbnN0cnVjdG9yT2JqLmRlc2NyaXB0aW9uICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdG90YWxTdGF0ZW1lbnREb2N1bWVudGVkICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGluamVjdGFibGUuZGVzY3JpcHRpb24gIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvdGFsU3RhdGVtZW50RG9jdW1lbnRlZCArPSAxO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChpbmplY3RhYmxlLnByb3BlcnRpZXMsIChwcm9wZXJ0eSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydHkubW9kaWZpZXJLaW5kID09PSAxMTEpIHsgLy8gRG9lc24ndCBoYW5kbGUgcHJpdmF0ZSBmb3IgY292ZXJhZ2VcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsU3RhdGVtZW50cyAtPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmKHByb3BlcnR5LmRlc2NyaXB0aW9uICE9PSAnJyAmJiBwcm9wZXJ0eS5tb2RpZmllcktpbmQgIT09IDExMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdG90YWxTdGF0ZW1lbnREb2N1bWVudGVkICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBfLmZvckVhY2goaW5qZWN0YWJsZS5tZXRob2RzLCAobWV0aG9kKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXRob2QubW9kaWZpZXJLaW5kID09PSAxMTEpIHsgLy8gRG9lc24ndCBoYW5kbGUgcHJpdmF0ZSBmb3IgY292ZXJhZ2VcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsU3RhdGVtZW50cyAtPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmKG1ldGhvZC5kZXNjcmlwdGlvbiAhPT0gJycgJiYgbWV0aG9kLm1vZGlmaWVyS2luZCAhPT0gMTExKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b3RhbFN0YXRlbWVudERvY3VtZW50ZWQgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgY2wuY292ZXJhZ2VQZXJjZW50ID0gTWF0aC5mbG9vcigodG90YWxTdGF0ZW1lbnREb2N1bWVudGVkIC8gdG90YWxTdGF0ZW1lbnRzKSAqIDEwMCk7XG4gICAgICAgICAgICAgICAgaWYodG90YWxTdGF0ZW1lbnRzID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsLmNvdmVyYWdlUGVyY2VudCA9IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNsLmNvdmVyYWdlQ291bnQgPSB0b3RhbFN0YXRlbWVudERvY3VtZW50ZWQgKyAnLycgKyB0b3RhbFN0YXRlbWVudHM7XG4gICAgICAgICAgICAgICAgY2wuc3RhdHVzID0gZ2V0U3RhdHVzKGNsLmNvdmVyYWdlUGVyY2VudCk7XG4gICAgICAgICAgICAgICAgdG90YWxQcm9qZWN0U3RhdGVtZW50RG9jdW1lbnRlZCArPSBjbC5jb3ZlcmFnZVBlcmNlbnQ7XG4gICAgICAgICAgICAgICAgZmlsZXMucHVzaChjbCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIF8uZm9yRWFjaCh0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuaW50ZXJmYWNlcywgKGludGVyKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFpbnRlci5wcm9wZXJ0aWVzIHx8XG4gICAgICAgICAgICAgICAgICAgICFpbnRlci5tZXRob2RzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsZXQgY2w6YW55ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZVBhdGg6IGludGVyLmZpbGUsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBpbnRlci50eXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGlua3R5cGU6IGludGVyLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBpbnRlci5uYW1lXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsU3RhdGVtZW50RG9jdW1lbnRlZCA9IDAsXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsU3RhdGVtZW50cyA9IGludGVyLnByb3BlcnRpZXMubGVuZ3RoICsgaW50ZXIubWV0aG9kcy5sZW5ndGggKyAxOyAvLyArMSBmb3IgaW50ZXJmYWNlIGl0c2VsZlxuXG4gICAgICAgICAgICAgICAgaWYgKGludGVyLmNvbnN0cnVjdG9yT2JqKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvdGFsU3RhdGVtZW50cyArPSAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW50ZXIuY29uc3RydWN0b3JPYmouZGVzY3JpcHRpb24gIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b3RhbFN0YXRlbWVudERvY3VtZW50ZWQgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaW50ZXIuZGVzY3JpcHRpb24gIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvdGFsU3RhdGVtZW50RG9jdW1lbnRlZCArPSAxO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIF8uZm9yRWFjaChpbnRlci5wcm9wZXJ0aWVzLCAocHJvcGVydHkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnR5Lm1vZGlmaWVyS2luZCA9PT0gMTExKSB7IC8vIERvZXNuJ3QgaGFuZGxlIHByaXZhdGUgZm9yIGNvdmVyYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICB0b3RhbFN0YXRlbWVudHMgLT0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZihwcm9wZXJ0eS5kZXNjcmlwdGlvbiAhPT0gJycgJiYgcHJvcGVydHkubW9kaWZpZXJLaW5kICE9PSAxMTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsU3RhdGVtZW50RG9jdW1lbnRlZCArPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXy5mb3JFYWNoKGludGVyLm1ldGhvZHMsIChtZXRob2QpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1ldGhvZC5tb2RpZmllcktpbmQgPT09IDExMSkgeyAvLyBEb2Vzbid0IGhhbmRsZSBwcml2YXRlIGZvciBjb3ZlcmFnZVxuICAgICAgICAgICAgICAgICAgICAgICAgdG90YWxTdGF0ZW1lbnRzIC09IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYobWV0aG9kLmRlc2NyaXB0aW9uICE9PSAnJyAmJiBtZXRob2QubW9kaWZpZXJLaW5kICE9PSAxMTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsU3RhdGVtZW50RG9jdW1lbnRlZCArPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBjbC5jb3ZlcmFnZVBlcmNlbnQgPSBNYXRoLmZsb29yKCh0b3RhbFN0YXRlbWVudERvY3VtZW50ZWQgLyB0b3RhbFN0YXRlbWVudHMpICogMTAwKTtcbiAgICAgICAgICAgICAgICBpZih0b3RhbFN0YXRlbWVudHMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY2wuY292ZXJhZ2VQZXJjZW50ID0gMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2wuY292ZXJhZ2VDb3VudCA9IHRvdGFsU3RhdGVtZW50RG9jdW1lbnRlZCArICcvJyArIHRvdGFsU3RhdGVtZW50cztcbiAgICAgICAgICAgICAgICBjbC5zdGF0dXMgPSBnZXRTdGF0dXMoY2wuY292ZXJhZ2VQZXJjZW50KTtcbiAgICAgICAgICAgICAgICB0b3RhbFByb2plY3RTdGF0ZW1lbnREb2N1bWVudGVkICs9IGNsLmNvdmVyYWdlUGVyY2VudDtcbiAgICAgICAgICAgICAgICBmaWxlcy5wdXNoKGNsKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXy5mb3JFYWNoKHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5waXBlcywgKHBpcGUpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgY2w6YW55ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZVBhdGg6IHBpcGUuZmlsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHBpcGUudHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmt0eXBlOiBwaXBlLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBwaXBlLm5hbWVcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxTdGF0ZW1lbnREb2N1bWVudGVkID0gMCxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxTdGF0ZW1lbnRzID0gMTtcbiAgICAgICAgICAgICAgICBpZiAocGlwZS5kZXNjcmlwdGlvbiAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgdG90YWxTdGF0ZW1lbnREb2N1bWVudGVkICs9IDE7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY2wuY292ZXJhZ2VQZXJjZW50ID0gTWF0aC5mbG9vcigodG90YWxTdGF0ZW1lbnREb2N1bWVudGVkIC8gdG90YWxTdGF0ZW1lbnRzKSAqIDEwMCk7XG4gICAgICAgICAgICAgICAgY2wuY292ZXJhZ2VDb3VudCA9IHRvdGFsU3RhdGVtZW50RG9jdW1lbnRlZCArICcvJyArIHRvdGFsU3RhdGVtZW50cztcbiAgICAgICAgICAgICAgICBjbC5zdGF0dXMgPSBnZXRTdGF0dXMoY2wuY292ZXJhZ2VQZXJjZW50KTtcbiAgICAgICAgICAgICAgICB0b3RhbFByb2plY3RTdGF0ZW1lbnREb2N1bWVudGVkICs9IGNsLmNvdmVyYWdlUGVyY2VudDtcbiAgICAgICAgICAgICAgICBmaWxlcy5wdXNoKGNsKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZmlsZXMgPSBfLnNvcnRCeShmaWxlcywgWydmaWxlUGF0aCddKTtcbiAgICAgICAgICAgIHZhciBjb3ZlcmFnZURhdGEgPSB7XG4gICAgICAgICAgICAgICAgY291bnQ6IChmaWxlcy5sZW5ndGggPiAwKSA/IE1hdGguZmxvb3IodG90YWxQcm9qZWN0U3RhdGVtZW50RG9jdW1lbnRlZCAvIGZpbGVzLmxlbmd0aCkgOiAwLFxuICAgICAgICAgICAgICAgIHN0YXR1czogJydcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb3ZlcmFnZURhdGEuc3RhdHVzID0gZ2V0U3RhdHVzKGNvdmVyYWdlRGF0YS5jb3VudCk7XG4gICAgICAgICAgICB0aGlzLmNvbmZpZ3VyYXRpb24uYWRkUGFnZSh7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2NvdmVyYWdlJyxcbiAgICAgICAgICAgICAgICBjb250ZXh0OiAnY292ZXJhZ2UnLFxuICAgICAgICAgICAgICAgIGZpbGVzOiBmaWxlcyxcbiAgICAgICAgICAgICAgICBkYXRhOiBjb3ZlcmFnZURhdGEsXG4gICAgICAgICAgICAgICAgZGVwdGg6IDAsXG4gICAgICAgICAgICAgICAgcGFnZVR5cGU6IENPTVBPRE9DX0RFRkFVTFRTLlBBR0VfVFlQRVMuUk9PVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkaHRtbGVuZ2luZS5nZW5lcmF0ZUNvdmVyYWdlQmFkZ2UodGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLm91dHB1dCwgY292ZXJhZ2VEYXRhKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuY292ZXJhZ2VUZXN0KSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvdmVyYWdlRGF0YS5jb3VudCA+PSB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuY292ZXJhZ2VUZXN0VGhyZXNob2xkKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdEb2N1bWVudGF0aW9uIGNvdmVyYWdlIGlzIG92ZXIgdGhyZXNob2xkJyk7XG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgwKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoJ0RvY3VtZW50YXRpb24gY292ZXJhZ2UgaXMgbm90IG92ZXIgdGhyZXNob2xkJyk7XG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJvY2Vzc1BhZ2VzKCkge1xuICAgICAgICBsb2dnZXIuaW5mbygnJyk7XG4gICAgICAgIGxvZ2dlci5pbmZvKCdQcm9jZXNzIHBhZ2VzJyk7XG4gICAgICAgIGxldCBwYWdlcyA9IHRoaXMuY29uZmlndXJhdGlvbi5wYWdlcyxcbiAgICAgICAgICAgIGkgPSAwLFxuICAgICAgICAgICAgbGVuID0gcGFnZXMubGVuZ3RoLFxuICAgICAgICAgICAgbG9vcCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiggaSA8PSBsZW4tMSkge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvY2VzcyBwYWdlJywgcGFnZXNbaV0ubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICRodG1sZW5naW5lLnJlbmRlcih0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEsIHBhZ2VzW2ldKS50aGVuKChodG1sRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZpbmFsUGF0aCA9IHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5vdXRwdXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZih0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEub3V0cHV0Lmxhc3RJbmRleE9mKCcvJykgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxQYXRoICs9ICcvJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYWdlc1tpXS5wYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxQYXRoICs9IHBhZ2VzW2ldLnBhdGggKyAnLyc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBmaW5hbFBhdGggKz0gcGFnZXNbaV0ubmFtZSArICcuaHRtbCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2VhcmNoRW5naW5lLmluZGV4UGFnZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5mb3M6IHBhZ2VzW2ldLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhd0RhdGE6IGh0bWxEYXRhLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogZmluYWxQYXRoXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZzLm91dHB1dEZpbGUocGF0aC5yZXNvbHZlKGZpbmFsUGF0aCksIGh0bWxEYXRhLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoJ0Vycm9yIGR1cmluZyAnICsgcGFnZXNbaV0ubmFtZSArICcgcGFnZSBnZW5lcmF0aW9uJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb29wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0sIChlcnJvck1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihlcnJvck1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkc2VhcmNoRW5naW5lLmdlbmVyYXRlU2VhcmNoSW5kZXhKc29uKHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5vdXRwdXQpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5hZGRpdGlvbmFsUGFnZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc0FkZGl0aW9uYWxQYWdlcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmFzc2V0c0ZvbGRlciAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzQXNzZXRzRm9sZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1Jlc291cmNlcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LCAoZSkgPT7CoHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgbG9vcCgpO1xuICAgIH1cblxuICAgIHByb2Nlc3NBZGRpdGlvbmFsUGFnZXMoKSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKCcnKTtcbiAgICAgICAgbG9nZ2VyLmluZm8oJ1Byb2Nlc3MgYWRkaXRpb25hbCBwYWdlcycpO1xuICAgICAgICBsZXQgcGFnZXMgPSB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuYWRkaXRpb25hbFBhZ2VzLFxuICAgICAgICAgICAgaSA9IDAsXG4gICAgICAgICAgICBsZW4gPSBwYWdlcy5sZW5ndGgsXG4gICAgICAgICAgICBsb29wID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmKCBpIDw9IGxlbi0xKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdQcm9jZXNzIHBhZ2UnLCBwYWdlc1tpXS5uYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgJGh0bWxlbmdpbmUucmVuZGVyKHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YSwgcGFnZXNbaV0pLnRoZW4oKGh0bWxEYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZmluYWxQYXRoID0gdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLm91dHB1dDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5vdXRwdXQubGFzdEluZGV4T2YoJy8nKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5hbFBhdGggKz0gJy8nO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhZ2VzW2ldLnBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5hbFBhdGggKz0gcGFnZXNbaV0ucGF0aCArICcvJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbmFsUGF0aCArPSBwYWdlc1tpXS5maWxlbmFtZSArICcuaHRtbCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2VhcmNoRW5naW5lLmluZGV4UGFnZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5mb3M6IHBhZ2VzW2ldLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhd0RhdGE6IGh0bWxEYXRhLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogZmluYWxQYXRoXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZzLm91dHB1dEZpbGUocGF0aC5yZXNvbHZlKGZpbmFsUGF0aCksIGh0bWxEYXRhLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoJ0Vycm9yIGR1cmluZyAnICsgcGFnZXNbaV0ubmFtZSArICcgcGFnZSBnZW5lcmF0aW9uJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb29wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0sIChlcnJvck1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihlcnJvck1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkc2VhcmNoRW5naW5lLmdlbmVyYXRlU2VhcmNoSW5kZXhKc29uKHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5vdXRwdXQpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5hc3NldHNGb2xkZXIgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzQXNzZXRzRm9sZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NSZXNvdXJjZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgKGUpID0+wqB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIGxvb3AoKTtcbiAgICB9XG5cbiAgICBwcm9jZXNzQXNzZXRzRm9sZGVyKCkge1xuICAgICAgICBsb2dnZXIuaW5mbygnJyk7XG4gICAgICAgIGxvZ2dlci5pbmZvKCdDb3B5IGFzc2V0cyBmb2xkZXInKTtcblxuICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmModGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmFzc2V0c0ZvbGRlcikpIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgUHJvdmlkZWQgYXNzZXRzIGZvbGRlciAke3RoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5hc3NldHNGb2xkZXJ9IGRpZCBub3QgZXhpc3RgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZzLmNvcHkocGF0aC5yZXNvbHZlKHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5hc3NldHNGb2xkZXIpLCBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSArIHBhdGguc2VwICsgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLm91dHB1dCArIHBhdGguc2VwICsgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmFzc2V0c0ZvbGRlciksIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKCdFcnJvciBkdXJpbmcgcmVzb3VyY2VzIGNvcHkgJywgZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByb2Nlc3NSZXNvdXJjZXMoKSB7XG4gICAgICAgIGxvZ2dlci5pbmZvKCcnKTtcbiAgICAgICAgbG9nZ2VyLmluZm8oJ0NvcHkgbWFpbiByZXNvdXJjZXMnKTtcblxuICAgICAgICBjb25zdCBvbkNvbXBsZXRlID0gKCkgPT4ge1xuICAgICAgICAgICAgbGV0IGZpbmFsVGltZSA9IChuZXcgRGF0ZSgpIC0gc3RhcnRUaW1lKSAvIDEwMDA7XG4gICAgICAgICAgICBsb2dnZXIuaW5mbygnJyk7XG4gICAgICAgICAgICBsb2dnZXIuaW5mbygnRG9jdW1lbnRhdGlvbiBnZW5lcmF0ZWQgaW4gJyArIHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5vdXRwdXQgKyAnIGluICcgKyBmaW5hbFRpbWUgKyAnIHNlY29uZHMgdXNpbmcgJyArIHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS50aGVtZSArICcgdGhlbWUnKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuc2VydmUpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgU2VydmluZyBkb2N1bWVudGF0aW9uIGZyb20gJHt0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEub3V0cHV0fSBhdCBodHRwOi8vMTI3LjAuMC4xOiR7dGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLnBvcnR9YCk7XG4gICAgICAgICAgICAgICAgdGhpcy5ydW5XZWJTZXJ2ZXIodGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLm91dHB1dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgbGV0IGZpbmFsT3V0cHV0ID0gdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLm91dHB1dC5yZXBsYWNlKHByb2Nlc3MuY3dkKCksICcnKTtcblxuICAgICAgICBmcy5jb3B5KHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUgKyAnLy4uL3NyYy9yZXNvdXJjZXMvJyksIHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpICsgcGF0aC5zZXAgKyBmaW5hbE91dHB1dCksIChlcnIpID0+IHtcbiAgICAgICAgICAgIGlmKGVycikge1xuICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcignRXJyb3IgZHVyaW5nIHJlc291cmNlcyBjb3B5ICcsIGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmV4dFRoZW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGZzLmNvcHkocGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCkgKyBwYXRoLnNlcCArIHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5leHRUaGVtZSksIHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpICsgcGF0aC5zZXAgKyBmaW5hbE91dHB1dCArICcvc3R5bGVzLycpLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKCdFcnJvciBkdXJpbmcgZXh0ZXJuYWwgc3R5bGluZyB0aGVtZSBjb3B5ICcsIGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdFeHRlcm5hbCBzdHlsaW5nIHRoZW1lIGNvcHkgc3VjY2VlZGVkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25Db21wbGV0ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG9uQ29tcGxldGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByb2Nlc3NHcmFwaHMoKSB7XG5cbiAgICAgICAgaWYgKHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5kaXNhYmxlR3JhcGgpIHtcblxuICAgICAgICAgICAgbG9nZ2VyLmluZm8oJycpO1xuICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ0dyYXBoIGdlbmVyYXRpb24gZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHRoaXMucHJvY2Vzc1BhZ2VzKCk7XG5cbiAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgbG9nZ2VyLmluZm8oJycpO1xuICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ1Byb2Nlc3MgbWFpbiBncmFwaCcpO1xuICAgICAgICAgICAgbG9nZ2VyLmluZm8oJycpO1xuICAgICAgICAgICAgbGV0IG1vZHVsZXMgPSB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEubW9kdWxlcyxcbiAgICAgICAgICAgICAgaSA9IDAsXG4gICAgICAgICAgICAgIGxlbiA9IG1vZHVsZXMubGVuZ3RoLFxuICAgICAgICAgICAgICBsb29wID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYoIGkgPD0gbGVuLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbygnUHJvY2VzcyBtb2R1bGUgZ3JhcGgnLCBtb2R1bGVzW2ldLm5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgIGxldCBmaW5hbFBhdGggPSB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEub3V0cHV0O1xuICAgICAgICAgICAgICAgICAgICAgIGlmKHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5vdXRwdXQubGFzdEluZGV4T2YoJy8nKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxQYXRoICs9ICcvJztcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgZmluYWxQYXRoICs9ICdtb2R1bGVzLycgKyBtb2R1bGVzW2ldLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgJG5nZGVuZ2luZS5yZW5kZXJHcmFwaChtb2R1bGVzW2ldLmZpbGUsIGZpbmFsUGF0aCwgJ2YnLCBtb2R1bGVzW2ldLm5hbWUpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAkbmdkZW5naW5lLnJlYWRHcmFwaChwYXRoLnJlc29sdmUoZmluYWxQYXRoICsgcGF0aC5zZXAgKyAnZGVwZW5kZW5jaWVzLnN2ZycpLCBtb2R1bGVzW2ldLm5hbWUpLnRoZW4oKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vZHVsZXNbaV0uZ3JhcGggPSA8c3RyaW5nPmRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb29wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0sIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcignRXJyb3IgZHVyaW5nIGdyYXBoIHJlYWQ6ICcsIGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgIH0sIChlcnJvck1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGVycm9yTWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1BhZ2VzKCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICBsZXQgZmluYWxNYWluR3JhcGhQYXRoID0gdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLm91dHB1dDtcbiAgICAgICAgICAgIGlmKGZpbmFsTWFpbkdyYXBoUGF0aC5sYXN0SW5kZXhPZignLycpID09PSAtMSkge1xuICAgICAgICAgICAgICAgIGZpbmFsTWFpbkdyYXBoUGF0aCArPSAnLyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmaW5hbE1haW5HcmFwaFBhdGggKz0gJ2dyYXBoJztcbiAgICAgICAgICAgICRuZ2RlbmdpbmUucmVuZGVyR3JhcGgodGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLnRzY29uZmlnLCBwYXRoLnJlc29sdmUoZmluYWxNYWluR3JhcGhQYXRoKSwgJ3AnKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAkbmdkZW5naW5lLnJlYWRHcmFwaChwYXRoLnJlc29sdmUoZmluYWxNYWluR3JhcGhQYXRoICsgcGF0aC5zZXAgKyAnZGVwZW5kZW5jaWVzLnN2ZycpLCAnTWFpbiBncmFwaCcpLnRoZW4oKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLm1haW5HcmFwaCA9IDxzdHJpbmc+ZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgbG9vcCgpO1xuICAgICAgICAgICAgICAgIH0sIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKCdFcnJvciBkdXJpbmcgZ3JhcGggcmVhZDogJywgZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoJ0Vycm9yIGR1cmluZyBncmFwaCBnZW5lcmF0aW9uOiAnLCBlcnIpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJ1bldlYlNlcnZlcihmb2xkZXIpIHtcbiAgICAgICAgaWYoIXRoaXMuaXNXYXRjaGluZykge1xuICAgICAgICAgICAgTGl2ZVNlcnZlci5zdGFydCh7XG4gICAgICAgICAgICAgICAgcm9vdDogZm9sZGVyLFxuICAgICAgICAgICAgICAgIG9wZW46IHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5vcGVuLFxuICAgICAgICAgICAgICAgIHF1aWV0OiB0cnVlLFxuICAgICAgICAgICAgICAgIGxvZ0xldmVsOiAwLFxuICAgICAgICAgICAgICAgIHdhaXQ6IDEwMDAsXG4gICAgICAgICAgICAgICAgcG9ydDogdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLnBvcnRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEud2F0Y2ggJiYgIXRoaXMuaXNXYXRjaGluZykge1xuICAgICAgICAgICAgdGhpcy5ydW5XYXRjaCgpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS53YXRjaCAmJiB0aGlzLmlzV2F0Y2hpbmcpIHtcbiAgICAgICAgICAgIGxldCBzcmNGb2xkZXIgPSBmaW5kTWFpblNvdXJjZUZvbGRlcih0aGlzLmZpbGVzKTtcbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKCcnKTtcbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBBbHJlYWR5IHdhdGNoaW5nIHNvdXJjZXMgaW4gJHtzcmNGb2xkZXJ9IGZvbGRlcmApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcnVuV2F0Y2goKSB7XG4gICAgICAgIGxldCBzcmNGb2xkZXIgPSBmaW5kTWFpblNvdXJjZUZvbGRlcih0aGlzLmZpbGVzKSxcbiAgICAgICAgICAgIHdhdGNoQ2hhbmdlZEZpbGVzID0gW107XG5cbiAgICAgICAgdGhpcy5pc1dhdGNoaW5nID0gdHJ1ZTtcblxuICAgICAgICBsb2dnZXIuaW5mbygnJyk7XG4gICAgICAgIGxvZ2dlci5pbmZvKGBXYXRjaGluZyBzb3VyY2VzIGluICR7c3JjRm9sZGVyfSBmb2xkZXJgKTtcblxuICAgICAgICBsZXQgd2F0Y2hlciA9IGNob2tpZGFyLndhdGNoKHNyY0ZvbGRlciwge1xuICAgICAgICAgICAgICAgIGF3YWl0V3JpdGVGaW5pc2g6IHRydWUsXG4gICAgICAgICAgICAgICAgaWdub3JlZDogLyhzcGVjfFxcLmQpXFwudHMvXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIHRpbWVyQWRkQW5kUmVtb3ZlUmVmLFxuICAgICAgICAgICAgdGltZXJDaGFuZ2VSZWYsXG4gICAgICAgICAgICB3YWl0ZXJBZGRBbmRSZW1vdmUgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyQWRkQW5kUmVtb3ZlUmVmKTtcbiAgICAgICAgICAgICAgICB0aW1lckFkZEFuZFJlbW92ZVJlZiA9IHNldFRpbWVvdXQocnVubmVyQWRkQW5kUmVtb3ZlLCAxMDAwKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBydW5uZXJBZGRBbmRSZW1vdmUgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5nZW5lcmF0ZSgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHdhaXRlckNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZXJDaGFuZ2VSZWYpO1xuICAgICAgICAgICAgICAgIHRpbWVyQ2hhbmdlUmVmID0gc2V0VGltZW91dChydW5uZXJDaGFuZ2UsIDEwMDApO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJ1bm5lckNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldFVwZGF0ZWRGaWxlcyh3YXRjaENoYW5nZWRGaWxlcyk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaGFzV2F0Y2hlZEZpbGVzVFNGaWxlcygpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ2V0TWljcm9EZXBlbmRlbmNpZXNEYXRhKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWJ1aWxkRXh0ZXJuYWxEb2N1bWVudGF0aW9uKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICBpZiAodGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmluY2x1ZGVzICE9PSAnJykge1xuICAgICAgICAgICAgd2F0Y2hlci5hZGQodGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmluY2x1ZGVzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdhdGNoZXJcbiAgICAgICAgICAgIC5vbigncmVhZHknLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgd2F0Y2hlclxuICAgICAgICAgICAgICAgICAgICAub24oJ2FkZCcsIChmaWxlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoYEZpbGUgJHtmaWxlfSBoYXMgYmVlbiBhZGRlZGApO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGVzdCBleHRlbnNpb24sIGlmIHRzXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyByZXNjYW4gZXZlcnl0aGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhdGguZXh0bmFtZShmaWxlKSA9PT0gJy50cycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3YWl0ZXJBZGRBbmRSZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLm9uKCdjaGFuZ2UnLCAoZmlsZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKGBGaWxlICR7ZmlsZX0gaGFzIGJlZW4gY2hhbmdlZGApO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGVzdCBleHRlbnNpb24sIGlmIHRzXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyByZXNjYW4gb25seSBmaWxlXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGF0aC5leHRuYW1lKGZpbGUpID09PSAnLnRzJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdhdGNoQ2hhbmdlZEZpbGVzLnB1c2gocGF0aC5qb2luKHByb2Nlc3MuY3dkKCkgKyBwYXRoLnNlcCArIGZpbGUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3YWl0ZXJDaGFuZ2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXRoLmV4dG5hbWUoZmlsZSkgPT09ICcubWQnIHx8IHBhdGguZXh0bmFtZShmaWxlKSA9PT0gJy5qc29uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdhdGNoQ2hhbmdlZEZpbGVzLnB1c2gocGF0aC5qb2luKHByb2Nlc3MuY3dkKCkgKyBwYXRoLnNlcCArIGZpbGUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3YWl0ZXJDaGFuZ2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLm9uKCd1bmxpbmsnLCAoZmlsZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKGBGaWxlICR7ZmlsZX0gaGFzIGJlZW4gcmVtb3ZlZGApO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGVzdCBleHRlbnNpb24sIGlmIHRzXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyByZXNjYW4gZXZlcnl0aGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhdGguZXh0bmFtZShmaWxlKSA9PT0gJy50cycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3YWl0ZXJBZGRBbmRSZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm4gdGhlIGFwcGxpY2F0aW9uIC8gcm9vdCBjb21wb25lbnQgaW5zdGFuY2UuXG4gICAgICovXG4gICAgZ2V0IGFwcGxpY2F0aW9uKCk6QXBwbGljYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cblxuICAgIGdldCBpc0NMSSgpOmJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuIiwiaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IHJlYWRDb25maWdGaWxlLCBmb3JtYXREaWFnbm9zdGljcywgRm9ybWF0RGlhZ25vc3RpY3NIb3N0LCBzeXMgfSBmcm9tICd0eXBlc2NyaXB0JztcblxuY29uc3QgZ2V0Q3VycmVudERpcmVjdG9yeSA9IHN5cy5nZXRDdXJyZW50RGlyZWN0b3J5O1xuY29uc3QgdXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcyA9IHN5cy51c2VDYXNlU2Vuc2l0aXZlRmlsZU5hbWVzO1xuY29uc3QgbmV3TGluZSA9IHN5cy5uZXdMaW5lO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TmV3TGluZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiBuZXdMaW5lO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMgPyBmaWxlTmFtZSA6IGZpbGVOYW1lLnRvTG93ZXJDYXNlKCk7XG59XG5cbmV4cG9ydCBjb25zdCBmb3JtYXREaWFnbm9zdGljc0hvc3Q6IEZvcm1hdERpYWdub3N0aWNzSG9zdCA9IHtcbiAgICBnZXRDdXJyZW50RGlyZWN0b3J5LFxuICAgIGdldENhbm9uaWNhbEZpbGVOYW1lLFxuICAgIGdldE5ld0xpbmVcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkQ29uZmlnKGNvbmZpZ0ZpbGU6IHN0cmluZyk6IGFueSB7XG4gICAgbGV0IHJlc3VsdCA9IHJlYWRDb25maWdGaWxlKGNvbmZpZ0ZpbGUsIHN5cy5yZWFkRmlsZSk7XG4gICAgaWYgKHJlc3VsdC5lcnJvcikge1xuICAgICAgICBsZXQgbWVzc2FnZSA9IGZvcm1hdERpYWdub3N0aWNzKFtyZXN1bHQuZXJyb3JdLCBmb3JtYXREaWFnbm9zdGljc0hvc3QpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQuY29uZmlnO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwQm9tKHNvdXJjZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBpZiAoc291cmNlLmNoYXJDb2RlQXQoMCkgPT09IDB4RkVGRikge1xuXHRcdHJldHVybiBzb3VyY2Uuc2xpY2UoMSk7XG5cdH1cblx0cmV0dXJuIHNvdXJjZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhhbmRsZVBhdGgoZmlsZXM6IHN0cmluZ1tdLCBjd2Q6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICBsZXQgX2ZpbGVzID0gZmlsZXMsXG4gICAgICAgIGkgPSAwLFxuICAgICAgICBsZW4gPSBmaWxlcy5sZW5ndGg7XG5cbiAgICBmb3IoaTsgaTxsZW47IGkrKykge1xuICAgICAgICBpZiAoZmlsZXNbaV0uaW5kZXhPZihjd2QpID09PSAtMSkge1xuICAgICAgICAgICAgZmlsZXNbaV0gPSBwYXRoLnJlc29sdmUoY3dkICsgcGF0aC5zZXAgKyBmaWxlc1tpXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gX2ZpbGVzO1xufVxuIiwiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcblxuaW1wb3J0IHsgQXBwbGljYXRpb24gfSBmcm9tICcuL2FwcC9hcHBsaWNhdGlvbic7XG5cbmltcG9ydCB7IENPTVBPRE9DX0RFRkFVTFRTIH0gZnJvbSAnLi91dGlscy9kZWZhdWx0cyc7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tICcuL2xvZ2dlcic7XG5pbXBvcnQgeyByZWFkQ29uZmlnLCBoYW5kbGVQYXRoIH0gZnJvbSAnLi91dGlscy91dGlscyc7XG5cbmxldCBwa2cgPSByZXF1aXJlKCcuLi9wYWNrYWdlLmpzb24nKSxcbiAgICBwcm9ncmFtID0gcmVxdWlyZSgnY29tbWFuZGVyJyksXG4gICAgZ2xvYiA9IHJlcXVpcmUoJ2dsb2InKSxcbiAgICBvcyA9IHJlcXVpcmUoJ29zJyksXG4gICAgb3NOYW1lID0gcmVxdWlyZSgnb3MtbmFtZScpLFxuICAgIGZpbGVzID0gW10sXG4gICAgY3dkID0gcHJvY2Vzcy5jd2QoKTtcblxucHJvY2Vzcy5zZXRNYXhMaXN0ZW5lcnMoMCk7XG5cbmV4cG9ydCBjbGFzcyBDbGlBcHBsaWNhdGlvbiBleHRlbmRzIEFwcGxpY2F0aW9uXG57XG4gICAgLyoqXG4gICAgICogUnVuIGNvbXBvZG9jIGZyb20gdGhlIGNvbW1hbmQgbGluZS5cbiAgICAgKi9cbiAgICBwcm90ZWN0ZWQgZ2VuZXJhdGUoKSB7XG5cbiAgICAgICAgZnVuY3Rpb24gbGlzdCh2YWwpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWwuc3BsaXQoJywnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByb2dyYW1cbiAgICAgICAgICAgIC52ZXJzaW9uKHBrZy52ZXJzaW9uKVxuICAgICAgICAgICAgLnVzYWdlKCc8c3JjPiBbb3B0aW9uc10nKVxuICAgICAgICAgICAgLm9wdGlvbignLXAsIC0tdHNjb25maWcgW2NvbmZpZ10nLCAnQSB0c2NvbmZpZy5qc29uIGZpbGUnKVxuICAgICAgICAgICAgLm9wdGlvbignLWQsIC0tb3V0cHV0IFtmb2xkZXJdJywgJ1doZXJlIHRvIHN0b3JlIHRoZSBnZW5lcmF0ZWQgZG9jdW1lbnRhdGlvbiAoZGVmYXVsdDogLi9kb2N1bWVudGF0aW9uKScsIENPTVBPRE9DX0RFRkFVTFRTLmZvbGRlcilcbiAgICAgICAgICAgIC5vcHRpb24oJy15LCAtLWV4dFRoZW1lIFtmaWxlXScsICdFeHRlcm5hbCBzdHlsaW5nIHRoZW1lIGZpbGUnKVxuICAgICAgICAgICAgLm9wdGlvbignLW4sIC0tbmFtZSBbbmFtZV0nLCAnVGl0bGUgZG9jdW1lbnRhdGlvbicsIENPTVBPRE9DX0RFRkFVTFRTLnRpdGxlKVxuICAgICAgICAgICAgLm9wdGlvbignLWEsIC0tYXNzZXRzRm9sZGVyIFtmb2xkZXJdJywgJ0V4dGVybmFsIGFzc2V0cyBmb2xkZXIgdG8gY29weSBpbiBnZW5lcmF0ZWQgZG9jdW1lbnRhdGlvbiBmb2xkZXInKVxuICAgICAgICAgICAgLm9wdGlvbignLW8sIC0tb3BlbicsICdPcGVuIHRoZSBnZW5lcmF0ZWQgZG9jdW1lbnRhdGlvbicsIGZhbHNlKVxuICAgICAgICAgICAgLm9wdGlvbignLXQsIC0tc2lsZW50JywgJ0luIHNpbGVudCBtb2RlLCBsb2cgbWVzc2FnZXMgYXJlblxcJ3QgbG9nZ2VkIGluIHRoZSBjb25zb2xlJywgZmFsc2UpXG4gICAgICAgICAgICAub3B0aW9uKCctcywgLS1zZXJ2ZScsICdTZXJ2ZSBnZW5lcmF0ZWQgZG9jdW1lbnRhdGlvbiAoZGVmYXVsdCBodHRwOi8vbG9jYWxob3N0OjgwODAvKScsIGZhbHNlKVxuICAgICAgICAgICAgLm9wdGlvbignLXIsIC0tcG9ydCBbcG9ydF0nLCAnQ2hhbmdlIGRlZmF1bHQgc2VydmluZyBwb3J0JywgQ09NUE9ET0NfREVGQVVMVFMucG9ydClcbiAgICAgICAgICAgIC5vcHRpb24oJy13LCAtLXdhdGNoJywgJ1dhdGNoIHNvdXJjZSBmaWxlcyBhZnRlciBzZXJ2ZSBhbmQgZm9yY2UgZG9jdW1lbnRhdGlvbiByZWJ1aWxkJywgZmFsc2UpXG4gICAgICAgICAgICAub3B0aW9uKCctLXRoZW1lIFt0aGVtZV0nLCAnQ2hvb3NlIG9uZSBvZiBhdmFpbGFibGUgdGhlbWVzLCBkZWZhdWx0IGlzIFxcJ2dpdGJvb2tcXCcgKGxhcmF2ZWwsIG9yaWdpbmFsLCBwb3N0bWFyaywgcmVhZHRoZWRvY3MsIHN0cmlwZSwgdmFncmFudCknKVxuICAgICAgICAgICAgLm9wdGlvbignLS1oaWRlR2VuZXJhdG9yJywgJ0RvIG5vdCBwcmludCB0aGUgQ29tcG9kb2MgbGluayBhdCB0aGUgYm90dG9tIG9mIHRoZSBwYWdlJywgZmFsc2UpXG4gICAgICAgICAgICAub3B0aW9uKCctLXRvZ2dsZU1lbnVJdGVtcyA8aXRlbXM+JywgJ0Nsb3NlIGJ5IGRlZmF1bHQgaXRlbXMgaW4gdGhlIG1lbnUgZXhhbXBsZTogXFwnYWxsXFwnIG9yIFxcJ21vZHVsZXNcXCcsXFwnY29tcG9uZW50c1xcJyxcXCdkaXJlY3RpdmVzXFwnLFxcJ2NsYXNzZXNcXCcsXFwnaW5qZWN0YWJsZXNcXCcsXFwnaW50ZXJmYWNlc1xcJyxcXCdwaXBlc1xcJyxcXCdhZGRpdGlvbmFsUGFnZXNcXCcnLCBsaXN0KVxuICAgICAgICAgICAgLm9wdGlvbignLS1pbmNsdWRlcyBbcGF0aF0nLCAnUGF0aCBvZiBleHRlcm5hbCBtYXJrZG93biBmaWxlcyB0byBpbmNsdWRlJylcbiAgICAgICAgICAgIC5vcHRpb24oJy0taW5jbHVkZXNOYW1lIFtuYW1lXScsICdOYW1lIG9mIGl0ZW0gbWVudSBvZiBleHRlcm5hbHMgbWFya2Rvd24gZmlsZXMgKGRlZmF1bHQgXCJBZGRpdGlvbmFsIGRvY3VtZW50YXRpb25cIiknLCBDT01QT0RPQ19ERUZBVUxUUy5hZGRpdGlvbmFsRW50cnlOYW1lKVxuICAgICAgICAgICAgLm9wdGlvbignLS1jb3ZlcmFnZVRlc3QgW3RocmVzaG9sZF0nLCAnVGVzdCBjb21tYW5kIG9mIGRvY3VtZW50YXRpb24gY292ZXJhZ2Ugd2l0aCBhIHRocmVzaG9sZCAoZGVmYXVsdCA3MCknKVxuICAgICAgICAgICAgLm9wdGlvbignLS1kaXNhYmxlU291cmNlQ29kZScsICdEbyBub3QgYWRkIHNvdXJjZSBjb2RlIHRhYicsIGZhbHNlKVxuICAgICAgICAgICAgLm9wdGlvbignLS1kaXNhYmxlR3JhcGgnLCAnRG8gbm90IGFkZCB0aGUgZGVwZW5kZW5jeSBncmFwaCcsIGZhbHNlKVxuICAgICAgICAgICAgLm9wdGlvbignLS1kaXNhYmxlQ292ZXJhZ2UnLCAnRG8gbm90IGFkZCB0aGUgZG9jdW1lbnRhdGlvbiBjb3ZlcmFnZSByZXBvcnQnLCBmYWxzZSlcbiAgICAgICAgICAgIC5vcHRpb24oJy0tZGlzYWJsZVByaXZhdGVPckludGVybmFsU3VwcG9ydCcsICdEbyBub3Qgc2hvdyBwcml2YXRlIG9yIEBpbnRlcm5hbCBpbiBnZW5lcmF0ZWQgZG9jdW1lbnRhdGlvbicsIGZhbHNlKVxuICAgICAgICAgICAgLnBhcnNlKHByb2Nlc3MuYXJndik7XG5cbiAgICAgICAgbGV0IG91dHB1dEhlbHAgPSAoKSA9PiB7XG4gICAgICAgICAgICBwcm9ncmFtLm91dHB1dEhlbHAoKVxuICAgICAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByb2dyYW0ub3V0cHV0KSB7XG4gICAgICAgICAgICB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEub3V0cHV0ID0gcHJvZ3JhbS5vdXRwdXQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJvZ3JhbS5leHRUaGVtZSkge1xuICAgICAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmV4dFRoZW1lID0gcHJvZ3JhbS5leHRUaGVtZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwcm9ncmFtLnRoZW1lKSB7XG4gICAgICAgICAgICB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEudGhlbWUgPSBwcm9ncmFtLnRoZW1lO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByb2dyYW0ubmFtZSkge1xuICAgICAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmRvY3VtZW50YXRpb25NYWluTmFtZSA9IHByb2dyYW0ubmFtZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwcm9ncmFtLmFzc2V0c0ZvbGRlcikge1xuICAgICAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmFzc2V0c0ZvbGRlciA9IHByb2dyYW0uYXNzZXRzRm9sZGVyO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByb2dyYW0ub3Blbikge1xuICAgICAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLm9wZW4gPSBwcm9ncmFtLm9wZW47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJvZ3JhbS50b2dnbGVNZW51SXRlbXMpIHtcbiAgICAgICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS50b2dnbGVNZW51SXRlbXMgPSBwcm9ncmFtLnRvZ2dsZU1lbnVJdGVtcztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwcm9ncmFtLmluY2x1ZGVzKSB7XG4gICAgICAgICAgICB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuaW5jbHVkZXMgID0gcHJvZ3JhbS5pbmNsdWRlcztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwcm9ncmFtLmluY2x1ZGVzTmFtZSkge1xuICAgICAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmluY2x1ZGVzTmFtZSAgPSBwcm9ncmFtLmluY2x1ZGVzTmFtZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwcm9ncmFtLnNpbGVudCkge1xuICAgICAgICAgICAgbG9nZ2VyLnNpbGVudCA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByb2dyYW0uc2VydmUpIHtcbiAgICAgICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5zZXJ2ZSAgPSBwcm9ncmFtLnNlcnZlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByb2dyYW0ucG9ydCkge1xuICAgICAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLnBvcnQgPSBwcm9ncmFtLnBvcnQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJvZ3JhbS53YXRjaCkge1xuICAgICAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLndhdGNoID0gcHJvZ3JhbS53YXRjaDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwcm9ncmFtLmhpZGVHZW5lcmF0b3IpIHtcbiAgICAgICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5oaWRlR2VuZXJhdG9yID0gcHJvZ3JhbS5oaWRlR2VuZXJhdG9yO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByb2dyYW0uaW5jbHVkZXMpIHtcbiAgICAgICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5pbmNsdWRlcyA9IHByb2dyYW0uaW5jbHVkZXM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJvZ3JhbS5pbmNsdWRlc05hbWUpIHtcbiAgICAgICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5pbmNsdWRlc05hbWUgPSBwcm9ncmFtLmluY2x1ZGVzTmFtZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwcm9ncmFtLmNvdmVyYWdlVGVzdCkge1xuICAgICAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmNvdmVyYWdlVGVzdCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuY292ZXJhZ2VUZXN0VGhyZXNob2xkID0gKHR5cGVvZiBwcm9ncmFtLmNvdmVyYWdlVGVzdCA9PT0gJ3N0cmluZycpID8gcGFyc2VJbnQocHJvZ3JhbS5jb3ZlcmFnZVRlc3QpIDogQ09NUE9ET0NfREVGQVVMVFMuZGVmYXVsdENvdmVyYWdlVGhyZXNob2xkO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByb2dyYW0uZGlzYWJsZVNvdXJjZUNvZGUpIHtcbiAgICAgICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5kaXNhYmxlU291cmNlQ29kZSA9IHByb2dyYW0uZGlzYWJsZVNvdXJjZUNvZGU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJvZ3JhbS5kaXNhYmxlR3JhcGgpIHtcbiAgICAgICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS5kaXNhYmxlR3JhcGggPSBwcm9ncmFtLmRpc2FibGVHcmFwaDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwcm9ncmFtLmRpc2FibGVDb3ZlcmFnZSkge1xuICAgICAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmRpc2FibGVDb3ZlcmFnZSA9IHByb2dyYW0uZGlzYWJsZUNvdmVyYWdlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByb2dyYW0uZGlzYWJsZVByaXZhdGVPckludGVybmFsU3VwcG9ydCkge1xuICAgICAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLmRpc2FibGVQcml2YXRlT3JJbnRlcm5hbFN1cHBvcnQgPSBwcm9ncmFtLmRpc2FibGVQcml2YXRlT3JJbnRlcm5hbFN1cHBvcnQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRoaXMuaXNXYXRjaGluZykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9zcmMvcmVzb3VyY2VzL2ltYWdlcy9iYW5uZXInKSkudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhwa2cudmVyc2lvbik7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgTm9kZS5qcyB2ZXJzaW9uIDogJHtwcm9jZXNzLnZlcnNpb259YCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgT3BlcmF0aW5nIHN5c3RlbSA6ICR7b3NOYW1lKG9zLnBsYXRmb3JtKCksIG9zLnJlbGVhc2UoKSl9YCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJvZ3JhbS5zZXJ2ZSAmJiAhcHJvZ3JhbS50c2NvbmZpZyAmJiBwcm9ncmFtLm91dHB1dCkge1xuICAgICAgICAgICAgLy8gaWYgLXMgJiAtZCwgc2VydmUgaXRcbiAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhwcm9ncmFtLm91dHB1dCkpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoYCR7cHJvZ3JhbS5vdXRwdXR9IGZvbGRlciBkb2Vzbid0IGV4aXN0YCk7XG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgU2VydmluZyBkb2N1bWVudGF0aW9uIGZyb20gJHtwcm9ncmFtLm91dHB1dH0gYXQgaHR0cDovLzEyNy4wLjAuMToke3Byb2dyYW0ucG9ydH1gKTtcbiAgICAgICAgICAgICAgICBzdXBlci5ydW5XZWJTZXJ2ZXIocHJvZ3JhbS5vdXRwdXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHByb2dyYW0uc2VydmUgJiYgIXByb2dyYW0udHNjb25maWcgJiYgIXByb2dyYW0ub3V0cHV0KSB7XG4gICAgICAgICAgICAvLyBpZiBvbmx5IC1zIGZpbmQgLi9kb2N1bWVudGF0aW9uLCBpZiBvayBzZXJ2ZSwgZWxzZSBlcnJvciBwcm92aWRlIC1kXG4gICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMocHJvZ3JhbS5vdXRwdXQpKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKCdQcm92aWRlIG91dHB1dCBnZW5lcmF0ZWQgZm9sZGVyIHdpdGggLWQgZmxhZycpO1xuICAgICAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYFNlcnZpbmcgZG9jdW1lbnRhdGlvbiBmcm9tICR7cHJvZ3JhbS5vdXRwdXR9IGF0IGh0dHA6Ly8xMjcuMC4wLjE6JHtwcm9ncmFtLnBvcnR9YCk7XG4gICAgICAgICAgICAgICAgc3VwZXIucnVuV2ViU2VydmVyKHByb2dyYW0ub3V0cHV0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChwcm9ncmFtLmhpZGVHZW5lcmF0b3IpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEuaGlkZUdlbmVyYXRvciA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCBkZWZhdWx0V2Fsa0ZPbGRlciA9IGN3ZCB8fCAnLicsXG4gICAgICAgICAgICAgICAgd2FsayA9IChkaXIsIGV4Y2x1ZGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHJlc3VsdHMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGxpc3QgPSBmcy5yZWFkZGlyU3luYyhkaXIpO1xuICAgICAgICAgICAgICAgICAgICBsaXN0LmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBleGNsdWRlVGVzdCA9IF8uZmluZChleGNsdWRlLCBmdW5jdGlvbihvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGdsb2JGaWxlcyA9IGdsb2Iuc3luYyhvLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN3ZDogY3dkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdsb2JGaWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBmaWxlTmFtZUZvckdsb2JTZWFyY2ggPSBwYXRoLmpvaW4oZGlyLCBmaWxlKS5yZXBsYWNlKGN3ZCArIHBhdGguc2VwLCAnJyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRHbG9iU2VhcmNoID0gZ2xvYkZpbGVzLmZpbmRJbmRleCgoZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlbGVtZW50ID09PSBmaWxlTmFtZUZvckdsb2JTZWFyY2g7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlc3QgPSByZXN1bHRHbG9iU2VhcmNoICE9PSAtMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRlc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKCdFeGNsdWRpbmcnLCBwYXRoLmpvaW4oZGlyLCBmaWxlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRlc3Q7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRlc3QgPSBwYXRoLmJhc2VuYW1lKG8pID09PSBmaWxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGVzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLndhcm4oJ0V4Y2x1ZGluZycsIHBhdGguam9pbihkaXIsIGZpbGUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGVzdDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZXhjbHVkZVRlc3QgPT09ICd1bmRlZmluZWQnICYmIGRpci5pbmRleE9mKCdub2RlX21vZHVsZXMnKSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlID0gcGF0aC5qb2luKGRpciwgZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHN0YXQgPSBmcy5zdGF0U3luYyhmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdCAmJiBzdGF0LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0cyA9IHJlc3VsdHMuY29uY2F0KHdhbGsoZmlsZSwgZXhjbHVkZSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICgvKHNwZWN8XFwuZClcXC50cy8udGVzdChmaWxlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybignSWdub3JpbmcnLCBmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAocGF0aC5leHRuYW1lKGZpbGUpID09PSAnLnRzJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ0luY2x1ZGluZycsIGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKHByb2dyYW0udHNjb25maWcgJiYgcHJvZ3JhbS5hcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS50c2NvbmZpZyA9IHByb2dyYW0udHNjb25maWc7XG4gICAgICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHByb2dyYW0udHNjb25maWcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgXCIke3Byb2dyYW0udHNjb25maWd9XCIgZmlsZSB3YXMgbm90IGZvdW5kIGluIHRoZSBjdXJyZW50IGRpcmVjdG9yeWApO1xuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IF9maWxlID0gcGF0aC5qb2luKFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksIHBhdGguZGlybmFtZSh0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEudHNjb25maWcpKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGguYmFzZW5hbWUodGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLnRzY29uZmlnKVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAvLyB1c2UgdGhlIGN1cnJlbnQgZGlyZWN0b3J5IG9mIHRzY29uZmlnLmpzb24gYXMgYSB3b3JraW5nIGRpcmVjdG9yeVxuICAgICAgICAgICAgICAgICAgICBjd2QgPSBfZmlsZS5zcGxpdChwYXRoLnNlcCkuc2xpY2UoMCwgLTEpLmpvaW4ocGF0aC5zZXApO1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbygnVXNpbmcgdHNjb25maWcnLCBfZmlsZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgbGV0IHRzQ29uZmlnRmlsZSA9IHJlYWRDb25maWcoX2ZpbGUpO1xuICAgICAgICAgICAgICAgICAgICBmaWxlcyA9IHRzQ29uZmlnRmlsZS5maWxlcztcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlcyA9IGhhbmRsZVBhdGgoZmlsZXMsIGN3ZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoIWZpbGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZXhjbHVkZSA9IHRzQ29uZmlnRmlsZS5leGNsdWRlIHx8IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZXMgPSB3YWxrKGN3ZCB8fCAnLicsIGV4Y2x1ZGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgc3VwZXIuc2V0RmlsZXMoZmlsZXMpO1xuICAgICAgICAgICAgICAgICAgICBzdXBlci5nZW5lcmF0ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gIGVsc2UgaWYgKHByb2dyYW0udHNjb25maWcgJiYgcHJvZ3JhbS5hcmdzLmxlbmd0aCA+IDAgJiYgcHJvZ3JhbS5jb3ZlcmFnZVRlc3QpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbygnUnVuIGRvY3VtZW50YXRpb24gY292ZXJhZ2UgdGVzdCcpO1xuICAgICAgICAgICAgICAgIHRoaXMuY29uZmlndXJhdGlvbi5tYWluRGF0YS50c2NvbmZpZyA9IHByb2dyYW0udHNjb25maWc7XG4gICAgICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHByb2dyYW0udHNjb25maWcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgXCIke3Byb2dyYW0udHNjb25maWd9XCIgZmlsZSB3YXMgbm90IGZvdW5kIGluIHRoZSBjdXJyZW50IGRpcmVjdG9yeWApO1xuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IF9maWxlID0gcGF0aC5qb2luKFxuICAgICAgICAgICAgICAgICAgICAgIHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCBwYXRoLmRpcm5hbWUodGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLnRzY29uZmlnKSksXG4gICAgICAgICAgICAgICAgICAgICAgcGF0aC5iYXNlbmFtZSh0aGlzLmNvbmZpZ3VyYXRpb24ubWFpbkRhdGEudHNjb25maWcpXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHVzZSB0aGUgY3VycmVudCBkaXJlY3Rvcnkgb2YgdHNjb25maWcuanNvbiBhcyBhIHdvcmtpbmcgZGlyZWN0b3J5XG4gICAgICAgICAgICAgICAgICAgIGN3ZCA9IF9maWxlLnNwbGl0KHBhdGguc2VwKS5zbGljZSgwLCAtMSkuam9pbihwYXRoLnNlcCk7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdVc2luZyB0c2NvbmZpZycsIF9maWxlKTtcblxuICAgICAgICAgICAgICAgICAgICBsZXQgdHNDb25maWdGaWxlID0gcmVhZENvbmZpZyhfZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgIGZpbGVzID0gdHNDb25maWdGaWxlLmZpbGVzO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmlsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVzID0gaGFuZGxlUGF0aChmaWxlcywgY3dkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICghZmlsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBleGNsdWRlID0gdHNDb25maWdGaWxlLmV4Y2x1ZGUgfHwgW107XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVzID0gd2Fsayhjd2QgfHwgJy4nLCBleGNsdWRlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHN1cGVyLnNldEZpbGVzKGZpbGVzKTtcbiAgICAgICAgICAgICAgICAgICAgc3VwZXIudGVzdENvdmVyYWdlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9ncmFtLnRzY29uZmlnICYmIHByb2dyYW0uYXJncy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb25maWd1cmF0aW9uLm1haW5EYXRhLnRzY29uZmlnID0gcHJvZ3JhbS50c2NvbmZpZztcbiAgICAgICAgICAgICAgICBsZXQgc291cmNlRm9sZGVyID0gcHJvZ3JhbS5hcmdzWzBdO1xuICAgICAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhzb3VyY2VGb2xkZXIpKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgUHJvdmlkZWQgc291cmNlIGZvbGRlciAke3NvdXJjZUZvbGRlcn0gd2FzIG5vdCBmb3VuZCBpbiB0aGUgY3VycmVudCBkaXJlY3RvcnlgKTtcbiAgICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdVc2luZyBwcm92aWRlZCBzb3VyY2UgZm9sZGVyJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHByb2dyYW0udHNjb25maWcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoYFwiJHtwcm9ncmFtLnRzY29uZmlnfVwiIGZpbGUgd2FzIG5vdCBmb3VuZCBpbiB0aGUgY3VycmVudCBkaXJlY3RvcnlgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0c0NvbmZpZ0ZpbGUgPSByZWFkQ29uZmlnKHByb2dyYW0udHNjb25maWcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGV4Y2x1ZGUgPSB0c0NvbmZpZ0ZpbGUuZXhjbHVkZSB8fCBbXTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZXMgPSB3YWxrKHBhdGgucmVzb2x2ZShzb3VyY2VGb2xkZXIpLCBleGNsdWRlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgc3VwZXIuc2V0RmlsZXMoZmlsZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VwZXIuZ2VuZXJhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKCd0c2NvbmZpZy5qc29uIGZpbGUgd2FzIG5vdCBmb3VuZCwgcGxlYXNlIHVzZSAtcCBmbGFnJyk7XG4gICAgICAgICAgICAgICAgb3V0cHV0SGVscCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbInBrZyIsIl8uZm9yRWFjaCIsIl8uc29ydEJ5IiwiXy5jbG9uZURlZXAiLCJfLmZpbmRJbmRleCIsIl8uY29uY2F0IiwiXy5maW5kIiwiXy5ncm91cEJ5IiwiSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlciIsIkhhbmRsZWJhcnMuVXRpbHMiLCJIYW5kbGViYXJzLlNhZmVTdHJpbmciLCJwYXRoIiwicmVzb2x2ZSIsImZzLnJlYWRGaWxlIiwicGF0aC5yZXNvbHZlIiwiSGFuZGxlYmFycy5yZWdpc3RlclBhcnRpYWwiLCJIYW5kbGViYXJzLmNvbXBpbGUiLCJmcy5vdXRwdXRGaWxlIiwicGF0aC5zZXAiLCJtYXJrZWQiLCJkaXJuYW1lIiwicGF0aC5kaXJuYW1lIiwicGF0aC5iYXNlbmFtZSIsImZzLmV4aXN0c1N5bmMiLCJwYXRoLmlzQWJzb2x1dGUiLCJwYXRoLmpvaW4iLCJmcy5yZWFkRmlsZVN5bmMiLCJ0cy5jcmVhdGVTb3VyY2VGaWxlIiwiXy51bmlxIiwic2VwIiwiXy51bmlxV2l0aCIsIl8uaXNFcXVhbCIsInRzLlN5bnRheEtpbmQiLCJ0cy5TY3JpcHRUYXJnZXQiLCJ0cy5Nb2R1bGVLaW5kIiwidHMuY3JlYXRlUHJvZ3JhbSIsInV0aWwuaW5zcGVjdCIsInBhdGguZXh0bmFtZSIsInJlYWRGaWxlU3luYyIsInRzLmZvckVhY2hDaGlsZCIsInRzLlN5bWJvbEZsYWdzIiwidHMuZGlzcGxheVBhcnRzVG9TdHJpbmciLCJ0cy5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbiIsInRzLmdldENsYXNzSW1wbGVtZW50c0hlcml0YWdlQ2xhdXNlRWxlbWVudHMiLCJ0cy5nZXRDbGFzc0V4dGVuZHNIZXJpdGFnZUNsYXVzZUVsZW1lbnQiLCJmcy5jb3B5IiwiTGl2ZVNlcnZlci5zdGFydCIsInN5cyIsInJlYWRDb25maWdGaWxlIiwiZm9ybWF0RGlhZ25vc3RpY3MiLCJnbG9iIiwiY3dkIiwiZnMucmVhZGRpclN5bmMiLCJmcy5zdGF0U3luYyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsSUFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFBO0FBQ2hDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7QUFDckIsSUFBSUEsS0FBRyxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBRXJDLElBQUssS0FLSjtBQUxELFdBQUssS0FBSztJQUNULGlDQUFJLENBQUE7SUFDSixtQ0FBSyxDQUFBO0lBQ0YsbUNBQUssQ0FBQTtJQUNMLGlDQUFJLENBQUE7Q0FDUCxFQUxJLEtBQUssS0FBTCxLQUFLLFFBS1Q7QUFFRDtJQU9DO1FBQ0MsSUFBSSxDQUFDLElBQUksR0FBR0EsS0FBRyxDQUFDLElBQUksQ0FBQztRQUNyQixJQUFJLENBQUMsT0FBTyxHQUFHQSxLQUFHLENBQUMsT0FBTyxDQUFDO1FBQzNCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQztRQUN4QixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztLQUNuQjtJQUVELHFCQUFJLEdBQUo7UUFBSyxjQUFPO2FBQVAsVUFBTyxFQUFQLHFCQUFPLEVBQVAsSUFBTztZQUFQLHlCQUFPOztRQUNYLElBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTTtZQUFFLE9BQU87UUFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FDVixJQUFJLENBQUMsTUFBTSxPQUFYLElBQUksR0FBUSxLQUFLLENBQUMsSUFBSSxTQUFLLElBQUksR0FDL0IsQ0FBQztLQUNGO0lBRUQsc0JBQUssR0FBTDtRQUFNLGNBQU87YUFBUCxVQUFPLEVBQVAscUJBQU8sRUFBUCxJQUFPO1lBQVAseUJBQU87O1FBQ1osSUFBRyxDQUFDLElBQUksQ0FBQyxNQUFNO1lBQUUsT0FBTztRQUN4QixJQUFJLENBQUMsTUFBTSxDQUNWLElBQUksQ0FB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
