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
 * Portions Copyright 2026 Wren Security.
 */

define([
    "lodash",
    "backbone",
    "react",
    "org/forgerock/commons/ui/common/main/Configuration",
    "org/forgerock/commons/ui/common/main/EventManager",
    "org/forgerock/commons/ui/common/util/Constants",
    "ThemeManager",
    "org/forgerock/commons/ui/common/util/UIUtils",
    "org/forgerock/commons/ui/common/util/reactify"
], function(_, Backbone, React, Configuration, EventManager, Constants, ThemeManager, UIUtils, reactify) {
    var BASE_TEMPLATE = "templates/common/DefaultBaseTemplate.html";

    function throwOnNoInitializationOptions (options) {
        if (!options) {
            throw new Error("[ReactAdapterView] No initialization options found.");
        }
    }

    function throwOnNoReactView (options) {
        if (!options.reactView) {
            throw new Error("[ReactAdapterView] No \"reactView\" option found on initialization options.");
        }
    }

    return Backbone.View.extend({
        initialize: function (options) {
            throwOnNoInitializationOptions(options);
            throwOnNoReactView(options);

            this.options = options;

            _.defaults(this.options, {
                reactProps: {},
                needsBaseTemplate: true
            });
        },

        setBaseTemplate: function () {
            Configuration.setProperty("baseTemplate", BASE_TEMPLATE);
            EventManager.sendEvent(Constants.EVENT_CHANGE_BASE_VIEW);
        },

        renderReactComponent () {
            reactify(React.createElement(this.options.reactView, this.options.reactProps), this.$el);
        },

        /**
         * Render the component into a fresh copy of the "#content" element, so that every rendered view is mounted
         * from scratch (the content can be replaced by other views in the meantime).
         */
        renderIntoContent () {
            const content = document.getElementById("content");
            const freshContent = content.cloneNode(false);

            content.parentNode.replaceChild(freshContent, content);
            this.setElement(freshContent);
            this.renderReactComponent();
        },

        /**
         * Unmount the rendered component (runs its cleanup). Rendered content that is still displayed is replaced
         * by its static copy first, so that the page does not go blank until the next view is rendered.
         */
        unmount () {
            // Do not render anymore (base template can still be loading)
            this.unmounted = true;
            if (this.el.isConnected) {
                this.el.parentNode.replaceChild(this.el.cloneNode(true), this.el);
            }
            reactify.unmount(this.$el);
        },

        render () {
            if (!this.options.needsBaseTemplate) {
                this.renderReactComponent();
            } else if (Configuration.baseTemplate === BASE_TEMPLATE) {
                // Base template is already rendered, replace only the content (as AbstractView does)
                this.renderIntoContent();
            } else {
                // Compiled with the same data as AbstractView compiles base templates
                ThemeManager.getTheme().then((theme) => UIUtils.compileTemplate(BASE_TEMPLATE,
                    _.extend({}, Configuration.globalData, { theme }))
                ).then((template) => {
                    // Another view has been rendered in the meantime
                    if (this.unmounted) {
                        return;
                    }
                    document.getElementById("wrapper").innerHTML = template;
                    this.setBaseTemplate();
                    this.renderIntoContent();
                });
            }
        }
    });
});
