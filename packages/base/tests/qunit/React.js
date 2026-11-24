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
    "org/forgerock/commons/ui/common/main/Configuration",
    "org/forgerock/commons/ui/common/main/ReactAdapterView",
    "org/forgerock/commons/ui/common/main/Router",
    "org/forgerock/commons/ui/common/main/ViewManager",
    "org/forgerock/commons/ui/common/util/ModuleLoader",
    "org/forgerock/commons/ui/common/util/reactify",
    "org/forgerock/commons/ui/common/util/UIUtils",
    "ThemeManager"
], function ($, sinon, React, ReactDOM, withRouter, Configuration, ReactAdapterView, Router, ViewManager,
        ModuleLoader, reactify, UIUtils, ThemeManager) {
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

    QUnit.module("React views", {
        beforeEach () {
            this.baseTemplate = Configuration.baseTemplate;
            const { currentView, currentViewArgs, currentReactAdapter } = ViewManager;
            this.viewManagerState = { currentView, currentViewArgs, currentReactAdapter };
            // Base template is already rendered, so that React views render into "#content" right away
            Configuration.baseTemplate = "templates/common/DefaultBaseTemplate.html";
            $("#wrapper").html("<div id='content'></div>");
        },
        afterEach () {
            if (ViewManager.currentReactAdapter) {
                ViewManager.currentReactAdapter.unmount();
            }
            Object.assign(ViewManager, this.viewManagerState);
            Configuration.baseTemplate = this.baseTemplate;
        }
    });

    // Wait (up to 1 second) until the condition is met
    const waitFor = async (condition) => {
        for (let i = 0; i < 100 && !condition(); i++) {
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
        return condition();
    };

    // Component that counts its mounted instances
    const createCounted = (label) => {
        const Component = () => {
            React.useEffect(() => {
                Component.mounted++;
                return () => Component.mounted--;
            }, []);
            return h("span", { className: "view" }, label);
        };
        Component.mounted = 0;
        return Component;
    };

    QUnit.test("ReactAdapterView.unmount runs cleanup and keeps a static copy of the content", (assert) => {
        const View = createCounted("first");
        const adapter = new ReactAdapterView({ reactView: View });

        ReactDOM.flushSync(() => adapter.render());
        const mountedContent = document.getElementById("content");
        assert.equal(View.mounted, 1, "view is mounted");

        adapter.unmount();

        assert.equal(View.mounted, 0, "view cleanup is run");
        assert.notStrictEqual(document.getElementById("content"), mountedContent, "content is replaced");
        assert.equal($("#content").text(), "first", "static copy of the content is displayed");
        assert.equal(mountedContent.innerHTML, "", "unmounted content is cleared");
    });

    QUnit.test("ViewManager unmounts the previous React view", async (assert) => {
        const First = createCounted("first");
        const Second = createCounted("second");
        const views = { first: First, second: Second };

        sinon.stub(ModuleLoader, "load").callsFake((path) => $.Deferred().resolve(views[path]));
        try {
            ViewManager.changeView("first", []);
            assert.true(await waitFor(() => First.mounted === 1), "first view is mounted");

            ViewManager.changeView("second", []);
            assert.true(await waitFor(() => Second.mounted === 1), "second view is mounted");
            assert.equal(First.mounted, 0, "first view is unmounted");
            assert.equal($("#content").text(), "second");
        } finally {
            ModuleLoader.load.restore();
        }
    });

    QUnit.test("ViewManager rebinds only views that support it", async (assert) => {
        const ReactView = createCounted("react");
        const backboneView = { render () {}, rebind: sinon.spy() };
        const views = { react: ReactView, backbone: backboneView, esm: { __esModule: true, "default": backboneView } };

        sinon.stub(ModuleLoader, "load").callsFake((path) => $.Deferred().resolve(views[path]));
        try {
            ViewManager.currentView = "react";
            ViewManager.currentViewArgs = [];
            const callback = sinon.spy();
            ViewManager.changeView("react", [], callback);
            assert.true(await waitFor(() => callback.calledOnce), "callback is called for unchanged React view");

            await ViewManager.rebindView("backbone");
            await ViewManager.rebindView("esm");
            assert.equal(backboneView.rebind.callCount, 2, "Backbone views (also as ES module) are rebound");
        } finally {
            ModuleLoader.load.restore();
        }
    });

    QUnit.test("ReactAdapterView does not render after unmount while base template loads", async (assert) => {
        const View = createCounted("late");
        const template = $.Deferred();
        // ThemeManager.getTheme is stubbed by the test runner
        const theme = await ThemeManager.getTheme();
        const stubs = [sinon.stub(UIUtils, "compileTemplate").returns(template)];
        const globalData = Configuration.globalData;

        Configuration.globalData = { product: "test" };
        Configuration.baseTemplate = "templates/common/LoginBaseTemplate.html";
        try {
            const adapter = new ReactAdapterView({ reactView: View });
            adapter.render();
            assert.true(await waitFor(() => UIUtils.compileTemplate.calledOnce), "base template is compiled");
            assert.deepEqual(UIUtils.compileTemplate.firstCall.args[1], { product: "test", theme },
                "base template is compiled with global data and theme");

            adapter.unmount();
            template.resolve("<div id='content'>base</div>");
            await waitFor(() => false);

            assert.equal($("#wrapper").text(), "", "base template is not rendered");
            assert.equal(View.mounted, 0, "view is not mounted");
        } finally {
            stubs.forEach((stub) => stub.restore());
            Configuration.globalData = globalData;
        }
    });
});
