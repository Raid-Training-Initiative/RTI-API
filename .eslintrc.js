module.exports = {
    root: true,
    env: {
        node: true,
        es6: true,
    },
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 2019,
        project: "tsconfig.json",
        tsconfigRootDir: __dirname,
    },
    plugins: ["@typescript-eslint"],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "prettier",
    ],
    ignorePatterns: [".eslintrc.js"],
    // add your custom rules here
    rules: {
        "no-inner-declarations": 1,
        curly: 1,
    },
};
