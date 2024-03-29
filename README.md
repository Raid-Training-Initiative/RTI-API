# RTI API

## Overview

This is a repository for the API that exposes the RTI data used by [RTI Bot](https://github.com/Daniel123643/RTIBot) for use within web interfaces and other third-party applications. The base URL of the live API is [here](https://rti.krhom.com/api/).

## Installation

-   Step 1: [Install Node.js](https://nodejs.org/en/download/) if you haven't already.
-   Step 2: [Install MongoDB](https://www.mongodb.com/try/download/community?tck=docs_server) and add its `bin` folder to your PATH.
-   Step 3: Clone the repo:

```bash
git clone https://github.com/StephanWells/RTI-API.git
```

-   Step 4: Initialise and update the database submodule:

```bash
git submodule update --init --recursive
```

-   Step 5: Open a terminal at the root folder and install Node dependencies:

```bash
npm install
```

-   Step 6: Create a file called `ConfigDebug.json` in the root directory, with the following contents:

```json
{
    "db": "mongodb://0.0.0.0:27017/",
    "guildId": "paste the guild ID here",
    "clientsFile": "./clients.json"
}
```

-   Step 7: Optionally, if you plan to run with Docker, create a file called `Config.json` in the root directory, with the following contents:

```json
{
    "db": "mongodb://db:27017/",
    "guildId": "paste the guild ID here",
    "clientsFile": "./clients/clients.json"
}
```

## Setting up Authentication

For most endpoints, a Bearer token will need to be provided. Below are steps for setting this up:

-   Step 1: Create a `clients.json` file containing an object with key-value pairs, where the keys are the Bearer tokens and the values are the names/identifiers for each of the tokens. Example `clients.json` file:

```json
{
    "TESTTOKEN": "RTI Developer"
}
```

-   Step 2: Point to the `clients.json` file in your `ConfigDebug.json` file. Example `ConfigDebug.json`:

```json
{
    "db": "mongodb://0.0.0.0:27017/",
    "guildId": "156175293055369216",
    "clientsFile": "./clients.json"
}
```

-   Step 3: Add your token to the `Authorization` header of requests you make in the form `Bearer <token>` (e.g. `Bearer TESTTOKEN`).

## Running

-   Step 1: Transpile TypeScript files into JavaScript code:

```bash
npm run tsc
```

-   Step 2: Run the app:

```bash
node dist/src/App.js Debug
```

-   Step 3: Make HTTP requests to the server, e.g. `GET http://localhost:8080/status`.

## Restoring Data

The API won't do much without data to expose. If there is a database already created and backed up into a dump folder, then you can restore this data for use within the API.

-   Step 1: [Install Mongo Tools](https://docs.mongodb.com/database-tools/installation/installation-windows/) and add its `bin` folder to your PATH.
-   Step 2: Connect to MongoDB (this can be done via running `mongo` in a terminal or via a GUI like [Robo 3T](https://robomongo.org/download)).
-   Step 3: Navigate to the directory containing your MongoDB dump folder in a terminal and run `mongorestore`:

```bash
mongorestore --gzip --archive=your_archive.archive
```

-   Or, to restore database (guild) X into database Y, use:

```bash
mongorestore --gzip --archive=your_archive.archive --nsFrom "X.*" --nsTo "Y.*"
```

## Enabling Discord Authentication (optional)

-   Step 1: Head over to the [Discord Developer Portal](https://discord.com/developers/) and create an application/reuse an existing applicaiton.
-   Step 2: Add the following line to your ConfigDebug.json

```json
{
    // ...
    "cors": "false",
    "discordAuth": {
        "clientId": "dicord application client ID here",
        "clientSecret": "discord application client secret here"
    }
}
```

-   Step 3: Restart the application

## Setting up Postman

Postman is a free software that will allow you to easily send requests to the API. Included in the `postman` folder are files you can import into Postman to immediately have a collection of requests you can make and an environment you can use.

-   Step 1: [Install Postman](https://www.postman.com/downloads/)
-   Step 2: Import the collection and environment via the `Import` button in Postman.
-   Step 3: Change your environment to the imported environment.
-   Step 4: Run the API locally (on port `8080`, which is the default port).
-   Step 5: Run any of the requests in the nested folder structure to sample the API.

Note that this will only work off the bat if you have an existing dump of RTI test data to use. Refer to the `Restoring Data` section if you don't have any data to use the API with. You may also change the environment's values (`baseUrl` and `rtiApiToken`) if you have a working API token and wish to hit the [live API](https://rti.krhom.com/api/).

## Optional Configuration

-   If using VS Code, put the following content in a `launch.json` JSON file in a folder called `.vscode` placed in the root directory:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "cwd": "${workspaceFolder}",
            "type": "node",
            "request": "launch",
            "runtimeExecutable": "node",
            "runtimeArgs": [
                "--nolazy",
                "-r",
                "ts-node/register/transpile-only"
            ],
            "name": "Launch Program",
            "skipFiles": ["<node_internals>/**", "node_modules/**"],
            "outputCapture": "std",
            "args": ["src/App.ts", "Debug"],
            "env": {
                "PINO_PRETTY": "true"
            }
        }
    ]
}
```

## File Information

-   `spec` is a folder containing a RAML specification to easily view the API design and what requests you can make.
-   `src` is a folder containing the code for this API, with `App.ts` being the executable file.
-   `postman` is a folder containing Postman collections and environments for unit tests and sampling the API.
-   `RTIBot-DB` is a submodule containing the documents and schemas for the database.
-   `.github` is a folder containing YAML files used to define GitHub actions for CI/CD.

Other files:

-   `Dockerfile`, `.dockerignore`, & `dockercompose.yml` are files used to spin up a Docker container.
-   `package.json` & `package-lock.json` are files used by NPM to install dependencies.
-   `start.sh` & `stop.sh` are files used by the GitHub action to deploy the API.
-   `tsconfig.json` is a config file used to transpile TypeScript files into JavaScript.
-   `Config.json` and `ConfigDebug.json` are files loaded when the app starts to determine what the database path, `clients.json` path, and guild ID are.
-   `.eslintrc.json` and `.prettierrc` are files for the linter and formatter configuration.
-   `keygen.sh` is a script you can run to generate auth tokens for basic authentication with clients. You can dump these into `clients.json`.

## Contact

-   Guild Wars 2 username: `Step.1285`
-   Discord username: `step#0`
-   RTI Discord: https://discord.gg/rti
