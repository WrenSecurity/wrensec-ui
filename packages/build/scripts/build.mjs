/*
 * The contents of this file are subject to the terms of the Common Development and
 * Distribution License (the License). You may not use this file except in compliance with the
 * License.
 *
 * You can obtain a copy of the License at legal/CDDLv1.1.txt. See the License for the
 * specific language governing permission and limitations under the License.
 *
 * When distributing Covered Software, include this CDDL Header Notice in each file and include
 * the License file at legal/CDDLv1.1.txt. If applicable, add the following below the CDDL
 * Header, with the fields enclosed by brackets [] replaced by your own identifying
 * information: "Portions copyright [year] [name of copyright owner]".
 *
 * Copyright 2023 Wren Security.
 */
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { spawn } from "child_process";
import { mkdir } from "fs/promises";
import { join } from "path";
import { rollup } from "rollup";
import { fileURLToPath } from "url";

const TARGET_PATH = fileURLToPath(new URL("../dist", import.meta.url));
await mkdir(TARGET_PATH, { recursive: true });

const bundle = await rollup({
    input: "src/index.mjs",
    plugins: [nodeResolve()],
    external: /node_modules/
});
await bundle.write({
    format: "cjs",
    file: join(TARGET_PATH, "index.cjs")
});

spawn("npm", ["pack", "--pack-destination", TARGET_PATH]);
