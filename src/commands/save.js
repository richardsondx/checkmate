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
exports.saveCommand = saveCommand;
/**
 * CheckMate Save Command
 * Saves approved specification drafts to disk
 */
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var chalk_1 = require("chalk");
var banner_js_1 = require("../ui/banner.js");
var specs_js_1 = require("../lib/specs.js");
var specAuthor_js_1 = require("../lib/specAuthor.js");
var SPECS_DIR = 'checkmate/specs';
var AGENT_SPECS_DIR = node_path_1.default.join(SPECS_DIR, 'agents');
/**
 * Save command handler
 */
function saveCommand(options) {
    return __awaiter(this, void 0, void 0, function () {
        var specDrafts, result, _i, specDrafts_1, draft, format, mdPath, yamlPath, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Print welcome banner
                    (0, banner_js_1.printBanner)();
                    console.log(chalk_1.default.cyan("\n\uD83D\uDCBE Saving approved specifications..."));
                    try {
                        specDrafts = JSON.parse(options.json);
                        // Validate the JSON structure
                        if (!Array.isArray(specDrafts)) {
                            throw new Error('JSON must be an array of spec drafts');
                        }
                    }
                    catch (error) {
                        console.error(chalk_1.default.red("\n\u274C Error parsing JSON: ".concat(error)));
                        throw error;
                    }
                    // Ensure specs directory exists
                    ensureSpecsDir();
                    result = {
                        saved: 0,
                        skipped: 0,
                        paths: []
                    };
                    _i = 0, specDrafts_1 = specDrafts;
                    _a.label = 1;
                case 1:
                    if (!(_i < specDrafts_1.length)) return [3 /*break*/, 9];
                    draft = specDrafts_1[_i];
                    // Skip drafts that are not approved unless force is true
                    if (!draft.approved && !options.force) {
                        console.log(chalk_1.default.yellow("Skipping unapproved spec: ".concat(draft.title)));
                        result.skipped++;
                        return [3 /*break*/, 8];
                    }
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 7, , 8]);
                    format = options.format || 'md';
                    if (!(format === 'md' || format === 'both')) return [3 /*break*/, 4];
                    return [4 /*yield*/, saveMarkdownSpec(draft)];
                case 3:
                    mdPath = _a.sent();
                    console.log(chalk_1.default.green("\u2705 Saved Markdown spec: ".concat(mdPath)));
                    result.paths.push(mdPath);
                    _a.label = 4;
                case 4:
                    if (!(format === 'yaml' || format === 'both')) return [3 /*break*/, 6];
                    return [4 /*yield*/, saveYamlSpec(draft)];
                case 5:
                    yamlPath = _a.sent();
                    console.log(chalk_1.default.green("\u2705 Saved YAML spec: ".concat(yamlPath)));
                    result.paths.push(yamlPath);
                    _a.label = 6;
                case 6:
                    result.saved++;
                    return [3 /*break*/, 8];
                case 7:
                    error_1 = _a.sent();
                    console.error(chalk_1.default.red("\n\u274C Error saving spec \"".concat(draft.title, "\": ").concat(error_1)));
                    result.skipped++;
                    return [3 /*break*/, 8];
                case 8:
                    _i++;
                    return [3 /*break*/, 1];
                case 9:
                    console.log(chalk_1.default.green("\n\uD83C\uDF89 Saved ".concat(result.saved, " specifications (skipped ").concat(result.skipped, ")")));
                    return [2 /*return*/, result];
            }
        });
    });
}
/**
 * Save a spec draft as a markdown file
 */
function saveMarkdownSpec(draft) {
    return __awaiter(this, void 0, void 0, function () {
        var result, content, checksSection, newChecks, metaJson, finalContent;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, specs_js_1.generateSpec)(draft.title, draft.files)];
                case 1:
                    result = _a.sent();
                    content = result.content;
                    // Find the Checks/Requirements section and replace it with our custom checks
                    if (draft.checks && draft.checks.length > 0) {
                        checksSection = content.match(/(?:##|###) (?:Checks|Requirements)\s+([\s\S]*?)(?=##|$)/);
                        if (checksSection) {
                            newChecks = draft.checks.map(function (check) { return "- [ ] ".concat(check); }).join('\n');
                            content = content.replace(checksSection[0], "## Checks\n".concat(newChecks, "\n\n"));
                        }
                    }
                    metaJson = JSON.stringify({
                        files_auto: true,
                        file_hashes: draft.files.reduce(function (acc, file) {
                            var _a, _b;
                            acc[file] = ((_b = (_a = draft.meta) === null || _a === void 0 ? void 0 : _a.file_hashes) === null || _b === void 0 ? void 0 : _b[file]) || 'auto-generated';
                            return acc;
                        }, {})
                    }, null, 2);
                    // Check if content already has a meta section
                    if (!content.includes('<!-- meta:')) {
                        content += "\n\n<!-- meta:\n".concat(metaJson, "\n-->\n");
                    }
                    finalContent = "".concat(content, "\n\n<!-- generated via checkmate interactive v0.4 -->\n");
                    // Write to disk
                    node_fs_1.default.writeFileSync(result.path, finalContent, 'utf8');
                    return [2 /*return*/, result.path];
            }
        });
    });
}
/**
 * Save a spec draft as a YAML agent spec
 */
function saveYamlSpec(draft) {
    return __awaiter(this, void 0, void 0, function () {
        var spec, slug, specPath, yamlSpec, yaml, yamlContent;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, specAuthor_js_1.generateTypeBSpec)(draft.title, draft.description || '')];
                case 1:
                    spec = _a.sent();
                    slug = draft.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    specPath = node_path_1.default.join(AGENT_SPECS_DIR, "".concat(slug, ".yaml"));
                    yamlSpec = {
                        title: draft.title,
                        files: draft.files,
                        // Convert 'checks' to 'requirements' format for YAML specs
                        requirements: draft.checks.map(function (check, index) { return ({
                            id: "req-".concat(index + 1),
                            require: check,
                            test: "file ".concat(draft.files[0] || 'src/index.ts', " => EXISTS"),
                            status: false
                        }); }),
                        meta: {
                            files_auto: true,
                            file_hashes: draft.files.reduce(function (acc, file) {
                                var _a, _b;
                                acc[file] = ((_b = (_a = draft.meta) === null || _a === void 0 ? void 0 : _a.file_hashes) === null || _b === void 0 ? void 0 : _b[file]) || 'auto-generated';
                                return acc;
                            }, {})
                        }
                    };
                    yaml = require('yaml');
                    yamlContent = yaml.stringify(yamlSpec);
                    node_fs_1.default.writeFileSync(specPath, yamlContent, 'utf8');
                    return [2 /*return*/, specPath];
            }
        });
    });
}
/**
 * Ensure specs directory exists
 */
function ensureSpecsDir() {
    if (!node_fs_1.default.existsSync(SPECS_DIR)) {
        node_fs_1.default.mkdirSync(SPECS_DIR, { recursive: true });
    }
    if (!node_fs_1.default.existsSync(AGENT_SPECS_DIR)) {
        node_fs_1.default.mkdirSync(AGENT_SPECS_DIR, { recursive: true });
    }
}
