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
const gulp = require("gulp");
const eslint = require("gulp-eslint-new");
const { cp, mkdir, readFile, writeFile } = require("fs/promises");
const { join, basename, dirname } = require("path");
const less = require("less");

const TARGET_PATH = "dist";

const MODULE_RESOURCES = {
    "backbone-relational/backbone-relational.js": "libs/backbone-relational.js",
    "backbone.paginator/lib/backbone.paginator.min.js": "libs/backbone.paginator.js",
    "backbone/backbone-min.js": "libs/backbone.js",
    "backgrid-filter/backgrid-filter.css": "css/backgrid-filter.css",
    "backgrid-filter/backgrid-filter.min.js": "libs/backgrid-filter.js",
    "backgrid-paginator/backgrid-paginator.min.css": "css/backgrid-paginator.css",
    "backgrid-paginator/backgrid-paginator.min.js": "libs/backgrid-paginator.js",
    "backgrid-select-all/backgrid-select-all.min.js": "libs/backgrid-select-all.js",
    "backgrid/lib/backgrid.min.css": "css/backgrid.css",
    "backgrid/lib/backgrid.min.js": "libs/backgrid.js",
    "bootstrap/dist/js/bootstrap.min.js": "libs/bootstrap.js",
    "bootstrap-dialog/dist/css/bootstrap-dialog.min.css": "css/bootstrap-dialog.css",
    "bootstrap-dialog/dist/js/bootstrap-dialog.min.js": "libs/bootstrap-dialog.js",
    "dragula/dist/dragula.min.js": "libs/dragula.js",
    "font-awesome/css/font-awesome.min.css": "css/fontawesome/css/font-awesome.css",
    "font-awesome/fonts/fontawesome-webfont.eot": "css/fontawesome/fonts/fontawesome-webfont.eot",
    "font-awesome/fonts/fontawesome-webfont.svg": "css/fontawesome/fonts/fontawesome-webfont.svg",
    "font-awesome/fonts/fontawesome-webfont.ttf": "css/fontawesome/fonts/fontawesome-webfont.ttf",
    "font-awesome/fonts/fontawesome-webfont.woff": "css/fontawesome/fonts/fontawesome-webfont.woff",
    "font-awesome/fonts/fontawesome-webfont.woff2": "css/fontawesome/fonts/fontawesome-webfont.woff2",
    "font-awesome/fonts/FontAwesome.otf": "css/fontawesome/fonts/FontAwesome.otf",
    "font-awesome/less/variables.less": "css/fontawesome/less/variables.less",
    "handlebars/dist/handlebars.js": "libs/handlebars.js",
    "i18next/lib/dep/i18next.min.js": "libs/i18next.js",
    "jquery/dist/jquery.min.js": "libs/jquery.js",
    "moment/min/moment.min.js": "libs/moment.js",
    "react-dom/dist/react-dom.min.js": "libs/react-dom.js",
    "react/dist/react.min.js": "libs/react.js",
    "requirejs/require.js": "libs/requirejs.js",
    "@selectize/selectize/dist/css/selectize.bootstrap3.css": "css/selectize.css",
    "@selectize/selectize/dist/js/selectize.min.js": "libs/selectize.js",
    "spin.js/spin.js": "libs/spin.js",
    "titatoggle/dist/titatoggle-dist-min.css": "css/titatoggle.css",
    "xdate/src/xdate.js": "libs/xdate.js"
};

const LOCAL_RESOURCES = {
    "js/form2js-2.0-769718a.js": "libs/form2js.js",
    "js/jquery.ba-dotimeout-1.0-min.js": "libs/jquery.ba-dotimeout.js",
    "js/jquery.placeholder-2.0.8.js": "libs/jquery.placeholder.js",
    "js/js2form-2.0-769718a.js": "libs/js2form.js",
    "js/lodash-3.10.1-min.js": "libs/lodash.js"
};

gulp.task("eslint", () => gulp.src("src/scripts/**/*.js")
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError()));

gulp.task("build:assets", () => gulp.src("src/assets/**")
    .pipe(gulp.dest(TARGET_PATH)) );

gulp.task("build:scripts", () => gulp.src("src/scripts/**")
    .pipe(gulp.dest(TARGET_PATH)));

gulp.task("build:libs", async () => {
    for (const parent of ["libs", "css", "css/fontawesome"]) {
        mkdir(join(TARGET_PATH, parent), { recursive: true });
    }
    for (const [module, target] of Object.entries(MODULE_RESOURCES)) {
        await cp(require.resolve(module), join(TARGET_PATH, target));
    }
    for (const [source, target] of Object.entries(LOCAL_RESOURCES)) {
        await cp(join("libs", source), join(TARGET_PATH, target));
    }
});

// XXX Add postprocessing previously done by less-plugin-clean-css.
// XXX Consider going for postcss processing.
gulp.task("build:styles", async () => {
    for (const filename of ["bootstrap/bootstrap.less"]) {
        const source = join(TARGET_PATH, "css", filename);
        const target = join(TARGET_PATH, "css", `${basename(filename, ".less")}.css`);
        const output = await less.render(await readFile(source, "utf-8"));
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, output.css);
    }
});

gulp.task("build", gulp.series(
    gulp.parallel(
        "build:assets",
        "build:scripts",
        "build:libs"
    ),
    ["build:styles"]
));

gulp.task("default", gulp.series("build"));
