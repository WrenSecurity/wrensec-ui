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
 * Copyright 2011-2016 ForgeRock AS.
 * Portions Copyright 2026 Wren Security
 */

define([
    "jquery",
    "lodash"
], function($, _) {

    var obj = {},
        eventRegistry = {},
        subscriptions = {},
        whenCompleteWarned = false;

    // Surface handler errors to the global error handler (window.onerror) without
    // aborting dispatch, matching how DOM EventTarget.dispatchEvent reports listener
    // exceptions.
    function reportError (error) {
        window.setTimeout(function () {
            throw error;
        });
    }

    function invokeHandler (handler, event) {
        var deferred = $.Deferred();
        try {
            $.when(handler(event)).then(
                function (value) { deferred.resolve(value); },
                function (error) {
                    reportError(error);
                    deferred.resolve();
                }
            );
        } catch (error) {
            reportError(error);
            deferred.resolve();
        }
        return deferred.promise();
    }

    function deferHandler (handler, event) {
        var deferred = $.Deferred();
        window.setTimeout(function () {
            invokeHandler(handler, event).always(deferred.resolve);
        });
        return deferred.promise();
    }

    /**
     * Dispatch the given event to all registered listeners.
     *
     * Handlers are invoked synchronously by default. Pass `{ async: true }` to defer each
     * handler to the next tick, matching the legacy dispatch behaviour.
     *
     * A handler that throws (or returns a rejected promise) does not abort dispatch;
     * the error is re-thrown asynchronously so it reaches `window.onerror`.
     *
     * @param {string} eventId
     * @param {*} [event]
     * @param {{ async?: boolean }} [options]
     * @returns {Promise} resolved once every handler has settled.
     */
    obj.sendEvent = function (eventId, event, options) {
        const async = !!(options && options.async);
        const results = _.map(eventRegistry[eventId], function (handler) {
            return async ? deferHandler(handler, event) : invokeHandler(handler, event);
        });
        return $.when.apply($, results).then(
            function () {
                if (_.has(subscriptions, eventId)) {
                    const subscription = subscriptions[eventId];
                    delete subscriptions[eventId];
                    subscription.resolve();
                }
            }
        );
    };

    obj.registerListener = function (eventId, callback) {
        if (!_.has(eventRegistry, eventId)) {
            eventRegistry[eventId] = [callback];
        } else {
            eventRegistry[eventId].push(callback);
        }
    };

    obj.unregisterListener = function (eventId, callbackToRemove) {
        if (_.has(eventRegistry, eventId)) {
            if (callbackToRemove !== undefined) {
                eventRegistry[eventId] = _.omitBy(eventRegistry[eventId], function (callback) {
                    return callback === callbackToRemove;
                });
            } else {
                delete eventRegistry[eventId];
            }
        }
    };

    /**
     * Returns a promise that will be resolved the next time the provided eventId has completed processing.
     *
     * @deprecated Await the promise returned by {@link sendEvent} instead.
     */
    obj.whenComplete = function (eventId) {
        if (!whenCompleteWarned) {
            whenCompleteWarned = true;
            console.warn(
                "EventManager.whenComplete is deprecated; await the promise returned by sendEvent instead."
            );
        }
        if (!_.has(subscriptions, eventId)) {
            subscriptions[eventId] = $.Deferred();
        }
        return subscriptions[eventId];
    };

    return obj;
});
