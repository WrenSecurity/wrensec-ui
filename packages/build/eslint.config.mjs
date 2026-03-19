import globals from "globals";
import wrensecurityConfig from "@wrensecurity/eslint-config";

export default [
    wrensecurityConfig,
    {
        languageOptions: {
            globals: {
                ...globals.es2015,
                ...globals.node
            },
            sourceType: "module",
            ecmaVersion: 2022
        }
    }
];
