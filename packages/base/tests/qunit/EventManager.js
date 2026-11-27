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
    "org/forgerock/commons/ui/common/main/EventManager"
], function ($, EventManager) {
    const EVENT_ID = "qunit.eventManager.test";

    let originalSetTimeout,
        reported,
        handlers;

    QUnit.module("EventManager", {
        beforeEach () {
            reported = [];
            handlers = [];
            // Handler errors are re-thrown from window.setTimeout; capture them instead.
            originalSetTimeout = window.setTimeout;
            window.setTimeout = function (callback) {
                try {
                    callback();
                } catch (error) {
                    reported.push(error);
                }
            };
        },
        afterEach () {
            window.setTimeout = originalSetTimeout;
            handlers.forEach((handler) => EventManager.unregisterListener(EVENT_ID, handler));
        }
    });

    function register (handler) {
        handlers.push(handler);
        EventManager.registerListener(EVENT_ID, handler);
    }

    QUnit.test("does not report promises rejected with a reason", async function (assert) {
        let called = false;
        register(() => $.Deferred().reject("authenticationFailed").promise());
        register(() => { called = true; });

        await EventManager.sendEvent(EVENT_ID);

        assert.true(called, "dispatch continues to later handlers");
        assert.deepEqual(reported, [], "no error is reported");
    });

    QUnit.test("reports promises rejected with an Error", async function (assert) {
        const error = new Error("failure");
        register(() => $.Deferred().reject(error).promise());

        await EventManager.sendEvent(EVENT_ID);

        assert.deepEqual(reported, [error]);
    });

    QUnit.test("reports errors thrown by handlers", async function (assert) {
        const error = new Error("failure");
        let called = false;
        register(() => { throw error; });
        register(() => { called = true; });

        await EventManager.sendEvent(EVENT_ID);

        assert.true(called, "dispatch continues to later handlers");
        assert.deepEqual(reported, [error]);
    });
});
