/**********************************************************************
 * Copyright 2012 CyberSource Corporation.  All rights reserved.
 **********************************************************************/

var MATCH_X_CHARACTERS=new RegExp('x', 'g');

var supported_cards = {"001":{"cvn_display":true,"cvn_required":true,"jpo_enabled":false},"002":{"cvn_display":true,"cvn_required":true,"jpo_enabled":false}};
var ranked_card_types = ["001","002"];
var card_detection_available = false;

var mask_sensitive_account_data = false;
var always_display_cvn = true;
var always_require_cvn = true;

var card_number_orig = "";
var card_cvn_orig = "";

var echeck_enabled = true;
var echeck_account_number_orig = "";
var echeck_routing_number_orig = "";

var currency = "QAR";

var card_type_presence_params = { failureMessage: "Cardholder Name  is a required field" };
var t = {
    'card_type': 'Card Type',
    'supported_cards_more': 'More',
    'supported_cards_less': 'Less',
    errors: {
        'card_number_required': 'Card number is a required field',
        'card_number_invalid': 'Enter a valid card number'
    }
};
var card_brand_names = {"001":"Visa","002":"Mastercard"};


var card_expiry_year_validator;
var card_expiry_month_validator;
var card_number_validator;
var card_cvn_validator;
var card_cvn_presence_validator_params;
var card_cvn_length_validator_params;
var card_type_validator_radio_buttons = {};
var card_type_validator_drop_down;

if(echeck_enabled){
    var echeckFields;
    var echeck_routing_number_validator;
    var echeck_account_number_validator;
    var echeck_check_number_validator;
    var echeck_account_type_validator;
    var date_of_birth_month_validator;
    var date_of_birth_day_validator;
    var date_of_birth_year_validator;
    var driver_license_number_validator;
    var driver_license_state_validator;
    var company_tax_id_validator;
}

function strip_spaces(input){
    return input.replace(/\s+/g, '');
}

function checkLuhn(input) {
    if(input===card_number_orig || input===card_number_orig.replace(MATCH_X_CHARACTERS,'•')){
        return true;
    }
    input = strip_spaces(input);
    if (input == '') {
        return false;
    } else {
        var sum = 0;
        var numdigits = input.length;
        var parity = numdigits % 2;
        for (var i = 0; i < numdigits; i++) {
            var digit = parseInt(input.charAt(i));
            if (i % 2 == parity) digit *= 2;
            if (digit > 9) digit -= 9;
            sum += digit;
        }
        return (sum % 10) == 0;
    }
}

function validate_expiry_date() {
    date = new Date();
    current_year = date.getFullYear();
    current_month = date.getMonth() + 1;
    expiry_month = $('#card_expiry_month').val();
    expiry_year = $('#card_expiry_year').val();

    if (isBlank(expiry_month) || isBlank(expiry_year)) {
        return false;
    } else {
        return !(parseInt(expiry_year) < current_year || (parseInt(expiry_year) == (current_year) && parseInt(expiry_month, 10) < current_month));
    }
}

function validate_date_of_birth() {
    dob_day = $('#dob_day').val();
    dob_month = $('#dob_month').val();
    dob_year = $('#dob_year').val();
    return isNotBlank(dob_day) && isNotBlank(dob_month) && isNotBlank(dob_year)
}

function isBlank(value) {
    return value == null || (typeof value === 'string' && value.replace(/^\s+|\s+$/gm,'').length < 1);
}
function isNotBlank(value) {
    return !isBlank(value);
}

function getCurrentCardType() {
    return card_detection_available ? $('#c-d-card-type').val() : ($('#card_type').val() || $('[name="card_type"]:checked').val());
}

function set_cvn_display(card_type) {
    $('#card_cvn').attr('maxlength', (isBlank(card_type) || card_type === '003') ? 4 : 3);

    card_cvn_validator.removeByFunction(Validate.Custom);
    if (always_display_cvn || isNotBlank(card_type) && (supported_cards[card_type].cvn_display || supported_cards[card_type].cvn_required)) {
        if (card_cvn_length_validator_params === undefined) {
            card_cvn_length_validator_params = {
                against: function (value, args) {
                    if (card_cvn_orig != value && card_cvn_orig.replace(MATCH_X_CHARACTERS,'•') != value) {
                        var cardType = getCurrentCardType();

                        if (isNotBlank(cardType)) {
                            return (cardType === '003' ? /^\d{4}$/ : /^\d{3}$/).test(value);
                        } else {
                            return (/^\d{3,4}$/).test(value);
                        }
                    } else {
                        return true;
                    }
                },
                failureMessage: "Enter a valid CVN"
            };
        }
        card_cvn_validator.add(Validate.Custom, card_cvn_length_validator_params);
        $('#card_cvn_line').show();
    } else {
        $('#card_cvn_line').hide();
        card_cvn_validator.removeMessageAndFieldClass();
    }
}

function set_cvn_required(card_type) {
    card_cvn_validator.removeByFunction(Validate.Presence);
    if (always_require_cvn || (isNotBlank(card_type) && supported_cards[card_type].cvn_required)) {
        if (card_cvn_presence_validator_params === undefined) {
            card_cvn_presence_validator_params = { failureMessage: "CVN is a required field" };
        }
        card_cvn_validator.add(Validate.Presence, card_cvn_presence_validator_params);
        $('#card_cvn_line label').text("CVN *");
        $('#card_cvn').attr('aria-required', 'true');
    } else {
        card_cvn_validator.removeMessageAndFieldClass();
        $('#card_cvn_line label').text("CVN");
        $('#card_cvn').attr('aria-required', 'false');
    }
}

function set_jpo_method_display(card_type, reset) {

    if (supported_cards[card_type] != null && supported_cards[card_type].jpo_enabled) {
        $('#jpo_payment_method').prop('disabled', false);
        $('#jpo_payment_methods_container').fadeIn();
        if (reset) {
            $('#jpo_payment_method').prop("selectedIndex", -1);
            $('#jpo_payment_method').trigger("liszt:updated");
        }
    } else {
        $('#jpo_payment_methods_container').hide();
        $('#jpo_installments_container').hide();
        $('#jpo_payment_method').prop('disabled', true);
        $('#jpo_installments').prop('disabled', true);
    }
}

function set_jpo_installments(installments) {
    if (installments == 4) {
        $('#jpo_installments').prop('disabled', false);
        $('#jpo_installments_container').fadeIn();
    } else {
        $('#jpo_installments_container').hide();
        $('#jpo_installments').prop("selectedIndex", 0);
        $('#jpo_installments').trigger("liszt:updated");
        $('#jpo_installments').prop('disabled', true);

    }
}

function initialize_card() {
    if (card_cvn_validator === undefined) {
        card_cvn_validator = new LiveValidation('card_cvn', {
            onlyOnBlur: true,
            messageElementId: 'card_cvn_error',
            insertAfterWhatNode: 'iw-card_cvn'
        });
    }

    card_cvn_validator.enable();

    if (!card_detection_available) {
        if ($("input[name='card_type']").length > 0) {
            set_cvn_display($('input:radio[name=card_type]:checked').val());
            set_cvn_required($('input:radio[name=card_type]:checked').val());
            set_jpo_method_display($('input:radio[name=card_type]:checked').val(), false);
            set_jpo_installments($('#jpo_payment_method').val());
            $('input:radio[name=card_type]').click(function (event) {
                set_cvn_display($(this).val());
                set_cvn_required($(this).val());
                set_jpo_method_display($(this).val(), true);
            });

            $('#jpo_payment_method').change(function () {
                set_jpo_installments($(this).val());
            });

            $("input[name='card_type']").each(function () {
                if (!card_type_validator_radio_buttons.hasOwnProperty(this.id)) {
                    card_type_validator_radio_buttons[this.id] = new LiveValidation(this, {
                        messageElementId: 'card_type_error',
                        insertAfterWhatNode: 'card_type_selection',
                        nodeToMark: 'card_type_selection'
                    });
                    card_type_validator_radio_buttons[this.id].enable();
                    card_type_validator_radio_buttons[this.id].add(Validate.Presence, card_type_presence_params);
                } else {
                    card_type_validator_radio_buttons[this.id].enable();
                }
            });
        } else {
            if (card_type_validator_drop_down === undefined) {
                card_type_validator_drop_down = new LiveValidation('card_type', {
                    messageElementId: 'card_type_error',
                    insertAfterWhatNode: 'card_type',
                    nodeToMark: 'card_type'
                });
                card_type_validator_drop_down.enable();
                card_type_validator_drop_down.add(Validate.Presence, card_type_presence_params);
            } else {
                card_type_validator_drop_down.enable();
            }

            set_cvn_display($('#card_type option:selected').val());
            set_cvn_required($('#card_type option:selected').val());
            set_jpo_method_display($('input:radio[name=card_type]:checked').val(), false);
            $('#card_type').change(function () {
                set_cvn_display($(this).val());
                set_cvn_required($(this).val());
                set_jpo_method_display($(this).val());
            });

            $('#jpo_payment_method').change(function () {
                set_jpo_installments($(this).val());
            });
        }

        var $cardNumber = $('#card_number');
        if (card_number_validator === undefined) {
            card_number_validator = new LiveValidation('card_number', {
                onlyOnBlur: true,
                messageElementId: 'card_number_error',
                insertAfterWhatNode: 'iw-card_number'
            });

            card_number_validator.add(Validate.Presence, { failureMessage: "Card number is a required field" });
            card_number_validator.add(Validate.Length, {  minimum: 9, tooShortMessage: "Enter a valid card number" });
            card_number_validator.add(Validate.Custom, {  against: function (value, args) {
                if (card_number_orig != value) {
                    return checkLuhn(value)
                } else {
                    return true;
                }
            },
                failureMessage: "Enter a valid card number"
            });

            card_number_validator.add(Validate.Custom, {  against: function (value, args) {
                var cardNumberStripped = $cardNumber.val().replace(/\s+/g, '');
                return cardNumberStripped.length <= 20;
            },
                failureMessage: "Enter a valid card number"
            });
        }

        card_number_validator.enable();
    }


    if ($('jpo_payment_method').length) {
        var jpo_payment_method_validator = new LiveValidation('jpo_payment_method', {
            onlyOnBlur: true,
            messageElementId: 'jpo_payment_method_error',
            insertAfterWhatNode: 'jpo_payment_method',
            nodeToMark: 'jpo_payment_method'
        });
        jpo_payment_method_validator.add(Validate.Presence, { failureMessage: "Payment option is a required field" });
    }

    if (card_expiry_month_validator === undefined) {
        card_expiry_month_validator = new LiveValidation('card_expiry_month', {
            onlyOnBlur: true,
            messageElementId: 'card_expiry_date_error',
            insertAfterWhatNode: 'card_expiry_date',
            nodeToMark: 'card_expiry_month',
            doOnBlur:function (e) {
                this.focused = false;
                setTimeout(function () {
                    if (!$(':focus').hasClass('field-card_expiry_date')) {
                        card_expiry_month_validator.validate(e);
                        card_expiry_year_validator.validate(e);
                    }
                }, 1);
            }
        });
        card_expiry_month_validator.add(Validate.Presence, { failureMessage: "Enter a valid expiry date" });
        card_expiry_month_validator.add(Validate.Custom, {
            against: function (value, args) {
                return validate_expiry_date();
            },
            failureMessage: "Enter a valid expiry date"
        });
    }
    card_expiry_month_validator.enable();

    if (card_expiry_year_validator === undefined) {
        card_expiry_year_validator = new LiveValidation('card_expiry_year', {
            onlyOnBlur: true,
            messageElementId: 'card_expiry_date_error',
            insertAfterWhatNode: 'card_expiry_date',
            nodeToMark: 'card_expiry_year',
            doOnBlur:function (e) {
                this.focused = false;
                setTimeout(function () {
                    if (!$(':focus').hasClass('field-card_expiry_date')) {
                        card_expiry_month_validator.validate(e);
                        card_expiry_year_validator.validate(e);
                    }
                }, 1);
            }
        });
        card_expiry_year_validator.add(Validate.Presence, { failureMessage: "Enter a valid expiry date" });
        card_expiry_year_validator.add(Validate.Custom, {
            against: function (value, args) {
                return validate_expiry_date();
            },
            failureMessage: "Enter a valid expiry date"
        });
    }
    card_expiry_year_validator.enable();

    var $cardExpiryMonth = $('#card_expiry_month');
    var $cardExpiryYear = $('#card_expiry_year');
    var $cardNumber = $('#card_number');

    $cardExpiryMonth.on('change', function () {
        if ($cardExpiryYear.hasClass('failedOnce')) {
            card_expiry_year_validator.validate();
        }
    });
    $cardExpiryMonth.attr("tabindex", 0);
    $cardExpiryYear.on('change', function () {
        if ($cardExpiryMonth.hasClass('failedOnce')) {
            card_expiry_month_validator.validate();
        }
    });
    $cardExpiryYear.attr("tabindex", 0);
    $cardNumber.on('blur', function() {
        $(this).val(strip_spaces($(this).val()));
    });
    if (!card_detection_available) {
        init_masking(mask_sensitive_account_data, 'card_number', maskAllButLastFour, card_number_validator);
    }
    init_masking(mask_sensitive_account_data, 'card_cvn', maskAll, card_cvn_validator);
}

function initializeCardDetection() {
    if (!card_detection_available) {
        return;
    }
    var $caWrapper1 = $('#c-a-wrapper-1');
    var $caMore = $('#c-a-more');

    $caMore.on('click', function() {
        $caWrapper1.toggleClass('closed').toggleClass('open');
        $(this).text($(this).text() == t['supported_cards_more'] ? t['supported_cards_less'] : t['supported_cards_more'])
    }).on('blur', function() {
        $caWrapper1.removeClass('open').addClass('closed');
        $(this).text(t['supported_cards_more']);
    });

    var $cardNumberWrapper = $('#c-d-wrapper');
    var $cardNumber = $('#card_number');
    var $cardTypeLogo = $('#c-d-card-type-logo');
    var $cardBrandNameHint = $('#c-d-brand-name-hint');

    var $cardTypeSelect = $('#c-d-card-type-select');
    var $cardTypeSelectFocus = $('#c-d-card-type-select-focus');

    var $cardType = $('#c-d-card-type');
    var $cardTypeOptions = $('#c-d-card-type-options');
    var $cardTypeSelected = $('#c-d-card-type-selected');
    var $cardTypeAllowOverride = $('#c-d-card-type-allow-override');

    var detectedCards;
    var detectedCardsLength;
    var currentCard;
    var cardSelected;

    var initialCardType = $cardType.val();
    var cardNumberPlaceholder = $cardNumber.attr('placeholder');
    var allowCardTypeOverride = $cardTypeAllowOverride.val() == 'true';

    var cardTypeLogoBaseClass = $cardTypeLogo.attr('class');
    function removeCardLogo() {
        $cardTypeLogo.attr('class', cardTypeLogoBaseClass).attr('title', '');
        $cardBrandNameHint.text('');
    }
    function setCardLogo(cardType, animate) {
        if (animate == null) {
            animate = (animate !== false && !$cardTypeLogo.hasClass('_' + cardType));
        }

        removeCardLogo();

        if (isBlank(cardType)) {
            return;
        }

        function set() {
            var brandName = card_brand_names[cardType];
            $cardTypeLogo.addClass('_' + cardType).addClass('card').attr('title', brandName);
            if (!animate) {
                $cardTypeLogo.addClass('instant');
            }
            $cardBrandNameHint.text(t['card_type'] + ': ' + brandName);
        }

        if (animate) {
            setTimeout(set, 10);
        } else {
            set();
        }
    }

    var defaultDetectedCards = null;
    var defaultDetectedCardsLength = 0;
    if (allowCardTypeOverride) {
        var cards = CardDetection.detect('', false).cards;
        if (cardNumberPlaceholder.length > 0) {
            for (var i = cards.length - 1; i > -1; i--) {
                if (cards[i].lengths.indexOf(cardNumberPlaceholder.length) < 0) {
                    cards.splice(i, 1);
                }
            }
        }
        defaultDetectedCards = sortDetectedCards(cards);
        defaultDetectedCardsLength = detectedCardsLength;
    }
    function resetToInitialState(cardTypeOverride) {
        var cardType = (cardTypeOverride === undefined) ? initialCardType : cardTypeOverride;

        detectedCards = defaultDetectedCards;
        detectedCardsLength = defaultDetectedCardsLength;
        currentCard = null;
        cardSelected = false;

        $cardType.val(cardType);
        $cardTypeOptions.val(null);
        $cardTypeSelected.val(null);
        setCardLogo(cardType, false);

        if (allowCardTypeOverride && detectedCardsLength > 1) {
            populateSelect(detectedCards, cardType);
            addSelect();
        } else {
            removeSelect();
        }

        set_cvn_display(cardType);
        set_cvn_required(cardType);
    }
    function setDetectedCards(cards) {
        detectedCards = {};
        detectedCardsLength = 0;
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i];
            if (ranked_card_types.indexOf(c.cybsCardType) > -1) {
                detectedCards[c.cybsCardType] = c;
                ++detectedCardsLength;
            }
        }
    }
    function hideSelect() {
        $cardTypeSelect.hide().attr('tabindex', '-1');
    }
    function showSelect() {
        $cardTypeSelect.show().attr('tabindex', '0');
    }
    function removeSelect() {
        hideSelect();
        $cardNumber.removeClass('multi-card');
        $cardNumberWrapper.removeClass('multi-card');
    }
    function populateSelect(cards, selected) {
        $cardTypeSelect.empty();
        $.each(cards, function (i, card) {
            $cardTypeSelect.append($('<option>', {
                value: card.cybsCardType,
                text : card_brand_names[card.cybsCardType]
            }));
        });
        $cardTypeSelect.val(selected);
    }
    function addSelect() {
        showSelect();
        $cardNumber.addClass('multi-card');
        $cardNumberWrapper.addClass('multi-card');
    }
    function selectCard(cardType, selected) {
        var previousCardType = $cardType.val();

        currentCard = detectedCards[cardType];
        cardSelected = selected;

        if (cardType != previousCardType) {
            setCardLogo(cardType);
        }

        $cardType.val(cardType);
        var cardTypeOptions = '';
        $.each(detectedCards, function(key, value) {
            if (cardTypeOptions.length > 0) {
                cardTypeOptions += ',';
            }
            cardTypeOptions += key;
        });
        $cardTypeOptions.val(cardTypeOptions);
        $cardTypeSelected.val(selected);

        set_cvn_display(cardType);
        set_cvn_required(cardType);
    }
    function sortDetectedCards(cards) {
        if (cards == null || cards.length < 1) {
            return [];
        }

        setDetectedCards(cards);

        var sorted = [];
        for (var i = 0; i < ranked_card_types.length; i++) {
            var card = detectedCards[ranked_card_types[i]];
            if (card != null) {
                sorted.push(card);
            }
        }
        return sorted;
    }
    $cardNumber.on('input', function(e) {
        var value = e.target.value;

        if (isBlank(value)) {
            resetToInitialState();
            return;
        }

        var results = CardDetection.detect(value, allowCardTypeOverride != true);

        var cards = sortDetectedCards(results.cards);

        if (cards.length > 0) {
            var defaultCard = cards[0];
            if (allowCardTypeOverride) {
                for (var i = 0; i < cards.length; i++) {
                    if (cards[i].binMatch) {
                        defaultCard = cards[i];
                        break;
                    }
                }
            }

            if (currentCard == null || detectedCards[currentCard.cybsCardType] == null) {
                selectCard(defaultCard.cybsCardType, false);
            } else {
                if (!cardSelected) {
                    selectCard(defaultCard.cybsCardType, false);
                } else {
                    selectCard(currentCard.cybsCardType, cardSelected);
                }
            }

            if (cards.length > 1) {
                populateSelect(cards, currentCard.cybsCardType);
                addSelect();
            } else {
                removeSelect();
                $cardTypeSelect.empty();
            }
        } else {
            resetToInitialState(null);
        }
    }).on('focus', function() {
        $cardTypeLogo.show();
        if (currentCard != null && detectedCardsLength > 1) {
            showSelect();
        }
    });

    $cardTypeSelect.on('focus', function() {
        $cardTypeSelectFocus.show();
    }).on('blur', function() {
        $cardTypeSelectFocus.hide();
    }).on('change', function() {
        selectCard(this.value, true);
        $cardNumber.trigger('focus');
    });

    card_number_validator = new LiveValidation('card_number', {
        onlyOnBlur: true,
        excludeOnBlurTargets: [$cardTypeSelect.attr('id')],
        messageElementId: 'card_number_error',
        insertAfterWhatNode: 'c-d-wrapper'
    });
    if (cardNumberPlaceholder == null || cardNumberPlaceholder.length < 1) {
        card_number_validator.add(Validate.Presence, { failureMessage: t['errors']['card_number_required'] });
    }
    card_number_validator.add(Validate.Custom, {
        against: function (value, args) {
            if (value.length > 0) {
                if (detectedCards == null || detectedCardsLength < 1) {
                    return false;
                }
                return currentCard != null && currentCard.valid === true;
            } else {
                return true;
            }
        },
        failureMessage: t['errors']['card_number_invalid']
    });
    card_number_validator.enable();

    $cardNumber.off('blur');
    $cardNumber.on('blur', function() {
        $cardNumber.val(strip_spaces($cardNumber.val()));
    });
    $cardTypeSelect.on('blur', function() {
        setTimeout(function() {
            if (!$cardNumber.is(':focus')) {
                card_number_validator.validate();
            }
        }, 50);
    });

    resetToInitialState();
}

function initializeECheck() {
    echeckFields = {"company_tax_id":{"required":false,"editable":false,"field_name":"company_tax_id","displayed":false},"driver_license_number":{"required":false,"editable":false,"field_name":"driver_license_number","displayed":false},"echeck_account_number":{"required":false,"editable":false,"field_name":"echeck_account_number","displayed":false},"echeck_account_type":{"required":false,"editable":false,"field_name":"echeck_account_type","displayed":false},"date_of_birth":{"required":false,"editable":false,"field_name":"date_of_birth","displayed":false},"echeck_routing_number":{"required":false,"editable":false,"field_name":"echeck_routing_number","displayed":false},"echeck_check_number":{"required":false,"editable":false,"field_name":"echeck_check_number","displayed":false},"driver_license_state":{"required":false,"editable":false,"field_name":"driver_license_state","displayed":false}};







}

function maskAll(value, maskWith) {
    return strip_spaces(value || '').replace(/./g, maskWith);
}
function maskAllButLastFour(value, maskWith) {
    value = strip_spaces(value || '');
    var maskEnd = (value.length > 4) ? (value.length - 4) : value.length;
    return maskAll(value.substring(0, maskEnd), maskWith) + value.substring(maskEnd).replace(/[^\d]/g, maskWith);
}

function init_masking(maskingRequired, fieldName, maskingFunction, validationObject) {
    var MASK_CHAR = '•';

    var $field = $('#' + fieldName);
    var $fieldWrapper = $('#iw-' + fieldName);
    var $fieldMask = $('#im-' + fieldName);

    $fieldWrapper.removeClass('init');

    var initialValue = $field.val();
    if (isNotBlank(initialValue)) {
        $field.on('focus', function() {
            if ($field.val() == initialValue) {
                $field.val(null);
                $field.addClass('empty')
            } else {
                $field.removeClass('empty')
            }
        });
        $field.on('blur', function() {
            if (isBlank($field.val())) {
                $field.val(initialValue);
                $field.addClass('empty')
                $field.removeClass('failedOnce')
            }
            validationObject.validate();
        });
        $field.on('keydown', function () {
            setTimeout(function () {
                var value = $field.val();
                $field.toggleClass('empty', isBlank(value));
            }, 50);
        });
    }

    $fieldMask.text(maskingFunction($field.val(), MASK_CHAR));
    $fieldMask.show();

    $field.on('blur', function () {
        var value = $field.val();
        if (value == initialValue) {
            $fieldMask.text(maskingFunction(value, MASK_CHAR));
        } else {
            $fieldMask.text(maskingRequired ? maskingFunction(value, MASK_CHAR) : value);
        }
    });
}

$(function () {
    var selected_payment_method = $('#payment_method').val();
    if (selected_payment_method === "card") {
        initialize_card();
        initializeCardDetection();
    } else if (selected_payment_method === "echeck") {
        initializeECheck();
    }
});

var sessionTimer = (function () {

    var sessionTimeoutInterval,
        serverSessionKeepAliveInterval

    var timerConfig = {
        refreshAttempts: 10,
        timeAfterWhichDialogShouldBeShown: 14.3 * 60 * 1000,
        durationToDisplayDialog: 30 * 1000,
        timeAfterWhichServerKeepAliveShouldOccur: 5 * 60 * 1000
    };

    $(function ($) {
        startClientSideSessionTimeout();

        $('.cancelbutton').on('click', function(e) {
            var prevFocus = $(e.target);
            $("#cancel-order-dialog").dialog({
                dialogClass: "no-close",
                buttons: {
                    'Yes': function () {
                        $('input[type=submit]').prop('disabled', true);
                        $('.pay_button').prop('disabled', true);
                        $('.cancelbutton').prop('disabled', true);
                        window.location.assign("/canceled");
                        $(this).dialog('close');
                    },
                    'No': function () {
                        $(this).dialog('close');
                        $("#cancel-order-dialog").dialog("destroy");
                        prevFocus.focus();
                    }
                },
                modal: true  });
        });
    });

    function startClientSideSessionTimeout() {
        var timer,
            refreshesRemaining =  timerConfig.refreshAttempts;

        sessionTimeoutInterval = setInterval(
                function () {
                    if (refreshesRemaining >0){
                        $(document.body).append("<div id=\"dialog-message\" style=\"display: none\" title=\"Page about to close\" aria-describedby=\"session_timeout_dialog_description\"><span id=\"session_timeout_dialog_description\">It appears you are not currently active on this page.<br><br>For security reasons this page will close.  To prevent this, click the below button.</span></div>")
                        var timeoutError = document.getElementById("dialog-message")
                        var prevFocus = document.activeElement;
                        $("#dialog-message").dialog({
                            dialogClass: "no-close",
                            buttons: {
                                'Stay on page': function () {
                                    timeoutError.remove(timeoutError);
                                    initiateServerSessionKeepAlive();

                                    refreshesRemaining--;
                                    clearTimeout(timer);
                                    $(this).dialog('close');
                                    var prevSibling = prevFocus.previousElementSibling;
                                    if(prevSibling != null && prevSibling.getAttribute('id') != null && prevSibling.getAttribute('id').indexOf('_masked') > -1){
                                        prevFocus.previousElementSibling.focus()
                                    }
                                    else if(prevFocus != null) {
                                        prevFocus.focus();
                                    }
                                    $("#dialog-message").dialog("destroy");
                                }
                            },
                            modal: true,
                            open: timer = setTimeout(function (event, ui) {
                                clearInterval(sessionTimeoutInterval);
                                $("#dialog-message").dialog("close");
                                window.location.assign("/timeout");
                            }, timerConfig.durationToDisplayDialog)

                        });
                        $(".ui-dialog.no-close button[title='Close']").remove();
                    }
                    else{
                        window.location.assign("/timeout");
                    }
                },
                timerConfig.timeAfterWhichDialogShouldBeShown
        );
    }

    function preventClientSideSessionTimeout() {
        clearInterval(sessionTimeoutInterval);
    }

    function startServerSessionPeriodicKeepAlive() {
        serverSessionKeepAliveInterval = setInterval(initiateServerSessionKeepAlive, timerConfig.timeAfterWhichServerKeepAliveShouldOccur);
    }

    function stopServerSessionPeriodicKeepAlive() {
        clearInterval(serverSessionKeepAliveInterval);
    }

    function initiateServerSessionKeepAlive() {
        var myImg = $('#keep_alive');
        myImg.attr("src", myImg.attr("src") + '?' + Math.random());

        if(isEmbedded()){
            refreshCache();
        }
    }

    function isEmbedded() {
        return window.location != window.parent.location;
    }

    function refreshCache(){
        $.get( "/extend-embedded", { session_uuid: 'd39a507e405541229bdc74c58f6fcd26', sessionid: '76617LMG8E9UUU9K9MWWA5B2YJS81V2M' } );
    }

    return {
        startClientSideSessionTimeout: startClientSideSessionTimeout,
        preventClientSideSessionTimeout: preventClientSideSessionTimeout,
        startServerSessionPeriodicKeepAlive: startServerSessionPeriodicKeepAlive,
        stopServerSessionPeriodicKeepAlive: stopServerSessionPeriodicKeepAlive
    };

})();

function displayTerms(e, terms) {
    var prevFocus = $(e.target);
    $("." + terms + "_dialog").dialog({
        dialogClass: "no-close",
        buttons: {
            'Print': function () {
                window.print();
            },
            'Back': function () {
                $(this).dialog('close');
                prevFocus.focus();
                $("." + terms + "_dialog").dialog("destroy");
            }
        },
        modal: true  });
};

function isIE() {
    return (navigator.userAgent.indexOf("MSIE") != -1) || (!!document.documentMode == true);
}

$(function ($) {
    var commit_button = $('input[name="commit"]');
    if (commit_button.length) {
        $(document).keydown(function (e) {
            if (e.which === 13) {
                var target = $(e.target)
                if (target.is(":submit, :button")) {
                    target.click();
                    return false;
                }
                if (target.is("select")  && isIE()) {
                    return true;
                } else if (target.is("a")){
                    target.click();
                    return true;
                }
                commit_button.click();
                return false;
            }
        });
    }
});

$(function ($) {
    $('input[type=submit][name=back]')
            .on('submit click', function (event) {
                $(this)[0].form.onsubmit = function(e) {
                    return true;
                };
            });
});

$(function ($) {
    $("[class~='error']").each(function(index) {
        var $this = $(this);
        $.each($this.attr("class").split(/\s+/), function () {
            if (this.indexOf('server-error-') == 0) {
                var fieldName = this.slice(13);
                var $field = $("[class~='field-" + fieldName + "']");
                if ($field.length < 1) return;
                $field.attr('aria-invalid', 'true');
                var describedBy = $field.attr('aria-describedby') || '';
                $field.attr('aria-describedby', (describedBy.length < 1 ? '' : ' ') + $this.attr('id'));
                $field.addClass('failedOnce');
            }
        });
    });

    var formsLV = Object.keys(LiveValidationForm.instances);
    if (formsLV.length === 1) {
        var errMsgs = {
            'multiple_sections_1': 'You have one or more errors in the following section(s): ',
            'multiple_sections_2': 'Please fix to continue.',
            'section_billing': 'You have one or more errors in your billing information. Please fix to continue.',
            'section_shipping': 'You have one or more errors in your shipping information. Please fix to continue.',
            'section_payment': 'You have one or more errors in your payment details. Please fix to continue.',
            'generic': 'You have one or more errors. Please fix to continue.'
        };
        var sectionNames = {
            'billing': 'Billing Information',
            'shipping': 'Shipping Information',
            'payment': 'Payment Details'
        }

        var $banner = $('.error-banner');
        var $bannerVldn = $banner.filter('.validation');
        var $bannerVldnSS = $bannerVldn.filter('.section');
        var $bannerVldnMS = $bannerVldn.filter('.multiple-sections');
        LiveValidationForm.instances[formsLV[0]].doAfterValidate = function (valid) {
            if (valid) {
                $bannerVldn.addClass('hidden').removeAttr('role');
                $bannerVldn.find('p').text(null);
                return;
            }

            var badSections = [];
            $('.errorborder').filter(':visible').filter(':not(:disabled)').each(function(index) {
                var $this = $(this);
                var id = $this.attr('id');
                var section = 'payment';
                if (id.indexOf('bill_') == 0) {
                    section = 'billing';
                } else if (id.indexOf('ship_') == 0) {
                    section = 'shipping';
                }

                if (badSections.indexOf(section) < 0) {
                    badSections.push(section);
                }
            });

            if ($bannerVldnMS.length > 0) {
                if (badSections.length > 0) {
                    $bannerVldnMS.removeClass('hidden').attr('role', 'alert');
                    var errMsgMS = errMsgs['multiple_sections_1'];
                    for (var i = 0; i < badSections.length; i++) {
                        errMsgMS += sectionNames[badSections[i]] + '; ';
                    }
                    errMsgMS = errMsgMS.replace(/; $/, '. ') + errMsgs['multiple_sections_2'];
                    $bannerVldnMS.find('p').text(errMsgMS);
                } else {
                    $bannerVldnMS.addClass('hidden').removeAttr('role');
                    $bannerVldnMS.find('p').text(null);
                }
            }

            $bannerVldnSS.addClass('hidden');
            $bannerVldnSS.find('p').text(null);
            for (var i = 0; i < badSections.length; i++) {
                var section = badSections[i];
                var $bannerSection = $('.error-banner.validation.' + section);
                $bannerSection
                    .removeClass('hidden')
                    .find('p').text($bannerSection.hasClass('generic') ? errMsgs['generic'] : errMsgs['section_' + section]);
            }
            var $bannerVldnSSGnVis;
            if ($bannerVldnMS.length < 1 && ($bannerVldnSSGnVis = $bannerVldnSS.filter('.generic').filter(':not(.hidden)')).length > 0) {
                $bannerVldnSSGnVis.first().attr('role', 'alert');
            }
        };

        LiveValidationForm.instances[formsLV[0]].doAfterValidate($('.errorborder').filter(':visible').length < 1);
    }
});
