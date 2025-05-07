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
exports.buildContext = buildContext;
/**
 * Context builder for CheckMate CLI
 * Scans project files, ranks them by relevance to a feature, and returns the top-N most relevant
 */
var fs = require("node:fs");
var path = require("node:path");
var fast_glob_1 = require("fast-glob");
var config_js_1 = require("./config.js");
var tree = require("./tree.js");
var embeddings_js_1 = require("./embeddings.js");
// In-memory cache for embeddings
var embeddingCache = {};
/**
 * Scan project files and rank them by relevance to a feature
 */
function buildContext(feature, allFiles, explicitFiles) {
    return __awaiter(this, void 0, void 0, function () {
        var config, topN, useEmbeddings, extensions, files, error_1, keywords, rankedFiles, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    config = (0, config_js_1.load)();
                    topN = config.context_top_n || 40;
                    useEmbeddings = config.use_embeddings !== false;
                    // If explicit files are provided, use them directly
                    if (explicitFiles && explicitFiles.length > 0) {
                        return [2 /*return*/, explicitFiles.map(function (filePath) { return ({
                                path: filePath,
                                relevance: 1.0,
                                reason: 'Explicitly specified file'
                            }); })];
                    }
                    extensions = allFiles
                        ? []
                        : ['ts', 'js', 'tsx', 'jsx'];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 6, , 7]);
                    if (!(extensions.length > 0)) return [3 /*break*/, 3];
                    return [4 /*yield*/, tree.scan(extensions)];
                case 2:
                    files = _b.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, (0, fast_glob_1.default)(['**/*'], {
                        ignore: ['**/node_modules/**', '**/.*/**', '**/dist/**'],
                        dot: false,
                        onlyFiles: true
                    })];
                case 4:
                    // Using fast-glob to get all files while excluding node_modules and hidden dirs
                    files = _b.sent();
                    _b.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    error_1 = _b.sent();
                    console.error('Error scanning files:', error_1);
                    return [2 /*return*/, []];
                case 7:
                    keywords = extractKeywords("".concat(feature.title, " ").concat(feature.description));
                    if (!useEmbeddings) return [3 /*break*/, 9];
                    return [4 /*yield*/, rankFilesByEmbeddings(files, "".concat(feature.title, " ").concat(feature.description))];
                case 8:
                    _a = _b.sent();
                    return [3 /*break*/, 11];
                case 9: return [4 /*yield*/, rankFilesByKeywords(files, keywords)];
                case 10:
                    _a = _b.sent();
                    _b.label = 11;
                case 11:
                    rankedFiles = _a;
                    // Take the top N most relevant files
                    return [2 /*return*/, rankedFiles.slice(0, topN)];
            }
        });
    });
}
/**
 * Extract keywords from a string by removing common words and punctuation
 */
function extractKeywords(text) {
    // Common words to filter out
    var stopWords = new Set([
        'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with',
        'by', 'about', 'as', 'into', 'like', 'through', 'after', 'before', 'between',
        'from', 'up', 'down', 'of', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'will', 'would',
        'should', 'may', 'might', 'must', 'that', 'which', 'who', 'whom', 'whose',
        'this', 'these', 'those', 'am', 'what', 'when', 'why', 'how', 'all', 'any',
        'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
        'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very'
    ]);
    // Convert to lowercase, replace punctuation with spaces, and split by whitespace
    var words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(function (word) { return word && !stopWords.has(word) && word.length > 2; });
    // Return unique keywords
    return __spreadArray([], new Set(words), true);
}
/**
 * Rank files by keyword relevance (TF-IDF style approach)
 */
function rankFilesByKeywords(files, keywords) {
    return __awaiter(this, void 0, void 0, function () {
        var rankedFiles, _i, files_1, filePath, stats, fileName, fileNameScore, pathScore, contentScore, contentReason, content, contentScoreResult, totalScore;
        return __generator(this, function (_a) {
            rankedFiles = [];
            // For each file, calculate a relevance score
            for (_i = 0, files_1 = files; _i < files_1.length; _i++) {
                filePath = files_1[_i];
                // Skip very large files (e.g., generated files, large assets)
                try {
                    stats = fs.statSync(filePath);
                    if (stats.size > 1024 * 1024) { // Skip files larger than 1MB
                        continue;
                    }
                }
                catch (error) {
                    continue; // Skip if can't get file stats
                }
                fileName = path.basename(filePath);
                fileNameScore = calculateFileNameScore(fileName, keywords);
                pathScore = calculatePathScore(filePath, keywords);
                contentScore = 0;
                contentReason = '';
                try {
                    content = readFileHead(filePath, 100);
                    contentScoreResult = calculateContentScore(content, keywords);
                    contentScore = contentScoreResult.score;
                    contentReason = contentScoreResult.reason || '';
                }
                catch (error) {
                    // Skip content scoring if file can't be read
                }
                totalScore = (fileNameScore * 0.4) + (pathScore * 0.2) + (contentScore * 0.4);
                // Add to ranked files list
                rankedFiles.push({
                    path: filePath,
                    relevance: totalScore,
                    reason: contentReason
                });
            }
            // Sort files by relevance score (descending)
            return [2 /*return*/, rankedFiles.sort(function (a, b) { return b.relevance - a.relevance; })];
        });
    });
}
/**
 * Rank files using semantic embeddings for better relevance
 */
function rankFilesByEmbeddings(files, featureText) {
    return __awaiter(this, void 0, void 0, function () {
        var featureEmbedding, rankedFiles, embedPromises, batchSize, i, batch, batchPromises;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, embeddings_js_1.createEmbedding)(featureText)];
                case 1:
                    featureEmbedding = _a.sent();
                    if (!featureEmbedding) {
                        console.warn('Could not create feature embedding. Falling back to keyword matching.');
                        return [2 /*return*/, rankFilesByKeywords(files, extractKeywords(featureText))];
                    }
                    rankedFiles = [];
                    embedPromises = [];
                    batchSize = 10;
                    i = 0;
                    _a.label = 2;
                case 2:
                    if (!(i < files.length)) return [3 /*break*/, 5];
                    batch = files.slice(i, i + batchSize);
                    batchPromises = batch.map(function (filePath) { return __awaiter(_this, void 0, void 0, function () {
                        var stats, fileContent, keywordScore, fileEmbedding, similarityScore, hybridScore, error_2;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    stats = fs.statSync(filePath);
                                    if (stats.size > 1024 * 1024) {
                                        return [2 /*return*/];
                                    }
                                    fileContent = readFileHead(filePath, 100);
                                    if (!fileContent)
                                        return [2 /*return*/];
                                    keywordScore = calculateHybridKeywordScore(filePath, fileContent, extractKeywords(featureText));
                                    return [4 /*yield*/, getFileEmbedding(filePath, fileContent)];
                                case 1:
                                    fileEmbedding = _a.sent();
                                    if (!fileEmbedding)
                                        return [2 /*return*/];
                                    similarityScore = (0, embeddings_js_1.cosineSimilarity)(featureEmbedding, fileEmbedding);
                                    hybridScore = (similarityScore * 0.6) + (keywordScore * 0.4);
                                    // Add to ranked files
                                    rankedFiles.push({
                                        path: filePath,
                                        relevance: hybridScore,
                                        reason: "Semantic similarity: ".concat(Math.round(similarityScore * 100), "%")
                                    });
                                    return [3 /*break*/, 3];
                                case 2:
                                    error_2 = _a.sent();
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    embedPromises.push.apply(embedPromises, batchPromises);
                    // Wait for this batch to complete before moving to the next
                    return [4 /*yield*/, Promise.all(batchPromises)];
                case 3:
                    // Wait for this batch to complete before moving to the next
                    _a.sent();
                    _a.label = 4;
                case 4:
                    i += batchSize;
                    return [3 /*break*/, 2];
                case 5: 
                // Sort files by relevance score (descending)
                return [2 /*return*/, rankedFiles.sort(function (a, b) { return b.relevance - a.relevance; })];
            }
        });
    });
}
/**
 * Get embedding for a file, using cache if available
 */
function getFileEmbedding(filePath, fileContent) {
    return __awaiter(this, void 0, void 0, function () {
        var stats, mtime, embedding;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    stats = fs.statSync(filePath);
                    mtime = stats.mtimeMs;
                    // Check if cached embedding exists and is current
                    if (embeddingCache[filePath] && embeddingCache[filePath].timestamp === mtime) {
                        return [2 /*return*/, embeddingCache[filePath].embedding];
                    }
                    return [4 /*yield*/, (0, embeddings_js_1.createEmbedding)(fileContent)];
                case 1:
                    embedding = _a.sent();
                    if (embedding) {
                        // Cache the embedding
                        embeddingCache[filePath] = {
                            embedding: embedding,
                            timestamp: mtime
                        };
                        return [2 /*return*/, embedding];
                    }
                    return [2 /*return*/, null];
            }
        });
    });
}
/**
 * Calculate a combined keyword score for the hybrid approach
 */
function calculateHybridKeywordScore(filePath, fileContent, keywords) {
    var fileName = path.basename(filePath);
    var fileNameScore = calculateFileNameScore(fileName, keywords);
    var pathScore = calculatePathScore(filePath, keywords);
    var contentScore = calculateContentScore(fileContent, keywords).score;
    return (fileNameScore * 0.4) + (pathScore * 0.2) + (contentScore * 0.4);
}
/**
 * Calculate a score for how well a filename matches the keywords
 */
function calculateFileNameScore(fileName, keywords) {
    if (keywords.length === 0)
        return 0;
    // Split filename (without extension) into parts
    var fileNameParts = path.parse(fileName).name
        .replace(/[^a-zA-Z0-9]/g, ' ')
        .toLowerCase()
        .split(/\s+/);
    // Calculate matches
    var matches = 0;
    for (var _i = 0, keywords_1 = keywords; _i < keywords_1.length; _i++) {
        var keyword = keywords_1[_i];
        for (var _a = 0, fileNameParts_1 = fileNameParts; _a < fileNameParts_1.length; _a++) {
            var part = fileNameParts_1[_a];
            if (part.includes(keyword) || keyword.includes(part)) {
                matches++;
                break;
            }
        }
    }
    return matches / keywords.length;
}
/**
 * Calculate a score for how well a file path matches the keywords
 */
function calculatePathScore(filePath, keywords) {
    if (keywords.length === 0)
        return 0;
    // Normalize path
    var normalizedPath = filePath.toLowerCase().replace(/[\\/.]/g, ' ');
    // Count keyword matches in path
    var matches = 0;
    for (var _i = 0, keywords_2 = keywords; _i < keywords_2.length; _i++) {
        var keyword = keywords_2[_i];
        if (normalizedPath.includes(keyword)) {
            matches++;
        }
    }
    return matches / keywords.length;
}
/**
 * Calculate a score for how well the file content matches the keywords
 */
function calculateContentScore(content, keywords) {
    if (keywords.length === 0 || !content)
        return { score: 0 };
    // Normalize content
    var normalizedContent = content.toLowerCase();
    // Count keyword occurrences in content
    var counts = {};
    var totalMatches = 0;
    for (var _i = 0, keywords_3 = keywords; _i < keywords_3.length; _i++) {
        var keyword = keywords_3[_i];
        // Count occurrences of this keyword
        var count = 0;
        var lastIndex = -1;
        while ((lastIndex = normalizedContent.indexOf(keyword, lastIndex + 1)) !== -1) {
            count++;
        }
        counts[keyword] = count;
        totalMatches += count;
    }
    // Find the top matching keyword for the reason
    var topKeyword = '';
    var topCount = 0;
    for (var _a = 0, _b = Object.entries(counts); _a < _b.length; _a++) {
        var _c = _b[_a], keyword = _c[0], count = _c[1];
        if (count > topCount) {
            topCount = count;
            topKeyword = keyword;
        }
    }
    // Calculate score (normalized by content length and number of keywords)
    var contentLength = normalizedContent.length / 100; // Normalize to prevent bias toward large files
    var score = Math.min(1, totalMatches / (contentLength * keywords.length));
    // Generate reason if we have matches
    var reason = topCount > 0 ? "Contains ".concat(topCount, " occurrences of \"").concat(topKeyword, "\"") : undefined;
    return { score: score, reason: reason };
}
/**
 * Read the first N lines of a file
 */
function readFileHead(filePath, lines) {
    if (lines === void 0) { lines = 100; }
    try {
        var content = fs.readFileSync(filePath, 'utf8');
        var contentLines = content.split('\n').slice(0, lines);
        return contentLines.join('\n');
    }
    catch (error) {
        return '';
    }
}
