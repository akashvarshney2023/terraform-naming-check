"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const hcl = __importStar(require("@evops/hcl-terraform-parser"));
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
const promises_1 = require("fs/promises");
const core = __importStar(require("@actions/core"));
dotenv.config();
// main funtion
async function main() {
    const workingDir = process.cwd();
    try {
        const modules = await loadAllTerraformConfigs(`${workingDir}/infra`);
        const isAllModuleLatest = await validateTags(modules);
        if (isAllModuleLatest) {
            core.info('\u001b[32mGreat !! all modules using the latest version.');
        }
        else {
            core.setOutput('output', 'neutral\n');
        }
    }
    catch (err) {
        console.error(`Error: ${err}`);
        process.exit(1);
    }
}
//on a given module name validate the tags 
async function validateTags(modules) {
    let isAllModuleLatest = true; // Assuming all modules are initially up to date
    for (const moduleName in modules) {
        const moduleSource = modules[moduleName];
        try {
            const { repoName, tag } = getRepoNameAndTag(moduleSource);
            const { latestTag, hasLatest } = await isRepositoryTagLatest(repoName, tag);
            if (!hasLatest) {
                const message = `The module ${moduleSource} is not the latest version. Please consider using the latest tag, which is [${latestTag}](https://github.com/${repoName}/tags).\n`;
                core.warning(message);
                isAllModuleLatest = false; // Set to false if any module is not up to date
            }
        }
        catch (err) {
            console.error(`Error: ${err}`);
        }
    }
    return isAllModuleLatest;
}
async function isRepositoryTagLatest(repoName, currentTag) {
    const url = `https://api.github.com/repos/${repoName}/git/refs/tags`;
    const token = process.env.REPO_READ_TOKEN;
    try {
        const response = await axios_1.default.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (response.status !== 200) {
            throw new Error(`Failed to fetch tags from GitHub API. Status: ${response.status}`);
        }
        const tags = response.data;
        let latestTag = "";
        for (const tag of tags) {
            const tagName = tag.ref.replace("refs/tags/", "");
            if (latestTag === "" || tagName > latestTag) {
                latestTag = tagName;
            }
        }
        if (latestTag === currentTag) {
            return { latestTag, hasLatest: true };
        }
        return { latestTag, hasLatest: false };
    }
    catch (err) {
        throw err;
    }
}
//extract reponame and tag from the source
function getRepoNameAndTag(moduleSource) {
    moduleSource = moduleSource.replace("git@", "");
    moduleSource = moduleSource.replace(".git", "");
    const parts = moduleSource.split(":");
    const repoName = parts[parts.length - 1];
    const repoParts = repoName.split("?");
    const extractedRepoName = repoParts[0];
    let tag = "";
    if (repoParts.length > 1) {
        const queryParams = repoParts[1];
        const values = new URLSearchParams(queryParams);
        tag = values.get("ref") || "";
    }
    return { repoName: extractedRepoName, tag };
}
//  loadTerraform file and return a list of module sources
async function loadTerraformConfig(workingDir) {
    const configFile = `${workingDir}/main.tf`;
    try {
        const configData = await readFile(configFile, 'utf8');
        const parsedConfig = hcl.parse(configData);
        // Extract module sources
        const moduleSources = [];
        for (const moduleName in parsedConfig.module_calls) {
            const moduleSource = parsedConfig.module_calls[moduleName].source;
            moduleSources.push(moduleSource);
        }
        return moduleSources;
    }
    catch (error) {
        throw new Error(`Error loading Terraform configuration: ${error}`);
    }
}
// Load and parse all Terraform configuration files in a directory
async function loadAllTerraformConfigs(workingDir) {
    try {
        const files = await (0, promises_1.readdir)(workingDir);
        // Filter the files with a .tf extension
        const tfFiles = files.filter((file) => file.endsWith('.tf'));
        const moduleSources = [];
        for (const tfFile of tfFiles) {
            const configFile = `${workingDir}/${tfFile}`;
            const configData = await readFile(configFile, 'utf8');
            const parsedConfig = hcl.parse(configData);
            // Extract module sources
            for (const moduleName in parsedConfig.module_calls) {
                const moduleSource = parsedConfig.module_calls[moduleName].source;
                moduleSources.push(moduleSource);
            }
        }
        return moduleSources;
    }
    catch (error) {
        throw new Error(`Error loading Terraform configurations: ${error}`);
    }
}
// Replace this with the actual readFile function from your chosen file system library
async function readFile(path, encoding) {
    const fs = require('fs').promises;
    return fs.readFile(path, encoding);
}
main();
//# sourceMappingURL=index.js.map