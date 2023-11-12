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

const TARGET_PATH = "target/www";

gulp.task("eslint", () => gulp.src("src/main/js/**/*.js")
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError()));

gulp.task("build:assets", () => gulp.src("src/main/resources/**")
    .pipe(gulp.dest(TARGET_PATH)) );

gulp.task("build:scripts", () => gulp.src("src/main/js/**")
    .pipe(gulp.dest(TARGET_PATH)));

gulp.task("build", gulp.parallel("build:assets", "build:scripts"));

gulp.task("default", gulp.series("build"));
