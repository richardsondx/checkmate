#!/usr/bin/env ts-node
"use strict";
/**
 * CheckMate Test Command
 * Tests the AI model integration and connectivity
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
exports.testCommand = testCommand;
var models_js_1 = require("../lib/models.js");
var banner_js_1 = require("../ui/banner.js");
var chalk_1 = require("chalk");
var config_js_1 = require("../lib/config.js");
function isAnthropicModel(modelName) {
    return modelName.toLowerCase().includes('claude');
}
function isOpenAIModel(modelName) {
    return modelName.toLowerCase().includes('gpt');
}
/**
 * Test command with support for checking AI models and connectivity
 */
function testCommand() {
    return __awaiter(this, arguments, void 0, function (options) {
        var config, reasonModel, quickModel, usesAnthropicAPI, usesOpenAIAPI, quickResponse, reasonResponse, apiStatusMessages, jsonOutput, error_1, jsonOutput, errorHelp, apiServiceMessages;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Print welcome banner
                    if (!options.quiet) {
                        (0, banner_js_1.printBanner)();
                    }
                    config = (0, config_js_1.load)();
                    reasonModel = config.models.reason;
                    quickModel = config.models.quick;
                    usesAnthropicAPI = isAnthropicModel(reasonModel) || isAnthropicModel(quickModel);
                    usesOpenAIAPI = isOpenAIModel(reasonModel) || isOpenAIModel(quickModel);
                    // Run model test
                    if (!options.quiet) {
                        console.log(chalk_1.default.cyan('\n⚙️ Running model test...'));
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    // Test the "quick" model
                    if (!options.quiet) {
                        console.log(chalk_1.default.yellow("Testing \"quick\" model (".concat(quickModel, ") connection...")));
                    }
                    return [4 /*yield*/, (0, models_js_1.callModel)('quick', 'You are a helpful assistant.', 'Say hello in one word.')];
                case 2:
                    quickResponse = _a.sent();
                    if (!options.quiet) {
                        console.log(chalk_1.default.green('✅ Quick model responded:'), quickResponse);
                    }
                    // Test the "reason" model
                    if (!options.quiet) {
                        console.log(chalk_1.default.yellow("\nTesting \"reason\" model (".concat(reasonModel, ") connection...")));
                    }
                    return [4 /*yield*/, (0, models_js_1.callModel)('reason', 'You are a helpful assistant.', 'Generate one sentence that describes what CheckMate does.')];
                case 3:
                    reasonResponse = _a.sent();
                    if (!options.quiet) {
                        console.log(chalk_1.default.green('✅ Reason model responded:'), reasonResponse);
                    }
                    apiStatusMessages = [];
                    if (usesOpenAIAPI) {
                        apiStatusMessages.push("\u2713 OpenAI API connection successful");
                    }
                    if (usesAnthropicAPI) {
                        apiStatusMessages.push("\u2713 Anthropic API connection successful");
                    }
                    if (options.json) {
                        jsonOutput = {
                            status: 'OPERATIONAL',
                            models: {
                                quick: {
                                    name: quickModel,
                                    status: 'OK',
                                    response: quickResponse
                                },
                                reason: {
                                    name: reasonModel,
                                    status: 'OK',
                                    response: reasonResponse
                                }
                            },
                            apis: {
                                openai: usesOpenAIAPI ? { status: 'OK' } : undefined,
                                anthropic: usesAnthropicAPI ? { status: 'OK' } : undefined
                            }
                        };
                        console.log(JSON.stringify(jsonOutput, null, 2));
                        return [2 /*return*/, jsonOutput];
                    }
                    else if (options.cursor) {
                        console.log('[CM-PASS] CheckMate operational with working AI models and API connections');
                    }
                    else if (!options.quiet) {
                        // Success message
                        (0, banner_js_1.printBox)("\nCheckMate Status: ".concat(chalk_1.default.green('✅ OPERATIONAL'), "\n\n").concat(apiStatusMessages.join('\n'), "\n\u2713 Quick model (").concat(quickModel, ") working correctly\n\u2713 Reason model (").concat(reasonModel, ") working correctly\n\nYour AI-powered TDD is ready to roll! \uD83D\uDE80\n      "));
                    }
                    return [2 /*return*/, {
                            status: 'OPERATIONAL',
                            quick: quickModel,
                            reason: reasonModel
                        }];
                case 4:
                    error_1 = _a.sent();
                    if (options.json) {
                        jsonOutput = {
                            status: 'ERROR',
                            error: error_1 instanceof Error ? error_1.message : String(error_1)
                        };
                        console.log(JSON.stringify(jsonOutput, null, 2));
                        return [2 /*return*/, jsonOutput];
                    }
                    else if (options.cursor) {
                        console.error("[CM-FAIL] Error connecting to AI model: ".concat(error_1 instanceof Error ? error_1.message : String(error_1)));
                    }
                    else if (!options.quiet) {
                        console.error(chalk_1.default.red('\n❌ Error connecting to AI model:'), error_1);
                        errorHelp = [];
                        if (usesOpenAIAPI) {
                            errorHelp.push("- Check your OpenAI API key (".concat(config.openai_key ? 'configured' : 'missing', ")"));
                        }
                        if (usesAnthropicAPI) {
                            errorHelp.push("- Check your Anthropic API key (".concat(config.anthropic_key ? 'configured' : 'missing', ")"));
                        }
                        errorHelp.push('- Check your internet connection');
                        apiServiceMessages = [];
                        if (usesOpenAIAPI) {
                            apiServiceMessages.push('- OpenAI service status');
                        }
                        if (usesAnthropicAPI) {
                            apiServiceMessages.push('- Anthropic service status');
                        }
                        (0, banner_js_1.printBox)("\nCheckMate Status: ".concat(chalk_1.default.red('❌ ERROR'), "\n\nThere was a problem connecting to the AI model.\nPlease check:\n\n").concat(errorHelp.join('\n'), "\n").concat(apiServiceMessages.join('\n'), "\n\nRun ").concat(chalk_1.default.cyan('checkmate config'), " to see your current configuration.\n      "));
                    }
                    return [2 /*return*/, { error: true, message: 'Error connecting to AI model' }];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// When the module is executed directly, run the test command
if (import.meta.url === "file://".concat(process.argv[1])) {
    await testCommand();
}
