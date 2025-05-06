#!/usr/bin/env ts-node
"use strict";
/**
 * CheckMate Audit Command
 * Compares specification requirements to implementation using action bullets
 * Shows meaningful differences and allows interactive updating of specs
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
exports.auditCommand = auditCommand;
var banner_js_1 = require("../ui/banner.js");
var chalk_1 = require("chalk");
var path = require("node:path");
var fs = require("node:fs");
var specs_js_1 = require("../lib/specs.js");
var files_js_1 = require("../lib/files.js");
var ai_client_js_1 = require("../lib/ai-client.js");
var status_js_1 = require("./status.js");
var enquirer_1 = require("enquirer");
var prompt = enquirer_1.default.prompt;
// Directory where implementation outlines are stored (cache)
var CACHE_DIR = 'checkmate/cache';
/**
 * Audit command to compare spec action bullets with implementation action bullets
 */
function auditCommand() {
    return __awaiter(this, arguments, void 0, function (options) {
        var specPath, specData, specPaths, error_1, specName, cacheFilePath, testResult, specBullets, implBullets, shouldGenerateBullets, cachedData, filesToAnalyze, specTitle, relevantFiles, error_2, fileContents, _i, filesToAnalyze_1, file, _a, _b, error_3, diffResult, jsonOutput;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    // Print welcome banner
                    if (!options.quiet) {
                        (0, banner_js_1.printCompactBanner)('CheckMate Audit');
                    }
                    // Check for required spec
                    if (!options.spec) {
                        if (!options.quiet) {
                            console.error(chalk_1.default.red('❌ No spec specified. Use --spec to specify a spec.'));
                            console.log('Example: checkmate audit --spec user-auth');
                            console.log('   OR simply: checkmate audit user-auth');
                        }
                        return [2 /*return*/, { error: true, message: 'No spec specified' }];
                    }
                    specData = {};
                    if (!options.spec) return [3 /*break*/, 4];
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, specs_js_1.getSpecByName)(options.spec)];
                case 2:
                    specPaths = _c.sent();
                    if (!specPaths || specPaths.length === 0) {
                        // Try treating specName as a direct path
                        if (fs.existsSync(options.spec)) {
                            specPath = options.spec;
                        }
                        else {
                            // Spec not found
                            if (!options.quiet) {
                                console.error(chalk_1.default.red("\u274C Could not find spec \"".concat(options.spec, "\"")));
                                console.log('Run "checkmate specs" to see a list of available specs.');
                            }
                            return [2 /*return*/, { error: true, message: "Spec not found: ".concat(options.spec) }];
                        }
                    }
                    else if (specPaths.length === 1) {
                        // Exactly one match found
                        specPath = specPaths[0];
                        if (!options.quiet) {
                            console.log(chalk_1.default.green("\u2705 Found spec: ".concat(path.basename(specPath))));
                        }
                    }
                    else {
                        // Multiple matches found
                        if (!options.quiet) {
                            console.log(chalk_1.default.yellow("Found ".concat(specPaths.length, " potential matches for \"").concat(options.spec, "\":")));
                            // Show the matches with numbers
                            specPaths.forEach(function (specFilePath, index) {
                                var basename = path.basename(specFilePath);
                                var relativePath = path.relative(process.cwd(), specFilePath);
                                console.log("  ".concat(index + 1, ". ").concat(chalk_1.default.cyan(basename), " (").concat(relativePath, ")"));
                            });
                            // Use first match by default
                            console.log(chalk_1.default.yellow("\nUsing the first match: ".concat(path.basename(specPaths[0]))));
                        }
                        specPath = specPaths[0];
                    }
                    // Parse the spec
                    try {
                        specData = (0, specs_js_1.parseSpec)(specPath);
                    }
                    catch (error) {
                        if (!options.quiet) {
                            console.error(chalk_1.default.red("\u274C Error parsing spec: ".concat(error.message)));
                        }
                        return [2 /*return*/, { error: true, message: "Error parsing spec: ".concat(error.message) }];
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _c.sent();
                    if (!options.quiet) {
                        console.error(chalk_1.default.red("\u274C Error searching for spec: ".concat(error_1.message)));
                    }
                    return [2 /*return*/, { error: true, message: "Error searching for spec: ".concat(error_1.message) }];
                case 4:
                    // Ensure cache directory exists
                    if (!fs.existsSync(CACHE_DIR)) {
                        fs.mkdirSync(CACHE_DIR, { recursive: true });
                    }
                    specName = specPath ? path.basename(specPath, path.extname(specPath)) : 'unknown';
                    cacheFilePath = path.join(CACHE_DIR, "".concat(specName, ".bullets.json"));
                    // First run tests on the spec
                    if (!options.quiet) {
                        console.log(chalk_1.default.blue('🧪 Running tests for spec...'));
                    }
                    return [4 /*yield*/, (0, status_js_1.statusCommand)({
                            target: options.spec,
                            quiet: options.quiet,
                            json: true
                        })];
                case 5:
                    testResult = _c.sent();
                    if (testResult.error) {
                        if (!options.quiet) {
                            console.error(chalk_1.default.red("\u274C Error running tests: ".concat(testResult.message)));
                        }
                        return [2 /*return*/, { error: true, message: "Error running tests: ".concat(testResult.message) }];
                    }
                    specBullets = extractSpecActionBullets(specData);
                    if (specBullets.length === 0) {
                        if (!options.quiet) {
                            console.error(chalk_1.default.yellow("\u26A0\uFE0F No action bullets found in spec \"".concat(options.spec, "\"")));
                        }
                    }
                    implBullets = [];
                    shouldGenerateBullets = true;
                    if (fs.existsSync(cacheFilePath) && !options.force) {
                        // Reuse existing bullets if they exist and force flag is not set
                        if (!options.quiet) {
                            console.log(chalk_1.default.blue("\uD83D\uDCC4 Using cached implementation bullets from ".concat(cacheFilePath)));
                        }
                        try {
                            cachedData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
                            implBullets = cachedData.bullets || [];
                            shouldGenerateBullets = false;
                        }
                        catch (error) {
                            if (!options.quiet) {
                                console.error(chalk_1.default.yellow("\u26A0\uFE0F Error reading cached bullets, will regenerate: ".concat(error.message)));
                            }
                            shouldGenerateBullets = true;
                        }
                    }
                    filesToAnalyze = [];
                    if (!shouldGenerateBullets) return [3 /*break*/, 19];
                    if (!(options.files && options.files.length > 0)) return [3 /*break*/, 6];
                    // Use explicitly provided files
                    filesToAnalyze = options.files;
                    return [3 /*break*/, 11];
                case 6:
                    if (!(specData.files && specData.files.length > 0)) return [3 /*break*/, 7];
                    // Use files from the spec
                    filesToAnalyze = specData.files;
                    return [3 /*break*/, 11];
                case 7:
                    // No files specified, use embedding to find relevant files
                    if (!options.quiet) {
                        console.log(chalk_1.default.blue('🔍 No files specified, finding relevant files using embeddings...'));
                    }
                    _c.label = 8;
                case 8:
                    _c.trys.push([8, 10, , 11]);
                    specTitle = specData.title || (specPath ? path.basename(specPath, path.extname(specPath)) : 'unknown');
                    return [4 /*yield*/, (0, files_js_1.getRelevantFiles)(specTitle, 10)];
                case 9:
                    relevantFiles = _c.sent();
                    filesToAnalyze = relevantFiles.map(function (file) { return file.path; });
                    if (!options.quiet) {
                        console.log(chalk_1.default.green("\u2705 Found ".concat(filesToAnalyze.length, " relevant files.")));
                    }
                    return [3 /*break*/, 11];
                case 10:
                    error_2 = _c.sent();
                    if (!options.quiet) {
                        console.error(chalk_1.default.red("\u274C Error finding relevant files: ".concat(error_2.message)));
                        console.log('Please specify files using --files option.');
                    }
                    return [2 /*return*/, { error: true, message: "Error finding relevant files: ".concat(error_2.message) }];
                case 11:
                    if (filesToAnalyze.length === 0) {
                        if (!options.quiet) {
                            console.error(chalk_1.default.red('❌ No files to analyze.'));
                            console.log('Please specify files using --files option.');
                        }
                        return [2 /*return*/, { error: true, message: 'No files to analyze' }];
                    }
                    fileContents = {};
                    _i = 0, filesToAnalyze_1 = filesToAnalyze;
                    _c.label = 12;
                case 12:
                    if (!(_i < filesToAnalyze_1.length)) return [3 /*break*/, 17];
                    file = filesToAnalyze_1[_i];
                    _c.label = 13;
                case 13:
                    _c.trys.push([13, 15, , 16]);
                    _a = fileContents;
                    _b = file;
                    return [4 /*yield*/, (0, files_js_1.getFileContent)(file)];
                case 14:
                    _a[_b] = _c.sent();
                    return [3 /*break*/, 16];
                case 15:
                    error_3 = _c.sent();
                    if (!options.quiet) {
                        console.error(chalk_1.default.yellow("\u26A0\uFE0F Could not read file ".concat(file, ": ").concat(error_3.message)));
                    }
                    return [3 /*break*/, 16];
                case 16:
                    _i++;
                    return [3 /*break*/, 12];
                case 17:
                    // Generate the implementation bullets
                    if (!options.quiet) {
                        console.log(chalk_1.default.blue('🔄 Extracting action bullets from implementation...'));
                    }
                    return [4 /*yield*/, extractImplementationBullets(fileContents)];
                case 18:
                    implBullets = _c.sent();
                    // Save the bullets to cache
                    fs.writeFileSync(cacheFilePath, JSON.stringify({
                        specName: specName,
                        timestamp: new Date().toISOString(),
                        bullets: implBullets
                    }, null, 2), 'utf8');
                    if (!options.quiet) {
                        console.log(chalk_1.default.green("\u2705 Implementation bullets cached to ".concat(cacheFilePath)));
                    }
                    _c.label = 19;
                case 19:
                    diffResult = compareActionBullets(specBullets, implBullets);
                    if (!options.json) return [3 /*break*/, 20];
                    jsonOutput = {
                        spec: specName,
                        testStatus: testResult.status,
                        matches: diffResult.matches,
                        missingInCode: diffResult.missingInCode,
                        missingInSpec: diffResult.missingInSpec,
                        status: (diffResult.missingInCode.length === 0 && diffResult.missingInSpec.length === 0) ? 'PASS' : 'FAIL'
                    };
                    console.log(JSON.stringify(jsonOutput, null, 2));
                    return [2 /*return*/, jsonOutput];
                case 20:
                    if (!!options.quiet) return [3 /*break*/, 23];
                    // Print a summary
                    console.log("\nSpec: ".concat(chalk_1.default.cyan(specName)));
                    console.log('────────────');
                    // Print matches
                    diffResult.matches.forEach(function (bullet) {
                        console.log("".concat(chalk_1.default.green('✅'), " ").concat(bullet));
                    });
                    // Print missing in code
                    diffResult.missingInCode.forEach(function (bullet) {
                        console.log("".concat(chalk_1.default.red('❌'), " ").concat(bullet, " ").concat(chalk_1.default.dim('<- missing in code')));
                    });
                    // Print missing in spec
                    diffResult.missingInSpec.forEach(function (bullet) {
                        console.log("".concat(chalk_1.default.yellow('⚠️'), " ").concat(bullet, " ").concat(chalk_1.default.dim('<- code has, spec missing')));
                    });
                    // Print debug meta data if requested
                    if (options.debug) {
                        console.log('\n--- Debug Meta Info ---');
                        console.log("Spec path: ".concat(specPath));
                        console.log("Files analyzed: ".concat(filesToAnalyze.length));
                        if (filesToAnalyze.length > 0) {
                            console.log('Files:');
                            filesToAnalyze.forEach(function (file) { return console.log("  - ".concat(file)); });
                        }
                    }
                    if (!(diffResult.missingInSpec.length > 0)) return [3 /*break*/, 22];
                    return [4 /*yield*/, promptToAddToSpec(diffResult.missingInSpec, specPath)];
                case 21:
                    _c.sent();
                    _c.label = 22;
                case 22:
                    // If there are missing items, fail unless warn-only mode is enabled
                    if (!options.warnOnly && (diffResult.missingInCode.length > 0 || diffResult.missingInSpec.length > 0)) {
                        if (!options.quiet) {
                            console.error(chalk_1.default.red('\n❌ Audit failed: Differences detected between spec and implementation.'));
                            console.log(chalk_1.default.dim('Use --warn-only flag to prevent failure on differences.'));
                        }
                        return [2 /*return*/, {
                                error: true,
                                message: 'Audit failed: Differences detected',
                                missingInCode: diffResult.missingInCode.length,
                                missingInSpec: diffResult.missingInSpec.length
                            }];
                    }
                    _c.label = 23;
                case 23: return [2 /*return*/, {
                        spec: specName,
                        test: testResult,
                        matches: diffResult.matches.length,
                        missingInCode: diffResult.missingInCode.length,
                        missingInSpec: diffResult.missingInSpec.length
                    }];
            }
        });
    });
}
/**
 * Extract action bullets from a spec object
 */
function extractSpecActionBullets(specData) {
    if (!specData) {
        return [];
    }
    var bullets = [];
    // Extract from different spec formats
    if (specData.checks && Array.isArray(specData.checks)) {
        // Extract from checks
        for (var _i = 0, _a = specData.checks; _i < _a.length; _i++) {
            var check = _a[_i];
            if (check.text) {
                // Remove any checkbox markers and clean up
                var text = check.text.replace(/^\s*\[[\sxX]\]\s*/, '').trim();
                bullets.push(text);
            }
            else if (check.require) {
                bullets.push(check.require.trim());
            }
        }
    }
    else if (specData.requirements && Array.isArray(specData.requirements)) {
        // Extract from requirements (backward compatibility)
        for (var _b = 0, _c = specData.requirements; _b < _c.length; _b++) {
            var req = _c[_b];
            if (req.text) {
                var text = req.text.replace(/^\s*\[[\sxX]\]\s*/, '').trim();
                bullets.push(text);
            }
            else if (req.require) {
                bullets.push(req.require.trim());
            }
        }
    }
    return bullets;
}
/**
 * Extract action bullets from implementation file contents
 */
function extractImplementationBullets(fileContents) {
    return __awaiter(this, void 0, void 0, function () {
        var fileText, stopVerbs, prompt, response, bullets;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fileText = Object.entries(fileContents)
                        .map(function (_a) {
                        var file = _a[0], content = _a[1];
                        return "// File: ".concat(file, "\n").concat(content);
                    })
                        .join('\n\n');
                    stopVerbs = ['return', 'print', 'log', 'console'];
                    prompt = "\nExtract the key actions performed by this code as a list of imperative action bullets.\nEach bullet must follow the format: \"verb + object\" (e.g., \"validate credentials\", \"hash password\").\n\nGuidelines:\n- Use simple present tense imperative verbs (e.g., \"create\", \"fetch\", \"validate\")\n- Each bullet must be a single action (do not combine multiple actions)\n- Do NOT number the bullets, use plain dash (-) format\n- Focus on functional behavior, not implementation details\n- Filter out trivial actions like ".concat(stopVerbs.join(', '), " unless they're primary functionality\n- DO NOT use sub-bullets or nested lists\n\nExample of good action bullets:\n- validate user credentials\n- fetch user profile\n- create authentication token\n- update database record\n\nReturn ONLY the bullet list with no introduction, description, explanation, or numbers.\n\nFiles to analyze:\n").concat(fileText, "\n");
                    return [4 /*yield*/, (0, ai_client_js_1.aiSummarize)(prompt)];
                case 1:
                    response = _a.sent();
                    bullets = response.split('\n')
                        .map(function (line) { return line.trim(); })
                        .filter(function (line) { return line.startsWith('- '); })
                        .map(function (line) { return line.substring(2).trim(); }) // Remove the bullet marker
                        .filter(function (line) { return line.length > 0 && !stopVerbs.some(function (verb) { return line.startsWith(verb); }); });
                    return [2 /*return*/, bullets];
            }
        });
    });
}
/**
 * Compare action bullets between spec and implementation
 */
function compareActionBullets(specBullets, implBullets) {
    // Use sets to store the results
    var matches = [];
    var missingInCode = [];
    var missingInSpec = [];
    // Normalize bullets for comparison
    var normalizeText = function (text) {
        return text.toLowerCase()
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/[.,;:!?]$/g, '') // Remove trailing punctuation
            .trim();
    };
    // Create normalized sets for efficient lookups
    var normalizedSpecBullets = new Map();
    var normalizedImplBullets = new Map();
    specBullets.forEach(function (bullet) {
        normalizedSpecBullets.set(normalizeText(bullet), bullet);
    });
    implBullets.forEach(function (bullet) {
        normalizedImplBullets.set(normalizeText(bullet), bullet);
    });
    // Find matches
    for (var _i = 0, _a = normalizedSpecBullets.entries(); _i < _a.length; _i++) {
        var _b = _a[_i], normalized = _b[0], original = _b[1];
        if (normalizedImplBullets.has(normalized)) {
            matches.push(original);
        }
        else {
            missingInCode.push(original);
        }
    }
    // Find missing in spec
    for (var _c = 0, _d = normalizedImplBullets.entries(); _c < _d.length; _c++) {
        var _e = _d[_c], normalized = _e[0], original = _e[1];
        if (!normalizedSpecBullets.has(normalized)) {
            missingInSpec.push(original);
        }
    }
    return { matches: matches, missingInCode: missingInCode, missingInSpec: missingInSpec };
}
/**
 * Interactively prompt to add missing bullets to spec
 */
function promptToAddToSpec(missingBullets, specPath) {
    return __awaiter(this, void 0, void 0, function () {
        var specContent, _i, missingBullets_1, bullet, response, checksIndex, nextSectionMatch, endOfChecksIndex, checksSection, newChecksSection, newContent, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    specContent = fs.readFileSync(specPath, 'utf8');
                    _i = 0, missingBullets_1 = missingBullets;
                    _a.label = 1;
                case 1:
                    if (!(_i < missingBullets_1.length)) return [3 /*break*/, 6];
                    bullet = missingBullets_1[_i];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, prompt({
                            type: 'confirm',
                            name: 'add',
                            message: "I found an action in code that isn't in spec: \"".concat(bullet, "\". Add it to spec?"),
                            initial: false
                        })];
                case 3:
                    response = _a.sent();
                    if (response.add) {
                        checksIndex = specContent.indexOf('## Checks');
                        if (checksIndex !== -1) {
                            nextSectionMatch = specContent.substring(checksIndex).match(/\n##\s/);
                            endOfChecksIndex = nextSectionMatch && nextSectionMatch.index !== undefined
                                ? checksIndex + nextSectionMatch.index
                                : specContent.length;
                            checksSection = specContent.substring(checksIndex, endOfChecksIndex);
                            newChecksSection = checksSection + "\n- [ ] ".concat(bullet);
                            newContent = specContent.substring(0, checksIndex) +
                                newChecksSection +
                                specContent.substring(endOfChecksIndex);
                            // Write the updated spec
                            fs.writeFileSync(specPath, newContent, 'utf8');
                            console.log(chalk_1.default.green("\u2705 Added \"".concat(bullet, "\" to spec")));
                        }
                        else {
                            console.error(chalk_1.default.red('❌ Could not find "## Checks" section in spec'));
                        }
                    }
                    return [3 /*break*/, 5];
                case 4:
                    error_4 = _a.sent();
                    console.error(chalk_1.default.red("\u274C Error updating spec: ".concat(error_4.message)));
                    return [3 /*break*/, 5];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/, true];
            }
        });
    });
}
// When the module is executed directly, run the audit command
if (import.meta.url === "file://".concat(process.argv[1])) {
    var options = {
        spec: process.argv[2],
        json: process.argv.includes('--json'),
        quiet: process.argv.includes('--quiet'),
        debug: process.argv.includes('--debug'),
        force: process.argv.includes('--force'),
        warnOnly: process.argv.includes('--warn-only')
    };
    await auditCommand(options);
}
