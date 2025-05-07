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
Object.defineProperty(exports, "__esModule", { value: true });
exports.load = load;
exports.save = save;
exports.updateModel = updateModel;
exports.setLogMode = setLogMode;
exports.ensureConfigExists = ensureConfigExists;
/**
 * Config handling for CheckMate CLI
 * Manages loading/saving of .checkmate configuration file
 */
var node_fs_1 = require("node:fs");
var yaml_1 = require("yaml");
// Default configuration
var DEFAULT_CONFIG = {
    openai_key: '',
    anthropic_key: '',
    models: {
        reason: 'claude-3-7-sonnet-20250219',
        quick: 'gpt-4o-mini',
    },
    tree_cmd: "git ls-files | grep -E '\\\\.(ts|js|tsx|jsx)$'",
    log: 'optional',
    context_top_n: 40,
    show_thinking: true,
    use_embeddings: true,
};
// Path to config file
var CONFIG_FILE = '.checkmate';
/**
 * Load configuration from .checkmate file
 * Returns default config if file doesn't exist
 */
function load() {
    try {
        if (node_fs_1.default.existsSync(CONFIG_FILE)) {
            var fileContent = node_fs_1.default.readFileSync(CONFIG_FILE, 'utf8');
            try {
                var parsedConfig = (0, yaml_1.parse)(fileContent);
                // Merge with defaults to ensure all fields exist
                return __assign(__assign(__assign({}, DEFAULT_CONFIG), parsedConfig), { models: __assign(__assign({}, DEFAULT_CONFIG.models), (parsedConfig.models || {})) });
            }
            catch (parseError) {
                console.error('Error parsing YAML config:', parseError);
                console.log('Using default configuration instead.');
                return __assign({}, DEFAULT_CONFIG);
            }
        }
    }
    catch (error) {
        console.error('Error loading config:', error);
    }
    // Return default config if file doesn't exist or can't be parsed
    return __assign({}, DEFAULT_CONFIG);
}
/**
 * Save configuration to .checkmate file
 */
function save(config) {
    try {
        var yamlStr = (0, yaml_1.stringify)(config);
        node_fs_1.default.writeFileSync(CONFIG_FILE, yamlStr, 'utf8');
    }
    catch (error) {
        console.error('Error saving config:', error);
        throw new Error("Failed to save config: ".concat(error));
    }
}
/**
 * Update a model in the configuration
 */
function updateModel(slot, modelName) {
    var config = load();
    config.models[slot] = modelName;
    save(config);
    return config;
}
/**
 * Set log mode
 */
function setLogMode(mode) {
    var config = load();
    config.log = mode;
    save(config);
    return config;
}
/**
 * Ensure config file exists, create with defaults if it doesn't
 */
function ensureConfigExists() {
    if (!node_fs_1.default.existsSync(CONFIG_FILE)) {
        save(DEFAULT_CONFIG);
        console.log("Created default config file: ".concat(CONFIG_FILE));
    }
}
