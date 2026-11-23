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
    "sinon",
    "org/forgerock/commons/ui/common/main/i18nManager",
    "org/forgerock/commons/ui/common/util/CookieHelper"
], (sinon, i18nManager, CookieHelper) => {
    /**
     * Resolve the language selected by i18nManager.init. The current language is set to the expected one, so that
     * init returns right after selecting the language (without reinitializing i18next).
     */
    const selectLanguage = (expected, locale, cookie) => {
        const options = { paramLang: { locale }, serverLang: "en", defaultLang: "en" };
        const getCookie = sinon.stub(CookieHelper, "getCookie");
        getCookie.withArgs("i18next").returns(cookie);
        const lang = i18nManager.lang;

        i18nManager.lang = expected;
        try {
            i18nManager.init(options);
        } finally {
            i18nManager.lang = lang;
            getCookie.restore();
        }
        return options.serverLang;
    };

    QUnit.module("i18nManager");

    QUnit.test("language is selected from parameter, cookie or server", (assert) => {
        assert.equal(selectLanguage("de", "de fr", "cs"), "de", "parameter wins over cookie");
        assert.equal(selectLanguage("cs", "<script>", "cs"), "cs", "invalid parameter falls back to cookie");
        assert.equal(selectLanguage("cs", "", "cs"), "cs", "missing parameter falls back to cookie");
        assert.equal(selectLanguage("en", "../x", "../y"), "en", "invalid values fall back to server language");
    });
});
