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
exports.createSlug = createSlug;
exports.generateSpec = generateSpec;
exports.parseSpec = parseSpec;
exports.validateYamlDocument = validateYamlDocument;
exports.serializeToYaml = serializeToYaml;
exports.listSpecs = listSpecs;
exports.getSpecByName = getSpecByName;
exports.findAffectedSpecs = findAffectedSpecs;
exports.verifyReferencedFiles = verifyReferencedFiles;
/**
 * Spec utilities for CheckMate CLI
 * Handles spec generation, parsing, and management
 */
var fs = require("node:fs");
var path = require("node:path");
var models_js_1 = require("./models.js");
var yaml_1 = require("yaml");
var crypto_1 = require("crypto");
var fast_glob_1 = require("fast-glob");
// Directory where specs are stored
var SPECS_DIR = 'checkmate/specs';
// Create a simple validator function for YAML specs
var validateYamlSpecStructure = function (data) {
    var errors = [];
    // Check for required fields
    if (!data.title)
        errors.push('Missing title field');
    if (!data.files || !Array.isArray(data.files))
        errors.push('Missing or invalid files array');
    if (!data.checks && !data.requirements)
        errors.push('Missing or invalid checks array');
    // Check checks structure if present
    if (data.checks && Array.isArray(data.checks)) {
        data.checks.forEach(function (check, index) {
            if (!check.id)
                errors.push("Check at index ".concat(index, " is missing id"));
            if (!check.require && !check.text)
                errors.push("Check at index ".concat(index, " is missing require or text field"));
        });
    }
    // Backward compatibility for requirements
    else if (data.requirements && Array.isArray(data.requirements)) {
        data.requirements.forEach(function (req, index) {
            if (!req.id)
                errors.push("Requirement at index ".concat(index, " is missing id"));
            if (!req.require && !req.text)
                errors.push("Requirement at index ".concat(index, " is missing require or text field"));
        });
    }
    return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
    };
};
/**
 * Create a slug from a feature description
 */
function createSlug(featureDesc) {
    return featureDesc
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
        .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
        .substring(0, 50); // Limit length
}
/**
 * Create a new spec file from a feature description
 * Uses AI to generate checks and context
 */
function generateSpec(featureDesc, files) {
    return __awaiter(this, void 0, void 0, function () {
        var slug, filePath, filesList, prompt, systemPrompt, content, autoFilesModule, updatedContent, error_1, fallbackContent, autoFilesModule, updatedContent;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('Generating AI-driven checks...');
                    slug = createSlug(featureDesc);
                    filePath = path.join(SPECS_DIR, "".concat(slug, ".md"));
                    filesList = files.map(function (file) { return "- ".concat(file); }).join('\n');
                    prompt = "Create a detailed specification for the following feature:\n  \nFeature: ".concat(featureDesc, "\n\nThe codebase has the following files:\n").concat(filesList, "\n\nGenerate a markdown document with EXACTLY this format:\n1. A title based on the feature description\n2. A section called \"## Checks\" containing 3-7 specific, testable checks as a checklist with \"[ ]\" format\n\nIMPORTANT: The ONLY allowed format is:\n# Title\n## Checks\n- [ ] Check 1\n- [ ] Check 2\n- [ ] Check 3\n\nDO NOT include any other sections, headings, or notes.\nDO NOT include a \"## Files\" or \"## Relevant Files\" section as we will add this metadata separately.\n\nMake each check specific to actual code functionality, referencing functions, methods or components that exist in the code.\nReturn ONLY the markdown content, no explanations or additional text.");
                    systemPrompt = "You are a senior toolsmith specialized in creating software specifications.\nYour task is to create a detailed spec in markdown format, with clear checks that can be checked programmatically.\nBe specific, actionable, and focus on measurable outcomes.\n\nThe specification MUST be a Markdown document with EXACTLY this format:\n1. A title at the top using a single # heading\n2. A section called \"## Checks\" containing 3-7 specific, testable checks as a checklist with \"[ ]\" format\n3. NO OTHER sections or headings are allowed\n\nDO NOT include any other headings like \"## Implementation Notes\", \"## Feature Requirements\", \"## Architecture Considerations\", etc.\nDO NOT include a \"## Files\" or \"## Relevant Files\" section.\n\nUse clear language and avoid jargon.\nFormat your response as a valid Markdown document.";
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 8]);
                    return [4 /*yield*/, (0, models_js_1.callModel)('reason', systemPrompt, prompt)];
                case 2:
                    content = _a.sent();
                    // Ensure the specs directory exists
                    ensureSpecsDir();
                    // Write the file
                    fs.writeFileSync(filePath, content, 'utf8');
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('./auto-files.js'); })];
                case 3:
                    autoFilesModule = _a.sent();
                    // Add meta information with automatic file discovery
                    return [4 /*yield*/, autoFilesModule.addMetaToSpec(filePath, true)];
                case 4:
                    // Add meta information with automatic file discovery
                    _a.sent();
                    updatedContent = fs.readFileSync(filePath, 'utf8');
                    return [2 /*return*/, { path: filePath, content: updatedContent }];
                case 5:
                    error_1 = _a.sent();
                    console.error('Error generating spec with AI:', error_1);
                    fallbackContent = "# ".concat(featureDesc, "\n\n## Checks\n- [ ] Validate input data before processing\n- [ ] Return appropriate error codes for invalid requests\n- [ ] Update database with new information\n- [ ] Send notification on successful completion\n");
                    // Ensure the specs directory exists
                    ensureSpecsDir();
                    // Write the fallback file
                    fs.writeFileSync(filePath, fallbackContent, 'utf8');
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('./auto-files.js'); })];
                case 6:
                    autoFilesModule = _a.sent();
                    // Add meta information with automatic file discovery
                    return [4 /*yield*/, autoFilesModule.addMetaToSpec(filePath, true)];
                case 7:
                    // Add meta information with automatic file discovery
                    _a.sent();
                    updatedContent = fs.readFileSync(filePath, 'utf8');
                    return [2 /*return*/, { path: filePath, content: updatedContent }];
                case 8: return [2 /*return*/];
            }
        });
    });
}
/**
 * Parse a spec file (both YAML and Markdown)
 */
function parseSpec(specPath) {
    var content = fs.readFileSync(specPath, 'utf8');
    var extension = path.extname(specPath).toLowerCase();
    // Check if this spec is in the agents subfolder
    var isAgentSpec = specPath.includes("".concat(SPECS_DIR, "/agents/"));
    // Handle YAML files (.yaml, .yml)
    if (extension === '.yaml' || extension === '.yml') {
        var result_1 = parseYamlSpec(content);
        if (isAgentSpec) {
            result_1.machine = true;
        }
        return result_1;
    }
    // Handle Markdown files (.md)
    var result = parseMarkdownSpec(content);
    if (isAgentSpec) {
        result.machine = true;
    }
    return result;
}
/**
 * Validate YAML document against JSON schema
 */
function validateYamlDocument(yamlContent) {
    try {
        var valid = validateYamlSpecStructure(yamlContent);
        if (!valid.valid) {
            return {
                valid: false,
                errors: valid.errors
            };
        }
        return { valid: true };
    }
    catch (error) {
        return {
            valid: false,
            errors: [error.message]
        };
    }
}
/**
 * Serialize JavaScript object to YAML string
 */
function serializeToYaml(data) {
    try {
        return (0, yaml_1.stringify)(data);
    }
    catch (error) {
        console.error('Error serializing to YAML:', error);
        throw new Error("Failed to serialize to YAML: ".concat(error.message));
    }
}
/**
 * Update the parseYamlSpec function to use schema validation
 */
function parseYamlSpec(content) {
    try {
        // Parse YAML content
        var yamlData = (0, yaml_1.parse)(content);
        // Validate against schema
        var validationResult = validateYamlDocument(yamlData);
        if (!validationResult.valid) {
            var errorMsg = validationResult.errors ? validationResult.errors.join(', ') : 'Unknown validation error';
            console.warn("YAML validation warnings: ".concat(errorMsg));
        }
        // Use checks if available, fall back to requirements for backward compatibility
        var checksArray = yamlData.checks || yamlData.requirements || [];
        // Convert checks to standard format with require/status
        var checks = checksArray.map(function (check) {
            return {
                id: check.id || crypto_1.default.randomBytes(4).toString('hex'),
                require: check.require || check.text || 'Unknown check',
                text: check.text,
                test: check.test,
                status: check.status === true
            };
        });
        return {
            title: yamlData.title || 'Untitled Spec',
            files: yamlData.files || [],
            requirements: checks, // For backward compatibility
            checks: checks,
            machine: false
        };
    }
    catch (error) {
        console.error('Error parsing YAML spec:', error);
        return {
            title: 'Error parsing spec',
            files: [],
            requirements: [],
            checks: [],
            machine: false
        };
    }
}
/**
 * Parse Markdown file
 */
function parseMarkdownSpec(content) {
    // Extract title from the first heading
    var titleMatch = content.match(/# (?:Feature: )?(.*?)(?=\n|$)/);
    var title = titleMatch ? titleMatch[1].trim() : 'Untitled Spec';
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
                    text: text,
                    status: status_1
                });
            }
        }
    }
    return {
        title: title,
        files: files,
        requirements: checks, // For backward compatibility
        checks: checks,
        machine: false
    };
}
/**
 * List all spec files
 */
function listSpecs() {
    ensureSpecsDir();
    try {
        // Use glob pattern to find specs in both root and agents subfolder
        return fast_glob_1.default.sync("".concat(SPECS_DIR, "/**/*.{md,markdown,yaml,yml}"), { absolute: true });
    }
    catch (error) {
        console.error('Error listing specs:', error);
        return [];
    }
}
/**
 * Get a spec by name (slug)
 * Returns an array of matching specs
 */
function getSpecByName(name) {
    return __awaiter(this, void 0, void 0, function () {
        var matches, hasExtension, specPath, _i, _a, ext, specPath, files, exactMatches, partialMatches, _b, files_1, file, content, titleMatch, title;
        return __generator(this, function (_c) {
            ensureSpecsDir();
            matches = [];
            // BUGFIX: Ensure name is properly cast to string
            if (typeof name !== 'string') {
                console.log("Warning: getSpecByName received non-string value: ".concat(name, ", type: ").concat(typeof name));
                name = String(name);
            }
            hasExtension = ['.md', '.yaml', '.yml'].some(function (ext) { return name.endsWith(ext); });
            if (hasExtension) {
                specPath = path.join(SPECS_DIR, name);
                if (fs.existsSync(specPath)) {
                    matches.push(specPath);
                    return [2 /*return*/, matches];
                }
            }
            else {
                // Try with each extension
                for (_i = 0, _a = ['.md', '.yaml', '.yml']; _i < _a.length; _i++) {
                    ext = _a[_i];
                    specPath = path.join(SPECS_DIR, "".concat(name).concat(ext));
                    if (fs.existsSync(specPath)) {
                        matches.push(specPath);
                        // Continue checking other extensions to find all potential matches
                    }
                }
                if (matches.length > 0) {
                    return [2 /*return*/, matches];
                }
            }
            files = fast_glob_1.default.sync("".concat(SPECS_DIR, "/**/*.{md,markdown,yaml,yml}"), { absolute: true });
            exactMatches = files.filter(function (file) {
                var baseName = path.basename(file, path.extname(file));
                return baseName === name;
            });
            if (exactMatches.length > 0) {
                return [2 /*return*/, exactMatches];
            }
            partialMatches = files.filter(function (file) {
                var baseName = path.basename(file, path.extname(file));
                return baseName.toLowerCase().includes(name.toLowerCase());
            });
            // If we still don't have matches, try matching against titles
            if (partialMatches.length === 0) {
                for (_b = 0, files_1 = files; _b < files_1.length; _b++) {
                    file = files_1[_b];
                    try {
                        content = fs.readFileSync(file, 'utf8');
                        titleMatch = content.match(/# (?:Feature: )?(.*?)(?=\n|$)/);
                        if (titleMatch) {
                            title = titleMatch[1].trim();
                            if (title.toLowerCase().includes(name.toLowerCase())) {
                                matches.push(file);
                            }
                        }
                    }
                    catch (error) {
                        // Skip files that can't be read
                    }
                }
            }
            return [2 /*return*/, partialMatches.length > 0 ? partialMatches : matches];
        });
    });
}
/**
 * Find all specs affected by a list of changed files
 */
function findAffectedSpecs(changedFiles) {
    var specFiles = listSpecs();
    var affectedSpecs = [];
    // Convert all changed file paths to absolute paths for consistency
    var normalizedChangedFiles = changedFiles.map(function (file) { return path.resolve(file); });
    for (var _i = 0, specFiles_1 = specFiles; _i < specFiles_1.length; _i++) {
        var specFile = specFiles_1[_i];
        var files = parseSpec(specFile).files;
        // Check if any of the spec's files match the changed files
        var isAffected = files.some(function (specFile) {
            var normalizedSpecFile = path.resolve(specFile);
            return normalizedChangedFiles.some(function (changedFile) {
                return changedFile.includes(normalizedSpecFile) || normalizedSpecFile.includes(changedFile);
            });
        });
        if (isAffected) {
            affectedSpecs.push(specFile);
        }
    }
    return affectedSpecs;
}
/**
 * Verify that files referenced in the spec exist
 */
function verifyReferencedFiles(files) {
    var missing = [];
    for (var _i = 0, files_2 = files; _i < files_2.length; _i++) {
        var file = files_2[_i];
        if (!fs.existsSync(file)) {
            missing.push(file);
        }
    }
    return {
        valid: missing.length === 0,
        missing: missing
    };
}
// Ensure the specs directory exists
function ensureSpecsDir() {
    if (!fs.existsSync(SPECS_DIR)) {
        fs.mkdirSync(SPECS_DIR, { recursive: true });
    }
}
