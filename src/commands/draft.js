"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.draftCommand = draftCommand;
exports.formatDraftsAsJson = formatDraftsAsJson;
var chalk_1 = require("chalk");
var banner_js_1 = require("../ui/banner.js");
var config_js_1 = require("../lib/config.js");
var splitter_js_1 = require("../lib/splitter.js");
var context_js_1 = require("../lib/context.js");
var node_child_process_1 = require("node:child_process");
/**
 * Draft command handler
 */
function draftCommand(options) {
    return __awaiter(this, void 0, void 0, function () {
        var features, projectFiles, contextLimit, specDrafts;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Print welcome banner
                    (0, banner_js_1.printBanner)();
                    console.log(chalk_1.default.cyan("\n\uD83D\uDD0D Analyzing \"".concat(options.description, "\" for potential specs...")));
                    return [4 /*yield*/, (0, splitter_js_1.splitFeature)(options.description)];
                case 1:
                    features = _a.sent();
                    projectFiles = getProjectFiles();
                    contextLimit = options.context || 50;
                    return [4 /*yield*/, Promise.all(features.map(function (feature) { return __awaiter(_this, void 0, void 0, function () {
                            var context, relevantFiles, draft;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, (0, context_js_1.buildContext)(feature, false)];
                                    case 1:
                                        context = _a.sent();
                                        relevantFiles = context
                                            .sort(function (a, b) { return b.relevance - a.relevance; })
                                            .slice(0, contextLimit)
                                            .map(function (c) { return c.path; });
                                        draft = {
                                            slug: feature.slug,
                                            title: feature.title,
                                            description: feature.description,
                                            files: relevantFiles,
                                            checks: [
                                                // Add some default checks based on the feature description
                                                "Implement ".concat(feature.title),
                                                "Add tests for ".concat(feature.title)
                                            ],
                                            approved: false
                                        };
                                        return [2 /*return*/, draft];
                                }
                            });
                        }); }))];
                case 2:
                    specDrafts = _a.sent();
                    console.log(chalk_1.default.green("\n\u2705 Generated ".concat(specDrafts.length, " draft specifications")));
                    // Return as JSON for processing by caller
                    return [2 /*return*/, specDrafts];
            }
        });
    });
}
/**
 * Get list of files in the project
 */
function getProjectFiles() {
    try {
        // Load config to get tree command
        var config = (0, config_js_1.load)();
        var treeCmd = config.tree_cmd || "git ls-files | grep -E '\\\\.(ts|js|tsx|jsx)$'";
        // Execute tree command
        var output = (0, node_child_process_1.execSync)(treeCmd, { encoding: 'utf8' });
        // Split output by lines and clean up
        return output
            .split('\n')
            .map(function (line) { return line.trim(); })
            .filter(function (line) { return line.length > 0 && !line.includes('node_modules'); });
    }
    catch (error) {
        console.error('Error getting project files:', error);
        return [];
    }
}
/**
 * Format draft specs as JSON string
 */
function formatDraftsAsJson(drafts) {
    return JSON.stringify(drafts, null, 2);
}
