#!/usr/bin/env ts-node
"use strict";
/**
 * CheckMate Status Command
 * Shows status of specifications and requirements
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
exports.statusCommand = statusCommand;
exports.getSpecStatus = getSpecStatus;
exports.countCheckpoints = countCheckpoints;
var banner_js_1 = require("../ui/banner.js");
var chalk_1 = require("chalk");
var specs_js_1 = require("../lib/specs.js");
var path = require("node:path");
var fs = require("node:fs");
/**
 * Status command to check specification status
 */
function statusCommand() {
    return __awaiter(this, arguments, void 0, function (options) {
        var specStatus, jsonOutput, jsonOutput, passRate, statusSymbol;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Print welcome banner
                    if (!options.quiet) {
                        (0, banner_js_1.printCompactBanner)('Spec Status');
                    }
                    // Check for required target
                    if (!options.target) {
                        if (!options.quiet) {
                            console.error(chalk_1.default.red('❌ No target specified. Use --target to specify a spec.'));
                            console.log('Example: checkmate status --target cursor-integration');
                        }
                        return [2 /*return*/, { error: true, message: 'No target specified' }];
                    }
                    return [4 /*yield*/, getSpecificSpecStatus(options.target)];
                case 1:
                    specStatus = _a.sent();
                    if (specStatus.notFound) {
                        if (options.json) {
                            jsonOutput = {
                                error: true,
                                message: "Spec not found: ".concat(options.target)
                            };
                            console.log(JSON.stringify(jsonOutput, null, 2));
                            return [2 /*return*/, jsonOutput];
                        }
                        else if (options.cursor) {
                            console.error("[CM-FAIL] Could not find spec \"".concat(options.target, "\""));
                        }
                        else if (!options.quiet) {
                            console.error(chalk_1.default.red("\u274C Could not find spec \"".concat(options.target, "\"")));
                            console.log('Run "checkmate specs" to see a list of available specs.');
                        }
                        return [2 /*return*/, { error: true, message: "Spec not found: ".concat(options.target) }];
                    }
                    if (options.json) {
                        jsonOutput = {
                            spec: specStatus.name,
                            path: specStatus.path,
                            total: specStatus.requirements,
                            passed: specStatus.passed,
                            failed: specStatus.failed,
                            status: specStatus.failed > 0 ? 'FAIL' : 'PASS',
                            exitCode: specStatus.failed > 0 ? 1 : 0,
                            warnings: {
                                hasTrivialTests: specStatus.hasTrivialTests,
                                hasEmptyChecks: specStatus.requirements === 0
                            }
                        };
                        console.log(JSON.stringify(jsonOutput, null, 2));
                        return [2 /*return*/, jsonOutput];
                    }
                    else if (options.cursor) {
                        // Output cursor-friendly format
                        if (specStatus.failed > 0) {
                            console.log("[CM-FAIL] ".concat(specStatus.name, ": ").concat(specStatus.passed, "/").concat(specStatus.requirements, " passed, ").concat(specStatus.failed, " failed"));
                        }
                        else if (specStatus.requirements > 0) {
                            console.log("[CM-PASS] ".concat(specStatus.name, ": all ").concat(specStatus.requirements, " passed"));
                        }
                        else {
                            console.log("[CM-WARN] ".concat(specStatus.name, ": No requirements found or invalid spec"));
                        }
                    }
                    else if (!options.quiet) {
                        passRate = specStatus.requirements > 0 ? Math.round((specStatus.passed / specStatus.requirements) * 100) : 0;
                        statusSymbol = specStatus.failed === 0 ? chalk_1.default.green('✔') : chalk_1.default.red('✖');
                        console.log(chalk_1.default.cyan("\nSpec Status: ".concat(specStatus.name)));
                        console.log("".concat(statusSymbol, " ").concat(specStatus.passed, " / ").concat(specStatus.requirements, " requirements passed (").concat(passRate, "%)"));
                        if (specStatus.hasTrivialTests) {
                            console.log(chalk_1.default.yellow('\n⚠️  Warning: This spec contains trivial test assertions'));
                        }
                        if (specStatus.requirements === 0) {
                            console.log(chalk_1.default.yellow('\n⚠️  Warning: This spec has no requirements'));
                        }
                        // Print list of failed requirements if any
                        if (specStatus.failed > 0 && specStatus.failedRequirements.length > 0) {
                            console.log(chalk_1.default.red('\nFailing requirements:'));
                            specStatus.failedRequirements.forEach(function (req, index) {
                                console.log(chalk_1.default.red("".concat(index + 1, ". ").concat(req.text || req.require || '')));
                            });
                        }
                    }
                    return [2 /*return*/, specStatus];
            }
        });
    });
}
/**
 * Get status for a specific spec by name or path
 */
function getSpecificSpecStatus(specNameOrPath) {
    return __awaiter(this, void 0, void 0, function () {
        var specPaths, specPath, spec, requirements, passedRequirements, failedRequirements, passed, failed, hasTrivialTests, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, specs_js_1.getSpecByName)(specNameOrPath)];
                case 1:
                    specPaths = _a.sent();
                    specPath = void 0;
                    if (!specPaths || specPaths.length === 0) {
                        // Try treating specNameOrPath as a direct path
                        if (fs.existsSync(specNameOrPath)) {
                            specPath = specNameOrPath;
                        }
                        else {
                            // Spec not found
                            return [2 /*return*/, {
                                    name: specNameOrPath,
                                    path: '',
                                    requirements: 0,
                                    passed: 0,
                                    failed: 0,
                                    hasTrivialTests: false,
                                    notFound: true,
                                    failedRequirements: []
                                }];
                        }
                    }
                    else {
                        // We'll just take the first matching spec if multiple are found
                        specPath = specPaths[0];
                    }
                    spec = (0, specs_js_1.parseSpec)(specPath);
                    requirements = spec.checks || spec.requirements || [];
                    passedRequirements = requirements.filter(function (r) { return r.status === true; });
                    failedRequirements = requirements.filter(function (r) { return !r.status; });
                    passed = passedRequirements.length;
                    failed = failedRequirements.length;
                    hasTrivialTests = checkForTrivialTests(requirements);
                    return [2 /*return*/, {
                            name: spec.title || path.basename(specPath, path.extname(specPath)),
                            path: specPath,
                            requirements: requirements.length,
                            passed: passed,
                            failed: failed,
                            hasTrivialTests: hasTrivialTests,
                            failedRequirements: failedRequirements
                        }];
                case 2:
                    error_1 = _a.sent();
                    console.error("Error parsing spec ".concat(specNameOrPath, ":"), error_1);
                    // Return a spec not found result
                    return [2 /*return*/, {
                            name: specNameOrPath,
                            path: '',
                            requirements: 0,
                            passed: 0,
                            failed: 0,
                            hasTrivialTests: false,
                            notFound: true,
                            failedRequirements: []
                        }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Check if the requirements have trivial tests
 */
function checkForTrivialTests(requirements) {
    for (var _i = 0, requirements_1 = requirements; _i < requirements_1.length; _i++) {
        var req = requirements_1[_i];
        if (req.test) {
            var testContent = req.test.trim();
            // Look for test blocks that only contain trivial assertions
            if (testContent === 'return true;' ||
                testContent === 'return true' ||
                testContent === 'true;' ||
                testContent === 'true' ||
                testContent.endsWith('// Always pass') ||
                testContent.includes('trivial assertion')) {
                return true;
            }
        }
    }
    return false;
}
/**
 * Get the status of a spec file
 * @param specFilename The filename of the spec to get status for
 * @returns The spec status with checkpoints
 */
function getSpecStatus(specFilename) {
    return __awaiter(this, void 0, void 0, function () {
        var specPaths, specPath, spec, checkpoints;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, specs_js_1.getSpecByName)(specFilename)];
                case 1:
                    specPaths = _a.sent();
                    specPath = (specPaths === null || specPaths === void 0 ? void 0 : specPaths[0]) || specFilename;
                    spec = (0, specs_js_1.parseSpec)(specPath);
                    checkpoints = spec.checks || spec.requirements || [];
                    return [2 /*return*/, {
                            filename: path.basename(specPath),
                            title: spec.title || path.basename(specPath, path.extname(specPath)),
                            checkpoints: checkpoints
                        }];
            }
        });
    });
}
/**
 * Count completed and remaining checkpoints
 * @param checkpoints Array of checkpoints
 * @returns Object with total, completed, and remaining counts
 */
function countCheckpoints(checkpoints) {
    var total = checkpoints.length;
    var completed = checkpoints.filter(function (c) { return c.status === true; }).length;
    var remaining = total - completed;
    return {
        total: total,
        completed: completed,
        remaining: remaining
    };
}
// When the module is executed directly, run the status command
if (import.meta.url === "file://".concat(process.argv[1])) {
    await statusCommand({ target: process.argv[2] });
}
