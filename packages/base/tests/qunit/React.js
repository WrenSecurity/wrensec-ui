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
    "org/forgerock/commons/ui/common/components/hoc/withRouter",
    "org/forgerock/commons/ui/common/main/Router",
    "org/forgerock/commons/ui/common/util/reactify"
], function ($, sinon, React, ReactDOM, withRouter, Router, reactify) {
    const h = React.createElement;
    let $container;

    // Root API renders asynchronously, flushSync makes the result available immediately
    const render = (element) => ReactDOM.flushSync(() => reactify(element, $container));

    QUnit.module("React integration", {
        beforeEach () {
            $container = $("<div></div>").appendTo("#qunit-fixture");
        },
        afterEach () {
            reactify.unmount($container);
            $container.remove();
        }
    });

    QUnit.test("reactify renders into the element and reuses the root", (assert) => {
        const createRoot = sinon.spy(ReactDOM, "createRoot");

        try {
            const result = render(h("span", { className: "value" }, "first"));

            assert.equal(result, undefined, "root API does not return the rendered component");
            assert.equal($container.text(), "first");

            render(h("span", { className: "value" }, "second"));

            assert.equal($container.text(), "second", "element is updated");
            assert.equal($container.find(".value").length, 1, "previous content is replaced");
            assert.true(createRoot.calledOnce, "root is reused");

            render(null);

            assert.equal($container.html(), "", "rendering null clears the element");
        } finally {
            createRoot.restore();
        }
    });

    QUnit.test("reactify.unmount runs cleanup and releases the root", (assert) => {
        const cleanup = sinon.spy();
        const Component = () => {
            React.useEffect(() => cleanup, []);
            return h("span", null, "mounted");
        };

        render(h(Component));
        assert.equal($container.text(), "mounted");

        assert.true(reactify.unmount($container), "component is unmounted");
        assert.true(cleanup.calledOnce, "effect cleanup is run");
        assert.equal($container.html(), "", "element is cleared");
        assert.false(reactify.unmount($container), "nothing to unmount anymore");

        render(h("span", null, "again"));
        assert.equal($container.text(), "again", "new root is created after unmount");
    });

    QUnit.test("reactify fails clearly without createRoot and render (React 19 react-dom)", (assert) => {
        const { createRoot, render: legacyRender } = ReactDOM;

        delete ReactDOM.createRoot;
        delete ReactDOM.render;
        try {
            assert.throws(() => reactify(h("span"), $container), /neither createRoot\(\) nor render\(\)/);
        } finally {
            ReactDOM.createRoot = createRoot;
            ReactDOM.render = legacyRender;
        }
    });

    QUnit.test("withRouter provides decoded router parameters", (assert) => {
        const Inner = ({ label, router }) => h("span", null, `${label}:${JSON.stringify(router.params)}`);
        const stubs = [
            sinon.stub(Router, "getURIFragment").returns("example/a%20b"),
            sinon.stub(Router, "extractParameters").returns(["a%20b", undefined]),
            sinon.stub(Router, "applyDefaultParameters").callsFake((route, params) => [params[0], null])
        ];

        Inner.displayName = "Inner";
        const Wrapped = withRouter(Inner);

        try {
            assert.equal(Wrapped.displayName, "withRouter(Inner)");
            assert.strictEqual(Wrapped.WrappedComponent, Inner);

            render(h(Wrapped, { label: "props" }));

            assert.equal($container.text(), "props:[\"a b\",\"\"]", "props are passed and parameters decoded");
        } finally {
            stubs.forEach((stub) => stub.restore());
        }
    });
});
