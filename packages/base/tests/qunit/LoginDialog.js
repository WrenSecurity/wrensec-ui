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
    "org/forgerock/commons/ui/common/LoginDialog",
    "org/forgerock/commons/ui/common/main/Configuration",
    "org/forgerock/commons/ui/common/main/EventManager",
    "org/forgerock/commons/ui/common/main/SessionManager",
    "org/forgerock/commons/ui/common/util/UIUtils"
], function ($, sinon, LoginDialog, Configuration, EventManager, SessionManager, UIUtils) {
    let sandbox,
        login;

    /** Wait until the login dialog (animated) is shown. */
    function whenShown () {
        return new Promise(function (resolve) {
            (function check () {
                if (LoginDialog.dialog && LoginDialog.dialog.state === "shown") {
                    resolve(LoginDialog.dialog);
                } else {
                    window.setTimeout(check, 10);
                }
            }());
        });
    }

    QUnit.module("LoginDialog", {
        beforeEach () {
            sandbox = sinon.createSandbox();
            login = sandbox.stub(SessionManager, "login");
            sandbox.stub(EventManager, "sendEvent");
            sandbox.stub(Configuration, "setProperty");
            sandbox.stub(UIUtils, "renderTemplate").callsFake(function (template, $el, data, callback) {
                $el.html('<form><input name="login"><input name="password" type="password"></form>');
                callback();
            });
        },
        afterEach () {
            sandbox.restore();
            $(".modal-backdrop").remove();
            $(document.body).removeClass("modal-open").css({ "overflow": "", "padding-right": "" });
        }
    });

    QUnit.test("keeps shown dialog when rendered again", async function (assert) {
        const firstCallback = sinon.spy(),
            secondCallback = sinon.spy();

        LoginDialog.render({ authenticatedCallback: firstCallback });
        const dialog = await whenShown();
        LoginDialog.render({ authenticatedCallback: secondCallback });

        assert.strictEqual(LoginDialog.dialog, dialog, "shown dialog is kept");
        assert.equal($(".modal.show").length, 1, "single dialog is shown");

        dialog.$body.find("input[name=login]").val("user");
        dialog.$body.find("input[name=password]").val("secret");
        login.callsFake(function (credentials, successCallback) {
            successCallback({});
        });
        $("#loginDialogSubmitButton").trigger("click");

        assert.deepEqual(login.firstCall.args[0], { userName: "user", password: "secret" }, "credentials");
        assert.ok(firstCallback.calledOnce, "first callback is called");
        assert.ok(secondCallback.calledOnce, "second callback is called");
        await dialog.hide();
        assert.equal($(".modal").length, 0, "dialog is removed");
    });
});
