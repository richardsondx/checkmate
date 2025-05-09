#!/usr/bin/env ts-node
"use strict";
/**
 * CheckMate List Checks Command
 * Returns a list of check items from a specification
 * Designed for LLM-driven TDD to retrieve checks for verification
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
exports.listChecksCommand = listChecksCommand;
var banner_js_1 = require("../ui/banner.js");
var chalk_1 = require("chalk");
var specs_js_1 = require("../lib/specs.js");
var path = require("node:path");
var fs = require("node:fs");
var crypto_1 = require("crypto");
/**
 * List checks command to retrieve check items from a specification
 */
function listChecksCommand() {
    return __awaiter(this, arguments, void 0, function (options) {
        var specPaths, error_1, specPath, specData, title, specName, rawChecks, checks, result;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Print welcome banner if not quiet
                    if (!options.quiet) {
                        (0, banner_js_1.printCompactBanner)('List Checks');
                    }
                    // Check for required spec
                    if (!options.spec) {
                        if (!options.quiet) {
                            console.error(chalk_1.default.red('❌ No spec specified. Use --spec to specify a spec.'));
                            console.log('Example: checkmate list-checks --spec feature-name');
                        }
                        return [2 /*return*/, { error: true, message: 'No spec specified' }];
                    }
                    specPaths = [];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, specs_js_1.getSpecByName)(options.spec || '')];
                case 2:
                    specPaths = _a.sent();
                    if (!specPaths || specPaths.length === 0) {
                        // Try treating options.spec as a direct path
                        if (fs.existsSync(options.spec)) {
                            specPaths = [options.spec];
                        }
                        else if (fs.existsSync("checkmate/specs/".concat(options.spec))) {
                            // Try in the checkmate/specs directory
                            specPaths = ["checkmate/specs/".concat(options.spec)];
                        }
                        else if (fs.existsSync("checkmate/specs/".concat(options.spec, ".md"))) {
                            // Try with .md extension added
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
                    title = specData.title || path.basename(specPath, path.extname(specPath));
                    specName = path.basename(specPath, path.extname(specPath));
                    rawChecks = specData.checks || specData.requirements || [];
                    checks = rawChecks.map(function (check, index) {
                        // Generate a stable ID if none exists
                        var checkId = check.id || generateStableId(specName, index, check.require || check.text || '');
                        return {
                            id: checkId,
                            text: check.text || check.require || '',
                            status: check.status === true ? 'pass' : (check.status === false ? 'fail' : 'unchecked'),
                            index: index
                        };
                    });
                    result = {
                        title: title,
                        spec: specName,
                        path: specPath,
                        checks: checks
                    };
                    // Output based on format
                    if (options.format === 'json' || options.cursor) {
                        if (!options.quiet) {
                            console.log(JSON.stringify(result, null, 2));
                        }
                        return [2 /*return*/, result];
                    }
                    else {
                        // Text output
                        if (!options.quiet) {
                            console.log(chalk_1.default.cyan("\nChecks for spec: ".concat(chalk_1.default.bold(title))));
                            console.log(chalk_1.default.dim("".concat(specPath, "\n")));
                            if (checks.length === 0) {
                                console.log(chalk_1.default.yellow('⚠️ No checks found in this spec'));
                            }
                            else {
                                checks.forEach(function (check, index) {
                                    var statusSymbol;
                                    var statusColor; // chalk function
                                    if (check.status === 'pass') {
                                        statusSymbol = '✅';
                                        statusColor = chalk_1.default.green;
                                    }
                                    else if (check.status === 'fail') {
                                        statusSymbol = '❌';
                                        statusColor = chalk_1.default.red;
                                    }
                                    else {
                                        statusSymbol = '⬜';
                                        statusColor = chalk_1.default.gray;
                                    }
                                    console.log("".concat(statusColor("".concat(index + 1, ". ").concat(statusSymbol, " ").concat(check.text)), " ").concat(chalk_1.default.dim("(ID: ".concat(check.id, ")"))));
                                });
                            }
                        }
                        return [2 /*return*/, result];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Generate a stable ID for a check item
 * This ensures IDs remain consistent even if the check order changes
 */
function generateStableId(specName, index, text) {
    // Create a hash from the spec name and check text
    var hash = crypto_1.default.createHash('md5').update("".concat(specName, ":").concat(text)).digest('hex');
    // Use the first 8 characters of the hash
    return hash.substring(0, 8);
}
// When the module is executed directly, run the list-checks command
if (import.meta.url === "file://".concat(process.argv[1])) {
    await listChecksCommand({
        spec: process.argv[2],
        format: (process.argv.includes('--json') ? 'json' : 'text')
    });
}
