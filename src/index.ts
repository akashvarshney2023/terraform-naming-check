// @ts-ignore
import * as hcl from "@evops/hcl-terraform-parser";
import axios from 'axios';
import * as dotenv from 'dotenv';
import { readdir } from 'fs/promises';
import * as core from '@actions/core'
dotenv.config();


// main funtion
async function main() {
  const workingDir: string = process.cwd();
  try {
    const modules: string[] = await loadAllTerraformConfigs(`${workingDir}/infra`);
    const isAllModuleLatest: boolean = await validateTags(modules);

    if (isAllModuleLatest) {
      core.info('\u001b[32mGreat !! all modules using the latest version.')

    } else {
      core.setOutput('output', 'neutral\n');
    }
  } catch (err) {
    console.error(`Error: ${err}`);
    process.exit(1);
  }
}
//on a given module name validate the tags 
async function validateTags(modules: string[]): Promise<boolean> {
  let isAllModuleLatest: boolean = true; // Assuming all modules are initially up to date

  for (const moduleName in modules) {
    const moduleSource: string = modules[moduleName];

    try {
      const { repoName, tag } = getRepoNameAndTag(moduleSource);
      const { latestTag, hasLatest } = await isRepositoryTagLatest(repoName, tag);
      if (!hasLatest) {
        const message: string = `The module ${moduleSource} is not the latest version. Please consider using the latest tag, which is [${latestTag}](https://github.com/${repoName}/tags).\n`;
        core.warning(message);
        isAllModuleLatest = false; // Set to false if any module is not up to date
      }
    } catch (err) {
      console.error(`Error: ${err}`);
    }
  }

  return isAllModuleLatest;
}

async function isRepositoryTagLatest(repoName: string, currentTag: string): Promise<{ latestTag: string; hasLatest: boolean }> {
  const url: string = `https://api.github.com/repos/${repoName}/git/refs/tags`;
  const token: string | undefined = process.env.REPO_READ_TOKEN;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status !== 200) {
      throw new Error(`Failed to fetch tags from GitHub API. Status: ${response.status}`);
    }

    const tags: { ref: string }[] = response.data;

    let latestTag: string = "";
    for (const tag of tags) {
      const tagName: string = tag.ref.replace("refs/tags/", "");
      if (latestTag === "" || tagName > latestTag) {
        latestTag = tagName;
      }
    }

    if (latestTag === currentTag) {
      return { latestTag, hasLatest: true };
    }

    return { latestTag, hasLatest: false };
  } catch (err) {
    throw err;
  }
}

//extract reponame and tag from the source
function getRepoNameAndTag(moduleSource: string): { repoName: string; tag: string } {
  moduleSource = moduleSource.replace("git@", "");
  moduleSource = moduleSource.replace(".git", "");

  const parts: string[] = moduleSource.split(":");
  const repoName: string = parts[parts.length - 1];

  const repoParts: string[] = repoName.split("?");
  const extractedRepoName: string = repoParts[0];

  let tag: string = "";
  if (repoParts.length > 1) {
    const queryParams: string = repoParts[1];
    const values: URLSearchParams = new URLSearchParams(queryParams);
    tag = values.get("ref") || "";
  }
  return { repoName: extractedRepoName, tag };
}

//  loadTerraform file and return a list of module sources
async function loadTerraformConfig(workingDir: string): Promise<string[]> {
  const configFile = `${workingDir}/main.tf`;

  try {
    const configData = await readFile(configFile, 'utf8');
    const parsedConfig = hcl.parse(configData);

    // Extract module sources
    const moduleSources: string[] = [];
    for (const moduleName in parsedConfig.module_calls) {
      const moduleSource = parsedConfig.module_calls[moduleName].source;
      moduleSources.push(moduleSource);
    }
    return moduleSources;
  } catch (error) {
    throw new Error(`Error loading Terraform configuration: ${error}`);
  }
}


// Load and parse all Terraform configuration files in a directory
async function loadAllTerraformConfigs(workingDir: string): Promise<string[]> {
  try {
    const files = await readdir(workingDir);

    // Filter the files with a .tf extension
    const tfFiles = files.filter((file) => file.endsWith('.tf'));

    const moduleSources: string[] = [];

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
  } catch (error) {
    throw new Error(`Error loading Terraform configurations: ${error}`);
  }
}


// Replace this with the actual readFile function from your chosen file system library
async function readFile(path: string, encoding: string): Promise<string> {

  const fs = require('fs').promises;
  return fs.readFile(path, encoding);
}

main();


