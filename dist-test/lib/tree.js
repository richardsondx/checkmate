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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCode = void 0;
exports.createErrorResponse = createErrorResponse;
exports.notifySuccess = notifySuccess;
exports.isGitInitialized = isGitInitialized;
exports.scan = scan;
exports.getFilesByGlob = getFilesByGlob;
exports.getRelativePaths = getRelativePaths;
exports.getDirectories = getDirectories;
exports.getChangedFiles = getChangedFiles;
/**
 * Tree scanner for CheckMate CLI
 * Scans the project for relevant code files
 */
var node_child_process_1 = require("node:child_process");
var node_util_1 = require("node:util");
var path = require("node:path");
var fs = require("node:fs");
var crypto = require("crypto");
var execAsync = (0, node_util_1.promisify)(node_child_process_1.exec);
// Path for snapshot file when git is not available
var SNAPSHOT_FILE = '.checkmate/snap.json';
/**
 * Error codes for invalid operations
 */
var ErrorCode;
(function (ErrorCode) {
    ErrorCode[ErrorCode["INVALID_PATH"] = 1001] = "INVALID_PATH";
    ErrorCode[ErrorCode["INVALID_EXTENSION"] = 1002] = "INVALID_EXTENSION";
    ErrorCode[ErrorCode["FILE_NOT_FOUND"] = 1003] = "FILE_NOT_FOUND";
    ErrorCode[ErrorCode["PERMISSION_DENIED"] = 1004] = "PERMISSION_DENIED";
    ErrorCode[ErrorCode["GIT_ERROR"] = 1005] = "GIT_ERROR";
    ErrorCode[ErrorCode["UNKNOWN_ERROR"] = 9999] = "UNKNOWN_ERROR";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
/**
 * Create a standard error response
 */
function createErrorResponse(code, message, details) {
    return { code: code, message: message, details: details };
}
/**
 * Send notification on successful completion
 */
function notifySuccess(operation, details) {
    var timestamp = new Date().toISOString();
    var notification = {
        type: 'success',
        operation: operation,
        timestamp: timestamp,
        details: details
    };
    console.log("\u2705 Success notification: ".concat(JSON.stringify(notification)));
    // Could be expanded to send webhooks, emails, or other notifications
    if (process.env.CHECKMATE_NOTIFY === 'true') {
        // Send to external notification service
        console.log('Would send notification to external service if configured');
    }
}
/**
 * Run a shell command and return stdout
 */
function runCommand(command) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, stdout, stderr, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, execAsync(command, { shell: '/bin/bash' })];
                case 1:
                    _a = _b.sent(), stdout = _a.stdout, stderr = _a.stderr;
                    if (stderr) {
                        console.error('Command stderr:', stderr);
                    }
                    return [2 /*return*/, stdout.trim()];
                case 2:
                    error_1 = _b.sent();
                    console.error('Error running command:', error_1);
                    return [2 /*return*/, ''];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Check if git is initialized in the current directory
 */
function isGitInitialized() {
    return __awaiter(this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, execAsync('git rev-parse --is-inside-work-tree')];
                case 1:
                    _a.sent();
                    return [2 /*return*/, true];
                case 2:
                    error_2 = _a.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get list of files using git ls-files
 */
function getGitFiles() {
    return __awaiter(this, void 0, void 0, function () {
        var output, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, runCommand('git ls-files')];
                case 1:
                    output = _a.sent();
                    return [2 /*return*/, output.split('\n').filter(Boolean)];
                case 2:
                    error_3 = _a.sent();
                    console.error('Error getting git files:', error_3);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get list of files using default find command (fallback)
 * Used when git is not initialized
 */
function findFiles() {
    return __awaiter(this, void 0, void 0, function () {
        var command, output;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    command = "find . -type f -not -path '*/node_modules/*' -not -path '*/\\.*/*'";
                    return [4 /*yield*/, runCommand(command)];
                case 1:
                    output = _a.sent();
                    return [2 /*return*/, output.split('\n').filter(Boolean)];
            }
        });
    });
}
/**
 * Filter file paths by extensions
 */
function filterByExtension(files, extensions) {
    var extSet = new Set(extensions.map(function (ext) { return ext.startsWith('.') ? ext : ".".concat(ext); }));
    return files.filter(function (file) {
        var ext = path.extname(file);
        return extSet.has(ext);
    });
}
/**
 * Scan the project for relevant code files
 * Uses the tree_cmd from config or falls back to defaults
 */
function scan() {
    return __awaiter(this, arguments, void 0, function (extensions) {
        var gitInitialized, files, _a;
        if (extensions === void 0) { extensions = ['ts', 'js', 'tsx', 'jsx']; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, isGitInitialized()];
                case 1:
                    gitInitialized = _b.sent();
                    if (!gitInitialized) return [3 /*break*/, 3];
                    return [4 /*yield*/, getGitFiles()];
                case 2:
                    _a = _b.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, findFiles()];
                case 4:
                    _a = _b.sent();
                    _b.label = 5;
                case 5:
                    files = _a;
                    // Filter by extension
                    return [2 /*return*/, filterByExtension(files, extensions)];
            }
        });
    });
}
/**
 * Get files by glob pattern
 */
function getFilesByGlob(globPattern) {
    return __awaiter(this, void 0, void 0, function () {
        var command, output;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    command = "find . -type f -path \"".concat(globPattern, "\" -not -path \"*/node_modules/*\" -not -path \"*/\\.*/*\"");
                    return [4 /*yield*/, runCommand(command)];
                case 1:
                    output = _a.sent();
                    return [2 /*return*/, output.split('\n').filter(Boolean)];
            }
        });
    });
}
/**
 * Get file paths relative to the project root
 */
function getRelativePaths(files) {
    return files.map(function (file) {
        // Remove './' prefix if it exists
        return file.startsWith('./') ? file.substring(2) : file;
    });
}
/**
 * Get just the directory part from a set of file paths
 */
function getDirectories(files) {
    var dirs = new Set();
    for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
        var file = files_1[_i];
        var dir = path.dirname(file);
        if (dir !== '.') {
            dirs.add(dir);
        }
    }
    return Array.from(dirs);
}
/**
 * Get changed files since the last snapshot or compared to Git base
 */
function getChangedFiles(gitBase) {
    return __awaiter(this, void 0, void 0, function () {
        var gitInitialized;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, isGitInitialized()];
                case 1:
                    gitInitialized = _a.sent();
                    if (gitInitialized) {
                        return [2 /*return*/, getGitChangedFiles(gitBase)];
                    }
                    else {
                        return [2 /*return*/, getFileSystemChangedFiles()];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Get changed files using git diff
 */
function getGitChangedFiles(base) {
    return __awaiter(this, void 0, void 0, function () {
        var diffBase, command, output, untrackedCommand, untrackedOutput, changedFiles, untrackedFiles, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    diffBase = base || 'HEAD';
                    command = "git diff --name-only ".concat(diffBase);
                    return [4 /*yield*/, runCommand(command)];
                case 1:
                    output = _a.sent();
                    untrackedCommand = 'git ls-files --others --exclude-standard';
                    return [4 /*yield*/, runCommand(untrackedCommand)];
                case 2:
                    untrackedOutput = _a.sent();
                    changedFiles = output.split('\n').filter(Boolean);
                    untrackedFiles = untrackedOutput.split('\n').filter(Boolean);
                    return [2 /*return*/, __spreadArray([], new Set(__spreadArray(__spreadArray([], changedFiles, true), untrackedFiles, true)), true)];
                case 3:
                    error_4 = _a.sent();
                    console.error('Error getting changed files from git:', error_4);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get changed files by comparing with a filesystem snapshot
 */
function getFileSystemChangedFiles() {
    return __awaiter(this, void 0, void 0, function () {
        var currentSnapshot, previousSnapshot, changedFiles, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    // Make sure .checkmate directory exists
                    if (!fs.existsSync('.checkmate')) {
                        fs.mkdirSync('.checkmate', { recursive: true });
                    }
                    return [4 /*yield*/, createFileSnapshot()];
                case 1:
                    currentSnapshot = _a.sent();
                    // If no snapshot file exists, create it and return all files as changed
                    if (!fs.existsSync(SNAPSHOT_FILE)) {
                        saveSnapshot(currentSnapshot);
                        return [2 /*return*/, currentSnapshot.map(function (file) { return file.path; })];
                    }
                    previousSnapshot = loadSnapshot();
                    changedFiles = findChangedFiles(previousSnapshot, currentSnapshot);
                    // Update snapshot with current state
                    saveSnapshot(currentSnapshot);
                    return [2 /*return*/, changedFiles];
                case 2:
                    error_5 = _a.sent();
                    console.error('Error getting changed files from snapshot:', error_5);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Create a snapshot of all files in the project
 */
function createFileSnapshot() {
    return __awaiter(this, void 0, void 0, function () {
        var files, snapshot, _i, files_2, file, stats, content, hash;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, findFiles()];
                case 1:
                    files = _a.sent();
                    snapshot = [];
                    for (_i = 0, files_2 = files; _i < files_2.length; _i++) {
                        file = files_2[_i];
                        try {
                            stats = fs.statSync(file);
                            content = fs.readFileSync(file);
                            hash = crypto.createHash('md5').update(content).digest('hex');
                            snapshot.push({
                                path: file,
                                hash: hash,
                                mtime: stats.mtimeMs
                            });
                        }
                        catch (error) {
                            // Skip files that can't be read
                            continue;
                        }
                    }
                    return [2 /*return*/, snapshot];
            }
        });
    });
}
/**
 * Find files that have changed between two snapshots
 */
function findChangedFiles(previous, current) {
    // Create maps for easier lookup
    var prevMap = new Map();
    previous.forEach(function (file) { return prevMap.set(file.path, file); });
    var changedFiles = [];
    // Check for changed or new files
    for (var _i = 0, current_1 = current; _i < current_1.length; _i++) {
        var file = current_1[_i];
        var prevFile = prevMap.get(file.path);
        // If file is new or has changed hash or mtime
        if (!prevFile || prevFile.hash !== file.hash || prevFile.mtime !== file.mtime) {
            changedFiles.push(file.path);
        }
        // Remove from map to track what's left (deleted files)
        prevMap.delete(file.path);
    }
    // Any files left in the map were deleted
    for (var _a = 0, prevMap_1 = prevMap; _a < prevMap_1.length; _a++) {
        var path_1 = prevMap_1[_a][0];
        changedFiles.push(path_1);
    }
    return changedFiles;
}
/**
 * Save snapshot to file
 */
function saveSnapshot(snapshot) {
    try {
        fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2), 'utf8');
    }
    catch (error) {
        console.error('Error saving snapshot:', error);
    }
}
/**
 * Load snapshot from file
 */
function loadSnapshot() {
    try {
        var content = fs.readFileSync(SNAPSHOT_FILE, 'utf8');
        return JSON.parse(content);
    }
    catch (error) {
        console.error('Error loading snapshot:', error);
        return [];
    }
}
