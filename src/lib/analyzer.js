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
exports.analyzeCodebase = analyzeCodebase;
/**
 * Code Analyzer for CheckMate
 * Analyzes repository context to identify potential features for spec generation
 */
var modelWrapper_js_1 = require("./modelWrapper.js");
var config_js_1 = require("./config.js");
var specs_js_1 = require("./specs.js");
/**
 * Analyze codebase to identify potential features and generate draft specs
 * @param context - The repository context (files and their content)
 * @returns Array of spec drafts for potential features
 */
function analyzeCodebase(context) {
    return __awaiter(this, void 0, void 0, function () {
        var config, model, fileGroups, drafts, _i, fileGroups_1, group, draft;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    config = (0, config_js_1.load)();
                    model = (0, modelWrapper_js_1.createLanguageModel)(((_a = config.models) === null || _a === void 0 ? void 0 : _a.reason) || 'gpt-4o');
                    return [4 /*yield*/, groupFilesByDomain(context, model)];
                case 1:
                    fileGroups = _b.sent();
                    drafts = [];
                    _i = 0, fileGroups_1 = fileGroups;
                    _b.label = 2;
                case 2:
                    if (!(_i < fileGroups_1.length)) return [3 /*break*/, 5];
                    group = fileGroups_1[_i];
                    return [4 /*yield*/, generateDraftFromGroup(group, context, model)];
                case 3:
                    draft = _b.sent();
                    if (draft) {
                        drafts.push(draft);
                    }
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/, drafts];
            }
        });
    });
}
/**
 * Group files by domain/functionality
 * @param context - The repository context
 * @param model - The language model to use
 * @returns Array of file groups with domain labels
 */
function groupFilesByDomain(context, model) {
    return __awaiter(this, void 0, void 0, function () {
        var files, prompt, response, jsonMatch, jsonStr, groups;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    files = Object.keys(context);
                    // Skip if there are no files
                    if (files.length === 0) {
                        return [2 /*return*/, []];
                    }
                    prompt = "\nYou are analyzing a codebase to group files by domain/functionality.\nI'll provide a list of files, and I need you to group them into logical domains.\n\nFiles:\n".concat(files.join('\n'), "\n\nGroup these files by domain or functionality. For each group:\n1. Provide a short, descriptive name for the domain (e.g., \"Authentication\", \"User Profile\", \"API Endpoints\")\n2. List the files that belong to this domain\n3. Each file should appear in exactly one group\n\nReturn your answer as a JSON array with this structure:\n[\n  { \n    \"domain\": \"Domain Name\", \n    \"files\": [\"file1.ts\", \"file2.ts\"] \n  }\n]\n\nBe precise and thorough in your analysis.\n");
                    return [4 /*yield*/, model.complete(prompt, {
                            temperature: 0.3,
                            max_tokens: 2000,
                        })];
                case 1:
                    response = _a.sent();
                    try {
                        jsonMatch = response.match(/\[\s*\{.*\}\s*\]/s);
                        if (!jsonMatch) {
                            throw new Error('Could not extract JSON from model response');
                        }
                        jsonStr = jsonMatch[0];
                        groups = JSON.parse(jsonStr);
                        return [2 /*return*/, groups];
                    }
                    catch (error) {
                        console.error('Error parsing model response:', error);
                        // Fallback: Create a single group with all files
                        return [2 /*return*/, [{ domain: 'Main Application', files: files }]];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Generate a draft spec from a file group
 * @param group - The file group to generate a draft for
 * @param context - The repository context
 * @param model - The language model to use
 * @returns A draft spec or null if no draft could be generated
 */
function generateDraftFromGroup(group, context, model) {
    return __awaiter(this, void 0, void 0, function () {
        var fileContents, _i, _a, file, extractedElements, prompt, response, jsonMatch, jsonStr, feature, title, slug, checks;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    // Skip if there are no files in the group
                    if (group.files.length === 0) {
                        return [2 /*return*/, null];
                    }
                    fileContents = [];
                    extractedElements = {
                        functions: new Set(),
                        methods: new Set(),
                        endpoints: new Set(),
                        options: new Set()
                    };
                    for (_i = 0, _a = group.files; _i < _a.length; _i++) {
                        file = _a[_i];
                        if (context[file]) {
                            // Extract function names, method names, API endpoints, and CLI options
                            var content = context[file];
                            
                            // Extract function declarations
                            var functionMatches = content.match(/function\s+(\w+)\s*\(/g) || [];
                            functionMatches.forEach(function(match) {
                                var functionName = match.replace(/function\s+/, '').replace(/\s*\($/, '');
                                extractedElements.functions.add(functionName);
                            });
                            
                            // Extract method declarations
                            var methodMatches = content.match(/(\w+)\s*\([^)]*\)\s*{/g) || [];
                            methodMatches.forEach(function(match) {
                                var methodName = match.replace(/\s*\([^)]*\)\s*{$/, '');
                                if (methodName && !methodName.match(/^(if|for|while|switch)$/)) {
                                    extractedElements.methods.add(methodName);
                                }
                            });
                            
                            // Extract API endpoints
                            var routeMatches = content.match(/app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g) || [];
                            routeMatches.forEach(function(match) {
                                var routeMatch = match.match(/app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/);
                                if (routeMatch) {
                                    var method = routeMatch[1];
                                    var route = routeMatch[2];
                                    extractedElements.endpoints.add(`${method.toUpperCase()} ${route}`);
                                }
                            });
                            
                            // Extract CLI options
                            var optionMatches = content.match(/\.option\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g) || [];
                            optionMatches.forEach(function(match) {
                                var optionMatch = match.match(/\.option\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
                                if (optionMatch) {
                                    var option = optionMatch[1];
                                    extractedElements.options.add(option);
                                }
                            });

                            fileContents.push("File: ".concat(file, "\n").concat(content.slice(0, 2000)).concat(content.length > 2000 ? '\n... (truncated)' : ''));
                        }
                    }
                    
                    // Build extracted elements section
                    var extractedElementsText = '';
                    if (extractedElements.functions.size > 0) {
                        extractedElementsText += "Functions found:\n" + 
                            Array.from(extractedElements.functions).map(fn => `- ${fn}`).join('\n') + "\n\n";
                    }
                    if (extractedElements.methods.size > 0) {
                        extractedElementsText += "Methods found:\n" + 
                            Array.from(extractedElements.methods).map(m => `- ${m}`).join('\n') + "\n\n";
                    }
                    if (extractedElements.endpoints.size > 0) {
                        extractedElementsText += "API Endpoints found:\n" + 
                            Array.from(extractedElements.endpoints).map(e => `- ${e}`).join('\n') + "\n\n";
                    }
                    if (extractedElements.options.size > 0) {
                        extractedElementsText += "CLI Options found:\n" + 
                            Array.from(extractedElements.options).map(o => `- ${o}`).join('\n') + "\n\n";
                    }
                    
                    // Skip if there are no file contents
                    if (fileContents.length === 0) {
                        return [2 /*return*/, null];
                    }
                    
                    prompt = "\nYou are analyzing a group of related files to identify concrete functional capabilities for testing.\nThe domain for these files is: \"".concat(group.domain, "\"\n\nHere are the file contents:\n\n").concat(fileContents.join('\n\n'), "\n\nI've extracted these specific code elements for your reference:\n\n").concat(extractedElementsText, "\n\nBased on these files, create a specification with these requirements:\n1. Provide a descriptive title for the feature\n2. Identify 4-7 SPECIFIC checks that directly reference the actual implementation\n\nIMPORTANT: For each check, you MUST use one of these exact formats:\n- \"The [functionName] function should [specific responsibility]\"\n- \"The [methodName] method should [specific responsibility]\"\n- \"[HTTP_METHOD] [/path] endpoint should [specific responsibility]\"\n- \"[--option-name] option should [specific responsibility]\"\n- \"handle [specific input/operation]\"\n- \"validate [specific data]\"\n- \"display [specific output]\"\n- \"process [specific data/event]\"\n\nUse the EXACT function, method, endpoint, and option names I extracted above. Priority should be given to these items that audit will look for.\n\nReturn your answer as a JSON object with this structure:\n{\n  \"title\": \"Feature Title\",\n  \"checks\": [\n    \"The example function should handle its specific responsibility\",\n    \"GET /api/example endpoint should validate input parameters\",\n    \"process configuration files in multiple formats\"\n  ]\n}\n\nEVERY CHECK MUST match the exact formats above and refer to actual elements in the code.\n");
                    
                    return [4 /*yield*/, model.complete(prompt, {
                            temperature: 0.7,
                            max_tokens: 1000,
                        })];
                case 1:
                    response = _b.sent();
                    try {
                        jsonMatch = response.match(/\{[\s\S]*\}/);
                        if (!jsonMatch) {
                            throw new Error('Could not extract JSON from model response');
                        }
                        jsonStr = jsonMatch[0];
                        feature = JSON.parse(jsonStr);
                        title = feature.title || group.domain;
                        slug = (0, specs_js_1.createSlug)(title);
                        checks = feature.checks || [];
                        return [2 /*return*/, {
                                slug: slug,
                                title: title,
                                files: group.files,
                                checks: checks,
                                meta: {
                                    files_auto: true,
                                    domain: group.domain,
                                    file_hashes: group.files.reduce(function (acc, file) {
                                        // Generate a simple hash from the first 100 chars of the file content
                                        var content = context[file] || '';
                                        var hash = Buffer.from(content.slice(0, 100)).toString('base64');
                                        acc[file] = hash;
                                        return acc;
                                    }, {})
                                }
                            }];
                    }
                    catch (error) {
                        console.error('Error parsing model response:', error);
                        return [2 /*return*/, null];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
