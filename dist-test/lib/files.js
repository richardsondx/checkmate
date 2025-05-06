"use strict";
/**
 * File operations for CheckMate CLI
 * Handles file reading, writing, and content management
 */
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileContent = getFileContent;
exports.writeFileContent = writeFileContent;
exports.getRelevantFiles = getRelevantFiles;
exports.resolveFilePatterns = resolveFilePatterns;
exports.fileExists = fileExists;
exports.getFileStats = getFileStats;
var fs = require("node:fs");
var path = require("node:path");
var tree_js_1 = require("./tree.js");
/**
 * Get file content from a path
 */
function getFileContent(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            try {
                return [2 /*return*/, fs.readFileSync(filePath, 'utf8')];
            }
            catch (error) {
                throw new Error("Could not read file ".concat(filePath, ": ").concat(error.message));
            }
            return [2 /*return*/];
        });
    });
}
/**
 * Write content to a file
 */
function writeFileContent(filePath, content) {
    return __awaiter(this, void 0, void 0, function () {
        var dirPath;
        return __generator(this, function (_a) {
            try {
                dirPath = path.dirname(filePath);
                fs.mkdirSync(dirPath, { recursive: true });
                // Write file
                fs.writeFileSync(filePath, content, 'utf8');
            }
            catch (error) {
                throw new Error("Could not write to file ".concat(filePath, ": ").concat(error.message));
            }
            return [2 /*return*/];
        });
    });
}
/**
 * Get relevant files based on a query string
 * This is a simple implementation that will be replaced with embeddings-based search in the future
 */
function getRelevantFiles(query_1) {
    return __awaiter(this, arguments, void 0, function (query, limit) {
        var codeExtensions, files, scoredFiles, normalizedQuery, _i, files_1, file, baseName, score, _a, normalizedQuery_1, term, error_1;
        if (limit === void 0) { limit = 10; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    codeExtensions = ['ts', 'js', 'tsx', 'jsx', 'py', 'rb', 'java', 'go', 'php', 'cs'];
                    return [4 /*yield*/, (0, tree_js_1.scan)(codeExtensions)];
                case 1:
                    files = _b.sent();
                    scoredFiles = [];
                    normalizedQuery = query.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
                    // Score each file
                    for (_i = 0, files_1 = files; _i < files_1.length; _i++) {
                        file = files_1[_i];
                        // Skip node_modules and other common excluded directories
                        if (file.includes('node_modules') || file.includes('.git')) {
                            continue;
                        }
                        baseName = path.basename(file).toLowerCase();
                        score = 0;
                        // Increase score for each query term found in the filename
                        for (_a = 0, normalizedQuery_1 = normalizedQuery; _a < normalizedQuery_1.length; _a++) {
                            term = normalizedQuery_1[_a];
                            if (term.length < 3)
                                continue; // Skip short terms
                            if (baseName.includes(term)) {
                                score += 5; // Higher score for matches in filename
                            }
                            else if (file.toLowerCase().includes(term)) {
                                score += 2; // Lower score for matches in path
                            }
                        }
                        // Add to scored files if there's any match
                        if (score > 0) {
                            scoredFiles.push({ path: file, score: score });
                        }
                    }
                    // Sort by score (descending) and take top N
                    return [2 /*return*/, scoredFiles
                            .sort(function (a, b) { return b.score - a.score; })
                            .slice(0, limit)];
                case 2:
                    error_1 = _b.sent();
                    throw new Error("Error finding relevant files: ".concat(error_1.message));
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Resolve files from glob patterns
 */
function resolveFilePatterns(patterns) {
    return __awaiter(this, void 0, void 0, function () {
        var resolvedFiles, _i, patterns_1, pattern, files, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    resolvedFiles = [];
                    _i = 0, patterns_1 = patterns;
                    _a.label = 1;
                case 1:
                    if (!(_i < patterns_1.length)) return [3 /*break*/, 4];
                    pattern = patterns_1[_i];
                    return [4 /*yield*/, (0, tree_js_1.getFilesByGlob)(pattern)];
                case 2:
                    files = _a.sent();
                    resolvedFiles.push.apply(resolvedFiles, files);
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: 
                // Remove duplicates
                return [2 /*return*/, __spreadArray([], new Set(resolvedFiles), true)];
                case 5:
                    error_2 = _a.sent();
                    throw new Error("Error resolving file patterns: ".concat(error_2.message));
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * Check if a file exists and is readable
 */
function fileExists(filePath) {
    try {
        fs.accessSync(filePath, fs.constants.R_OK);
        return true;
    }
    catch (error) {
        return false;
    }
}
/**
 * Get file stats (size, modified time, etc.)
 */
function getFileStats(filePath) {
    try {
        return fs.statSync(filePath);
    }
    catch (error) {
        throw new Error("Could not get stats for file ".concat(filePath, ": ").concat(error.message));
    }
}
