"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSession = startSession;
exports.getCurrentSession = getCurrentSession;
exports.record = record;
exports.pickUsage = pickUsage;
exports.getPricing = getPricing;
exports.summary = summary;
exports.getAllSessionsSummary = getAllSessionsSummary;
exports.parseTimeFilter = parseTimeFilter;
/**
 * Telemetry module for CheckMate
 * Tracks token usage and cost per project/session
 */
var fs_1 = require("fs");
var path_1 = require("path");
var config_js_1 = require("./config.js");
// Default pricing per 1K tokens (if not in config)
var DEFAULT_PRICING = {
    'openai/gpt-4o': 0.01,
    'openai/gpt-4o-mini': 0.005,
    'anthropic/claude-3-opus': 0.015,
    'anthropic/claude-3-sonnet': 0.008,
    'anthropic/claude-3-haiku': 0.00025,
};
// Current session data
var current = { id: '', cmd: '' };
var telemetryFolder = '';
var currentFile = '';
var inCI = process.env.CI === 'true';
/**
 * Initialize telemetry for a new session
 * @param cmd The command being executed
 */
function startSession(cmd) {
    current = { id: Date.now().toString(36), cmd: cmd };
    // Create telemetry directory if it doesn't exist
    try {
        var config = (0, config_js_1.load)();
        // Skip if logging is disabled
        if (config.log === 'off')
            return;
        telemetryFolder = path_1.default.join(process.cwd(), '.checkmate-telemetry');
        fs_1.default.mkdirSync(telemetryFolder, { recursive: true });
        // Create new session file
        currentFile = path_1.default.join(telemetryFolder, "".concat(current.id, ".jsonl"));
        // Record session start
        var entry = {
            ts: new Date().toISOString(),
            cmd: cmd,
            provider: 'system',
            model: 'session-start',
            in: 0,
            out: 0
        };
        write(JSON.stringify(entry) + '\n');
    }
    catch (error) {
        console.error('Failed to initialize telemetry:', error);
    }
}
/**
 * Get the current session information
 * @returns Current session data or undefined if not initialized
 */
function getCurrentSession() {
    return current.id ? current : undefined;
}
/**
 * Record a telemetry entry
 * @param entry The telemetry entry to record
 */
function record(entry) {
    // Skip if logging is disabled or not initialized
    if (!currentFile)
        return;
    try {
        var formattedEntry = {
            ts: new Date().toISOString(),
            cmd: current.cmd,
            provider: entry.provider,
            model: entry.model,
            in: entry.tokensIn,
            out: entry.tokensOut,
            ms: entry.ms,
            estimated: entry.estimated
        };
        write(JSON.stringify(formattedEntry) + '\n');
    }
    catch (error) {
        // Fail silently - telemetry should never break the main app
    }
}
/**
 * Extract token usage from model response
 * @param response The model response object
 * @returns Token usage data
 */
function pickUsage(response) {
    var _a, _b, _c, _d;
    // Default to estimated values
    var estimated = true;
    var prompt = 0;
    var completion = 0;
    try {
        // OpenAI format
        if (((_a = response === null || response === void 0 ? void 0 : response.usage) === null || _a === void 0 ? void 0 : _a.prompt_tokens) && ((_b = response === null || response === void 0 ? void 0 : response.usage) === null || _b === void 0 ? void 0 : _b.completion_tokens)) {
            prompt = response.usage.prompt_tokens;
            completion = response.usage.completion_tokens;
            estimated = false;
        }
        // Anthropic Claude 3 format
        else if (((_c = response === null || response === void 0 ? void 0 : response.usage) === null || _c === void 0 ? void 0 : _c.input_tokens) && ((_d = response === null || response === void 0 ? void 0 : response.usage) === null || _d === void 0 ? void 0 : _d.output_tokens)) {
            prompt = response.usage.input_tokens;
            completion = response.usage.output_tokens;
            estimated = false;
        }
        // Fallback to estimation based on text length
        else if (response) {
            // Estimate based on text length (roughly 4 chars per token)
            if (response.prompt)
                prompt = Math.ceil(response.prompt.length / 4);
            if (response.content || response.text) {
                var text = response.content || response.text;
                completion = Math.ceil(text.length / 4);
            }
        }
    }
    catch (error) {
        // Fallback to zero if extraction fails
    }
    return { prompt: prompt, completion: completion, estimated: estimated };
}
/**
 * Write data to the telemetry file
 * @param data The data to write
 */
function write(data) {
    try {
        // Append to the current session file if it exists
        if (currentFile) {
            fs_1.default.appendFileSync(currentFile, data);
            // Check file size and roll over if necessary (>5MB)
            var stats = fs_1.default.statSync(currentFile);
            if (stats.size > 5 * 1024 * 1024) {
                currentFile = path_1.default.join(telemetryFolder, "".concat(current.id, "-").concat(Date.now().toString(36), ".jsonl"));
            }
        }
    }
    catch (error) {
        // Silently fail - telemetry should not break the app
    }
}
/**
 * Get pricing for a model
 * @param provider Provider name
 * @param model Model name
 * @returns Price per 1K tokens
 */
function getPricing(provider, model) {
    var config = (0, config_js_1.load)();
    var key = "".concat(provider, "/").concat(model);
    // Check in config
    if (config.pricing && config.pricing[key]) {
        return config.pricing[key];
    }
    // Fall back to defaults
    return DEFAULT_PRICING[key] || 0.01; // Default to $0.01 per 1K if unknown
}
/**
 * Get a summary of telemetry data
 * @param filePath Optional specific session file to summarize
 * @returns Usage summary
 */
function summary(filePath) {
    // If no file is specified and currentFile isn't set, use the most recent file
    var sessionFile = filePath;
    if (!sessionFile && !currentFile) {
        try {
            var folderPath_1 = telemetryFolder || path_1.default.join(process.cwd(), '.checkmate-telemetry');
            if (fs_1.default.existsSync(folderPath_1)) {
                // Get the most recent jsonl file
                var files = fs_1.default.readdirSync(folderPath_1)
                    .filter(function (file) { return file.endsWith('.jsonl'); })
                    .map(function (file) { return ({
                    name: file,
                    time: fs_1.default.statSync(path_1.default.join(folderPath_1, file)).mtime.getTime()
                }); })
                    .sort(function (a, b) { return b.time - a.time; });
                if (files.length > 0) {
                    sessionFile = path_1.default.join(folderPath_1, files[0].name);
                }
            }
        }
        catch (e) {
            // Silently continue if error
        }
    }
    else {
        sessionFile = sessionFile || currentFile;
    }
    var result = {
        tokens: 0,
        cost: 0,
        estimatedTokens: 0,
        byModel: {}
    };
    try {
        if (!sessionFile || !fs_1.default.existsSync(sessionFile)) {
            return result;
        }
        var lines = fs_1.default.readFileSync(sessionFile, 'utf8').split('\n').filter(Boolean);
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
            var line = lines_1[_i];
            try {
                var entry = JSON.parse(line);
                // Skip session start entries
                if (entry.provider === 'system')
                    continue;
                var totalTokens = entry.in + entry.out;
                var modelKey = "".concat(entry.provider, "/").concat(entry.model);
                // Initialize model entry if it doesn't exist
                if (!result.byModel[modelKey]) {
                    result.byModel[modelKey] = {
                        tokens: { input: 0, output: 0, total: 0 },
                        cost: 0,
                        isEstimated: false
                    };
                }
                // Update totals
                result.tokens += totalTokens;
                if (entry.estimated) {
                    result.estimatedTokens += totalTokens;
                    result.byModel[modelKey].isEstimated = true;
                }
                // Update model-specific data
                result.byModel[modelKey].tokens.input += entry.in;
                result.byModel[modelKey].tokens.output += entry.out;
                result.byModel[modelKey].tokens.total += totalTokens;
                // Calculate cost
                var price = getPricing(entry.provider, entry.model);
                var tokenCost = (totalTokens / 1000) * price;
                result.cost += tokenCost;
                result.byModel[modelKey].cost += tokenCost;
            }
            catch (error) {
                // Skip invalid entries
            }
        }
    }
    catch (error) {
        // Return empty summary on error
    }
    return result;
}
/**
 * Get a summary of all sessions
 * @param options Options for filtering sessions
 * @returns Usage summary
 */
function getAllSessionsSummary(options) {
    var result = {
        tokens: 0,
        cost: 0,
        estimatedTokens: 0,
        byModel: {}
    };
    try {
        // Make sure we have a telemetry folder path even if it wasn't initialized yet
        var folderPath_2 = telemetryFolder || path_1.default.join(process.cwd(), '.checkmate-telemetry');
        if (!fs_1.default.existsSync(folderPath_2)) {
            return result;
        }
        var files = fs_1.default.readdirSync(folderPath_2)
            .filter(function (file) { return file.endsWith('.jsonl'); })
            .filter(function (file) {
            // Filter by session ID if provided
            if (options.sessionId) {
                return file.startsWith(options.sessionId);
            }
            // Filter by time if provided
            if (options.since) {
                var stats = fs_1.default.statSync(path_1.default.join(folderPath_2, file));
                var fileTime = new Date(stats.mtime).getTime();
                var sinceTime = new Date().getTime() - parseTimeFilter(options.since);
                return fileTime >= sinceTime;
            }
            return true;
        })
            .map(function (file) { return path_1.default.join(folderPath_2, file); });
        // Merge summaries from all files
        for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
            var file = files_1[_i];
            var fileSummary = summary(file);
            result.tokens += fileSummary.tokens;
            result.cost += fileSummary.cost;
            result.estimatedTokens += fileSummary.estimatedTokens;
            // Merge by model data
            for (var _a = 0, _b = Object.entries(fileSummary.byModel); _a < _b.length; _a++) {
                var _c = _b[_a], modelKey = _c[0], modelData = _c[1];
                if (!result.byModel[modelKey]) {
                    result.byModel[modelKey] = {
                        tokens: { input: 0, output: 0, total: 0 },
                        cost: 0,
                        isEstimated: false
                    };
                }
                result.byModel[modelKey].tokens.input += modelData.tokens.input;
                result.byModel[modelKey].tokens.output += modelData.tokens.output;
                result.byModel[modelKey].tokens.total += modelData.tokens.total;
                result.byModel[modelKey].cost += modelData.cost;
                result.byModel[modelKey].isEstimated = result.byModel[modelKey].isEstimated || modelData.isEstimated;
            }
        }
    }
    catch (error) {
        // Return current summary on error
        console.error('Error getting all sessions summary:', error);
    }
    return result;
}
/**
 * Parse a time filter string into milliseconds
 * @param timeFilter Time filter string (e.g., "24h", "7d")
 * @returns Time in milliseconds
 */
function parseTimeFilter(timeFilter) {
    var match = timeFilter.match(/^(\d+)([hdwm])$/);
    if (!match)
        return 24 * 60 * 60 * 1000; // Default to 24h
    var value = match[1], unit = match[2];
    var numValue = parseInt(value, 10);
    switch (unit) {
        case 'h': return numValue * 60 * 60 * 1000; // hours
        case 'd': return numValue * 24 * 60 * 60 * 1000; // days
        case 'w': return numValue * 7 * 24 * 60 * 60 * 1000; // weeks
        case 'm': return numValue * 30 * 24 * 60 * 60 * 1000; // months (approximate)
        default: return 24 * 60 * 60 * 1000; // Default to 24h
    }
}
