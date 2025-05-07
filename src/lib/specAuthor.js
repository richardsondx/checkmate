"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.ensureUniqueRequirementIds = exports.SpecificationType = void 0;
exports.writeSpec = writeSpec;
exports.authorSpec = authorSpec;
exports.generateYamlSpec = generateYamlSpec;
exports.generateTestCode = generateTestCode;
exports.generateId = generateId;
exports.saveYamlSpec = saveYamlSpec;
exports.createSpecification = createSpecification;
exports.createTypeBSpecification = createTypeBSpecification;
exports.saveSpecification = saveSpecification;
exports.generateTypeASpec = generateTypeASpec;
exports.generateTypeBSpec = generateTypeBSpec;
exports.validateSpecification = validateSpecification;
exports.ensureUniqueCheckIds = ensureUniqueCheckIds;
/**
 * Spec author for CheckMate CLI
 * Generates rich, actionable specifications from feature descriptions and context
 */
var fs = require("node:fs");
var path = require("node:path");
var models_js_1 = require("./models.js");
var specs_js_1 = require("./specs.js");
var uuid_1 = require("uuid");
var yaml_1 = require("yaml");
var crypto_1 = require("crypto");
// Directory where specs are stored
var SPECS_DIR = 'checkmate/specs';
var AGENTS_DIR = path.join(SPECS_DIR, 'agents');
// Ensure the specs directory exists
function ensureSpecsDir() {
    if (!fs.existsSync(SPECS_DIR)) {
        fs.mkdirSync(SPECS_DIR, { recursive: true });
    }
}
// Ensure the agents directory exists
function ensureAgentsDir() {
    if (!fs.existsSync(AGENTS_DIR)) {
        fs.mkdirSync(AGENTS_DIR, { recursive: true });
    }
}
// Function to write a spec to a file (previously imported from parse.js)
function writeSpec(spec, filePath) {
    try {
        // Convert to YAML or the appropriate format
        var yaml = JSON.stringify(spec, null, 2);
        // Ensure directory exists
        var dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        // Write to file
        fs.writeFileSync(filePath, yaml, 'utf8');
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error("Error writing spec to ".concat(filePath, ": ").concat(error.message));
        }
        throw error;
    }
}
/**
 * Generate a rich specification from a feature and context
 */
function authorSpec(feature, contextFiles, additionalNotes, options) {
    return __awaiter(this, void 0, void 0, function () {
        var filesWithReasons, notesSection, systemPrompt, userPrompt, result, extension, outputDir, filePath, specObj, jsonMatch, needsMoreContext, yamlContent, autoFilesModule, contentToProcess, spec, error_1, fallbackSpec, outputDir, filePath, yamlContent, fallbackMarkdown, outputDir, filePath, autoFilesModule, contentToProcess, spec;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Ensure specs directory exists
                    ensureSpecsDir();
                    // Ensure agents directory exists if needed
                    if (options === null || options === void 0 ? void 0 : options.agent) {
                        ensureAgentsDir();
                    }
                    filesWithReasons = contextFiles
                        .map(function (file) { return "- ".concat(file.path).concat(file.reason ? " (".concat(file.reason, ")") : ''); })
                        .join('\n');
                    notesSection = additionalNotes ?
                        "\n\nAdditional context/checks:\n".concat(additionalNotes) : '';
                    systemPrompt = "You are a senior software architect specialized in creating detailed, testable specifications.\nYour task is to create a comprehensive spec based on a feature description and relevant code files.\n\n".concat((options === null || options === void 0 ? void 0 : options.agent) ? "\nThe specification MUST follow this JSON schema:\n{\n  \"title\": \"Feature title\",\n  \"files\": [\"path/to/file1.ts\", \"path/to/file2.ts\"],\n  \"checks\": [\n    {\n      \"id\": \"unique-id-1\",\n      \"require\": \"Clear requirement statement that can be verified\",\n      \"test\": \"JavaScript/TypeScript code that tests the requirement\"\n    }\n  ]\n}\n" : "\nThe specification MUST be a Markdown document with EXACTLY this format:\n1. A title at the top using a single # heading\n2. A section called \"## Checks\" containing 3-7 specific, testable checks as a checklist with \"[ ]\" format\n3. NO OTHER sections or headings are allowed\n\nDO NOT include any other headings like \"## Implementation Notes\", \"## Feature Requirements\", \"## Architecture Considerations\", etc.\nDO NOT include a \"## Files\" or \"## Relevant Files\" section as this will be handled automatically.\n", "\n\nFollow these guidelines:\n- Each check must be concrete, testable, and specific (not generic)\n").concat((options === null || options === void 0 ? void 0 : options.agent) ? "- Focus on verification: each test must be runnable JavaScript/TypeScript\n- Keep the checks focused and atomic - one clear assertion per check\n- The test code should import necessary files and make assertions\n- Tests should focus on business logic and API behavior, not UI interactions\n- Return valid JSON that will be converted to YAML" : "- Each bullet point should be specific and measurable\n- Checks should be testable in isolation\n- Use clear language and avoid jargon\n- Format checks as a checklist with \"[ ]\" format\n- Include ONLY the title and checks sections - no additional sections", "\n\nIf the file list provided contains too many files, select only the most relevant ones (max 10).");
                    userPrompt = "Create a detailed, testable specification for this feature:\n\nFeature name: ".concat(feature.title, "\nDescription: ").concat(feature.description).concat(notesSection, "\n\nHere are potentially relevant files (ranked by relevance):\n").concat(filesWithReasons, "\n\nGenerate a specification that:\n").concat((options === null || options === void 0 ? void 0 : options.agent) ? "1. Lists only the most relevant files from above (no more than 10)\n2. Provides 3-7 concrete, testable checks \n3. Each test should be executable JavaScript or TypeScript that imports the right modules" :
                        "1. Has ONLY two sections: a title and a \"## Checks\" section\n2. The \"## Checks\" section should contain 3-7 concrete requirements as a checklist with \"[ ]\" format\n3. DO NOT include any other sections, headings, or notes\n\nIMPORTANT: The ONLY allowed format is:\n# Title\n## Checks\n- [ ] Check 1\n- [ ] Check 2\n- [ ] Check 3\n", "\n\n").concat((options === null || options === void 0 ? void 0 : options.agent) ? 'Reply ONLY with the JSON specification object.' : 'Reply ONLY with the Markdown content following the exact format specified, no explanations or additional sections.');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 8, , 14]);
                    return [4 /*yield*/, (0, models_js_1.reason)(userPrompt, systemPrompt)];
                case 2:
                    result = _a.sent();
                    extension = (options === null || options === void 0 ? void 0 : options.agent) ? '.yaml' : '.md';
                    outputDir = (options === null || options === void 0 ? void 0 : options.agent) ? AGENTS_DIR : SPECS_DIR;
                    filePath = path.join(outputDir, "".concat(feature.slug).concat(extension));
                    if (!(options === null || options === void 0 ? void 0 : options.agent)) return [3 /*break*/, 3];
                    specObj = void 0;
                    try {
                        specObj = JSON.parse(result);
                    }
                    catch (error) {
                        console.error('Error parsing AI response as JSON:', error);
                        jsonMatch = result.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
                            result.match(/(\{[\s\S]*?\})/);
                        if (jsonMatch && jsonMatch[1]) {
                            try {
                                specObj = JSON.parse(jsonMatch[1]);
                            }
                            catch (innerError) {
                                console.error('Failed to extract JSON from response:', innerError);
                                throw new Error('Could not parse AI response as JSON');
                            }
                        }
                        else {
                            throw new Error('AI did not return valid JSON');
                        }
                    }
                    // Handle backward compatibility - if the response uses 'requirements' instead of 'checks'
                    if (specObj.requirements && !specObj.checks) {
                        specObj.checks = specObj.requirements;
                    }
                    // Add unique IDs to checks if missing
                    specObj.checks = specObj.checks.map(function (check) { return (__assign(__assign({}, check), { id: check.id || "check-".concat((0, uuid_1.v4)().slice(0, 8)) })); });
                    // If noTest option is enabled, remove test blocks
                    if (options === null || options === void 0 ? void 0 : options.noTest) {
                        specObj.checks = specObj.checks.map(function (check) { return (__assign(__assign({}, check), { test: check.test || '// TODO: Implement test' })); });
                    }
                    needsMoreContext = result.toLowerCase().includes('more context') ||
                        result.toLowerCase().includes('additional context');
                    if (!(options === null || options === void 0 ? void 0 : options.dryRun)) {
                        yamlContent = (0, yaml_1.stringify)(specObj);
                        // Ensure directory exists
                        if (!fs.existsSync(outputDir)) {
                            fs.mkdirSync(outputDir, { recursive: true });
                        }
                        fs.writeFileSync(filePath, yamlContent, 'utf8');
                    }
                    return [2 /*return*/, {
                            path: filePath,
                            spec: specObj,
                            slug: feature.slug,
                            needsMoreContext: needsMoreContext
                        }];
                case 3:
                    if (!!(options === null || options === void 0 ? void 0 : options.dryRun)) return [3 /*break*/, 6];
                    // Ensure directory exists
                    if (!fs.existsSync(outputDir)) {
                        fs.mkdirSync(outputDir, { recursive: true });
                    }
                    fs.writeFileSync(filePath, result, 'utf8');
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('./auto-files.js'); })];
                case 4:
                    autoFilesModule = _a.sent();
                    return [4 /*yield*/, autoFilesModule.addMetaToSpec(filePath, true)];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6:
                    contentToProcess = !(options === null || options === void 0 ? void 0 : options.dryRun)
                        ? fs.readFileSync(filePath, 'utf8')
                        : result;
                    spec = parseMarkdownContent(contentToProcess, feature.title);
                    return [2 /*return*/, {
                            path: filePath,
                            spec: spec,
                            slug: feature.slug,
                            needsMoreContext: contentToProcess.toLowerCase().includes('more context') ||
                                contentToProcess.toLowerCase().includes('additional context')
                        }];
                case 7: return [3 /*break*/, 14];
                case 8:
                    error_1 = _a.sent();
                    console.error('Error generating spec with AI:', error_1);
                    if (!(options === null || options === void 0 ? void 0 : options.agent)) return [3 /*break*/, 9];
                    fallbackSpec = createFallbackSpec(feature, contextFiles);
                    outputDir = AGENTS_DIR;
                    filePath = path.join(outputDir, "".concat(feature.slug, ".yaml"));
                    if (!(options === null || options === void 0 ? void 0 : options.dryRun)) {
                        yamlContent = (0, yaml_1.stringify)(fallbackSpec);
                        // Ensure directory exists
                        if (!fs.existsSync(outputDir)) {
                            fs.mkdirSync(outputDir, { recursive: true });
                        }
                        fs.writeFileSync(filePath, yamlContent, 'utf8');
                    }
                    return [2 /*return*/, {
                            path: filePath,
                            spec: fallbackSpec,
                            slug: feature.slug,
                            needsMoreContext: true
                        }];
                case 9:
                    fallbackMarkdown = createFallbackMarkdown(feature, contextFiles);
                    outputDir = SPECS_DIR;
                    filePath = path.join(outputDir, "".concat(feature.slug, ".md"));
                    if (!!(options === null || options === void 0 ? void 0 : options.dryRun)) return [3 /*break*/, 12];
                    // Ensure directory exists
                    if (!fs.existsSync(outputDir)) {
                        fs.mkdirSync(outputDir, { recursive: true });
                    }
                    fs.writeFileSync(filePath, fallbackMarkdown, 'utf8');
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('./auto-files.js'); })];
                case 10:
                    autoFilesModule = _a.sent();
                    return [4 /*yield*/, autoFilesModule.addMetaToSpec(filePath, true)];
                case 11:
                    _a.sent();
                    _a.label = 12;
                case 12:
                    contentToProcess = !(options === null || options === void 0 ? void 0 : options.dryRun)
                        ? fs.readFileSync(filePath, 'utf8')
                        : fallbackMarkdown;
                    spec = parseMarkdownContent(contentToProcess, feature.title);
                    return [2 /*return*/, {
                            path: filePath,
                            spec: spec,
                            slug: feature.slug,
                            needsMoreContext: true
                        }];
                case 13: return [3 /*break*/, 14];
                case 14: return [2 /*return*/];
            }
        });
    });
}
/**
 * Parse markdown content to extract a spec object
 */
function parseMarkdownContent(content, defaultTitle) {
    // Extract title from the first heading
    var titleMatch = content.match(/# (?:Feature: )?(.*?)(?=\n|$)/);
    var title = titleMatch ? titleMatch[1].trim() : defaultTitle;
    // Extract files section
    var filesSection = content.match(/(?:##|###) Files\s+([\s\S]*?)(?=##|$)/);
    var files = [];
    if (filesSection && filesSection[1]) {
        var fileLines = filesSection[1].split('\n');
        for (var _i = 0, fileLines_1 = fileLines; _i < fileLines_1.length; _i++) {
            var line = fileLines_1[_i];
            if (line.trim().startsWith('-')) {
                var filePath = line.trim().substring(1).trim();
                if (filePath) {
                    files.push(filePath);
                }
            }
        }
    }
    // Try to extract "Checks" section first, fallback to "Requirements" for backward compatibility
    var checksSection = content.match(/(?:##|###) Checks\s+([\s\S]*?)(?=##|$)/);
    var reqSection = !checksSection ? content.match(/(?:##|###) Requirements\s+([\s\S]*?)(?=##|$)/) : null;
    var checks = [];
    var section = checksSection || reqSection;
    if (section && section[1]) {
        var lines = section[1].split('\n');
        for (var _a = 0, lines_1 = lines; _a < lines_1.length; _a++) {
            var line = lines_1[_a];
            // Look for checkbox format: - [ ] or - [x]
            var checkMatch = line.match(/- \[([ xX])\] (.*?)(?=\n|$)/);
            if (checkMatch) {
                var status_1 = checkMatch[1].toLowerCase() === 'x';
                var text = checkMatch[2].trim();
                // Create a check with an ID
                checks.push({
                    id: crypto_1.default.randomBytes(4).toString('hex'),
                    require: text,
                    status: status_1
                });
            }
        }
    }
    return {
        title: title,
        files: files,
        checks: checks,
        requirements: checks // For backward compatibility
    };
}
/**
 * Create a fallback markdown spec
 */
function createFallbackMarkdown(feature, contextFiles) {
    // Create a basic markdown template with the standardized format
    return "# ".concat(feature.title, "\n\n## Checks\n- [ ] Implement basic structure for ").concat(feature.title, "\n- [ ] Process data correctly\n- [ ] Handle edge cases and errors\n");
}
/**
 * Create a fallback spec if AI generation fails
 */
function createFallbackSpec(feature, contextFiles) {
    // Select top files (max 10)
    var topFiles = contextFiles.slice(0, 10).map(function (file) { return file.path; });
    // Create a basic template
    return {
        title: feature.title,
        files: topFiles,
        checks: [
            {
                id: 'check-1',
                require: "Implement basic structure for ".concat(feature.title),
                test: "// TODO: Implement test for basic structure\nimport { /* import needed modules */ } from '...';\n\n// Write test code here\n// Example:\n// const result = someFunction();\n// if (!result) throw new Error('Test failed');"
            },
            {
                id: 'check-2',
                require: 'Process data correctly',
                test: "// TODO: Implement test for data processing\nimport { /* import needed modules */ } from '...';\n\n// Write test code here"
            },
            {
                id: 'check-3',
                require: 'Handle edge cases and errors',
                test: "// TODO: Implement test for error handling\nimport { /* import needed modules */ } from '...';\n\n// Write test code here"
            }
        ],
        requirements: [
            {
                id: 'check-1',
                require: "Implement basic structure for ".concat(feature.title),
                test: "// TODO: Implement test for basic structure\nimport { /* import needed modules */ } from '...';\n\n// Write test code here\n// Example:\n// const result = someFunction();\n// if (!result) throw new Error('Test failed');"
            },
            {
                id: 'check-2',
                require: 'Process data correctly',
                test: "// TODO: Implement test for data processing\nimport { /* import needed modules */ } from '...';\n\n// Write test code here"
            },
            {
                id: 'check-3',
                require: 'Handle edge cases and errors',
                test: "// TODO: Implement test for error handling\nimport { /* import needed modules */ } from '...';\n\n// Write test code here"
            }
        ]
    };
}
/**
 * Generate a valid YAML spec from a feature description
 */
function generateYamlSpec(feature_1) {
    return __awaiter(this, arguments, void 0, function (feature, files, isAgent, checks) {
        var slug, specChecks, checkObjects, specObject, validation, yamlContent;
        if (files === void 0) { files = []; }
        if (isAgent === void 0) { isAgent = false; }
        if (checks === void 0) { checks = []; }
        return __generator(this, function (_a) {
            try {
                slug = (0, specs_js_1.createSlug)(feature);
                specChecks = checks.length > 0
                    ? checks
                    : [
                        "Implement core functionality for ".concat(feature),
                        "Add proper error handling for ".concat(feature),
                        "Ensure ".concat(feature, " works with edge cases")
                    ];
                checkObjects = specChecks.map(function (check) { return ({
                    id: "check-".concat(generateId()),
                    require: check,
                    test: generateTestCode(check, files)
                }); });
                specObject = {
                    title: feature.charAt(0).toUpperCase() + feature.slice(1),
                    files: files,
                    checks: checkObjects
                };
                validation = validateSpecification(specObject);
                if (!validation.valid) {
                    console.warn('Generated spec validation issues:', validation.errors);
                    // Fix any validation issues
                    if (!specObject.title) {
                        specObject.title = feature || 'Untitled Feature';
                    }
                    if (!Array.isArray(specObject.files)) {
                        specObject.files = [];
                    }
                    if (!Array.isArray(specObject.checks) || specObject.checks.length === 0) {
                        specObject.checks = [
                            {
                                id: "check-".concat(generateId()),
                                require: "Implement ".concat(feature || 'feature'),
                                test: "// TODO: Implement test for ".concat(feature || 'feature')
                            }
                        ];
                    }
                    // Ensure all checks have IDs
                    specObject.checks = specObject.checks.map(function (check) {
                        if (!check.id) {
                            check.id = "check-".concat(generateId());
                        }
                        return check;
                    });
                }
                yamlContent = (0, yaml_1.stringify)(specObject);
                return [2 /*return*/, yamlContent];
            }
            catch (error) {
                console.error('Error generating YAML spec:', error);
                throw error;
            }
            return [2 /*return*/];
        });
    });
}
/**
 * Generate test code for a check
 */
function generateTestCode(check, files) {
    // Get file module names without extensions
    var moduleImports = files.map(function (file) {
        var moduleName = path.basename(file, path.extname(file))
            .replace(/[^a-zA-Z0-9_]/g, '_'); // Sanitize for valid variable name
        return { path: file, name: moduleName };
    });
    // Generate imports based on files
    var imports = moduleImports.length > 0
        ? moduleImports.map(function (mod) { return "import * as ".concat(mod.name, " from '../").concat(mod.path, "';"); }).join('\n')
        : '// No files specified for import';
    // Extract keywords from check for test focus
    var keywords = check.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(' ')
        .filter(function (word) { return word.length > 4; })
        .slice(0, 5);
    var testFocus = '';
    if (check.toLowerCase().includes('error')) {
        testFocus = 'error handling';
    }
    else if (check.toLowerCase().includes('edge case')) {
        testFocus = 'edge cases';
    }
    else if (check.toLowerCase().includes('valid')) {
        testFocus = 'validation';
    }
    else {
        testFocus = 'functionality';
    }
    // Generate test code
    return "\n// Test for: ".concat(check, "\n").concat(imports, "\nimport * as fs from 'fs';\nimport * as path from 'path';\n\n/**\n * Test ").concat(testFocus, " for ").concat(keywords.join(' '), " functionality\n */\nexport default function test() {\n  try {\n    // Check that required files exist\n").concat(moduleImports.map(function (mod) { return "    // Ensure ".concat(mod.path, " can be imported\n    if (typeof ").concat(mod.name, " !== 'undefined') {\n      console.log('\u2705 Successfully imported ").concat(mod.path, "');\n    } else {\n      throw new Error('Failed to import ").concat(mod.path, "');\n    }"); }).join('\n\n'), "\n    \n    // TODO: Add more specific tests for:\n    // ").concat(check, "\n    \n    // Placeholder test (replace with actual implementation)\n    if (").concat(moduleImports.length > 0 ? "".concat(moduleImports[0].name) : 'true', ") {\n      console.log('\u2705 Test passed!');\n      return true;\n    } else {\n      throw new Error('Test condition failed');\n    }\n  } catch (error) {\n    console.error('\u274C Test failed:', error);\n    throw error; // Re-throw to signal test failure\n  }\n}");
}
/**
 * Generate a simple ID for checks
 */
function generateId(length) {
    if (length === void 0) { length = 8; }
    return crypto_1.default.randomBytes(length).toString('hex').substring(0, length);
}
/**
 * Save a YAML spec to a file
 */
function saveYamlSpec(feature_1, yamlContent_1) {
    return __awaiter(this, arguments, void 0, function (feature, yamlContent, isAgent) {
        var outputDir, slug, specPath;
        if (isAgent === void 0) { isAgent = false; }
        return __generator(this, function (_a) {
            try {
                outputDir = isAgent ? AGENTS_DIR : SPECS_DIR;
                // Ensure directory exists
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }
                slug = (0, specs_js_1.createSlug)(feature);
                specPath = path.join(outputDir, "".concat(slug, ".yaml"));
                // Write the file
                fs.writeFileSync(specPath, yamlContent, 'utf8');
                return [2 /*return*/, specPath];
            }
            catch (error) {
                console.error('Error saving YAML spec:', error);
                throw error;
            }
            return [2 /*return*/];
        });
    });
}
/**
 * Specification types supported by CheckMate
 */
var SpecificationType;
(function (SpecificationType) {
    SpecificationType["A"] = "A";
    SpecificationType["B"] = "B";
    SpecificationType["YAML"] = "YAML";
    SpecificationType["MARKDOWN"] = "MARKDOWN";
})(SpecificationType || (exports.SpecificationType = SpecificationType = {}));
/**
 * Create a new Type A specification
 */
function createSpecification(spec) {
    // Validate the specification
    if (!spec.type || spec.type !== 'A') {
        throw new Error('Invalid specification type. Must be "A"');
    }
    if (!spec.name) {
        throw new Error('Specification must have a name');
    }
    if (!spec.testCases || !Array.isArray(spec.testCases) || spec.testCases.length === 0) {
        throw new Error('Specification must have at least one test case');
    }
    // Validate each test case
    for (var _i = 0, _a = spec.testCases; _i < _a.length; _i++) {
        var testCase = _a[_i];
        if (!testCase.input || !testCase.expectedOutput) {
            throw new Error('Each test case must have input and expectedOutput properties');
        }
    }
    return {
        type: 'A',
        name: spec.name,
        testCases: spec.testCases
    };
}
/**
 * Create a new Type B specification
 */
function createTypeBSpecification(spec) {
    // Validate the specification
    if (!spec.type || spec.type !== 'B') {
        throw new Error('Invalid specification type. Must be "B"');
    }
    if (!spec.name) {
        throw new Error('Specification must have a name');
    }
    if (!spec.checks || !Array.isArray(spec.checks) || spec.checks.length === 0) {
        throw new Error('Specification must have at least one check');
    }
    // Generate IDs for checks if not provided and ensure they're unique
    var checks = ensureUniqueCheckIds(spec.checks);
    // Ensure validation rules are properly formatted
    var validationRules = spec.validationRules || [];
    // Type B specifications must have at least one validation rule
    if (validationRules.length === 0) {
        validationRules.push({
            type: 'format',
            rule: 'Must follow Type B structure'
        });
    }
    return {
        type: 'B',
        name: spec.name,
        checks: checks,
        validationRules: validationRules
    };
}
/**
 * Save a specification to file
 */
function saveSpecification(spec, outputPath) {
    ensureSpecsDir();
    // Generate output path if not provided
    if (!outputPath) {
        var fileName = "test-specification-type-".concat(spec.type.toLowerCase(), ".json");
        outputPath = path.join(AGENTS_DIR, fileName);
    }
    // Convert to JSON and save
    var specJson = JSON.stringify(spec, null, 2);
    fs.writeFileSync(outputPath, specJson, 'utf8');
    return outputPath;
}
/**
 * Generate a Type A test specification with AI assistance
 */
function generateTypeASpec(name, description) {
    return __awaiter(this, void 0, void 0, function () {
        var systemPrompt, userPrompt, response, jsonMatch, spec, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    systemPrompt = "You are a specialized test engineer creating test specifications. \nFor the given feature, generate a valid Type A test specification with appropriate test cases.\nEach test case should have a clear input and expected output.";
                    userPrompt = "Please create a Type A test specification for the following feature:\nFeature: ".concat(name, "\nDescription: ").concat(description, "\n\nGenerate a JSON structure following this model:\n{\n  \"type\": \"A\",\n  \"name\": \"The feature name\",\n  \"testCases\": [\n    {\n      \"input\": \"Sample input 1\",\n      \"expectedOutput\": \"Expected output 1\"\n    },\n    {\n      \"input\": \"Sample input 2\",\n      \"expectedOutput\": \"Expected output 2\"\n    }\n  ]\n}\n\nInclude at least 3 diverse test cases covering different aspects of the feature.\nEnsure each test case has clear input values and definite expected outputs.");
                    return [4 /*yield*/, (0, models_js_1.reason)(systemPrompt, userPrompt)];
                case 1:
                    response = _a.sent();
                    jsonMatch = response.match(/\{[\s\S]*\}/);
                    if (!jsonMatch) {
                        throw new Error('Failed to get valid JSON from AI response');
                    }
                    spec = JSON.parse(jsonMatch[0]);
                    // Validate and return the specification
                    return [2 /*return*/, createSpecification(spec)];
                case 2:
                    error_2 = _a.sent();
                    console.error('Error generating Type A specification:', error_2);
                    // Return a default specification if AI fails
                    return [2 /*return*/, {
                            type: 'A',
                            name: name,
                            testCases: [
                                {
                                    input: 'default input',
                                    expectedOutput: 'default output'
                                },
                                {
                                    input: 'second input',
                                    expectedOutput: 'second output'
                                },
                                {
                                    input: 'third input',
                                    expectedOutput: 'third output'
                                }
                            ]
                        }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Generate a Type B test specification with AI assistance
 */
function generateTypeBSpec(name, description) {
    return __awaiter(this, void 0, void 0, function () {
        var systemPrompt, userPrompt, response, jsonMatch, spec, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    systemPrompt = "You are a specialized test engineer creating check specifications. \nFor the given feature, generate a valid Type B test specification with appropriate checks and validation rules.\nEach check should have a clear description and specific criteria for validation.";
                    userPrompt = "Please create a Type B test specification for the following feature:\nFeature: ".concat(name, "\nDescription: ").concat(description, "\n\nGenerate a JSON structure following this model:\n{\n  \"type\": \"B\",\n  \"name\": \"The feature name\",\n  \"checks\": [\n    {\n      \"id\": \"check1\",\n      \"description\": \"Check description\",\n      \"criteria\": [\"Criterion 1\", \"Criterion 2\"]\n    },\n    {\n      \"id\": \"check2\",\n      \"description\": \"Another check\",\n      \"criteria\": [\"Criterion 1\", \"Criterion 2\"]\n    }\n  ],\n  \"validationRules\": [\n    {\n      \"type\": \"format\",\n      \"rule\": \"Validation rule description\"\n    },\n    {\n      \"type\": \"content\",\n      \"rule\": \"Another validation rule\"\n    }\n  ]\n}\n\nInclude at least 3 checks with specific validation criteria.\nAlso include at least 2 validation rules specific to Type B specifications.");
                    return [4 /*yield*/, (0, models_js_1.reason)(systemPrompt, userPrompt)];
                case 1:
                    response = _a.sent();
                    jsonMatch = response.match(/\{[\s\S]*\}/);
                    if (!jsonMatch) {
                        throw new Error('Failed to get valid JSON from AI response');
                    }
                    spec = JSON.parse(jsonMatch[0]);
                    // Validate and return the specification
                    return [2 /*return*/, createTypeBSpecification(spec)];
                case 2:
                    error_3 = _a.sent();
                    console.error('Error generating Type B specification:', error_3);
                    // Return a default specification if AI fails
                    return [2 /*return*/, {
                            type: 'B',
                            name: name,
                            checks: [
                                {
                                    id: 'check1',
                                    description: 'First check',
                                    criteria: ['Criterion 1', 'Criterion 2']
                                },
                                {
                                    id: 'check2',
                                    description: 'Second check',
                                    criteria: ['Criterion 1', 'Criterion 2']
                                },
                                {
                                    id: 'check3',
                                    description: 'Third check',
                                    criteria: ['Criterion 1', 'Criterion 2']
                                }
                            ],
                            validationRules: [
                                {
                                    type: 'format',
                                    rule: 'Must follow Type B structure'
                                },
                                {
                                    type: 'content',
                                    rule: 'Must have specific validation rules different from other types'
                                }
                            ]
                        }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Validate a specification against a schema to ensure correctness
 */
function validateSpecification(spec) {
    var errors = [];
    // Check if it's a valid object
    if (!spec || typeof spec !== 'object') {
        return { valid: false, errors: ['Specification must be an object'] };
    }
    // Check required fields for all spec types
    if (!spec.title || typeof spec.title !== 'string') {
        errors.push('Specification must have a title field that is a string');
    }
    // Check schema for Type A specs
    if (spec.type === 'A') {
        if (!Array.isArray(spec.testCases)) {
            errors.push('Type A specification must have a testCases array');
        }
        else {
            spec.testCases.forEach(function (testCase, index) {
                if (!testCase.input) {
                    errors.push("Test case ".concat(index, " is missing input field"));
                }
                if (!testCase.expectedOutput) {
                    errors.push("Test case ".concat(index, " is missing expectedOutput field"));
                }
            });
        }
    }
    // Check schema for Type B specs
    else if (spec.type === 'B') {
        if (!Array.isArray(spec.checks)) {
            errors.push('Type B specification must have a checks array');
        }
        else {
            spec.checks.forEach(function (check, index) {
                if (!check.id) {
                    errors.push("Check ".concat(index, " is missing id field"));
                }
                if (!check.description) {
                    errors.push("Check ".concat(index, " is missing description field"));
                }
                if (!Array.isArray(check.criteria)) {
                    errors.push("Check ".concat(index, " is missing criteria array"));
                }
            });
        }
        if (!Array.isArray(spec.validationRules)) {
            errors.push('Type B specification must have a validationRules array');
        }
    }
    // Check schema for standard YAML/JSON specs
    else {
        // Validate files field
        if (!Array.isArray(spec.files)) {
            errors.push('Specification must have a files array');
        }
        else {
            // Check that all files are strings
            spec.files.forEach(function (file, index) {
                if (typeof file !== 'string') {
                    errors.push("File at index ".concat(index, " must be a string"));
                }
            });
        }
        // Validate checks field
        if ((!Array.isArray(spec.checks) || spec.checks.length === 0) &&
            (!Array.isArray(spec.requirements) || spec.requirements.length === 0)) {
            errors.push('Specification must have either a checks or requirements array');
        }
        else {
            // Get the checks array (either direct or from requirements for backward compatibility)
            var checksArray = spec.checks || spec.requirements || [];
            // Check that all checks have required fields
            checksArray.forEach(function (check, index) {
                if (!check.id) {
                    errors.push("Check at index ".concat(index, " is missing id field"));
                }
                if (!check.require || typeof check.require !== 'string') {
                    errors.push("Check at index ".concat(index, " is missing or has invalid 'require' field"));
                }
                if (check.test && typeof check.test !== 'string') {
                    errors.push("Check at index ".concat(index, " has invalid 'test' field (must be a string)"));
                }
            });
            // Check for duplicate check IDs
            var ids_1 = new Set();
            checksArray.forEach(function (check) {
                if (check.id) {
                    if (ids_1.has(check.id)) {
                        errors.push("Duplicate check ID: ".concat(check.id));
                    }
                    else {
                        ids_1.add(check.id);
                    }
                }
            });
        }
    }
    return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
    };
}
/**
 * Ensure all checks have unique IDs
 */
function ensureUniqueCheckIds(checks) {
    var usedIds = new Set();
    return checks.map(function (check) {
        // If no ID is provided, or ID is already used, generate a new one
        if (!check.id || usedIds.has(check.id)) {
            check.id = crypto_1.default.randomBytes(4).toString('hex');
            // Keep generating until we get a unique ID (extremely unlikely to loop more than once)
            while (usedIds.has(check.id)) {
                check.id = crypto_1.default.randomBytes(4).toString('hex');
            }
        }
        // Add ID to used IDs
        usedIds.add(check.id);
        return check;
    });
}
// Alias for backward compatibility
exports.ensureUniqueRequirementIds = ensureUniqueCheckIds;
