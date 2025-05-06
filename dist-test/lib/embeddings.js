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
exports.createEmbedding = createEmbedding;
exports.cosineSimilarity = cosineSimilarity;
exports.loadCachedEmbeddings = loadCachedEmbeddings;
exports.saveCachedEmbeddings = saveCachedEmbeddings;
/**
 * Text embeddings for CheckMate
 * Provides functions to create and compare text embeddings
 */
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var config_js_1 = require("./config.js");
var openai_1 = require("openai");
// Cache directory for embeddings
var CACHE_DIR = node_path_1.default.join('checkmate', 'cache', 'embeddings');
/**
 * Create an embedding for a text string
 */
function createEmbedding(text) {
    return __awaiter(this, void 0, void 0, function () {
        var config, openai, response, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    config = (0, config_js_1.load)();
                    openai = new openai_1.default({
                        apiKey: config.openai_key || process.env.OPENAI_API_KEY
                    });
                    return [4 /*yield*/, openai.embeddings.create({
                            model: 'text-embedding-3-small',
                            input: text.substring(0, 8000) // Limit to first 8000 chars to stay within token limit
                        })];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, response.data[0].embedding];
                case 2:
                    error_1 = _a.sent();
                    console.error('Error creating embedding:', error_1);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Calculate cosine similarity between two embeddings
 * Returns a value between -1 and 1, where 1 means identical
 */
function cosineSimilarity(a, b) {
    if (a.length !== b.length) {
        throw new Error('Embeddings must have the same length');
    }
    var dotProduct = 0;
    var normA = 0;
    var normB = 0;
    for (var i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    if (normA === 0 || normB === 0) {
        return 0;
    }
    return dotProduct / (normA * normB);
}
/**
 * Load embeddings from cache file
 */
function loadCachedEmbeddings() {
    try {
        // Ensure cache directory exists
        if (!node_fs_1.default.existsSync(CACHE_DIR)) {
            node_fs_1.default.mkdirSync(CACHE_DIR, { recursive: true });
            return {};
        }
        var cachePath = node_path_1.default.join(CACHE_DIR, 'embeddings.json');
        if (!node_fs_1.default.existsSync(cachePath)) {
            return {};
        }
        var cacheContent = node_fs_1.default.readFileSync(cachePath, 'utf8');
        return JSON.parse(cacheContent);
    }
    catch (error) {
        console.error('Error loading cached embeddings:', error);
        return {};
    }
}
/**
 * Save embeddings to cache file
 */
function saveCachedEmbeddings(cache) {
    try {
        // Ensure cache directory exists
        if (!node_fs_1.default.existsSync(CACHE_DIR)) {
            node_fs_1.default.mkdirSync(CACHE_DIR, { recursive: true });
        }
        var cachePath = node_path_1.default.join(CACHE_DIR, 'embeddings.json');
        node_fs_1.default.writeFileSync(cachePath, JSON.stringify(cache), 'utf8');
    }
    catch (error) {
        console.error('Error saving cached embeddings:', error);
    }
}
