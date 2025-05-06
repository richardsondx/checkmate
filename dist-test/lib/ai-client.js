"use strict";
/**
 * AI Client for CheckMate CLI
 * Specialized functions for code summarization and implementation analysis
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiSummarize = aiSummarize;
exports.aiCompare = aiCompare;
exports.aiGenerateDiff = aiGenerateDiff;
exports.aiExtractConcepts = aiExtractConcepts;
var models_js_1 = require("./models.js");
/**
 * Summarize code using the AI model
 */
function aiSummarize(prompt) {
    return __awaiter(this, void 0, void 0, function () {
        var systemInstructions;
        return __generator(this, function (_a) {
            systemInstructions = "\nYou are a code-to-pseudocode analyzer specializing in creating concise summaries of code.\nYour task is to analyze source code and extract the key functional steps as numbered bullets.\nFocus only on the executable flow and important logic.\nUse present imperative verbs (validate, check, create, etc.)\nUse exactly the format requested in the prompt.\nBe precise and specific about what the code does.";
            return [2 /*return*/, (0, models_js_1.reason)(prompt, systemInstructions)];
        });
    });
}
/**
 * Compare two text blocks semantically for similarity
 */
function aiCompare(textA, textB) {
    return __awaiter(this, void 0, void 0, function () {
        var prompt, systemInstructions, response, match;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prompt = "\nCompare these two descriptions semantically and determine their similarity from 0-1:\n\nText A: \"".concat(textA, "\"\nText B: \"").concat(textB, "\"\n\nRespond with a single number between 0 and 1, where:\n- 1.0 means identical in meaning\n- 0.8-0.9 means very similar with minor variations\n- 0.5-0.7 means generally similar but with notable differences\n- 0.3-0.4 means somewhat related but different intent\n- 0.0-0.2 means completely different or unrelated\n\nSimilarity score (0-1):");
                    systemInstructions = "\nYou are a semantic comparison expert who analyzes text for functional similarity.\nYour task is to return ONLY a similarity score as a decimal between 0 and 1.\nYou should focus on the functional intent, not exact wording.";
                    return [4 /*yield*/, (0, models_js_1.quick)(prompt, systemInstructions)];
                case 1:
                    response = _a.sent();
                    match = response.match(/([0-9](\.[0-9]+)?)/);
                    if (match && match[0]) {
                        return [2 /*return*/, parseFloat(match[0])];
                    }
                    // Default to a moderate similarity if parsing fails
                    return [2 /*return*/, 0.5];
            }
        });
    });
}
/**
 * Generate a semantic diff between spec requirements and implementation
 */
function aiGenerateDiff(specRequirements, implementationBullets) {
    return __awaiter(this, void 0, void 0, function () {
        var diffs, i, j, similarity;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    diffs = [];
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < specRequirements.length)) return [3 /*break*/, 6];
                    j = 0;
                    _a.label = 2;
                case 2:
                    if (!(j < implementationBullets.length)) return [3 /*break*/, 5];
                    return [4 /*yield*/, aiCompare(specRequirements[i], implementationBullets[j])];
                case 3:
                    similarity = _a.sent();
                    diffs.push({ specIndex: i, implIndex: j, similarity: similarity });
                    _a.label = 4;
                case 4:
                    j++;
                    return [3 /*break*/, 2];
                case 5:
                    i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/, diffs];
            }
        });
    });
}
/**
 * Extract key concepts from a text
 */
function aiExtractConcepts(text) {
    return __awaiter(this, void 0, void 0, function () {
        var prompt, systemInstructions, response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prompt = "\nExtract the 3-5 key concepts from this text, focusing on actions, verbs, and nouns:\n\n".concat(text, "\n\nList each concept as a single word or short phrase, one per line.");
                    systemInstructions = "\nYou are a semantic analyzer who extracts key concepts from text.\nYour task is to identify and list the most important 3-5 actions, verbs, and nouns.\nRespond with ONLY a list of key concepts, one per line, without explanations or commentary.";
                    return [4 /*yield*/, (0, models_js_1.quick)(prompt, systemInstructions)];
                case 1:
                    response = _a.sent();
                    // Split response into lines and filter empty ones
                    return [2 /*return*/, response
                            .split('\n')
                            .map(function (line) { return line.trim(); })
                            .filter(Boolean)];
            }
        });
    });
}
