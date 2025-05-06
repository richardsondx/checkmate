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
exports.splitFeature = splitFeature;
/**
 * Feature splitter for CheckMate CLI
 * Takes a natural language sentence and splits it into distinct feature stubs
 */
var models_js_1 = require("./models.js");
var specs_js_1 = require("./specs.js");
/**
 * Split a natural language sentence into distinct feature stubs
 * Uses a two-stage approach:
 * 1. LLM-based clustering for semantic understanding
 * 2. Heuristic sentence analysis to catch additional splits
 */
function splitFeature(sentence) {
    return __awaiter(this, void 0, void 0, function () {
        var llmClusters, heuristicClusters, mergedFeatures;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, llmClustering(sentence)];
                case 1:
                    llmClusters = _a.sent();
                    heuristicClusters = heuristicSplitter(sentence);
                    mergedFeatures = mergeClusters(llmClusters, heuristicClusters);
                    // If no features were found, fall back to treating the entire sentence as one feature
                    if (mergedFeatures.length === 0) {
                        return [2 /*return*/, [{
                                    title: sentence,
                                    description: sentence,
                                    slug: (0, specs_js_1.createSlug)(sentence),
                                    confidence: 'medium'
                                }]];
                    }
                    return [2 /*return*/, mergedFeatures];
            }
        });
    });
}
/**
 * Stage A: LLM-based clustering for semantic understanding
 */
function llmClustering(sentence) {
    return __awaiter(this, void 0, void 0, function () {
        var systemPrompt, userPrompt, result, parsedResponse, jsonMatch, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    systemPrompt = "You are an analyst specialized in breaking down complex requirements into clear, distinct features.\nWhen given a sentence that may describe multiple features, your job is to split it into separate atomic features.\n\nReturn a JSON object with the following structure:\n{\n  \"features\": [\n    {\n      \"title\": \"A clear, concise name for the feature (3-8 words)\",\n      \"description\": \"A detailed explanation of what this specific feature entails (1-3 sentences)\",\n      \"confidence\": \"high\" | \"medium\" | \"low\"\n    }\n  ]\n}\n\nEach feature should be minimal and standalone. Do not overlap functionality between features.\nIf the sentence describes just one feature, return an array with a single object.\nSet confidence to \"low\" if you're unsure about the feature, \"medium\" if reasonably confident, \"high\" if very confident.\n\nIMPORTANT: Return ONLY valid JSON that can be parsed with JSON.parse().";
                    userPrompt = "Return a JSON features object for distinct minimal features expressed in this sentence: \"".concat(sentence, "\"");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, models_js_1.reason)(userPrompt, systemPrompt)];
                case 2:
                    result = _a.sent();
                    parsedResponse = void 0;
                    try {
                        parsedResponse = JSON.parse(result);
                    }
                    catch (error) {
                        console.error('Error parsing model response as JSON:', error);
                        jsonMatch = result.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
                            result.match(/(\{[\s\S]*?\})/);
                        if (jsonMatch && jsonMatch[1]) {
                            try {
                                parsedResponse = JSON.parse(jsonMatch[1]);
                            }
                            catch (innerError) {
                                console.error('Failed to extract JSON from response:', innerError);
                                return [2 /*return*/, []];
                            }
                        }
                        else {
                            return [2 /*return*/, []];
                        }
                    }
                    // Validate and transform the parsed features
                    if (!parsedResponse || !parsedResponse.features || !Array.isArray(parsedResponse.features)) {
                        console.error('Model did not return expected features array');
                        return [2 /*return*/, []];
                    }
                    // Create slugs and ensure all properties exist
                    return [2 /*return*/, parsedResponse.features.map(function (feature) { return ({
                            title: feature.title || 'Untitled Feature',
                            description: feature.description || feature.title || 'No description provided',
                            slug: feature.slug || (0, specs_js_1.createSlug)(feature.title || 'untitled-feature'),
                            confidence: feature.confidence || 'medium'
                        }); })];
                case 3:
                    error_1 = _a.sent();
                    console.error('Error in llmClustering:', error_1);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Stage B: Sentence-level heuristics to catch additional splits
 */
function heuristicSplitter(sentence) {
    var features = [];
    // Split on specific patterns
    var sentenceSplits = sentence
        // Split on "and", "but" when they represent separate features
        .split(/\s+and\s+|\s+but\s+/i)
        // Further split on commas followed by gerunds or action verbs
        .flatMap(function (s) { return s.split(/,\s*(?=\w+ing\b|\ballow|\bcreate|\bupdate|\bdelete|\benable|\bdisable|\bview|\bsearch|\badd|\bremove|\bedit|\bmanage)/i); });
    // Process each potential split
    for (var _i = 0, sentenceSplits_1 = sentenceSplits; _i < sentenceSplits_1.length; _i++) {
        var split = sentenceSplits_1[_i];
        // Skip if too short to be a meaningful feature
        if (split.trim().length < 10)
            continue;
        // Create a feature for each significant split
        features.push({
            title: split.trim(),
            description: split.trim(),
            slug: (0, specs_js_1.createSlug)(split.trim()),
            confidence: 'medium' // Heuristic splits get medium confidence
        });
    }
    return features;
}
/**
 * Merge LLM and heuristic clusters, removing duplicates
 */
function mergeClusters(llmClusters, heuristicClusters) {
    // Combine both sets of features
    var allFeatures = __spreadArray(__spreadArray([], llmClusters, true), heuristicClusters, true);
    // Use a map to deduplicate by title similarity
    var uniqueFeatures = new Map();
    for (var _i = 0, allFeatures_1 = allFeatures; _i < allFeatures_1.length; _i++) {
        var feature = allFeatures_1[_i];
        var isDuplicate = false;
        // Check against existing features for similarity
        for (var _a = 0, _b = uniqueFeatures.entries(); _a < _b.length; _a++) {
            var _c = _b[_a], key = _c[0], existingFeature = _c[1];
            // Simple title similarity check (could be enhanced with more sophisticated similarity)
            var normalizedTitle1 = feature.title.toLowerCase().replace(/\W+/g, ' ').trim();
            var normalizedTitle2 = existingFeature.title.toLowerCase().replace(/\W+/g, ' ').trim();
            if (normalizedTitle1 === normalizedTitle2 ||
                normalizedTitle1.includes(normalizedTitle2) ||
                normalizedTitle2.includes(normalizedTitle1)) {
                // Prefer LLM clusters over heuristic ones when merging
                if (feature.confidence === 'high' && existingFeature.confidence !== 'high') {
                    uniqueFeatures.set(key, feature);
                }
                isDuplicate = true;
                break;
            }
        }
        // Add if not a duplicate
        if (!isDuplicate) {
            uniqueFeatures.set(feature.slug, feature);
        }
    }
    return Array.from(uniqueFeatures.values());
}
