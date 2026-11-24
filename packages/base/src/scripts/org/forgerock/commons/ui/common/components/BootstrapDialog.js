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
 * Copyright 2015-2016 ForgeRock AS.
 * Portions Copyright 2026 Wren Security.
 */

define([
    "lodash",
    "jquery",
    "org/forgerock/commons/ui/common/components/ModalDialog"
], function (_, $, ModalDialog) {

    function forceFocus (dialog) {
        dialog.$modalContent.find("[autofocus]").focus();
    }

    function setButtonStates (dialog) {
        _.each(dialog.options.buttons, function(button) {
            if (button.disabled === true) {
                dialog.getButton(button.id).disable();
            }
        });
    }

    function onShown (event) {
        forceFocus(event.data.dialog);
        setButtonStates(event.data.dialog);
    }

    /**
     * Modal dialog with commons specific enhancements (header text color by dialog type, autofocus support and
     * initially disabled buttons).
     * @exports org/forgerock/commons/ui/common/components/BootstrapDialog
     * @see org/forgerock/commons/ui/common/components/ModalDialog
     */
    var obj = {};

    obj.TYPE_DEFAULT = ModalDialog.TYPE_DEFAULT;
    obj.TYPE_INFO = ModalDialog.TYPE_INFO;
    obj.TYPE_PRIMARY = ModalDialog.TYPE_PRIMARY;
    obj.TYPE_SUCCESS = ModalDialog.TYPE_SUCCESS;
    obj.TYPE_WARNING = ModalDialog.TYPE_WARNING;
    obj.TYPE_DANGER = ModalDialog.TYPE_DANGER;
    obj.SIZE_NORMAL = ModalDialog.SIZE_NORMAL;
    obj.SIZE_SMALL = ModalDialog.SIZE_SMALL;
    obj.SIZE_WIDE = ModalDialog.SIZE_WIDE;
    obj.SIZE_LARGE = ModalDialog.SIZE_LARGE;

    /**
     * Create and open a dialog.
     * @param {Object} options dialog options (see ModalDialog)
     * @param {boolean} [options.buttons[].disabled] whether the button is initially disabled
     * @returns {ModalDialog} opened dialog
     */
    obj.show = function (options) {
        var dialog = new ModalDialog(options).realize(),
            type = dialog.options.type;

        // Gives the dialog header the native bootstrap text color classes.
        // The title then inherits from this.
        dialog.getModalHeader().addClass(type.replace("type", "text"));

        /**
         * Workaround for autofocus having no effect in Bootstrap modals
         * @see http://getbootstrap.com/javascript/#modals
         */
        dialog.getModal().on("shown.bs.modal", { dialog: dialog }, onShown);

        return dialog.open();
    };

    /**
     * Create and open a confirmation dialog with cancel and confirm buttons.
     * @param {Object} options dialog options
     * @param {string} [options.type] dialog type (defaults to TYPE_PRIMARY)
     * @param {string} [options.title] dialog title
     * @param {string|jQuery} [options.message] dialog message
     * @param {boolean} [options.closable] whether the dialog can be closed without choosing (defaults to false)
     * @param {string} [options.btnCancelLabel] cancel button label (defaults to common.form.cancel translation)
     * @param {string} [options.btnOKLabel] confirm button label (defaults to common.form.ok translation)
     * @param {string} [options.btnOKClass] confirm button CSS class (defaults to button class by dialog type)
     * @param {function} [options.callback] called with true when confirmed and false when cancelled
     * @returns {ModalDialog} opened dialog
     */
    obj.confirm = function (options) {
        var type = options.type || obj.TYPE_PRIMARY;

        function choose (dialog, result) {
            if (_.isFunction(options.callback)) {
                options.callback(result);
            }
            dialog.close();
        }

        return obj.show({
            type: type,
            title: options.title,
            message: options.message,
            closable: options.closable === true,
            buttons: [{
                label: options.btnCancelLabel || $.t("common.form.cancel"),
                action: function (dialog) {
                    choose(dialog, false);
                }
            }, {
                label: options.btnOKLabel || $.t("common.form.ok"),
                cssClass: options.btnOKClass || type.replace("type", "btn"),
                action: function (dialog) {
                    choose(dialog, true);
                }
            }]
        });
    };

    return obj;
});
