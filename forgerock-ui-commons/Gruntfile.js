/**
 * The contents of this file are subject to the terms of the Common Development and
 * Distribution License (the License). You may not use this file except in compliance with the
 * License.
 *
 * You can obtain a copy of the License at legal/CDDLv1.0.txt. See the License for the
 * specific language governing permission and limitations under the License.
 *
 * When distributing Covered Software, include this CDDL Header Notice in each file and include
 * the License file at legal/CDDLv1.0.txt. If applicable, add the following below the CDDL
 * Header, with the fields enclosed by brackets [] replaced by your own identifying
 * information: "Portions copyright [year] [name of copyright owner]".
 *
 * Copyright 2016 ForgeRock AS.
 */

module.exports = function (grunt) {
    grunt.loadNpmTasks("grunt-eslint");
    grunt.loadNpmTasks('grunt-contrib-copy');

    grunt.initConfig({
        eslint: {
            /**
             * Check the JavaScript source code for common mistakes and style issues.
             */
            lint: {
                src: [
                    "src/main/js/**/*.js"
                    //"src/test/js/**/*.js"
                ],
                options: {
                    format: require.resolve("eslint-formatter-warning-summary")
                }
            }
        },
        copy: {
            main: {
                files: [
                    // JS - npm
                    { src: "node_modules/backbone/backbone-min.js", dest: "dist/libs/backbone-1.1.2-min.js" },
                    { src: "node_modules/backbone-relational/backbone-relational.js", dest: "dist/libs/backbone-relational-0.9.0-min.js" }, // Not actually minified
                    { src: "node_modules/backbone.paginator/lib/backbone.paginator.min.js", dest: "dist/libs/backbone.paginator-2.0.2-min.js" },
                    { src: "node_modules/backgrid/lib/backgrid.min.js", dest: "dist/libs/backgrid-0.3.5-min.js" },
                    { src: "node_modules/backgrid-filter/backgrid-filter.min.js", dest: "dist/libs/backgrid-filter-0.3.7-min.js" },
                    { src: "node_modules/backgrid-paginator/backgrid-paginator.min.js", dest: "dist/libs/backgrid-paginator-0.3.5-min.js" },
                    { src: "node_modules/backgrid-select-all/backgrid-select-all.min.js", dest: "dist/libs/backgrid-select-all-0.3.5-min.js" },
                    { src: "node_modules/dragula/dist/dragula.min.js", dest: "dist/libs/dragula-3.6.7-min.js" },
                    { src: "node_modules/i18next/lib/dep/i18next.min.js", dest: "dist/libs/i18next-1.7.3-min.js" },
                    { src: "node_modules/jquery/dist/jquery.min.js", dest: "dist/libs/jquery-2.1.1-min.js" },
                    { src: "node_modules/moment/min/moment.min.js", dest: "dist/libs/moment-2.8.1-min.js" },
                    { src: "node_modules/requirejs/require.js", dest: "dist/libs/requirejs-2.1.14-min.js" }, // Not actually minified
                    { src: "node_modules/selectize/dist/js/selectize.min.js", dest: "dist/libs/selectize-0.12.1-min.js" },
                    { src: "node_modules/spin.js/spin.js", dest: "dist/libs/spin-2.0.1-min.js" }, // Not actually minified
                    { src: "node_modules/xdate/src/xdate.js", dest: "dist/libs/xdate-0.8-min.js" }, // Not actually minified
                    { src: "node_modules/react/dist/react.min.js", dest: "dist/libs/react-15.2.1-min.js" },
                    { src: "node_modules/react-dom/dist/react-dom.min.js", dest: "dist/libs/react-dom-15.2.1-min.js" },
                    { src: "node_modules/handlebars/dist/handlebars.js", dest: "dist/libs/handlebars-4.0.5.js" }, // Not mified but could be

                    // JS - custom
                    { src: "libs/js/bootstrap-3.3.5-custom.js", dest: "dist/libs/bootstrap-3.3.5-custom.js" },
                    { src: "libs/js/bootstrap-dialog-1.34.4-min.js", dest: "dist/libs/bootstrap-dialog-1.34.4-min.js" },
                    { src: "libs/js/form2js-2.0-769718a.js", dest: "dist/libs/form2js-2.0-769718a.js" },
                    { src: "libs/js/jquery.ba-dotimeout-1.0-min.js", dest: "dist/libs/jquery.ba-dotimeout-1.0-min.js" },
                    { src: "libs/js/jquery.placeholder-2.0.8.js", dest: "dist/libs/jquery.placeholder-2.0.8.js" },
                    { src: "libs/js/js2form-2.0-769718a.js", dest: "dist/libs/js2form-2.0-769718a.js" },
                    { src: "libs/js/lodash-3.10.1-min.js", dest: "dist/libs/lodash-3.10.1-min.js" },

                    // CSS - npm
                    { src: "node_modules/backgrid/lib/backgrid.min.css", dest: "dist/css/backgrid-0.3.5-min.css" },
                    { src: "node_modules/backgrid-filter/backgrid-filter.css", dest: "dist/css/backgrid-filter-0.3.7-min.css" },
                    { src: "node_modules/backgrid-paginator/backgrid-paginator.min.css", dest: "dist/css/backgrid-paginator-0.3.5-min.css" },
                    { src: "node_modules/selectize/dist/css/selectize.bootstrap3.css", dest: "dist/css/selectize-0.12.1-bootstrap3.css" },
                    { src: "node_modules/titatoggle/dist/titatoggle-dist-min.css", dest: "dist/css/titatoggle-1.2.6-min.css" }, // Actually 1.2.15

                    // CSS - custom
                    { src: "libs/css/bootstrap-3.3.5-custom.css", dest: "dist/css/bootstrap-3.3.5-custom.css" },
                    { src: "libs/css/bootstrap-dialog-1.34.4-min.css", dest: "dist/css/bootstrap-dialog-1.34.4-min.css" },

                    // Fontawesome
                    { src: "node_modules/font-awesome/css/font-awesome.min.css", dest: "dist/css/fontawesome/css/font-awesome.min.css" },
                    { src: "node_modules/font-awesome/less/variables.less", dest: "dist/css/fontawesome/less/variables.less" },
                    { expand: true, flatten: true, src: "node_modules/font-awesome/fonts/*", dest: "dist/css/fontawesome/fonts/" },
                ],
            },
        },
    });

    grunt.registerTask("build", ["eslint", "copy"]);
    grunt.registerTask("default", "build");
};
