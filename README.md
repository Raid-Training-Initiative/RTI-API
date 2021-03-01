# RTI API

## Overview
This is a repository for the API that exposes the RTI data used by [RTI Bot](https://github.com/Daniel123643/RTIBot) for use within web interfaces and other third-party applications. The base URL of the live API is [here](https://rti.krhom.com/api/).

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
* Step 6: Create a file called `ConfigDebug.json` in the root directory, with the following contents:
```json
{
    "db": "mongodb://localhost:27017/",
    "guildId": "paste the guild ID here",
}
```
* Step 7: Optionally, if you plan to run with Docker, create a file called `Config.json` in the root directory, with the following contents:
```json
{
    "db": "mongodb://db:27017/",
    "guildId": "paste the guild ID here",
}
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
* Step 3: Make HTTP requests to the server, e.g. `GET http://localhost:8080/status`.

## Restoring Data
If there is a database already created and backed up into a dump folder, then you can restore this data for use within the API.

* Step 1: [Install Mongo Tools](https://docs.mongodb.com/database-tools/installation/installation-windows/) and add its `bin` folder to your PATH.
* Step 2: Connect to MongoDB (this can be done via running `mongo` in a terminal or via a GUI like [Robo 3T](https://robomongo.org/download)).
* Step 3: Navigate to the directory containing your MongoDB dump folder in a terminal and run `mongorestore`:
```bash
mongorestore
```
* Note that if your dump folder is an archive, you should run:
```bash
mongorestore --gzip --archive=<your_dump_archive>
```

## Setting up Authentication
For most endpoints, a Bearer token will need to be provided. Below are steps for setting this up:

* Step 1: Create a `clients.json` file containing an object with key-value pairs, where the keys are the Bearer tokens and the values are the names/identifiers for each of the tokens. Example `clients.json` file:
```json
{
    "TESTTOKEN": "RTI Developer"
}
```
* Step 2: Point to the `clients.json` file in your `ConfigDebug.json` file:
```json
{
    "db": "mongodb://localhost:27017/",
    "guildId": "705796529293623417",
    "clientsFile": "./clients.json"
}
```

## Setting up Postman
Postman is a free software that will allow you to easily send requests to the API. Included in the `postman` folder are files you can import into Postman to immediately have a collection of requests you can make and an environment you can use.

* Step 1: [Install Postman](https://www.postman.com/downloads/)
* Step 2: Import the collection and environment via the `Import` button in Postman.
* Step 3: Change your environment to the imported environment.
* Step 4: Run the API locally (on port `8080`, which is the default port).
* Step 5: Run any of the requests in the nested folder structure to sample the API.

Note that this will only work off the bat if you have an existing dump of RTI test data to use. Refer to the `Restoring Data` section if you don't have any data to use the API with. You may also change the environment's values (`baseUrl` and `rtiApiToken`) if you have a working API token and wish to hit the [live API](https://rti.krhom.com/api/).

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
        "no-unused-vars": "off"
    }
}
```

## File Information
* `spec` is a folder containing a RAML specification to easily view the API design and what requests you can make.
* `src` is a folder containing the code for this API, with `App.ts` being the executable file.
* `postman` is a folder containing Postman collections and environments for unit tests and sampling the API.
* `RTIBot-DB` is a submodule containing the documents and schemas for the database.
* `.github` is a folder containing YAML files used to define GitHub actions for CI/CD.

Other files:

* `Dockerfile`, `.dockerignore`, & `dockercompose.yml` are files used to spin up a Docker container.
* `package.json` & `package-lock.json` are files used by Node to install dependencies.
* `start.sh` & `stop.sh` are files used by the GitHub action to deploy the API.
* `tsconfig.json` is a config file used to transpile TypeScript files into JavaScript.
* `Config.json` and `ConfigDebug.json` are files loaded when the app starts to determine what the database path, `clients.json` path, and guild ID are.

## Contact
* Guild Wars 2 username: `Step.1285`
* Discord username: `Step#1937`
* RTI Discord: https://discord.gg/rti
