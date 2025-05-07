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
exports.addMetaToSpec = addMetaToSpec;
exports.updateAutoFiles = updateAutoFiles;
exports.hasAutoFileDiscovery = hasAutoFileDiscovery;
exports.enableAutoFilesForAllSpecs = enableAutoFilesForAllSpecs;
exports.updateAllAutoFiles = updateAllAutoFiles;
/**
 * Auto-file discovery for CheckMate
 * Automatically detects and tracks relevant files for specs
 */
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var specs_js_1 = require("./specs.js");
var context_js_1 = require("./context.js");
var node_crypto_1 = require("node:crypto");
var yaml_1 = require("yaml");
/**
 * Add meta block to a spec file
 * @param specPath Path to the spec file
 * @param enableAutoFiles Whether to enable auto file discovery
 */
function addMetaToSpec(specPath_1) {
    return __awaiter(this, arguments, void 0, function (specPath, enableAutoFiles) {
        var content, spec, fileHashes, _i, _a, file, fileContent, hash, meta, metaYaml, metaComment, newContent, yamlDoc, error_1;
        if (enableAutoFiles === void 0) { enableAutoFiles = true; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    // Check if specPath is a valid file path - if it starts with '{' it's likely JSON content
                    if (specPath.trim().startsWith('{')) {
                        console.warn('Warning: Received JSON content instead of a file path. Skipping meta block addition.');
                        return [2 /*return*/];
                    }
                    // Check if the file exists before trying to read it
                    if (!node_fs_1.default.existsSync(specPath)) {
                        console.warn("Warning: Spec file does not exist: ".concat(specPath));
                        return [2 /*return*/];
                    }
                    content = node_fs_1.default.readFileSync(specPath, 'utf8');
                    return [4 /*yield*/, (0, specs_js_1.parseSpec)(specPath)];
                case 1:
                    spec = _b.sent();
                    fileHashes = {};
                    for (_i = 0, _a = spec.files || []; _i < _a.length; _i++) {
                        file = _a[_i];
                        try {
                            if (node_fs_1.default.existsSync(file)) {
                                fileContent = node_fs_1.default.readFileSync(file, 'utf8');
                                hash = (0, node_crypto_1.createHash)('md5').update(fileContent.slice(0, 1000)).digest('hex');
                                fileHashes[file] = hash;
                            }
                        }
                        catch (error) {
                            console.warn("Warning: Could not read file ".concat(file));
                        }
                    }
                    meta = {
                        files_auto: enableAutoFiles,
                        file_hashes: fileHashes
                    };
                    // Check if file is markdown or yaml
                    if (specPath.endsWith('.md')) {
                        metaYaml = yaml_1.default.stringify({ meta: meta });
                        metaComment = "\n\n<!-- meta:\n".concat(metaYaml, "-->\n");
                        // Check if meta block already exists
                        if (content.includes('<!-- meta:')) {
                            newContent = content.replace(/<!-- meta:[\s\S]*?-->/, metaComment);
                            node_fs_1.default.writeFileSync(specPath, newContent, 'utf8');
                        }
                        else {
                            // Add meta block at the end
                            node_fs_1.default.writeFileSync(specPath, content + metaComment, 'utf8');
                        }
                    }
                    else if (specPath.endsWith('.yaml') || specPath.endsWith('.yml')) {
                        yamlDoc = yaml_1.default.parse(content);
                        yamlDoc.meta = meta;
                        node_fs_1.default.writeFileSync(specPath, yaml_1.default.stringify(yamlDoc), 'utf8');
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _b.sent();
                    console.error("Error adding meta to spec ".concat(specPath, ":"), error_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Update files for a spec using auto-discovery
 * @param specPath Path to the spec file
 */
function updateAutoFiles(specPath) {
    return __awaiter(this, void 0, void 0, function () {
        var content, spec, featureStub, context, newFiles, oldFiles, fileHashes, _i, newFiles_1, file, fileContent, hash, meta, newContent, filesRegex, filesSection, metaYaml, metaComment, yamlDoc, error_2;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    // Safety check for invalid paths
                    if (!specPath || typeof specPath !== 'string' || specPath.trim().startsWith('{') || !node_fs_1.default.existsSync(specPath)) {
                        console.warn("Cannot update auto-files for invalid spec path: ".concat(specPath));
                        return [2 /*return*/, []];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    content = node_fs_1.default.readFileSync(specPath, 'utf8');
                    return [4 /*yield*/, (0, specs_js_1.parseSpec)(specPath)];
                case 2:
                    spec = _b.sent();
                    featureStub = {
                        title: spec.title,
                        slug: node_path_1.default.basename(specPath, node_path_1.default.extname(specPath)),
                        description: ((_a = spec.checks) === null || _a === void 0 ? void 0 : _a.map(function (c) { return c.text; }).join(' ')) || ''
                    };
                    return [4 /*yield*/, (0, context_js_1.buildContext)(featureStub, false)];
                case 3:
                    context = _b.sent();
                    newFiles = context
                        .sort(function (a, b) { return b.relevance - a.relevance; })
                        .slice(0, 20)
                        .map(function (c) { return c.path; });
                    oldFiles = spec.files || [];
                    fileHashes = {};
                    for (_i = 0, newFiles_1 = newFiles; _i < newFiles_1.length; _i++) {
                        file = newFiles_1[_i];
                        try {
                            if (node_fs_1.default.existsSync(file)) {
                                fileContent = node_fs_1.default.readFileSync(file, 'utf8');
                                hash = (0, node_crypto_1.createHash)('md5').update(fileContent.slice(0, 1000)).digest('hex');
                                fileHashes[file] = hash;
                            }
                        }
                        catch (error) {
                            console.warn("Warning: Could not read file ".concat(file));
                        }
                    }
                    meta = {
                        files_auto: true,
                        file_hashes: fileHashes
                    };
                    // Update the spec file with the new files and meta
                    if (specPath.endsWith('.md')) {
                        newContent = content;
                        filesRegex = /files:[\s\S]*?(?=\n\n|\n#)/;
                        filesSection = "files:\n".concat(newFiles.map(function (f) { return "- ".concat(f); }).join('\n'));
                        if (newContent.match(filesRegex)) {
                            newContent = newContent.replace(filesRegex, filesSection);
                        }
                        metaYaml = yaml_1.default.stringify({ meta: meta });
                        metaComment = "\n\n<!-- meta:\n".concat(metaYaml, "-->\n");
                        if (newContent.includes('<!-- meta:')) {
                            newContent = newContent.replace(/<!-- meta:[\s\S]*?-->/, metaComment);
                        }
                        else {
                            newContent = newContent + metaComment;
                        }
                        node_fs_1.default.writeFileSync(specPath, newContent, 'utf8');
                    }
                    else if (specPath.endsWith('.yaml') || specPath.endsWith('.yml')) {
                        yamlDoc = yaml_1.default.parse(content);
                        yamlDoc.files = newFiles;
                        yamlDoc.meta = meta;
                        node_fs_1.default.writeFileSync(specPath, yaml_1.default.stringify(yamlDoc), 'utf8');
                    }
                    return [2 /*return*/, newFiles];
                case 4:
                    error_2 = _b.sent();
                    console.error("Error updating auto-files for spec ".concat(specPath, ":"), error_2);
                    return [2 /*return*/, []];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Check if a spec has auto-file discovery enabled
 * @param specPath Path to the spec file
 */
function hasAutoFileDiscovery(specPath) {
    var _a, _b;
    // Safety check for invalid paths
    if (!specPath || typeof specPath !== 'string' || specPath.trim().startsWith('{') || !node_fs_1.default.existsSync(specPath)) {
        return false;
    }
    try {
        // Read the spec file
        var content = node_fs_1.default.readFileSync(specPath, 'utf8');
        // Check if it's markdown with a meta block
        if (specPath.endsWith('.md')) {
            var metaMatch = content.match(/<!-- meta:([\s\S]*?)-->/);
            if (metaMatch) {
                var metaYaml = metaMatch[1];
                var meta = yaml_1.default.parse(metaYaml);
                return ((_a = meta.meta) === null || _a === void 0 ? void 0 : _a.files_auto) === true;
            }
        }
        // Check if it's yaml with a meta field
        else if (specPath.endsWith('.yaml') || specPath.endsWith('.yml')) {
            var yamlDoc = yaml_1.default.parse(content);
            return ((_b = yamlDoc.meta) === null || _b === void 0 ? void 0 : _b.files_auto) === true;
        }
        return false;
    }
    catch (error) {
        console.error("Error checking auto-file discovery for spec ".concat(specPath, ":"), error);
        return false;
    }
}
/**
 * Enable auto-file discovery for all specs in the project
 */
function enableAutoFilesForAllSpecs() {
    return __awaiter(this, void 0, void 0, function () {
        var specs, _i, specs_1, spec, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    specs = (0, specs_js_1.listSpecs)();
                    console.log("Found ".concat(specs.length, " specs to process"));
                    _i = 0, specs_1 = specs;
                    _a.label = 1;
                case 1:
                    if (!(_i < specs_1.length)) return [3 /*break*/, 5];
                    spec = specs_1[_i];
                    if (!(typeof spec === 'string' && spec.trim() && !spec.startsWith('{') && node_fs_1.default.existsSync(spec))) return [3 /*break*/, 3];
                    return [4 /*yield*/, addMetaToSpec(spec, true)];
                case 2:
                    _a.sent();
                    console.log("Enabled auto-file discovery for ".concat(spec));
                    return [3 /*break*/, 4];
                case 3:
                    console.warn("Skipping invalid spec path: ".concat(spec));
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5: return [3 /*break*/, 7];
                case 6:
                    error_3 = _a.sent();
                    console.error('Error enabling auto-files for all specs:', error_3);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * Update files for all specs with auto-file discovery enabled
 */
function updateAllAutoFiles() {
    return __awaiter(this, void 0, void 0, function () {
        var results, specs, _i, specs_2, spec, newFiles, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    results = {};
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 8, , 9]);
                    specs = (0, specs_js_1.listSpecs)();
                    console.log("Found ".concat(specs.length, " specs to process for auto-file updates"));
                    _i = 0, specs_2 = specs;
                    _a.label = 2;
                case 2:
                    if (!(_i < specs_2.length)) return [3 /*break*/, 7];
                    spec = specs_2[_i];
                    if (!(typeof spec === 'string' && spec.trim() && !spec.startsWith('{') && node_fs_1.default.existsSync(spec))) return [3 /*break*/, 5];
                    if (!hasAutoFileDiscovery(spec)) return [3 /*break*/, 4];
                    return [4 /*yield*/, updateAutoFiles(spec)];
                case 3:
                    newFiles = _a.sent();
                    results[spec] = newFiles;
                    console.log("Updated auto-files for ".concat(spec));
                    _a.label = 4;
                case 4: return [3 /*break*/, 6];
                case 5:
                    console.warn("Skipping invalid spec path: ".concat(spec));
                    _a.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 2];
                case 7: return [3 /*break*/, 9];
                case 8:
                    error_4 = _a.sent();
                    console.error('Error updating auto-files for all specs:', error_4);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/, results];
            }
        });
    });
}
