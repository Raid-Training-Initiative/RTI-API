# RTI API

## Overview
This is a repository for the API that exposes the RTI data used by [RTI Bot](https://github.com/Daniel123643/RTIBot) for use within web interfaces and other third-party applications.

## Installation
* Step 1: [Install Node.js](https://nodejs.org/en/download/) if you haven't already.
* Step 2: Clone the repo:
```bash
git clone https://github.com/StephanWells/RTI-API.git
```
* Step 3: Initialise and update the database submodule:
```bash
git submodule update --init --recursive
```
* Step 4: Open the terminal at the root folder and install Node dependencies:
```bash
npm install
```

## Running
* Step 1: Transpile TypeScript files into JavaScript code:
```bash
npm run tsc
```
* Step 2: Run the app:
```bash
node dist/src/App.js Debug
```
* Step 3: Make HTTP requests to the server, e.g. `GET http://localhost:8080/comps`.

## Optional Configuration
* If using VS Code, put the following JSON files in a folder called `.vscode` placed in the root directory:

`launch.json`

```json
{
    // Use IntelliSense to learn about possible attributes.
    // Hover to view descriptions of existing attributes.
    // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "cwd": "${workspaceFolder}",
            "type": "node",
            "request": "launch",
            "name": "Launch Program",
            "skipFiles": [
                "<node_internals>/**"
            ],
            "program": "${workspaceFolder}/dist/src/App.js",
            "preLaunchTask": "npm: tsc",
            "outFiles": [
                "${workspaceFolder}/dist/**/*.js"
            ],
            "args": [ "Debug"
            ]
        }
    ]
}
```

`tasks.json`

```json
{
    "tasks": [
        {
            "type": "npm",
            "script": "tsc",
            "problemMatcher": [],
            "label": "npm: tsc",
            "detail": "tsc",
            "group": {
                "kind": "build",
                "isDefault": true
            },
            "options": {
                "cwd": "${workspaceFolder}"
            }
        }
    ]
}
```

* For realtime IDE linting, you can also install [ES Lint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) for VS Code and place the following `.eslintrc.json` file into the root directory:
```json
{
    "env": {
        "browser": true,
        "es6": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended"
    ],
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 2018
    },
    "plugins": [
        "@typescript-eslint"
    ],
    "rules": {
    }
}
```

## Contact
* Guild Wars 2 username: `Step.1285`
* Discord username: `Step#1937`
* RTI Discord: https://discord.gg/rti
