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

define(["lodash", "react-dom"], function (_, ReactDOM) {
    // React roots by their container element (root API only)
    const roots = new WeakMap();

    /**
     * Given a component, render it into the given DOM element.
     * <p/>
     * React and React DOM are not provided by this library, the application has to provide them as "react"
     * and "react-dom" modules. React 18 is rendered using the root API (the root is reused when rendering into
     * the same element again), older versions using legacy ReactDOM.render(). React 19 has no UMD builds and its
     * "react-dom" has neither, so the application's "react-dom" module has to export createRoot from
     * "react-dom/client" as well.
     * @exports org/forgerock/commons/ui/common/util/reactify
     * @param  {ReactElement} component The React element to render
     * @param  {jQuery} el A jQuery object containing a collection of DOM elements
     * @return {ReactComponent} Rendered component (legacy render only, undefined with the root API)
     * @example reactify(<Title>My Text</Title>, this.$el.find("[data-title]"));
     */
    const exports = (component, el) => {
        const container = el[0];

        if (_.isFunction(ReactDOM.createRoot)) {
            let root = roots.get(container);
            if (!root) {
                root = ReactDOM.createRoot(container);
                roots.set(container, root);
            }
            root.render(component);
            return undefined;
        }

        if (!_.isFunction(ReactDOM.render)) {
            throw new Error("[reactify] \"react-dom\" module provides neither createRoot() nor render() " +
                "(React 19 requires \"react-dom\" module that exports createRoot from \"react-dom/client\").");
        }

        return ReactDOM.render(component, container);
    };

    /**
     * Unmount the component rendered by reactify from the given DOM element, so that its cleanup (effect cleanups,
     * componentWillUnmount) is run. Does nothing when no component is rendered there.
     * @param  {jQuery} el A jQuery object containing a collection of DOM elements
     * @return {boolean} true if a component was unmounted
     * @example reactify.unmount(this.$el.find("[data-title]"));
     */
    exports.unmount = (el) => {
        const container = el[0];

        if (_.isFunction(ReactDOM.createRoot)) {
            const root = roots.get(container);
            if (!root) {
                return false;
            }
            roots.delete(container);
            root.unmount();
            return true;
        }

        return ReactDOM.unmountComponentAtNode(container);
    };

    return exports;
});
