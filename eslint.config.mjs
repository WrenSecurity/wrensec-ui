import globals from "globals";
import wrensecurityConfig from "@wrensecurity/eslint-config";

export default [
    wrensecurityConfig,
    {
        languageOptions: {
            globals: {
                ...globals.amd,
                ...globals.browser,
                ...globals.es2015,
                ...globals.qunit
            }
        },
        rules: {
            /*
             * --------------------------------------------------------------------------------
             * ERROR RULES
             *
             * Violating these rules will cause the build to fail.
             * --------------------------------------------------------------------------------
             */

            "array-bracket-spacing": ["error", "never"],
            "indent": ["error", 4, {
                "FunctionDeclaration": {
                    "parameters": 2
                },
                "FunctionExpression": {
                    "parameters": 2
                },
                "SwitchCase": 1,
                "VariableDeclarator": 1
            }],
            "max-len": ["error", 120, 4],
            "new-parens": "error",
            "no-alert": "error",
            "no-duplicate-case": "error",
            "no-empty-character-class": "error",
            "no-extend-native": "error",
            "no-global-assign": "error",
            "no-invalid-regexp": "error",
            "no-irregular-whitespace": "error",
            "no-labels": "error",
            "no-lonely-if": "error",
            "no-mixed-spaces-and-tabs": "error",
            "no-multiple-empty-lines": "error",
            "no-multi-str": "error",
            "no-trailing-spaces": "error",
            "no-unused-vars": "error",
            "no-void": "error",

            /*
             * --------------------------------------------------------------------------------
             * WARNING RULES
             *
             * These are rules that we want to turn into errors but can't yet because there are
             * too many violations. As we fix the violations, we will transition them into
             * error rules.
             * --------------------------------------------------------------------------------
             */

            /**
             * Require a capital letter for constructors.
             *
             * var f = Foo(); # bad
             *
             * var f = new Foo(); # good
             */
            "new-cap": ["warn", {
                "capIsNew": false
            }],
            /**
             * Multiple spaces not allowed.
             *
             * var fruit···=··"apples" # bad
             *
             * var fruit·=·"apples" # good
             */
            "no-multi-spaces": "warn",

            /**
             * Allow the use of eval!
             */
            "no-eval": "warn"
        }
    },
    {
        files: ["**/gulpfile.js"],
        languageOptions: {
            globals: {
                ...globals.node
            },
            ecmaVersion: 2021
        }
    },
    {
        // New components are ES modules (transpiled to AMD by the build) and must use modern language features
        files: ["**/*.jsm"],
        languageOptions: {
            sourceType: "module",
            ecmaVersion: 2021
        },
        rules: {
            "no-restricted-globals": ["error",
                { name: "define", message: "Use ES module export instead of AMD define()." },
                { name: "require", message: "Use ES module import instead of AMD require()." }
            ],
            "no-var": "error",
            "object-shorthand": "error",
            "prefer-arrow-callback": "error",
            "prefer-const": "error",
            "prefer-rest-params": "error",
            "prefer-spread": "error",
            "prefer-template": "error"
        }
    },
    {
        files: ["**/*.mjs"],
        languageOptions: {
            globals: {
                ...globals.node
            },
            sourceType: "module",
            ecmaVersion: 2021
        }
    }
];
