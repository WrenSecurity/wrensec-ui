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
 * Copyright 2026 Wren Security.
 */

define([
    "jquery",
    "sinon",
    "react",
    "react-dom",
    "org/forgerock/commons/ui/common/main/Router",
    "org/forgerock/commons/ui/common/util/reactify",
    "org/forgerock/mock/ui/react/ReactExampleView"
], ($, sinon, React, ReactDOM, Router, reactify, ReactExampleView) => {
    let $container;
    let stubs;

    const render = (element) => ReactDOM.flushSync(() => reactify(element, $container));

    QUnit.module("ReactExampleView (ES module)", {
        beforeEach () {
            $container = $("<div></div>").appendTo("#qunit-fixture");
            stubs = [
                sinon.stub(Router, "getURIFragment").returns("react/Wren"),
                sinon.stub(Router, "extractParameters").returns(["Wren"]),
                sinon.stub(Router, "applyDefaultParameters").callsFake((route, params) => params)
            ];
        },
        afterEach () {
            render(null);
            $container.remove();
            stubs.forEach((stub) => stub.restore());
        }
    });

    QUnit.test("is transpiled to AMD module with default export", (assert) => {
        assert.true(ReactExampleView.__esModule, "module is marked as transpiled ES module");
        assert.equal(ReactExampleView.default.displayName, "withRouter(ReactExample)");
    });

    QUnit.test("renders route parameter and updates state", (assert) => {
        render(React.createElement(ReactExampleView.default));

        assert.equal($container.find("#reactExampleParam").text(), "Wren", "route parameter is rendered");

        ReactDOM.flushSync(() => $container.find("#reactExampleCounter")[0].click());

        assert.equal($container.find("#reactExampleCounter").text(), "Clicked 1 times", "state is updated");
    });
});
