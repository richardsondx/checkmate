#!/usr/bin/env ts-node
"use strict";
/**
 * CheckMate Verify LLM Reasoning Command
 * Verifies the logical reasoning of an LLM's self-assessment of a check item
 * Part of the LLM-driven TDD workflow
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
exports.verifyLlmReasoningCommand = verifyLlmReasoningCommand;
var banner_js_1 = require("../ui/banner.js");
var chalk_1 = require("chalk");
var specs_js_1 = require("../lib/specs.js");
var fs = require("node:fs");
var path = require("node:path");
var models_js_1 = require("../lib/models.js");
/**
 * Verify LLM reasoning command
 * Takes the LLM's defined success/failure conditions and outcome report
 * Uses the reason model to check logical consistency and updates the spec
 */
function verifyLlmReasoningCommand() {
    return __awaiter(this, arguments, void 0, function (options) {
        var missingArgs, specPaths, error_1, specPath, specData, checks, checkIndex, check, systemPrompt, prompt, modelResponse, isPassing, explanation, content, updatedContent, extension, yaml, specData_1, checksArray, yamlError_1, failureReason, error_2;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Print welcome banner
                    if (!options.quiet) {
                        (0, banner_js_1.printCompactBanner)('Verify LLM Reasoning');
                    }
                    missingArgs = [];
                    if (!options.spec)
                        missingArgs.push('--spec');
                    if (!options.checkId)
                        missingArgs.push('--check-id');
                    if (!options.successCondition)
                        missingArgs.push('--success-condition');
                    if (!options.failureCondition)
                        missingArgs.push('--failure-condition');
                    if (!options.outcomeReport)
                        missingArgs.push('--outcome-report');
                    if (missingArgs.length > 0) {
                        if (!options.quiet) {
                            console.error(chalk_1.default.red("\u274C Missing required arguments: ".concat(missingArgs.join(', '))));
                            console.log('Example: checkmate verify-llm-reasoning --spec feature-name --check-id check_0 ' +
                                '--success-condition "Password is hashed" ' +
                                '--failure-condition "Password is plaintext" ' +
                                '--outcome-report "Found bcrypt hash in database"');
                        }
                        return [2 /*return*/, {
                                error: true,
                                message: "Missing required arguments: ".concat(missingArgs.join(', ')),
                                missingArgs: missingArgs
                            }];
                    }
                    specPaths = [];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, specs_js_1.getSpecByName)(options.spec || '')];
                case 2:
                    specPaths = _a.sent();
                    if (!specPaths || specPaths.length === 0) {
                        // Try alternate paths
                        if (options.spec && fs.existsSync(options.spec)) {
                            specPaths = [options.spec];
                        }
                        else if (fs.existsSync("checkmate/specs/".concat(options.spec))) {
                            specPaths = ["checkmate/specs/".concat(options.spec)];
                        }
                        else if (fs.existsSync("checkmate/specs/".concat(options.spec, ".md"))) {
                            specPaths = ["checkmate/specs/".concat(options.spec, ".md")];
                        }
                        else {
                            // Spec not found
                            if (!options.quiet) {
                                console.error(chalk_1.default.red("\u274C Could not find spec \"".concat(options.spec, "\"")));
                                console.log('Run "checkmate features" to see a list of available features.');
                            }
                            return [2 /*return*/, { error: true, message: "Spec not found: ".concat(options.spec) }];
                        }
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    if (!options.quiet) {
                        console.error(chalk_1.default.red("\u274C Error searching for spec: ".concat(error_1 instanceof Error ? error_1.message : String(error_1))));
                    }
                    return [2 /*return*/, { error: true, message: "Error searching for spec: ".concat(error_1 instanceof Error ? error_1.message : String(error_1)) }];
                case 4:
                    specPath = specPaths[0];
                    try {
                        specData = (0, specs_js_1.parseSpec)(specPath);
                    }
                    catch (error) {
                        if (!options.quiet) {
                            console.error(chalk_1.default.red("\u274C Error parsing spec: ".concat(error instanceof Error ? error.message : String(error))));
                        }
                        return [2 /*return*/, { error: true, message: "Error parsing spec: ".concat(error instanceof Error ? error.message : String(error)) }];
                    }
                    checks = specData.checks || specData.requirements || [];
                    checkIndex = checks.findIndex(function (check) {
                        return check.id === options.checkId || // Match by ID
                            String(check.id).includes(options.checkId || '');
                    } // Partial ID match
                    );
                    if (checkIndex === -1) {
                        if (!options.quiet) {
                            console.error(chalk_1.default.red("\u274C Check with ID \"".concat(options.checkId, "\" not found in spec")));
                            console.log('Available check IDs:');
                            checks.forEach(function (check, index) {
                                console.log("  ".concat(index, ": ").concat(check.id || 'No ID', " - ").concat(check.text || check.require || 'No text'));
                            });
                        }
                        return [2 /*return*/, { error: true, message: "Check with ID \"".concat(options.checkId, "\" not found in spec") }];
                    }
                    check = checks[checkIndex];
                    systemPrompt = "You are a logical reasoning validator.\nYour task is to determine if an LLM's Outcome Report logically satisfies its own Success Condition while avoiding its Failure Condition.\nYou are purely checking logical consistency, not re-verifying the code implementation yourself.\nYou must reason step by step, then provide either \"PASS\" or \"FAIL\" with a brief explanation if \"FAIL\".\nYour response must start with \"PASS\" or \"FAIL:\" (with a colon if FAIL).\nBe strict but fair - the outcome must clearly satisfy the success condition and avoid the failure condition.";
                    prompt = "\nGiven the following:\nLLM's Success Condition (SC): \"".concat(options.successCondition, "\"\nLLM's Failure Condition (FC): \"").concat(options.failureCondition, "\"\nLLM's Outcome Report (OR): \"").concat(options.outcomeReport, "\"\n\nDoes the LLM's Outcome Report (OR) definitively and logically satisfy its own Success Condition (SC) AND definitively avoid its Failure Condition (FC)?\n\nAnalyze this step by step, then respond with only \"PASS\" or \"FAIL: brief explanation\".");
                    if (options.debug) {
                        if (!options.quiet) {
                            console.log(chalk_1.default.dim('\nDebug - Prompt:'));
                            console.log(chalk_1.default.dim(prompt));
                            console.log(chalk_1.default.dim('\nDebug - System Prompt:'));
                            console.log(chalk_1.default.dim(systemPrompt));
                        }
                    }
                    _a.label = 5;
                case 5:
                    _a.trys.push([5, 13, , 14]);
                    return [4 /*yield*/, (0, models_js_1.reason)(prompt, systemPrompt)];
                case 6:
                    modelResponse = _a.sent();
                    if (options.debug) {
                        if (!options.quiet) {
                            console.log(chalk_1.default.dim('\nDebug - Model Response:'));
                            console.log(chalk_1.default.dim(modelResponse));
                        }
                    }
                    isPassing = modelResponse.trim().startsWith('PASS');
                    explanation = isPassing ? 'Logical check passed' : modelResponse.trim();
                    // If the user wants the explanation saved to a file, save it
                    if (options.explanationFile && !isPassing) {
                        try {
                            fs.writeFileSync(options.explanationFile, explanation, 'utf8');
                            if (!options.quiet) {
                                console.log(chalk_1.default.blue("\uD83D\uDCDD Explanation written to ".concat(options.explanationFile)));
                            }
                        }
                        catch (fileError) {
                            console.error(chalk_1.default.yellow("\u26A0\uFE0F Could not write explanation to file: ".concat(fileError instanceof Error ? fileError.message : String(fileError))));
                        }
                    }
                    content = fs.readFileSync(specPath, 'utf8');
                    updatedContent = void 0;
                    extension = path.extname(specPath).toLowerCase();
                    if (!(extension === '.yaml' || extension === '.yml')) return [3 /*break*/, 11];
                    _a.label = 7;
                case 7:
                    _a.trys.push([7, 9, , 10]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('yaml'); })];
                case 8:
                    yaml = _a.sent();
                    specData_1 = yaml.parse(content);
                    checksArray = specData_1.checks || specData_1.requirements || [];
                    if (checksArray[checkIndex]) {
                        checksArray[checkIndex].status = isPassing;
                    }
                    // Serialize back to YAML
                    updatedContent = yaml.stringify(specData_1);
                    return [3 /*break*/, 10];
                case 9:
                    yamlError_1 = _a.sent();
                    if (!options.quiet) {
                        console.error(chalk_1.default.red("\u274C Error updating YAML spec: ".concat(yamlError_1 instanceof Error ? yamlError_1.message : String(yamlError_1))));
                    }
                    return [2 /*return*/, {
                            error: true,
                            message: "Error updating YAML spec: ".concat(yamlError_1 instanceof Error ? yamlError_1.message : String(yamlError_1))
                        }];
                case 10: return [3 /*break*/, 12];
                case 11:
                    // Handle Markdown specs
                    try {
                        updatedContent = updateMarkdownCheckStatus(content, check.text || check.require, isPassing);
                    }
                    catch (mdError) {
                        if (!options.quiet) {
                            console.error(chalk_1.default.red("\u274C Error updating Markdown spec: ".concat(mdError instanceof Error ? mdError.message : String(mdError))));
                        }
                        return [2 /*return*/, {
                                error: true,
                                message: "Error updating Markdown spec: ".concat(mdError instanceof Error ? mdError.message : String(mdError))
                            }];
                    }
                    _a.label = 12;
                case 12:
                    // Write the updated content back to the file
                    fs.writeFileSync(specPath, updatedContent, 'utf8');
                    // Success message
                    if (isPassing) {
                        if (!options.quiet) {
                            console.log(chalk_1.default.green("\u2705 Logical verification PASSED for check \"".concat(check.text || check.require, "\"")));
                            console.log(chalk_1.default.green("\u2705 Spec \"".concat(path.basename(specPath), "\" has been updated, check marked as [\u2713]")));
                        }
                        return [2 /*return*/, {
                                success: true,
                                result: 'PASS',
                                spec: path.basename(specPath, path.extname(specPath)),
                                checkId: options.checkId,
                                checkText: check.text || check.require
                            }];
                    }
                    else {
                        failureReason = modelResponse.replace(/^FAIL:\s*/, '').trim();
                        if (!options.quiet) {
                            console.log(chalk_1.default.red("\u274C Logical verification FAILED for check \"".concat(check.text || check.require, "\"")));
                            console.log(chalk_1.default.red("\u274C Reason: ".concat(failureReason)));
                            console.log(chalk_1.default.red("\u270D\uFE0F Spec \"".concat(path.basename(specPath), "\" has been updated, check marked as [\u2716]")));
                        }
                        return [2 /*return*/, {
                                success: false,
                                result: 'FAIL',
                                reason: failureReason,
                                spec: path.basename(specPath, path.extname(specPath)),
                                checkId: options.checkId,
                                checkText: check.text || check.require
                            }];
                    }
                    return [3 /*break*/, 14];
                case 13:
                    error_2 = _a.sent();
                    if (!options.quiet) {
                        console.error(chalk_1.default.red("\u274C Error during logical verification: ".concat(error_2 instanceof Error ? error_2.message : String(error_2))));
                    }
                    return [2 /*return*/, {
                            error: true,
                            message: "Error during logical verification: ".concat(error_2 instanceof Error ? error_2.message : String(error_2))
                        }];
                case 14: return [2 /*return*/];
            }
        });
    });
}
/**
 * Update the status of a check in a Markdown spec file
 */
function updateMarkdownCheckStatus(content, checkText, isPassing) {
    // Escape special characters for regex
    var escapedCheckText = checkText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Replace the check line with updated status
    var checkboxRegex = new RegExp("- \\[([ xX])\\] ".concat(escapedCheckText), 'g');
    var newStatus = isPassing ? 'x' : '✖';
    return content.replace(checkboxRegex, "- [".concat(newStatus, "] ").concat(checkText));
}
// When the module is executed directly, run the command
if (import.meta.url === "file://".concat(process.argv[1])) {
    await verifyLlmReasoningCommand({
        spec: process.argv.find(function (arg, i) { return arg === '--spec' && i + 1 < process.argv.length; }) ?
            process.argv[process.argv.indexOf('--spec') + 1] : undefined,
        checkId: process.argv.find(function (arg, i) { return arg === '--check-id' && i + 1 < process.argv.length; }) ?
            process.argv[process.argv.indexOf('--check-id') + 1] : undefined,
        successCondition: process.argv.find(function (arg, i) { return arg === '--success-condition' && i + 1 < process.argv.length; }) ?
            process.argv[process.argv.indexOf('--success-condition') + 1] : undefined,
        failureCondition: process.argv.find(function (arg, i) { return arg === '--failure-condition' && i + 1 < process.argv.length; }) ?
            process.argv[process.argv.indexOf('--failure-condition') + 1] : undefined,
        outcomeReport: process.argv.find(function (arg, i) { return arg === '--outcome-report' && i + 1 < process.argv.length; }) ?
            process.argv[process.argv.indexOf('--outcome-report') + 1] : undefined,
        explanationFile: process.argv.find(function (arg, i) { return arg === '--explanation-file' && i + 1 < process.argv.length; }) ?
            process.argv[process.argv.indexOf('--explanation-file') + 1] : undefined,
        debug: process.argv.includes('--debug'),
        quiet: process.argv.includes('--quiet')
    });
}
