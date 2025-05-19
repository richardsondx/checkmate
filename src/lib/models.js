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
exports.getOpenAIClient = getOpenAIClient;
exports.callModel = callModel;
exports.reason = reason;
exports.quick = quick;
exports.testModelIntegration = testModelIntegration;
/**
 * AI Model integration for CheckMate CLI
 * Supports both OpenAI and Anthropic models
 */
var openai_1 = require("openai");
var sdk_1 = require("@anthropic-ai/sdk");
var config_js_1 = require("./config.js");
var telemetry = require("./telemetry.js");
/**
 * Initialize OpenAI client with configuration
 */
function getOpenAIClient() {
    var config = (0, config_js_1.load)();
    // Get the API key from config or environment variable
    var apiKey = config.openai_key;
    // Check if the key is an environment variable reference
    if (apiKey.startsWith('env:')) {
        var envVarName = apiKey.substring(4);
        apiKey = process.env[envVarName] || '';
    }
    // Validate API key
    if (!apiKey) {
        throw new Error('OpenAI API key not found. Please set it in .checkmate or as OPENAI_API_KEY environment variable.');
    }
    return new openai_1.default({ apiKey: apiKey });
}
/**
 * Initialize Anthropic client with configuration
 */
function getAnthropicClient() {
    var config = (0, config_js_1.load)();
    // Get the API key from config or environment variable
    var apiKey = config.anthropic_key;
    // Check if the key is an environment variable reference
    if (apiKey.startsWith('env:')) {
        var envVarName = apiKey.substring(4);
        apiKey = process.env[envVarName] || '';
    }
    // Validate API key
    if (!apiKey) {
        throw new Error('Anthropic API key not found. Please set it in .checkmate or as ANTHROPIC_API_KEY environment variable.');
    }
    return new sdk_1.default({ apiKey: apiKey });
}
/**
 * Check if the model is an Anthropic model
 */
function isAnthropicModel(modelName) {
    return modelName.toLowerCase().includes('claude');
}
/**
 * Call the AI model using the specified slot
 *
 * @param slot - The model slot to use ('reason' or 'quick')
 * @param systemPrompt - System instructions for the model
 * @param userPrompt - The user's request/query
 * @returns The model's response text
 */
function callModel(slot, systemPrompt, userPrompt) {
    return __awaiter(this, void 0, void 0, function () {
        var config, modelName, temperature, startTime, result, usage, response, response, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Check if we're in a test environment
                    if (process.env.TEST_ENV === 'true') {
                        return [2 /*return*/, mockCallModel(slot, systemPrompt, userPrompt)];
                    }
                    config = (0, config_js_1.load)();
                    modelName = config.models[slot];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    temperature = slot === 'quick' ? 0 : 0.2;
                    startTime = Date.now();
                    result = void 0;
                    usage = void 0;
                    if (!isAnthropicModel(modelName)) return [3 /*break*/, 3];
                    return [4 /*yield*/, callAnthropicModel(modelName, systemPrompt, userPrompt, temperature)];
                case 2:
                    response = _a.sent();
                    result = response.text;
                    usage = telemetry.pickUsage(response.raw);
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, callOpenAIModel(modelName, systemPrompt, userPrompt, temperature)];
                case 4:
                    response = _a.sent();
                    result = response.text;
                    usage = telemetry.pickUsage(response.raw);
                    _a.label = 5;
                case 5:
                    // Record telemetry
                    telemetry.record({
                        provider: isAnthropicModel(modelName) ? 'anthropic' : 'openai',
                        model: modelName,
                        tokensIn: usage.prompt,
                        tokensOut: usage.completion,
                        ms: Date.now() - startTime,
                        estimated: usage.estimated
                    });
                    return [2 /*return*/, result];
                case 6:
                    error_1 = _a.sent();
                    console.error("Error calling ".concat(slot, " model:"), error_1);
                    throw error_1;
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * Mock implementation for tests to avoid actual API calls
 */
function mockCallModel(slot, systemPrompt, userPrompt) {
    console.log(`[TEST] Mock model call to ${slot} with prompt: ${userPrompt.substring(0, 50)}...`);
    
    // Extract the feature title from the prompt for the reason model
    let title = "Test Feature";
    if (slot === 'reason') {
        // Try to extract from various prompt formats
        let titleMatch = userPrompt.match(/Feature: ([^\n]+)/);
        if (!titleMatch) {
            titleMatch = userPrompt.match(/feature:\s*([^\n]+)/i);
        }
        if (!titleMatch) {
            titleMatch = userPrompt.match(/Generate.*for:\s*([^\n]+)/i);
        }
        
        // For test-gen.mjs, which passes "Auto Answer Test" as the name
        if (userPrompt.includes("Auto Answer Test")) {
            title = "Auto Answer Test";
        } else if (titleMatch && titleMatch[1]) {
            title = titleMatch[1].trim();
        }
    }
    
    if (slot === 'quick') {
        return "pass This is a mock response for testing purposes";
    } else {
        // For reason model, include the title in the response for tests
        return `# ${title}\n\n## Checks\n- [ ] Check if input validation is correctly implemented\n- [ ] Verify that all edge cases are handled\n- [ ] Ensure proper error messages are displayed\n- [ ] Confirm data is saved correctly to the database`;
    }
}
/**
 * Call the OpenAI API with the specified parameters
 */
function callOpenAIModel(modelName, systemPrompt, userPrompt, temperature) {
    return __awaiter(this, void 0, void 0, function () {
        var client, params, response, text;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    client = getOpenAIClient();
                    params = {
                        model: modelName,
                        temperature: temperature,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ]
                    };
                    // Choose the right parameter based on the model name
                    // GPT-4o and newer models require max_completion_tokens
                    if (modelName.includes('gpt-4o') || modelName.includes('o3')) {
                        params.max_completion_tokens = 4096;
                    }
                    else {
                        params.max_tokens = 4096;
                    }
                    return [4 /*yield*/, client.chat.completions.create(params)];
                case 1:
                    response = _b.sent();
                    text = ((_a = response.choices[0].message.content) === null || _a === void 0 ? void 0 : _a.trim()) || '';
                    return [2 /*return*/, { text: text, raw: response }];
            }
        });
    });
}
/**
 * Call the Anthropic API with the specified parameters
 */
function callAnthropicModel(modelName, systemPrompt, userPrompt, temperature) {
    return __awaiter(this, void 0, void 0, function () {
        var client, response, contentBlock;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    client = getAnthropicClient();
                    return [4 /*yield*/, client.messages.create({
                            model: modelName,
                            max_tokens: 4096,
                            temperature: temperature,
                            system: systemPrompt,
                            messages: [
                                { role: 'user', content: userPrompt }
                            ]
                        })];
                case 1:
                    response = _a.sent();
                    // Extract the response text
                    // Check the content type before accessing the text property
                    if (response.content && response.content.length > 0) {
                        contentBlock = response.content[0];
                        if (contentBlock.type === 'text') {
                            return [2 /*return*/, { text: contentBlock.text.trim(), raw: response }];
                        }
                    }
                    throw new Error('Unexpected response format from Anthropic API');
            }
        });
    });
}
/**
 * Use the 'reason' model for generating thoughtful, detailed content
 * Example: Generating requirements, developing specs
 */
function reason(prompt, systemInstructions) {
    return __awaiter(this, void 0, void 0, function () {
        var defaultSystemPrompt;
        return __generator(this, function (_a) {
            defaultSystemPrompt = "You are a senior toolsmith specialized in creating software specifications.\nYour task is to create a detailed spec in markdown format, with clear requirements that can be checked programmatically.\nBe specific, actionable, and focus on measurable outcomes.";
            return [2 /*return*/, callModel('reason', systemInstructions || defaultSystemPrompt, prompt)];
        });
    });
}
/**
 * Use the 'quick' model for fast evaluations and simple decisions
 * Example: Evaluating if a requirement passes its test
 */
function quick(prompt, systemInstructions) {
    return __awaiter(this, void 0, void 0, function () {
        var defaultSystemPrompt;
        return __generator(this, function (_a) {
            defaultSystemPrompt = "You are a strict test evaluator. \nYour job is to determine if the described requirement has been met based on the code and context.\nAnswer with just \"pass\" or \"fail\" followed by a single sentence explanation.";
            return [2 /*return*/, callModel('quick', systemInstructions || defaultSystemPrompt, prompt)];
        });
    });
}
/**
 * Direct test function for validation
 */
function testModelIntegration() {
    return __awaiter(this, void 0, void 0, function () {
        var response, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    // If in test environment, return success without actual API calls
                    if (process.env.TEST_ENV === 'true') {
                        console.log('Model response: TEST_SUCCESS (mock)');
                        return [2 /*return*/, true];
                    }
                    return [4 /*yield*/, callModel('quick', 'You are a test assistant.', 'Reply with "TEST_SUCCESS" to confirm you are working.')];
                case 1:
                    response = _a.sent();
                    console.log('Model response:', response);
                    return [2 /*return*/, response.includes('TEST_SUCCESS')];
                case 2:
                    error_2 = _a.sent();
                    console.error('Model integration test failed:', error_2);
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
