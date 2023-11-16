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
const babel = require("@babel/core");
const gulp = require("gulp");
const eslint = require("gulp-eslint-new");
const { cp, mkdir, readFile, writeFile } = require("fs/promises");
const less = require("less");
const { runQunitPuppeteer, printResultSummary } = require("node-qunit-puppeteer");
const { join, basename, dirname } = require("path");
const { finished } = require("stream/promises");
var requirejs = require('requirejs');
const { rollup } = require("rollup");
const { pathToFileURL } = require("url");

// XXX There is a missing functionality of watch/sync on parent projects that
// was intentionally dropped when migrating from Grunt to Gulp... this will be
// addressed later on when needed.

const SOURCE_PATH = "src/scripts";
const TARGET_PATH = "build/www";
const TESTS_PATH = "build/test";

const MODULE_RESOURCES = {
    "qunit/qunit/qunit.js": "libs/qunit.js",
    "qunit/qunit/qunit.css": "css/qunit.css"
};

const TEST_RESOURCES = {
    "tests/qunit/**": "",
    "../base/tests/qunit/**": "tests/commons/",
    "../user/tests/qunit/**": "tests/user/"
};

gulp.task("eslint", () => gulp.src("src/scripts/**/*.js")
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError()));

gulp.task("build:assets", () => gulp.src("src/assets/**")
    .pipe(gulp.dest(TARGET_PATH)) );

gulp.task("build:scripts", () => gulp.src("src/scripts/**")
    .pipe(gulp.dest(TARGET_PATH)));

gulp.task("build:compose", () => gulp.src(["../user/dist/**"])
    .pipe(gulp.dest(TARGET_PATH)));

gulp.task("build:libs", async () => {
    for (const parent of ["libs", "css"]) {
        mkdir(join(TARGET_PATH, parent), { recursive: true });
    }
    for (const [source, target] of Object.entries(MODULE_RESOURCES)) {
        await cp(require.resolve(source), join(TARGET_PATH, target));
    }
});

// XXX Add postprocessing previously done by less-plugin-clean-css.
// XXX Consider going for postcss processing.
gulp.task("build:styles", async () => {
    for (const filename of ["structure.less", "theme.less"]) {
        const source = join(TARGET_PATH, "css", filename);
        const target = join(TARGET_PATH, "css", `${basename(filename, ".less")}.css`);
        const output = await less.render(await readFile(source, "utf-8"), {
            paths: join(TARGET_PATH, "css")
        });
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, output.css);
    }
});

gulp.task("build:editor", async () => {
    const bundle = await rollup({
        input: "src/scripts/org/forgerock/mock/ui/examples/CodeMirror.mjs",
        plugins: [require("@rollup/plugin-node-resolve").nodeResolve()]
    });
    await bundle.write({
        format: "amd",
        amd: {
            id: "org/forgerock/mock/ui/examples/CodeMirror"
        },
        file: join(TARGET_PATH, "org/forgerock/mock/ui/examples/CodeMirror.js")
    });
});

gulp.task("build:bundle", () => {
    return new Promise((resolve, reject) => {
        requirejs.optimize({
            baseUrl: TARGET_PATH,
            mainConfigFile: join(SOURCE_PATH, "main.js"),
            out: join(TARGET_PATH, "main.js"),
            include: ["main"],
            preserveLicenseComments: false,
            generateSourceMaps: true,
            optimize: "uglify2",
            excludeShallow: [
                // These files are excluded from optimization so that the UI can be customized without having to
                // repackage it.
                "config/AppConfiguration",
                // Exclude mock project dependencies to create a more representative bundle.
                "mock/Data",
                "sinon"
            ]
        }, resolve, reject);
    });
});

gulp.task("test:scripts", async () => {
    for (const [source, target] of Object.entries(TEST_RESOURCES)) {
        await finished(gulp
            .src(source)
            .pipe(gulp.dest(join(TESTS_PATH, target))));
    }
});

gulp.task("test:libs", async () => {
    const output = await babel.transformAsync(
        await readFile(require.resolve("sinon/pkg/sinon.js"), "utf-8"),
        {
            presets: ["@babel/preset-env"],
            sourceMaps: true
        }
    );
    await mkdir(join(TARGET_PATH, "libs"), { recursive: true });
    await writeFile(join(TARGET_PATH, "libs/sinon.js"), output.code);
    await writeFile(join(TARGET_PATH, "libs/sinon.map.js"), JSON.stringify(output.map));
});

gulp.task("test:qunit", async () => {
    const result = await runQunitPuppeteer({
        targetUrl: pathToFileURL(join(TESTS_PATH, "index.html")).href,
        puppeteerArgs: [
            "--allow-file-access-from-files",
            "--no-sandbox"
        ]
    });
    printResultSummary(result, console);
});

gulp.task("build", gulp.series(
    gulp.parallel(
        "build:assets",
        "build:scripts",
        "build:compose",
        "build:editor",
        "build:libs",
        "test:libs"
    ),
    gulp.parallel(
        "build:styles",
        "build:bundle"
    )
));

gulp.task("test", gulp.series(
    "test:scripts",
    "test:qunit"
));

gulp.task("default", gulp.series("build", "test"));
