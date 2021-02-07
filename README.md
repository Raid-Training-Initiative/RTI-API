# RTI API

## Overview
This is a repository for the API that exposes the RTI data used by [RTI Bot](https://github.com/Daniel123643/RTIBot) for use within web interfaces and other third-party applications.

`spec` is a folder containing a RAML specification to easily view the API design and what requests you can make. `src` is a folder containing the code for this API, with `App.ts` being the executable file.

## Installation
* Step 1: [Install Node.js](https://nodejs.org/en/download/) if you haven't already.
* Step 2: [Install MongoDB](https://www.mongodb.com/try/download/community?tck=docs_server) and add its `bin` folder to your PATH.
* Step 3: Clone the repo:
```bash
git clone https://github.com/StephanWells/RTI-API.git
```
* Step 4: Initialise and update the database submodule:
```bash
git submodule update --init --recursive
```
* Step 5: Open the terminal at the root folder and install Node dependencies:
```bash
npm install
```

## Restoring Data
If there is a database already created and backed up into a dump folder, then you can restore this data for use within the API.

* Step 1: [Install Mongo Tools](https://docs.mongodb.com/database-tools/installation/installation-windows/) and add its `bin` folder to your PATH.
* Step 2: Connect to MongoDB (this can be done via running `mongo` in a terminal or via a GUI like [Robo 3T](https://robomongo.org/download)).
* Step 3: Navigate to the directory containing your MongoDB dump folder in a terminal and run `mongorestore`:
```bash
mongorestore
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
